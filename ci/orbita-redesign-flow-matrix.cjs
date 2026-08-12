const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'), out=path.resolve(process.argv[3]||'evidence/flow-matrix.json');
const src=path.join(root,'src'), scenariosPath=path.join(root,'config/inspector/scenarios.json');
const domains=['danas','radovi','kalendar','dokumenti','ljudi','izvestaji','oi','podesavanja'];
const files=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(tsx?|jsx?)$/.test(e.name))files.push(p)}}walk(src);
const rel=p=>path.relative(root,p).replaceAll('\\','/');
const scenarios=fs.existsSync(scenariosPath)?JSON.parse(fs.readFileSync(scenariosPath,'utf8')):[];const scenarioList=Array.isArray(scenarios)?scenarios:(scenarios.scenarios||[]);
const result={audit:'ORBITA_REDESIGN_FUNCTION_FLOW_MATRIX',meaning:'coverage inventory only; PASS requires runtime + human UX review',domains:{},crossCutting:{}};
for(const d of domains){const domainFiles=files.filter(p=>new RegExp(`/screens/${d}(?:/|\\.)`,'i').test('/'+rel(p)) || (d==='dokumenti'&&/\/screens\/docs\//i.test('/'+rel(p))));let actions=new Map(),buttons=0,forms=0,dialogs=0,disabled=0,errors=0,empties=0;
 for(const p of domainFiles){const s=fs.readFileSync(p,'utf8');buttons+=(s.match(/<button\b/g)||[]).length;forms+=(s.match(/<(?:form|input|select|textarea)\b/g)||[]).length;dialogs+=(s.match(/(?:modal|dialog|sheet)/gi)||[]).length;disabled+=(s.match(/\bdisabled\s*=/g)||[]).length;errors+=(s.match(/(?:error|grešk|gresk|neuspe|failed)/gi)||[]).length;empties+=(s.match(/(?:empty|prazn|nema\s)/gi)||[]).length;for(const m of s.matchAll(/data-orbita-action\s*=\s*["'`]([^"'`]+)["'`]/g)){(actions.get(m[1])??actions.set(m[1],[]).get(m[1])).push(rel(p))}}
 const sc=scenarioList.filter(x=>(x.route||'').toLowerCase()===d || (d==='dokumenti'&&(x.route||'').toLowerCase()==='dokumenti'));
 result.domains[d]={sourceFiles:domainFiles.length,buttons,formControls:forms,modalDialogSignals:dialogs,disabledStateBindings:disabled,errorRecoverySignals:errors,emptyStateSignals:empties,actionIds:[...actions.keys()].sort(),scenarioCoverage:sc.map(x=>({id:x.id,required:!!x.required,allowMutation:!!x.allowMutation,allowFormInput:!!x.allowFormInput})),provisionalClassification:sc.length?'B_CODED_WITH_RUNTIME_COVERAGE_REQUIRES_HUMAN_UX_CLOSURE':'B_CODED_WEAK_RUNTIME_COVERAGE'};
}
const crossFiles={shell:files.filter(p=>/AppShell|CommandPalette|navigation/i.test(rel(p))),preload:files.filter(p=>/preload/i.test(rel(p))),main:files.filter(p=>/^src\/main\//.test(rel(p)))};
for(const [k,arr] of Object.entries(crossFiles))result.crossCutting[k]={sourceFiles:arr.length,files:arr.map(rel).slice(0,80)};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(Object.fromEntries(Object.entries(result.domains).map(([k,v])=>[k,{files:v.sourceFiles,actions:v.actionIds.length,scenarios:v.scenarioCoverage.length,buttons:v.buttons}]))));