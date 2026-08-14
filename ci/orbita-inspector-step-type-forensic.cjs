const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'inspector-step-types.json');
const file=path.join(root,'tooling','inspector','visual-runtime-inspector.mjs');
if(!fs.existsSync(file))throw new Error('visual inspector owner missing');
const s=fs.readFileSync(file,'utf8');
const types=new Set();
for(const re of [
 /step\.type\s*===\s*['"`]([^'"`]+)['"`]/g,
 /step\.type\s*!==\s*['"`]([^'"`]+)['"`]/g,
 /case\s+['"`]([^'"`]+)['"`]\s*:/g
])for(const m of s.matchAll(re))types.add(m[1]);
const fields=new Set();
for(const m of s.matchAll(/\bstep\.([A-Za-z_$][\w$]*)/g))fields.add(m[1]);
const inputSignals={
 hasInputLikeType:[...types].some(x=>/input|fill|type|change|set/i.test(x)),
 inputLikeTypes:[...types].filter(x=>/input|fill|type|change|set/i.test(x)).sort(),
 textFields:[...fields].filter(x=>/value|text|input|key|fill|content/i.test(x)).sort(),
 selectorField:fields.has('selector')
};
const result={state:'PASS',audit:'ORBITA_INSPECTOR_STEP_TYPE_FORENSIC',stepTypes:[...types].sort(),stepFields:[...fields].sort(),inputSignals,laws:['semantic identifiers only; no source snippets','no candidate mutation','reuse existing authored step type when adding recovery proof']};
if(!result.stepTypes.length)throw new Error('step types unresolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
