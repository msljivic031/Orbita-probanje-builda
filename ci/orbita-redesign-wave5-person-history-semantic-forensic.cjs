const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'person-history-semantic.json');
const src=path.join(root,'src');
const files=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/.test(e.name))files.push(p)}}walk(src);
const keys=['responsibilityAssignments','ResponsibilityAssignment','WorkCompletionRecord','EffectiveResponsibilityProjection','ResponsibilityRoute','delegate','delegation','substitute','substitution','effectiveFrom','effectiveTo','endReason','businessAssigner','commandActor','availability','PersonAvailabilityEvent','TemporalTeamMembership','organization','membership'];
const inventory=[];
for(const f of files){const s=fs.readFileSync(f,'utf8');const counts={};let total=0;for(const k of keys){const n=(s.match(new RegExp(k,'gi'))||[]).length;if(n){counts[k]=n;total+=n}}if(total)inventory.push({file:path.relative(root,f).replaceAll('\\','/'),counts,total});}
inventory.sort((a,b)=>b.total-a.total||a.file.localeCompare(b.file));
const known=[
 'src/domain/work/responsibilityTypes.ts',
 'src/domain/work/temporalResponsibility.ts',
 'src/domain/people/personTypes.ts',
 'src/domain/people/temporalTeamMembership.ts',
 'src/renderer/screens/ljudi/components/LjudiPersonResponsibilityHistory.tsx',
 'src/renderer/screens/ljudi/components/LjudiTemporalResponsibilityDossier.tsx',
 'src/renderer/screens/ljudi/components/LjudiAvailabilityFoundationPanel.tsx'
];
function namesAndFields(rel){const p=path.join(root,rel);if(!fs.existsSync(p))return {missing:true};const s=fs.readFileSync(p,'utf8');const exports=[...s.matchAll(/export\s+(?:type|interface|class|function|const)\s+([A-Za-z0-9_]+)/g)].map(m=>m[1]);const interfaces=[];for(const m of s.matchAll(/(?:export\s+)?(?:type|interface)\s+([A-Za-z0-9_]+)[^{=]*(?:=\s*)?\{([\s\S]*?)\n\}/g)){const props=[...m[2].matchAll(/^\s*([A-Za-z0-9_]+)\??\s*:/gm)].map(x=>x[1]);interfaces.push({name:m[1],fields:props.slice(0,80)});}const unions=[];for(const m of s.matchAll(/(?:export\s+)?type\s+([A-Za-z0-9_]+)\s*=\s*([^;]+);/g)){const values=[...m[2].matchAll(/["']([^"']+)["']/g)].map(x=>x[1]);if(values.length)unions.push({name:m[1],values:[...new Set(values)].slice(0,80)});}const labels=[...s.matchAll(/>([^<>{}\n]{3,80})</g)].map(m=>m[1].trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(0,60);return {exports:[...new Set(exports)].slice(0,100),interfaces,unions,uiLabels:labels};}
const knownEvidence=Object.fromEntries(known.map(r=>[r,namesAndFields(r)]));
const verdict={
 currentHistoryInputs:['responsibilityAssignments','effectiveResponsibilities','workCompletionRecords'],
 physicallySignaledSemanticFamilies:{assignmentLifecycle:inventory.some(x=>x.counts.ResponsibilityAssignment&&x.counts.effectiveFrom),completion:inventory.some(x=>x.counts.WorkCompletionRecord),delegation:inventory.some(x=>x.counts.delegate||x.counts.delegation),substitution:inventory.some(x=>x.counts.substitute||x.counts.substitution),availability:inventory.some(x=>x.counts.PersonAvailabilityEvent),organizationTemporal:inventory.some(x=>x.counts.TemporalTeamMembership)},
 caution:'Keyword/type presence is not proof that every semantic event is persisted or rendered. Build timeline only from proven persisted sources.'
};
const result={audit:'ORBITA_WAVE5_PERSON_HISTORY_SEMANTIC_FORENSIC',verdict,knownEvidence,topRelevantFiles:inventory.slice(0,80)};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({verdict,unions:Object.fromEntries(Object.entries(knownEvidence).map(([k,v])=>[k,v.unions||[]])),top:inventory.slice(0,20).map(x=>x.file)},null,2));