const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
const legend='src/domain/people/workforceLegend.ts';
let l=read(legend);
if(!l.includes('export function workforceLegendEntriesForMonth(')){
  const anchor='export function workforceLegendEntryForDate(';
  const i=l.indexOf(anchor); if(i<0) throw new Error('workforceLegendEntryForDate anchor missing');
  const helper=`export function workforceLegendEntriesForMonth(\n  versions: WorkforceLegendVersion[] | undefined,\n  monthKey: string,\n): EffectiveWorkforceLegendEntry[] {\n  const match = /^(\\d{4})-(\\d{2})$/.exec(monthKey);\n  if (!match) throw new Error('Workforce legend month must be YYYY-MM');\n  const count = new Date(Date.UTC(Number(match[1]), Number(match[2]), 0)).getUTCDate();\n  const unique = new Map<string, EffectiveWorkforceLegendEntry>();\n  for (let day = 1; day <= count; day += 1) {\n    const isoDate = monthKey + '-' + String(day).padStart(2, '0');\n    for (const entry of workforceLegendEntriesForDate(versions, isoDate)) {\n      const key = entry.kind + '|' + entry.token + '|' + entry.name + '|' + entry.category;\n      if (!unique.has(key)) unique.set(key, entry);\n    }\n  }\n  return [...unique.values()].sort((a, b) =>\n    a.order - b.order ||\n    a.kind.localeCompare(b.kind) ||\n    (a.effectiveFrom ?? '').localeCompare(b.effectiveFrom ?? '') ||\n    a.token.localeCompare(b.token),\n  );\n}\n\n`;
  l=l.slice(0,i)+helper+l.slice(i);
}
write(legend,l);
const monthly='src/domain/people/workforceMonthlySheet.ts';
let m=read(monthly);
if(!m.includes('workforceLegendEntriesForMonth')){
  m=m.replace('workforceLegendEntryForDate, workforceLegendEntriesForDate','workforceLegendEntryForDate, workforceLegendEntriesForDate, workforceLegendEntriesForMonth');
  m=m.replace('DEFAULT_WORKFORCE_LEGEND, workforceLegendEntriesForDate }','DEFAULT_WORKFORCE_LEGEND, workforceLegendEntriesForDate, workforceLegendEntriesForMonth }');
}
write(monthly,m);
const component='src/renderer/screens/ljudi/components/LjudiWorkforceSheet.tsx';
let c=read(component);
c=c.replace('buildWorkforceMonthlyRows, workforceLegendEntriesForDate','buildWorkforceMonthlyRows, workforceLegendEntriesForMonth');
c=c.replace('workforceLegendEntriesForDate(workspace.workforceLegendVersions, `${monthKey}-01`)','workforceLegendEntriesForMonth(workspace.workforceLegendVersions, monthKey)');
const oldMap='legendEntries.slice().sort((a,b)=>a.order-b.order).map((entry) => <span key={entry.kind} data-kind={entry.kind}><b>{entry.token}</b>{entry.name}</span>)';
const newMap="legendEntries.slice().sort((a,b)=>a.order-b.order || (a.effectiveFrom ?? '').localeCompare(b.effectiveFrom ?? '')).map((entry) => <span key={entry.versionId ?? `${entry.kind}-${entry.token}-${entry.effectiveFrom ?? entry.source}`} data-kind={entry.kind} data-orbita-workforce-legend-token={entry.token} data-orbita-workforce-legend-source={entry.source} data-orbita-workforce-legend-effective-from={entry.effectiveFrom ?? ''} title={entry.effectiveFrom ? `Važi od ${new Date(entry.effectiveFrom).toLocaleDateString('sr-RS')}` : undefined}><b>{entry.token}</b>{entry.name}{entry.effectiveFrom ? ` · od ${new Date(entry.effectiveFrom).toLocaleDateString('sr-RS')}` : ''}</span>)";
const n=c.split(oldMap).length-1; if(n!==1) throw new Error(`visible Workforce legend map anchor expected 1, got ${n}`);
c=c.replace(oldMap,newMap);
c=c.replace('Legenda se razrešava po efektivnoj verziji za izabrani mesec; arhivirana verzija ne prepisuje istorijsko značenje.','Legenda prikazuje sve različite oznake i značenja koja su stvarno važila tokom izabranog meseca; istorijsko značenje se ne prepisuje.');
write(component,c);
console.log(JSON.stringify({state:'W6B_MONTH_LEGEND_REPAIR_APPLIED',owners:[legend,monthly,component],truth:['daily cells resolve as-of date','visible monthly legend includes every distinct token/name/category actually used during selected month','mid-month rename D to AV shows both meanings with effective dates','archive/fallback versions with identical visible meaning are not duplicated','visible legend exposes token/source/effective-from evidence attributes','React keys remain version-stable'],productSemanticsChanged:true,reason:'close real mid-month legend truth gap and duplicate-archive legend noise before visual admission'},null,2));
