const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const target=path.join(root,'src/domain/people/workforceOutputSnapshot.ts');
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,`import type { Person } from './personTypes.js';
import type { Workspace } from '../workspace/workspaceTypes.js';
import { buildWorkforceMonthlyRows } from './workforceMonthlySheet.js';
import { workforceLegendEntriesForDate } from './workforceLegend.js';
import type { EffectiveWorkforceLegendEntry } from './workforceLegend.js';

export const WORKFORCE_OUTPUT_NO_HOLIDAY_INVENTION =
  'Vikendi prate kanonski workSchedule owner. Praznici se ne izmišljaju dok ne postoji zajednički holiday owner.';

export type WorkforceOutputScope = {
  workspaceId: string;
  organizationId?: string;
  unitIds: string[];
  label: string;
};

export type WorkforceOutputLegendEntry = Pick<
  EffectiveWorkforceLegendEntry,
  'kind' | 'token' | 'name' | 'category' | 'order' | 'provenance' | 'semanticId' | 'versionId' | 'source' | 'effectiveFrom'
>;

export type WorkforceOutputDayLegend = {
  isoDate: string;
  entries: WorkforceOutputLegendEntry[];
};

export type WorkforceOutputCell = {
  isoDate: string;
  inScope: boolean;
  boundaryConfidence?: 'known' | 'unknown_start';
  kind?: string;
  token: string;
  label: string;
  workingDay: boolean;
};

export type WorkforceOutputRow = {
  personId: string;
  displayName: string;
  hasUnknownStart: boolean;
  cells: WorkforceOutputCell[];
};

export type WorkforceOutputSnapshot = {
  schema: 'orbita.workforce-output.v1';
  scope: WorkforceOutputScope;
  monthKey: string;
  generatedAt: string;
  days: Array<{ isoDate: string; day: number; workingDay: boolean }>;
  rows: WorkforceOutputRow[];
  legendByDay: WorkforceOutputDayLegend[];
  truthNotes: {
    noHolidayInvention: typeof WORKFORCE_OUTPUT_NO_HOLIDAY_INVENTION;
    temporalMembership: 'as_of_day_with_unknown_start_preserved';
    legendResolution: 'as_of_day_append_only_versions';
  };
};

function legendForOutput(entry: EffectiveWorkforceLegendEntry): WorkforceOutputLegendEntry {
  return {
    kind: entry.kind,
    token: entry.token,
    name: entry.name,
    category: entry.category,
    order: entry.order,
    provenance: entry.provenance,
    semanticId: entry.semanticId,
    versionId: entry.versionId,
    source: entry.source,
    effectiveFrom: entry.effectiveFrom,
  };
}

export function buildWorkforceOutputSnapshot(args: {
  workspace: Workspace;
  monthKey: string;
  generatedAt: string;
  scope: WorkforceOutputScope;
  currentScopePeople: Person[];
  scopeTeamIds: string[];
}): WorkforceOutputSnapshot {
  const { workspace, monthKey, generatedAt, scope, currentScopePeople, scopeTeamIds } = args;
  if (!/^\\d{4}-\\d{2}$/.test(monthKey)) throw new Error('Workforce output month must be YYYY-MM');
  if (!generatedAt || Number.isNaN(Date.parse(generatedAt))) throw new Error('Workforce output generatedAt must be an ISO-compatible instant');
  if (!scope.workspaceId.trim() || !scope.label.trim()) throw new Error('Workforce output scope requires workspaceId and label');

  const projection = buildWorkforceMonthlyRows({ workspace, monthKey, currentScopePeople, scopeTeamIds });
  const legendByDay = projection.days.map((day): WorkforceOutputDayLegend => ({
    isoDate: day.isoDate,
    entries: workforceLegendEntriesForDate(workspace.workforceLegendVersions, day.isoDate).map(legendForOutput),
  }));

  return {
    schema: 'orbita.workforce-output.v1',
    scope: {
      workspaceId: scope.workspaceId,
      organizationId: scope.organizationId,
      unitIds: [...scope.unitIds],
      label: scope.label,
    },
    monthKey,
    generatedAt,
    days: projection.days.map((day) => ({ ...day })),
    rows: projection.rows.map((row) => ({
      personId: row.person.id,
      displayName: row.person.displayName,
      hasUnknownStart: row.hasUnknownStart,
      cells: row.cells.map((cell) => ({
        isoDate: cell.isoDate,
        inScope: cell.inScope,
        boundaryConfidence: cell.boundaryConfidence,
        kind: cell.kind,
        token: cell.token,
        label: cell.label,
        workingDay: cell.workingDay,
      })),
    })),
    legendByDay,
    truthNotes: {
      noHolidayInvention: WORKFORCE_OUTPUT_NO_HOLIDAY_INVENTION,
      temporalMembership: 'as_of_day_with_unknown_start_preserved',
      legendResolution: 'as_of_day_append_only_versions',
    },
  };
}
`,'utf8');
console.log(JSON.stringify({state:'W6C_OUTPUT_SNAPSHOT_IMPLEMENTED_NOT_ADMITTED',owner:'src/domain/people/workforceOutputSnapshot.ts',truth:['one pure snapshot owner','reuses buildWorkforceMonthlyRows','legend resolved for every ISO day through workforceLegendEntriesForDate','scope/month/generatedAt explicit','unknown_start preserved','no holiday invention','no file or Electron IO'],notYetClaimed:['native PDF export','platform print','renderer commands','W6C PASS']},null,2));
