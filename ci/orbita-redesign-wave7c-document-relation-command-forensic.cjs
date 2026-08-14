const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-document-relation-commands.json');
const targets=[
 'src/main/persistence/documents/sqliteNativeDocumentCommands.ts',
 'src/main/persistence/repository/documentRepository.ts',
 'src/main/persistence/workspace/sqliteWorkspaceStore.ts',
 'src/main/persistence/workspace/sqliteWorkspaceReader.ts',
 'src/main/persistence/schema/sqliteSchema.ts'
];
function splitTop(raw){const parts=[];let cur='',depth=0,quote=null,esc=false;for(const ch of raw){if(quote){cur+=ch;if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote=null;continue;}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;cur+=ch;continue;}if(ch===','&&depth===0){if(cur.trim())parts.push(cur.trim());cur='';continue;}if('<({['.includes(ch))depth++;if('>)}]'.includes(ch))depth=Math.max(0,depth-1);cur+=ch;}if(cur.trim())parts.push(cur.trim());return parts;}
function exports(file){const s=fs.readFileSync(file,'utf8'),out=[];for(const m of s.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*(?:<[^>]*>\s*)?\(([^)]*)\)\s*(?::\s*([^\{\n]+))?/gs)){const name=m[1];if(!/document|link|unlink|workspace|database|open|import/i.test(name))continue;out.push({name,arity:splitTop(m[2]).length,parameters:splitTop(m[2]).map(p=>{const mm=/^(?:\.\.\.)?([A-Za-z_$][\w$]*)\??\s*(?::\s*([^=]+))?/.exec(p.trim());return {name:mm?.[1]||'unknown',type:(mm?.[2]||'unknown').trim().replace(/\s+/g,' ').slice(0,160)};}),returnType:(m[3]||'inferred').trim().replace(/\s+/g,' ').slice(0,180)});}return out;}
function typeShapes(file){const s=fs.readFileSync(file,'utf8'),rows=[];for(const m of s.matchAll(/export\s+(?:interface|type)\s+([A-Za-z_$][\w$]*)[^\{=]*[=]?\s*\{([\s\S]*?)\n\}/g)){if(!/document|link|unlink|request|result/i.test(m[1]))continue;const fields=[...m[2].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map(x=>x[1]);rows.push({name:m[1],fields:[...new Set(fields)].sort()});}return rows;}
const files=[];for(const rel of targets){const f=path.join(root,rel);if(!fs.existsSync(f))continue;files.push({path:rel,exports:exports(f),types:typeShapes(f)});}
const relationExports=files.flatMap(f=>f.exports.map(e=>({file:f.path,...e}))).filter(e=>/link|unlink.*document|document.*link/i.test(e.name));
const result={state:'PASS',audit:'ORBITA_W7C_DOCUMENT_RELATION_COMMAND_FORENSIC',files,relationExports,laws:['names/signatures/field names only; no source snippets','reuse existing relation owner','throwaway database proof only','no product API or schema addition']};
if(!relationExports.length)throw new Error('document relation exports unresolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
