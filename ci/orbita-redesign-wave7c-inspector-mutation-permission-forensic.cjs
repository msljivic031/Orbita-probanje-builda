const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
if(!fs.existsSync(root))throw new Error('candidate root missing');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){if(['node_modules','.git','dist-renderer','dist-electron'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else if(/\.(mjs|cjs|js|ts|tsx|json)$/.test(e.name))out.push(p);}return out;}
const files=walk(root);const exact='contains mutation click without allowMutation';
const exactHits=[],allowHits=[],schemaHits=[];
const rel=p=>path.relative(root,p).replace(/\\/g,'/');
const lineOf=(text,index)=>text.slice(0,index).split(/\r?\n/).length;
for(const file of files){const text=fs.readFileSync(file,'utf8');let idx=text.indexOf(exact);if(idx>=0){exactHits.push({file:rel(file),line:lineOf(text,idx),mentionsStepAllow:/step\s*\.\s*allowMutation/.test(text),mentionsScenarioAllow:/scenario\s*\.\s*allowMutation/.test(text),mentionsAllowMutationEquality:/allowMutation\s*(?:===|!==|==|!=)/.test(text),mentionsMutationClick:/mutation.*click|click.*mutation/i.test(text),functions:[...text.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(/g)].map(m=>m[1]).slice(0,40)});}
 if(text.includes('allowMutation'))allowHits.push({file:rel(file),count:text.split('allowMutation').length-1,stepProperty:/step\s*\.\s*allowMutation/.test(text),scenarioProperty:/scenario\s*\.\s*allowMutation/.test(text),jsonProperty:/["']allowMutation["']\s*:/.test(text),typeProperty:/allowMutation\??\s*:/.test(text)});
 if(/inspector.*schema|scenario.*schema|schema.*scenario/i.test(rel(file))&&text.includes('allowMutation'))schemaHits.push({file:rel(file),count:text.split('allowMutation').length-1,typeProperty:/allowMutation\??\s*:/.test(text),allowedKeyList:/['"]allowMutation['"]/.test(text)});
}
if(exactHits.length!==1)throw new Error(`exact mutation-preflight owner expected 1, got ${exactHits.length}`);
const owner=exactHits[0];
const relevantAllow=allowHits.filter(x=>/inspector|scenario|quality|tooling|config/i.test(x.file));
const verdict={exactErrorOwner:owner.file,stepLevelExpected:owner.mentionsStepAllow,scenarioLevelExpected:owner.mentionsScenarioAllow,allowMutationPresentInSchema:schemaHits.length>0||relevantAllow.some(x=>x.typeProperty||x.allowedKeyList),candidateNeedsHarnessRepair:true,productMutationRequired:false};
console.log(JSON.stringify({state:'PASS',audit:'ORBITA_W7C_INSPECTOR_MUTATION_PERMISSION_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',exactError:exact,owner,allowMutationOwners:relevantAllow,schemaOwners:schemaHits,verdict},null,2));
