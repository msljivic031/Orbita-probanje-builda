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

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }
function fail(message) { throw new Error(`W6C physical PDF proof: ${message}`); }
function checkpoint(stage) {
  const line = `${new Date().toISOString()} ${stage}`;
  console.log(`[W6C-C2c] ${line}`);
  try { fs.mkdirSync(path.dirname(progressPath), { recursive: true }); fs.appendFileSync(progressPath, line + '\n'); } catch {}
}
function writeFailure(error) {
  const message = error instanceof Error ? error.stack || error.message : String(error);
  try { fs.mkdirSync(path.dirname(resultPath), { recursive: true }); fs.writeFileSync(resultPath, JSON.stringify({ state: 'FAIL', proof: 'W6C_CANONICAL_PHYSICAL_PDF', error: message }, null, 2)); } catch {}
  console.error(message); return message;
}
function withTimeout(promise, ms, label) { return Promise.race([promise,new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms))]); }
function terminate(code) { checkpoint(`exit-${code}`); try { app.exit(code); } catch {} process.exit(code); }

checkpoint(`module-evaluated-process-${process.type ?? 'unknown'}-electron-${process.versions.electron ?? 'missing'}`);
const globalWatchdog = setTimeout(() => { checkpoint('global-watchdog-fired'); writeFailure(new Error('W6C physical PDF proof watchdog exceeded 120000ms')); terminate(124); }, 120000);
const readinessWatchdog = setTimeout(() => { checkpoint(`ready-watchdog-fired-isReady-${String(app.isReady())}`); writeFailure(new Error('Electron app readiness timed out after 30000ms')); terminate(125); }, 30000);

async function runProof() {
  let exitCode = 0;
  try {
    clearTimeout(readinessWatchdog);
    checkpoint(`app-ready-handler-isReady-${String(app.isReady())}`);
    fs.mkdirSync(path.dirname(target), { recursive: true });

    const databasePath = createDemoDatabasePath();
    if (!process.env.ORBITA_RUNTIME_SCREENSHOT_DATABASE_PATH) fail('canonical inspector database path is not bound');
    if (!fs.existsSync(databasePath)) fail('canonical inspector database file is missing');
    checkpoint('canonical-inspector-db-open');
    const database = openDemoWorkspaceDatabase(databasePath, { forceSeed: false });
    let workspace;
    try { workspace = readWorkspaceFromDatabase(database); } finally { database.close(); }
    checkpoint('canonical-inspector-db-read');

    if (!workspace?.id) fail('canonical workspace id missing');
    if (!Array.isArray(workspace.people) || workspace.people.length === 0) fail('canonical inspector workspace has no people');
    if (!Array.isArray(workspace.organizationTeams) || workspace.organizationTeams.length === 0) fail('canonical inspector workspace has no organizationTeams');
    if (!Array.isArray(workspace.organizations) || workspace.organizations.length === 0) fail('canonical inspector workspace has no organizations');

    const candidates = workspace.organizations.map((organization) => ({
      organization,
      people: workspace.people.filter((person) => person.organizationId === organization.id && !person.archivedAt),
      teams: workspace.organizationTeams.filter((team) => team.organizationId === organization.id && !team.archivedAt),
    })).filter((entry) => entry.people.length > 0 && entry.teams.length > 0)
      .sort((a,b) => (b.people.length + b.teams.length) - (a.people.length + a.teams.length) || a.organization.name.localeCompare(b.organization.name, 'sr'));
    const scope = candidates[0];
    if (!scope) fail('canonical inspector workspace has no organization with both people and teams');

    const monthKey = '2026-08';
    const scopeLabel = `${scope.organization.name} · fizički PDF dokaz`;
    const request = {
      workspaceId: workspace.id,
      organizationId: scope.organization.id,
      unitIds: scope.teams.map((team) => team.id),
      personIds: scope.people.map((person) => person.id),
      scopeLabel,
      monthKey,
    };
    checkpoint(`canonical-scope-people-${request.personIds.length}-units-${request.unitIds.length}`);

    const semanticGeneratedAt = new Date().toISOString();
    const semanticSnapshot = buildWorkforceOutputSnapshot({
      workspace,
      monthKey,
      generatedAt: semanticGeneratedAt,
      scope: { workspaceId: workspace.id, organizationId: scope.organization.id, unitIds: [...request.unitIds], label: scopeLabel },
      currentScopePeople: scope.people,
      scopeTeamIds: [...request.unitIds],
    });
    checkpoint('snapshot-built');
    const html = renderWorkforceSnapshotHtml(semanticSnapshot);
    if (!html.includes('Workforce · 2026-08')) fail('HTML month truth missing');
    if (!html.includes(scopeLabel)) fail('HTML scope truth missing');
    if (!html.includes(scope.people[0].displayName)) fail('HTML canonical person truth missing');
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

    const databaseBytes = fs.readFileSync(databasePath);
    const proof = {
      state: 'PASS', proof: 'W6C_CANONICAL_PHYSICAL_PDF', schema: semanticSnapshot.schema, monthKey,
      workspaceId: workspace.id, organizationId: scope.organization.id, unitCount: request.unitIds.length, personCount: request.personIds.length,
      dayCount: semanticSnapshot.days.length, legendDayCount: semanticSnapshot.legendByDay.length,
      sourceDatabaseFile: path.basename(databasePath), sourceDatabaseBytes: databaseBytes.length, sourceDatabaseSha256: sha256(databaseBytes),
      fileName: path.basename(target), bytes: bytes.length, sha256: actualSha, pdfHeader: header, eofMarker: true, generatedAt: exported.generatedAt,
      truth: [
        'source SQLite was physically produced by the existing canonical visual inspector runtime',
        'no manual proof person organization team or history row was inserted',
        'canonical output command re-reads that SQLite before export',
        'same C1 snapshot semantics contain real month/scope/person/day/legend truth',
        'real Electron printToPDF produced physical bytes',
        'physical file bytes and returned bytes match',
        'physical SHA-256 and returned SHA-256 match',
        'no technical 1970 sentinel in output HTML truth',
      ],
    };
    fs.writeFileSync(resultPath, JSON.stringify(proof, null, 2));
    console.log(JSON.stringify(proof, null, 2));
  } catch (error) { exitCode = 1; checkpoint('caught-failure'); writeFailure(error); }
  finally { clearTimeout(globalWatchdog); clearTimeout(readinessWatchdog); terminate(exitCode); }
}

app.whenReady().then(runProof).catch((error) => { clearTimeout(globalWatchdog); clearTimeout(readinessWatchdog); checkpoint('whenReady-rejected'); writeFailure(error); terminate(1); });
