const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-documents-scenario-owner.json');
const scenarioFile=path.join(root,'config','inspector','scenarios.json');
if(!fs.existsSync(scenarioFile))throw new Error('inspector scenarios missing');
const doc=JSON.parse(fs.readFileSync(scenarioFile,'utf8'));
const rows=[];
function visitScenario(node){
 if(!node||typeof node!=='object')return;
 if(!Array.isArray(node)&&typeof node.id==='string'&&Array.isArray(node.steps)){
  const semantic=JSON.stringify({id:node.id,route:node.route,screen:node.screen,title:node.title,steps:node.steps});
  if(/dokumenti|documents/i.test(semantic)){
   const actions=[],selectors=[],captures=[],types=[];
   for(const step of node.steps){if(!step||typeof step!=='object')continue;types.push(step.type||'unknown');if(typeof step.selector==='string'){selectors.push(step.selector);const m=/data-orbita-action=["']([^"']+)/.exec(step.selector);if(m)actions.push(m[1]);}if(step.type==='capture'&&typeof step.label==='string')captures.push(step.label);}
   rows.push({id:node.id,required:node.required??null,route:typeof node.route==='string'?node.route:null,screen:typeof node.screen==='string'?node.screen:null,allowMutation:node.allowMutation??null,allowFormInput:node.allowFormInput??null,stepTypes:[...new Set(types)],actions:[...new Set(actions)],selectors:[...new Set(selectors)].filter(x=>/dokumenti|documents/i.test(x)),captures:[...new Set(captures)].filter(x=>/dokumenti|documents/i.test(x))});
  }
 }
 if(Array.isArray(node))node.forEach(visitScenario);else Object.values(node).forEach(visitScenario);
}
visitScenario(doc);if(!rows.length)throw new Error('no Documents scenario owner resolved');
function walk(dir){const out=[];if(!fs.existsSync(dir))return out;for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const scanRoots=[path.join(root,'config'),path.join(root,'tooling','quality')];
const files=scanRoots.flatMap(walk).filter(f=>/\.(json|mjs|cjs|js|ts)$/.test(f));
const target='documents-review-unlink';
const fileRefs=[];
function jsonPaths(node,parts=[],out=[]){if(typeof node==='string'){if(node.includes(target))out.push({path:parts.join('.'),kind:node===target?'exact-action':'contains-action'});return out;}if(!node||typeof node!=='object')return out;if(Array.isArray(node))node.forEach((v,i)=>jsonPaths(v,[...parts,String(i)],out));else Object.entries(node).forEach(([k,v])=>jsonPaths(v,[...parts,k],out));return out;}
for(const f of files){const text=fs.readFileSync(f,'utf8');const count=text.split(target).length-1;if(!count)continue;const rel=path.relative(root,f).replace(/\\/g,'/');let paths=[];if(f.endsWith('.json')){try{paths=jsonPaths(JSON.parse(text));}catch{paths=[];}}fileRefs.push({file:rel,count,jsonPaths:paths});}
if(!fileRefs.length)throw new Error('documents-review-unlink not found in inspector contracts');
const result={state:'PASS',audit:'ORBITA_W7C_DOCUMENTS_SCENARIO_OWNER_FORENSIC',scenarioCount:rows.length,scenarios:rows,reviewUnlinkContractReferences:fileRefs,laws:['semantic path/count facts only','no product mutation','no source snippets','direct scenario coverage must replace only the physically located obsolete disposition','no broad config deletion']};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
