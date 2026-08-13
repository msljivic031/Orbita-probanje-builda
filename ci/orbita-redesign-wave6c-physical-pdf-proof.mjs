import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { app } from 'electron';
import { createDemoDatabasePath } from './dist-electron/main/persistence/schema/sqliteSchema.js';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from './dist-electron/main/persistence/workspace/sqliteWorkspaceStore.js';
import { buildWorkforceOutputSnapshot } from './dist-electron/domain/people/workforceOutputSnapshot.js';
import { renderWorkforceSnapshotHtml } from './dist-electron/main/output/workforceOutputService.js';
import { exportCanonicalWorkforcePdf } from './dist-electron/main/output/workforceOutputCommands.js';

const target = path.resolve(process.argv[2] || 'workforce-canonical-proof.pdf');
const resultPath = path.resolve(process.argv[3] || `${target}.json`);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}
function fail(message) {
  throw new Error(`W6C physical PDF proof: ${message}`);
}
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

const watchdog = setTimeout(() => {
  const error = 'W6C physical PDF proof watchdog exceeded 120000ms';
  try {
    fs.mkdirSync(path.dirname(resultPath), { recursive: true });
    fs.writeFileSync(resultPath, JSON.stringify({ state: 'FAIL', proof: 'W6C_CANONICAL_PHYSICAL_PDF', error }, null, 2));
  } catch {}
  console.error(error);
  try { app.exit(124); } catch {}
  process.exit(124);
}, 120000);

await app.whenReady();
let exitCode = 0;
try {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const databasePath = createDemoDatabasePath();
  const seedDb = openDemoWorkspaceDatabase(databasePath, { forceSeed: true });
  let workspace;
  try {
    workspace = readWorkspaceFromDatabase(seedDb);
  } finally {
    seedDb.close();
  }
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
  const html = renderWorkforceSnapshotHtml(semanticSnapshot);
  if (!html.includes('Workforce · 2026-08')) fail('HTML month truth missing');
  if (!html.includes(scopeLabel)) fail('HTML scope truth missing');
  if (!html.includes(workspace.people[0].displayName)) fail('HTML canonical person truth missing');
  if (!html.includes('Legenda po datumima')) fail('HTML day-resolved legend missing');
  if (/1\.\s*1\.\s*1970|1970-01-01/.test(html)) fail('HTML exposes technical 1970 system sentinel');
  if (html.includes('<script')) fail('output HTML must not contain script');

  const exported = await withTimeout(exportCanonicalWorkforcePdf(request, target), 90000, 'Electron printToPDF');
  const bytes = fs.readFileSync(target);
  const actualSha = sha256(bytes);
  const header = bytes.subarray(0, 5).toString('ascii');
  const tail = bytes.subarray(Math.max(0, bytes.length - 2048)).toString('latin1');
  if (header !== '%PDF-') fail(`invalid PDF header ${JSON.stringify(header)}`);
  if (!tail.includes('%%EOF')) fail('PDF EOF marker missing');
  if (bytes.length < 4096) fail(`PDF unexpectedly small: ${bytes.length}`);
  if (bytes.length !== exported.bytes) fail(`reported bytes ${exported.bytes} != physical bytes ${bytes.length}`);
  if (actualSha !== exported.sha256) fail(`reported sha256 ${exported.sha256} != physical sha256 ${actualSha}`);

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
  const message = error instanceof Error ? error.stack || error.message : String(error);
  fs.mkdirSync(path.dirname(resultPath), { recursive: true });
  fs.writeFileSync(resultPath, JSON.stringify({ state: 'FAIL', proof: 'W6C_CANONICAL_PHYSICAL_PDF', error: message }, null, 2));
  console.error(message);
} finally {
  clearTimeout(watchdog);
  try { app.exit(exitCode); } catch {}
}
process.exit(exitCode);
