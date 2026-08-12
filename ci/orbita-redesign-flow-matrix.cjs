const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'), out=path.resolve(process.argv[3]||'evidence/flow-matrix.json');
const src=path.join(root,'src');
const domains=['danas','radovi','kalendar','dokumenti','ljudi','izvestaji','oi','podesavanja'];
const canonical={
  danas:['today-open-work-dossier','today-calendar-transition'],
  radovi:['radovi-full-dossier-all-tabs-return','new-work-all-sections-form-validity-no-commit','new-work-commit-dossier-reload-reopen','new-work-modal-usability-validation-and-feedback','dossier-operational-tab-composers-no-mutation','subwork-network-intent-review-no-mutation'],
  kalendar:['calendar-previous-period','calendar-selected-day-create-and-dossier-no-mutation'],
  dokumenti:['documents-select-document','documents-library-operational-closure-no-native-dialog'],
  ljudi:['people-open-availability-surface','people-availability-period-validation-and-layout','people-select-person'],
  izvestaji:['reports-current-period'],
  oi:['oi-open-dossier'],
  podesavanja:['settings-appearance']
};
const files=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){if(['node_modules','dist','build','out','.git'].includes(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(tsx?|jsx?|mjs|cjs|json)$/.test(e.name))files.push(p)}}walk(root);
const sourceFiles=files.filter(p=>p.startsWith(src)); const rel=p=>path.relative(root,p).replaceAll('\\','/');
const textCache=new Map(); const text=p=>{if(!textCache.has(p))textCache.set(p,fs.readFileSync(p,'utf8'));return textCache.get(p)};
const scenarioHits={};for(const [domain,ids] of Object.entries(canonical)){scenarioHits[domain]=ids.map(id=>{const hits=files.filter(p=>text(p).includes(id)).map(rel);return {id,sourceHits:hits,physicallyReferenced:hits.length>0,required:true}})}
const result={audit:'ORBITA_REDESIGN_FUNCTION_FLOW_MATRIX_V2',meaning:'coverage inventory only; canonical scenario IDs are physically verified in current candidate source/tooling; runtime PASS and human UX closure remain separate gates',domains:{},crossCutting:{},scenarioTruth:{expectedCanonicalCount:Object.values(canonical).flat().length,physicallyReferencedCanonicalCount:0}};
for(const d of domains){const domainFiles=sourceFiles.filter(p=>new RegExp(`/screens/${d}(?:/|\\.)`,'i').test('/'+rel(p)) || (d==='dokumenti'&&/\/screens\/docs\//i.test('/'+rel(p))));let actions=new Map(),buttons=0,forms=0,dialogs=0,disabled=0,errors=0,empties=0;
 for(const p of domainFiles){const s=text(p);buttons+=(s.match(/<button\b/g)||[]).length;forms+=(s.match(/<(?:form|input|select|textarea)\b/g)||[]).length;dialogs+=(s.match(/(?:modal|dialog|sheet)/gi)||[]).length;disabled+=(s.match(/\bdisabled\s*=/g)||[]).length;errors+=(s.match(/(?:error|grešk|gresk|neuspe|failed)/gi)||[]).length;empties+=(s.match(/(?:empty|prazn|nema\s)/gi)||[]).length;for(const m of s.matchAll(/data-orbita-action\s*=\s*["'`]([^"'`]+)["'`]/g)){(actions.get(m[1])??actions.set(m[1],[]).get(m[1])).push(rel(p))}}
 const sc=scenarioHits[d]||[]; result.scenarioTruth.physicallyReferencedCanonicalCount+=sc.filter(x=>x.physicallyReferenced).length;
 result.domains[d]={sourceFiles:domainFiles.length,buttons,formControls:forms,modalDialogSignals:dialogs,disabledStateBindings:disabled,errorRecoverySignals:errors,emptyStateSignals:empties,actionIds:[...actions.keys()].sort(),scenarioCoverage:sc,provisionalClassification:sc.length&&sc.every(x=>x.physicallyReferenced)?'B_CODED_WITH_CANONICAL_RUNTIME_SCENARIO_REFERENCES_REQUIRES_HUMAN_UX_CLOSURE':'B_CODED_SCENARIO_REFERENCE_GAP_REQUIRES_REVIEW'};
}
const crossFiles={shell:sourceFiles.filter(p=>/AppShell|CommandPalette|navigation/i.test(rel(p))),preload:sourceFiles.filter(p=>/preload/i.test(rel(p))),main:sourceFiles.filter(p=>/^src\/main\//.test(rel(p)))};
for(const [k,arr] of Object.entries(crossFiles))result.crossCutting[k]={sourceFiles:arr.length,files:arr.map(rel).slice(0,120)};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify({scenarioTruth:result.scenarioTruth,domains:Object.fromEntries(Object.entries(result.domains).map(([k,v])=>[k,{files:v.sourceFiles,actions:v.actionIds.length,scenarios:v.scenarioCoverage.length,physicallyReferenced:v.scenarioCoverage.filter(x=>x.physicallyReferenced).length,buttons:v.buttons}]))}));