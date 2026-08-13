const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');

const legendFile=path.join(root,'src/renderer/screens/podesavanja/WorkforceLegendSettings.tsx');
let legend=fs.readFileSync(legendFile,'utf8').replace(/\r\n/g,'\n');
const rowFrom='<article className="settings-rule-row" key={entry.kind} data-orbita-workforce-legend-kind={entry.kind}>';
const rowTo='<article className="settings-rule-row" key={entry.kind} data-orbita-workforce-legend-kind={entry.kind} data-orbita-workforce-legend-token={entry.token} data-orbita-workforce-legend-source={entry.source} data-orbita-workforce-legend-effective-from={entry.effectiveFrom ?? \'\'}>';
if(!legend.includes(rowTo)){
  const n=legend.split(rowFrom).length-1;
  if(n!==1)throw Error(`Settings legend evidence row anchor expected 1, got ${n}`);
  legend=legend.replace(rowFrom,rowTo);
}
fs.writeFileSync(legendFile,legend,'utf8');

const settingsFile=path.join(root,'src/renderer/screens/podesavanja/PodesavanjaScreen.tsx');
let settings=fs.readFileSync(settingsFile,'utf8').replace(/\r\n/g,'\n');
const sectionEvidence='data-orbita-settings-section={section.id}';
if(!settings.includes(sectionEvidence)){
  const clickAnchor='onClick={() => setActiveSection(section.id)}';
  const n=settings.split(clickAnchor).length-1;
  if(n!==1)throw Error(`Settings section navigation owner expected 1, got ${n}`);
  settings=settings.replace(clickAnchor,`${sectionEvidence} ${clickAnchor}`);
}
fs.writeFileSync(settingsFile,settings,'utf8');

console.log(JSON.stringify({state:'W6B_SETTINGS_EVIDENCE_REPAIR_APPLIED',owners:['src/renderer/screens/podesavanja/WorkforceLegendSettings.tsx','src/renderer/screens/podesavanja/PodesavanjaScreen.tsx'],productSemanticsChanged:false,evidenceAttributes:['kind','token','source','effective-from','settings-section'],truth:'Settings section navigation is selected by stable semantic section id, never by dynamic version-count text.'},null,2));
