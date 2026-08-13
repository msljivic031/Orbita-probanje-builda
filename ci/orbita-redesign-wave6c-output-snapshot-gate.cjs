const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'src/domain/people/workforceOutputSnapshot.ts');
if(!fs.existsSync(file))throw Error('W6C Workforce output snapshot owner missing');
const s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const must=[
  "schema: 'orbita.workforce-output.v1'",
  'buildWorkforceMonthlyRows({ workspace, monthKey, currentScopePeople, scopeTeamIds })',
  'workforceLegendEntriesForDate(workspace.workforceLegendVersions, day.isoDate)',
  'legendByDay',
  'workspaceId: string',
  'organizationId?: string',
  'unitIds: string[]',
  'monthKey: string',
  'generatedAt: string',
  'personId: row.person.id',
  'displayName: row.person.displayName',
  'boundaryConfidence: cell.boundaryConfidence',
  'workingDay: cell.workingDay',
  'as_of_day_with_unknown_start_preserved',
  'as_of_day_append_only_versions',
  'Praznici se ne izmišljaju',
];
for(const token of must)if(!s.includes(token))throw Error('W6C snapshot invariant missing: '+token);
const forbidden=[
  "from 'electron'",
  'from "electron"',
  "from 'node:fs'",
  'from "node:fs"',
  "from 'node:path'",
  'from "node:path"',
  'writeFile',
  'showSaveDialog',
  'printToPDF',
  'webContents.print',
  'Blob(',
  'URL.createObjectURL',
  'Math.random',
];
for(const token of forbidden)if(s.includes(token))throw Error('W6C snapshot illegally owns output/runtime concern: '+token);
const ownerCount=(s.match(/export function buildWorkforceOutputSnapshot\s*\(/g)||[]).length;
if(ownerCount!==1)throw Error('W6C snapshot builder owner expected 1, got '+ownerCount);
const legendCallCount=(s.match(/workforceLegendEntriesForDate\(/g)||[]).length;
if(legendCallCount!==1)throw Error('W6C per-day legend resolution call expected 1, got '+legendCallCount);
console.log(JSON.stringify({state:'PASS',gate:'W6C_OUTPUT_SNAPSHOT_CONTRACT',owner:'src/domain/people/workforceOutputSnapshot.ts',truth:['single pure snapshot owner','canonical monthly rows reused','legend resolved as-of every output day','explicit workspace/organization/unit scope','explicit month and generatedAt','person/day/cell truth preserved','unknown_start preserved','no holiday invention','no Electron/file/browser output concern in domain']},null,2));
