const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-documents-scenario-owner.json');
const file=path.join(root,'config','inspector','scenarios.json');
if(!fs.existsSync(file))throw new Error('inspector scenarios missing');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
const rows=[];
function visit(node){
 if(!node||typeof node!=='object')return;
 if(!Array.isArray(node)&&typeof node.id==='string'&&Array.isArray(node.steps)){
  const semantic=JSON.stringify({id:node.id,route:node.route,screen:node.screen,title:node.title,steps:node.steps});
  if(/dokumenti|documents/i.test(semantic)){
   const actions=[],selectors=[],captures=[],types=[];
   for(const step of node.steps){if(!step||typeof step!=='object')continue;types.push(step.type||'unknown');if(typeof step.selector==='string'){selectors.push(step.selector);const m=/data-orbita-action=["']([^"']+)/.exec(step.selector);if(m)actions.push(m[1]);}if(step.type==='capture'&&typeof step.label==='string')captures.push(step.label);}
   rows.push({id:node.id,required:node.required??null,route:typeof node.route==='string'?node.route:null,screen:typeof node.screen==='string'?node.screen:null,allowMutation:node.allowMutation??null,allowFormInput:node.allowFormInput??null,stepTypes:[...new Set(types)],actions:[...new Set(actions)],selectors:[...new Set(selectors)].filter(x=>/dokumenti|documents/i.test(x)),captures:[...new Set(captures)].filter(x=>/dokumenti|documents/i.test(x))});
  }
 }
 if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit);
}
visit(doc);
if(!rows.length)throw new Error('no Documents scenario owner resolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({state:'PASS',audit:'ORBITA_W7C_DOCUMENTS_SCENARIO_OWNER_FORENSIC',scenarioCount:rows.length,scenarios:rows,laws:['semantic scenario facts only','no product mutation','no source snippets','extend a physically proven canonical Documents scenario only']},null,2));
console.log(JSON.stringify({state:'PASS',scenarioCount:rows.length,scenarios:rows},null,2));
