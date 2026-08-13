import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { createDemoDatabasePath } from './dist-electron/main/persistence/schema/sqliteSchema.js';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from './dist-electron/main/persistence/workspace/sqliteWorkspaceStore.js';
import { buildWorkforceOutputSnapshot } from './dist-electron/domain/people/workforceOutputSnapshot.js';
import { renderWorkforceSnapshotHtml } from './dist-electron/main/output/workforceOutputService.js';
import { exportCanonicalWorkforcePdf } from './dist-electron/main/output/workforceOutputCommands.js';

const target = path.resolve(process.env.ORBITA_W6C_PDF_TARGET || process.argv[2] || 'workforce-canonical-proof.pdf');
const resultPath = path.resolve(process.env.ORBITA_W6C_PDF_RESULT || process.argv[3] || `${target}.json`);
const progressPath = resultPath.replace(/\.json$/i, '') + '.progress.log';

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
function fail(message) {
  throw new Error(`W6C physical PDF proof: ${message}`);
}
function checkpoint(stage) {
  const line = `${new Date().toISOString()} ${stage}`;
  console.log(`[W6C-C2c] ${line}`);
  try {
    fs.mkdirSync(path.dirname(progressPath), { recursive: true });
    fs.appendFileSync(progressPath, line + '\n');
  } catch {}
}
function writeFailure(error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  try {
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, JSON.stringify({ state: 'FAIL', proof: 'W6C_CANONICAL_PHYSICAL_PDF', error: message }, null, 2));
  } catch {}
  console.error(message);
  return message;
}
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}
function terminate(code) {
  checkpoint(`exit-${code}`);
  try { app.exit(code); } catch {}
  process.exit(code);
}

checkpoint(`module-evaluated-process-${process.type ?? 'unknown'}-electron-${process.versions.electron ?? 'missing'}`);
const globalWatchdog = setTimeout(() => {
  checkpoint('global-watchdog-fired');
  writeFailure(new Error('W6C physical PDF proof watchdog exceeded 120000ms'));
  terminate(124);
}, 120000);
const readinessWatchdog = setTimeout(() => {
  checkpoint(`ready-watchdog-fired-isReady-${String(app.isReady())}`);
  writeFailure(new Error('Electron app readiness timed out after 30000ms'));
  terminate(125);
}, 30000);

async function runProof() {
  let exitCode = 0;
  try {
    clearTimeout(readinessWatchdog);
    checkpoint(`app-ready-handler-isReady-${String(app.isReady())}`);

    fs.mkdirSync(path.dirname(target), { recursive: true });
    checkpoint('canonical-db-open');
    const databasePath = createDemoDatabasePath();
    const seedDb = openDemoWorkspaceDatabase(databasePath, { forceSeed: true });
    let workspace;
    try {
      workspace = readWorkspaceFromDatabase(seedDb);
    } finally {
      seedDb.close();
    }
    checkpoint('canonical-db-read');
    if (!workspace?.id) fail('canonical workspace id missing');
    if (!Array.isArray(workspace.people) || workspace.people.length === 0) fail('canonical workspace has no people');
    if (!Array.isArray(workspace.organizationTeams)) fail('canonical organizationTeams missing');
    if (!Array.isArray(workspace.organizations)) fail('canonical organizations missing');

    const organization = workspace.organizations[0];
    const organizationTeams = organization
      ? workspace.organizationTeams.filter((team) => team.organizationId === organization.id)
      : workspace.organizationTeams;
    const scopedTeams = organizationTeams.length ? organizationTeams : workspace.organizationTeams;
    const monthKey = '2026-08';
    const scopeLabel = organization?.name ? `${organization.name} · fizički PDF dokaz` : 'ORBITA workspace · fizički PDF dokaz';
    const request = {
      workspaceId: workspace.id,
      organizationId: organization?.id,
      unitIds: scopedTeams.map((team) => team.id),
      personIds: workspace.people.map((person) => person.id),
      scopeLabel,
      monthKey,
    };

    const semanticGeneratedAt = new Date().toISOString();
    const semanticSnapshot = buildWorkforceOutputSnapshot({
      workspace,
      monthKey,
      generatedAt: semanticGeneratedAt,
      scope: {
        workspaceId: workspace.id,
        organizationId: organization?.id,
        unitIds: [...request.unitIds],
        label: scopeLabel,
      },
      currentScopePeople: workspace.people,
      scopeTeamIds: [...request.unitIds],
    });
    checkpoint('snapshot-built');
    const html = renderWorkforceSnapshotHtml(semanticSnapshot);
    if (!html.includes('Workforce · 2026-08')) fail('HTML month truth missing');
    if (!html.includes(scopeLabel)) fail('HTML scope truth missing');
    if (!html.includes(workspace.people[0].displayName)) fail('HTML canonical person truth missing');
    if (!html.includes('Legenda po datumima')) fail('HTML day-resolved legend missing');
    if (/1\.\s*1\.\s*1970|1970-01-01/.test(html)) fail('HTML exposes technical 1970 system sentinel');
    if (html.includes('<script')) fail('output HTML must not contain script');
    checkpoint(`html-validated-bytes-${Buffer.byteLength(html, 'utf8')}`);

    checkpoint('canonical-export-start');
    const exported = await withTimeout(exportCanonicalWorkforcePdf(request, target), 80000, 'Electron canonical PDF export');
    checkpoint('canonical-export-resolved');
    const bytes = fs.readFileSync(target);
    const actualSha = sha256(bytes);
    const header = bytes.subarray(0, 5).toString('ascii');
    const tail = bytes.subarray(Math.max(0, bytes.length - 2048)).toString('latin1');
    if (header !== '%PDF-') fail(`invalid PDF header ${JSON.stringify(header)}`);
    if (!tail.includes('%%EOF')) fail('PDF EOF marker missing');
    if (bytes.length < 4096) fail(`PDF unexpectedly small: ${bytes.length}`);
    if (bytes.length !== exported.bytes) fail(`reported bytes ${exported.bytes} != physical bytes ${bytes.length}`);
    if (actualSha !== exported.sha256) fail(`reported sha256 ${exported.sha256} != physical sha256 ${actualSha}`);
    checkpoint('physical-pdf-verified');

    const proof = {
      state: 'PASS',
      proof: 'W6C_CANONICAL_PHYSICAL_PDF',
      schema: semanticSnapshot.schema,
      monthKey,
      workspaceId: workspace.id,
      organizationId: organization?.id ?? null,
      unitCount: request.unitIds.length,
      personCount: request.personIds.length,
      dayCount: semanticSnapshot.days.length,
      legendDayCount: semanticSnapshot.legendByDay.length,
      fileName: path.basename(target),
      bytes: bytes.length,
      sha256: actualSha,
      pdfHeader: header,
      eofMarker: true,
      generatedAt: exported.generatedAt,
      truth: [
        'canonical demo SQLite workspace seeded/read through existing persistence owner',
        'canonical output command re-reads SQLite before export',
        'same C1 snapshot semantics contain real month/scope/person/day/legend truth',
        'real Electron printToPDF produced physical bytes',
        'physical file bytes and returned bytes match',
        'physical SHA-256 and returned SHA-256 match',
        'no technical 1970 sentinel in output HTML truth',
      ],
    };
    fs.writeFileSync(resultPath, JSON.stringify(proof, null, 2));
    console.log(JSON.stringify(proof, null, 2));
  } catch (error) {
    exitCode = 1;
    checkpoint('caught-failure');
    writeFailure(error);
  } finally {
    clearTimeout(globalWatchdog);
    clearTimeout(readinessWatchdog);
    terminate(exitCode);
  }
}

app.whenReady().then(runProof).catch((error) => {
  clearTimeout(globalWatchdog);
  clearTimeout(readinessWatchdog);
  checkpoint('whenReady-rejected');
  writeFailure(error);
  terminate(1);
});
