const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>{const p=path.join(root,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r\n/g,'\n'),'utf8');};
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
function insertBefore(file,anchor,extra,label){let s=read(file);if(s.includes(extra.trim()))return;const i=s.indexOf(anchor);if(i<0)throw Error(`${label}: anchor missing`);write(file,s.slice(0,i)+extra.trim()+'\n\n'+s.slice(i));}
function insertAfter(file,anchor,extra,label){let s=read(file);if(s.includes(extra.trim()))return;const i=s.indexOf(anchor);if(i<0)throw Error(`${label}: anchor missing`);const at=i+anchor.length;write(file,s.slice(0,at)+'\n'+extra.trim()+'\n'+s.slice(at));}

const legend='src/domain/people/workforceLegend.ts';
write(legend,`import type { PersonAvailabilityEventKind } from './personTypes';

export type WorkforceLegendSemanticCategory = 'available' | 'leave' | 'field' | 'blocked' | 'absence';
export type WorkforceLegendProvenance = 'system_default_v1' | 'user';
export type WorkforceLegendSeed = {
  kind: PersonAvailabilityEventKind;
  token: string;
  name: string;
  category: WorkforceLegendSemanticCategory;
  order: number;
  provenance: 'system_default_v1';
};
export type WorkforceLegendVersion = {
  versionId: string;
  semanticId: string;
  availabilityKind: PersonAvailabilityEventKind;
  token: string;
  displayName: string;
  semanticCategory: WorkforceLegendSemanticCategory;
  sortOrder: number;
  isArchived: boolean;
  effectiveFrom: string;
  supersedesVersionId?: string;
  provenance: WorkforceLegendProvenance;
  actorPersonId?: string;
  recordedAt: string;
};
export type EffectiveWorkforceLegendEntry = WorkforceLegendSeed & {
  semanticId: string;
  versionId?: string;
  source: 'persisted' | 'system_fallback' | 'archived_fallback';
  effectiveFrom?: string;
};

export const DEFAULT_WORKFORCE_LEGEND: WorkforceLegendSeed[] = [
  { kind: 'available', token: 'D', name: 'Dostupan', category: 'available', order: 10, provenance: 'system_default_v1' },
  { kind: 'annual_leave', token: 'GO', name: 'Godišnji', category: 'leave', order: 20, provenance: 'system_default_v1' },
  { kind: 'sick_leave', token: 'BO', name: 'Bolovanje', category: 'leave', order: 30, provenance: 'system_default_v1' },
  { kind: 'field_work', token: 'T', name: 'Teren', category: 'field', order: 40, provenance: 'system_default_v1' },
  { kind: 'day_off', token: 'SD', name: 'Slobodan dan', category: 'leave', order: 50, provenance: 'system_default_v1' },
  { kind: 'blocked', token: 'B', name: 'Blokada', category: 'blocked', order: 60, provenance: 'system_default_v1' },
  { kind: 'other_absence', token: 'O', name: 'Odsustvo', category: 'absence', order: 70, provenance: 'system_default_v1' },
];

export function workforceLegendSemanticId(kind: PersonAvailabilityEventKind) {
  return \`availability:\${kind}\`;
}

function asInstant(value: string) {
  return value.includes('T') ? value : \`\${value}T23:59:59.999Z\`;
}

export function resolveWorkforceLegendVersion(
  versions: WorkforceLegendVersion[] | undefined,
  kind: PersonAvailabilityEventKind,
  asOf: string,
): WorkforceLegendVersion | undefined {
  const boundary = asInstant(asOf);
  const candidates = (versions ?? [])
    .filter((version) => version.availabilityKind === kind && version.effectiveFrom <= boundary)
    .sort((a, b) =>
      a.effectiveFrom.localeCompare(b.effectiveFrom) ||
      a.recordedAt.localeCompare(b.recordedAt) ||
      a.versionId.localeCompare(b.versionId),
    );
  const latest = candidates.at(-1);
  return latest && !latest.isArchived ? latest : undefined;
}

export function workforceLegendEntriesForDate(
  versions: WorkforceLegendVersion[] | undefined,
  asOf: string,
): EffectiveWorkforceLegendEntry[] {
  return DEFAULT_WORKFORCE_LEGEND.map((fallback) => {
    const allForKind = (versions ?? [])
      .filter((version) => version.availabilityKind === fallback.kind && version.effectiveFrom <= asInstant(asOf))
      .sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.recordedAt.localeCompare(b.recordedAt) || a.versionId.localeCompare(b.versionId));
    const latest = allForKind.at(-1);
    if (!latest) return { ...fallback, semanticId: workforceLegendSemanticId(fallback.kind), source: 'system_fallback' };
    if (latest.isArchived) return { ...fallback, semanticId: latest.semanticId, versionId: latest.versionId, source: 'archived_fallback', effectiveFrom: latest.effectiveFrom };
    return {
      kind: latest.availabilityKind,
      token: latest.token,
      name: latest.displayName,
      category: latest.semanticCategory,
      order: latest.sortOrder,
      provenance: latest.provenance === 'system_default_v1' ? 'system_default_v1' : fallback.provenance,
      semanticId: latest.semanticId,
      versionId: latest.versionId,
      source: 'persisted',
      effectiveFrom: latest.effectiveFrom,
    };
  }).sort((a, b) => a.order - b.order);
}

export function workforceLegendEntryForDate(
  versions: WorkforceLegendVersion[] | undefined,
  kind: PersonAvailabilityEventKind,
  asOf: string,
): EffectiveWorkforceLegendEntry {
  const entry = workforceLegendEntriesForDate(versions, asOf).find((candidate) => candidate.kind === kind);
  if (!entry) throw new Error(\`Workforce legend fallback missing for \${kind}\`);
  return entry;
}
`);

const workspaceTypes='src/domain/workspace/workspaceTypes.ts';
let wt=read(workspaceTypes);
if(!wt.includes("from '../people/workforceLegend'")) wt=`import type { WorkforceLegendVersion } from '../people/workforceLegend';\n`+wt;
if(!wt.includes('workforceLegendVersions')){
  const m=/^(\s*)availabilityEvents\s*:\s*[^;]+;\s*$/m.exec(wt);
  if(!m) throw Error('Workspace availabilityEvents field anchor missing');
  wt=wt.slice(0,m.index)+m[0]+`\n${m[1]}workforceLegendVersions: WorkforceLegendVersion[];`+wt.slice(m.index+m[0].length);
}
write(workspaceTypes,wt);

const schemaFile='src/main/persistence/schema/sqliteA419WorkforceLegendSchema.ts';
write(schemaFile,`import { DatabaseSync } from 'node:sqlite';

const DEFAULT_ROWS = [
  ['workforce-legend:available:system-default-v1','availability:available','available','D','Dostupan','available',10],
  ['workforce-legend:annual_leave:system-default-v1','availability:annual_leave','annual_leave','GO','Godišnji','leave',20],
  ['workforce-legend:sick_leave:system-default-v1','availability:sick_leave','sick_leave','BO','Bolovanje','leave',30],
  ['workforce-legend:field_work:system-default-v1','availability:field_work','field_work','T','Teren','field',40],
  ['workforce-legend:day_off:system-default-v1','availability:day_off','day_off','SD','Slobodan dan','leave',50],
  ['workforce-legend:blocked:system-default-v1','availability:blocked','blocked','B','Blokada','blocked',60],
  ['workforce-legend:other_absence:system-default-v1','availability:other_absence','other_absence','O','Odsustvo','absence',70],
] as const;
const SYSTEM_EFFECTIVE_FROM = '1970-01-01T00:00:00.000Z';
const SYSTEM_RECORDED_AT = '2026-08-13T00:00:00.000Z';

export function ensureA419WorkforceLegendSchema(database: DatabaseSync) {
  database.exec(\`
    CREATE TABLE IF NOT EXISTS workforce_legend_versions_a419 (
      version_id TEXT PRIMARY KEY,
      semantic_id TEXT NOT NULL,
      availability_kind TEXT NOT NULL CHECK (availability_kind IN ('available','annual_leave','sick_leave','field_work','day_off','blocked','other_absence')),
      token TEXT NOT NULL,
      display_name TEXT NOT NULL,
      semantic_category TEXT NOT NULL CHECK (semantic_category IN ('available','leave','field','blocked','absence')),
      sort_order INTEGER NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0 CHECK (is_archived IN (0,1)),
      effective_from TEXT NOT NULL,
      supersedes_version_id TEXT,
      provenance TEXT NOT NULL CHECK (provenance IN ('system_default_v1','user')),
      actor_person_id TEXT,
      recorded_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_workforce_legend_versions_a419_kind_effective
      ON workforce_legend_versions_a419(availability_kind, effective_from, recorded_at, version_id);
    CREATE INDEX IF NOT EXISTS idx_workforce_legend_versions_a419_semantic_effective
      ON workforce_legend_versions_a419(semantic_id, effective_from, recorded_at, version_id);
    CREATE TRIGGER IF NOT EXISTS trg_workforce_legend_versions_a419_append_only_update
      BEFORE UPDATE ON workforce_legend_versions_a419 BEGIN SELECT RAISE(ABORT, 'workforce legend versions are append-only'); END;
    CREATE TRIGGER IF NOT EXISTS trg_workforce_legend_versions_a419_append_only_delete
      BEFORE DELETE ON workforce_legend_versions_a419 BEGIN SELECT RAISE(ABORT, 'workforce legend versions are append-only'); END;
  \`);
  const insert = database.prepare(\`INSERT OR IGNORE INTO workforce_legend_versions_a419 (
    version_id, semantic_id, availability_kind, token, display_name, semantic_category, sort_order,
    is_archived, effective_from, supersedes_version_id, provenance, actor_person_id, recorded_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, NULL, 'system_default_v1', NULL, ?)\`);
  for (const row of DEFAULT_ROWS) insert.run(...row, SYSTEM_EFFECTIVE_FROM, SYSTEM_RECORDED_AT);
}
`);

const schema='src/main/persistence/schema/sqliteSchema.ts';
let ss=read(schema);
if(!ss.includes('sqliteA419WorkforceLegendSchema.js')){
  const imp=/^import\s+\{\s*ensureA418TemporalResponsibilitySchema\s*\}\s+from\s+['"]\.\/sqliteA418TemporalResponsibilitySchema\.js['"];?\s*$/m.exec(ss);
  if(!imp) throw Error('A418 schema import anchor missing');
  const add=`\nimport { ensureA419WorkforceLegendSchema } from './sqliteA419WorkforceLegendSchema.js';`;
  ss=ss.slice(0,imp.index+imp[0].length)+add+ss.slice(imp.index+imp[0].length);
}
if(!ss.includes('ensureA419WorkforceLegendSchema(')){
  const call=/ensureA418TemporalResponsibilitySchema\(([^)]+)\);/.exec(ss);
  if(!call) throw Error('A418 ensure call anchor missing');
  ss=ss.replace(call[0],`${call[0]}\n  ensureA419WorkforceLegendSchema(${call[1]});`);
}
write(schema,ss);

const reader='src/main/persistence/workspace/sqliteWorkspaceReader.ts';
let rd=read(reader);
if(!rd.includes("workforceLegend.js")) rd=`import type { WorkforceLegendVersion } from '../../../domain/people/workforceLegend.js';\n`+rd;
if(!rd.includes('function readWorkforceLegendVersions(')){
  const anchor='export function readWorkspaceFromDatabase';
  const i=rd.indexOf(anchor); if(i<0) throw Error('readWorkspaceFromDatabase anchor missing');
  const helper=`function readWorkforceLegendVersions(database: DatabaseSync): WorkforceLegendVersion[] {\n  const rows = database.prepare(\`SELECT version_id, semantic_id, availability_kind, token, display_name, semantic_category, sort_order, is_archived, effective_from, supersedes_version_id, provenance, actor_person_id, recorded_at FROM workforce_legend_versions_a419 ORDER BY effective_from, recorded_at, version_id\`).all() as Array<Record<string, unknown>>;\n  return rows.map((row) => ({\n    versionId: String(row.version_id), semanticId: String(row.semantic_id), availabilityKind: String(row.availability_kind) as WorkforceLegendVersion['availabilityKind'],\n    token: String(row.token), displayName: String(row.display_name), semanticCategory: String(row.semantic_category) as WorkforceLegendVersion['semanticCategory'],\n    sortOrder: Number(row.sort_order), isArchived: Number(row.is_archived) === 1, effectiveFrom: String(row.effective_from),\n    supersedesVersionId: row.supersedes_version_id == null ? undefined : String(row.supersedes_version_id), provenance: String(row.provenance) as WorkforceLegendVersion['provenance'],\n    actorPersonId: row.actor_person_id == null ? undefined : String(row.actor_person_id), recordedAt: String(row.recorded_at),\n  }));\n}\n\n`;
  rd=rd.slice(0,i)+helper+rd.slice(i);
}
if(!rd.includes('workforceLegendVersions:')){
  let changed=false;
  rd=rd.replace(/^(\s*)availabilityEvents,\s*$/m,(m,indent)=>{changed=true;return `${m}\n${indent}workforceLegendVersions: readWorkforceLegendVersions(database),`;});
  if(!changed) rd=rd.replace(/^(\s*)availabilityEvents\s*:\s*([^,\n]+),\s*$/m,(m,indent,value)=>{changed=true;return `${m}\n${indent}workforceLegendVersions: readWorkforceLegendVersions(database),`;});
  if(!changed) throw Error('Workspace reader availabilityEvents return anchor missing');
}
write(reader,rd);

const monthly='src/domain/people/workforceMonthlySheet.ts';
let wm=read(monthly);
if(!wm.includes("from './workforceLegend'")){
  wm=wm.replace("import { isCanonicalWorkingDay } from '../work/workSchedule';", "import { isCanonicalWorkingDay } from '../work/workSchedule';\nimport { DEFAULT_WORKFORCE_LEGEND, workforceLegendEntryForDate, workforceLegendEntriesForDate } from './workforceLegend';\nexport { DEFAULT_WORKFORCE_LEGEND, workforceLegendEntriesForDate } from './workforceLegend';");
}
const start=wm.indexOf('export type WorkforceLegendSeed =');
const end=wm.indexOf('export type WorkforceDay =');
if(start>=0&&end>start) wm=wm.slice(0,start)+wm.slice(end);
wm=wm.replace(/\n\s*const legendByKind = new Map\(DEFAULT_WORKFORCE_LEGEND\.map\(\(entry\) => \[entry\.kind, entry\]\)\);/,'');
wm=wm.replace('      const legend = legendByKind.get(foundation.currentKind);','      const legend = workforceLegendEntryForDate(workspace.workforceLegendVersions, foundation.currentKind, day.isoDate);');
wm=wm.replace("      return { isoDate: day.isoDate, inScope: true, boundaryConfidence: unknown ? 'unknown_start' : 'known', kind: foundation.currentKind, label, token: legend?.token ?? label.slice(0,2).toUpperCase(), workingDay: day.workingDay };","      return { isoDate: day.isoDate, inScope: true, boundaryConfidence: unknown ? 'unknown_start' : 'known', kind: foundation.currentKind, label, token: legend.token, workingDay: day.workingDay };");
if(!wm.includes('workforceLegendEntriesForDate')) throw Error('Workforce monthly legend import failed');
write(monthly,wm);

const component='src/renderer/screens/ljudi/components/LjudiWorkforceSheet.tsx';
let cp=read(component);
cp=cp.replace("import { DEFAULT_WORKFORCE_LEGEND, buildWorkforceMonthlyRows } from '../../../../domain/people/workforceMonthlySheet';","import { buildWorkforceMonthlyRows, workforceLegendEntriesForDate } from '../../../../domain/people/workforceMonthlySheet';");
if(!cp.includes('const legendEntries =')){
  const anchor='  const isCurrentMonth = monthKey === monthKeyFromIso(today);';
  if(!cp.includes(anchor)) throw Error('Workforce component month anchor missing');
  cp=cp.replace(anchor,`${anchor}\n  const legendEntries = useMemo(() => workforceLegendEntriesForDate(workspace.workforceLegendVersions, \`${'${monthKey}'}-01\`), [workspace.workforceLegendVersions, monthKey]);`);
}
cp=cp.replace('DEFAULT_WORKFORCE_LEGEND.slice().sort((a,b)=>a.order-b.order)','legendEntries.slice().sort((a,b)=>a.order-b.order)');
cp=cp.replace('W6A sistemska legenda je fallback; W6B dodaje verzionisanu konfiguraciju.','Legenda se razrešava po efektivnoj verziji za izabrani mesec; arhivirana verzija ne prepisuje istorijsko značenje.');
write(component,cp);

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE6B_WORKFORCE_LEGEND_CORE',state:'IMPLEMENTED_NOT_ADMITTED',newOwners:[legend,schemaFile],patchedOwners:[workspaceTypes,schema,reader,monthly,component],truth:['append-only A4.19 legend versions','deterministic system seed','one Workspace hydration path','per-day as-of legend resolution','historic rename cannot rewrite prior row meaning'],notYetClaimed:['write command','semantic-history mutation','Settings editor','permission-bound IPC','W6B PASS','print/export']},null,2));
