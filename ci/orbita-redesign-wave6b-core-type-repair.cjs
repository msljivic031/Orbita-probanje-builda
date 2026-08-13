const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function replaceExact(file,from,to,label){const s=read(file),n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
const legend='src/domain/people/workforceLegend.ts';
let s=read(legend);
let count=0;
s=s.replace(/const latest = candidates\.at\(-1\);/g,()=>{count++;return 'const latest = candidates[candidates.length - 1];';});
s=s.replace(/const latest = allForKind\.at\(-1\);/g,()=>{count++;return 'const latest = allForKind[allForKind.length - 1];';});
if(count!==2)throw Error(`legacy-target latest repair expected 2, got ${count}`);
const mapFrom='  return DEFAULT_WORKFORCE_LEGEND.map((fallback) => {';
const mapTo='  return DEFAULT_WORKFORCE_LEGEND.map((fallback): EffectiveWorkforceLegendEntry => {';
if(!s.includes(mapFrom))throw Error('typed legend map anchor missing');
s=s.replace(mapFrom,mapTo);
write(legend,s);
const workspace='src/domain/workspace/workspaceTypes.ts';
replaceExact(workspace,'workforceLegendVersions: WorkforceLegendVersion[];','workforceLegendVersions?: WorkforceLegendVersion[];','fixture-compatible persisted legend field');
console.log(JSON.stringify({state:'W6B_CORE_TYPE_REPAIR_APPLIED',productSemanticsChanged:false,repairs:['replace Array.at for current TS target','preserve EffectiveWorkforceLegendEntry literal union','allow legacy fixtures to omit persisted legend while repository hydration supplies it'],owners:[legend,workspace]},null,2));
