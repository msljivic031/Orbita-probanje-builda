const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-unlink-request-shape.json');
const commandFile=path.join(root,'src/main/persistence/documents/sqliteNativeDocumentCommands.ts');
const typeFile=path.join(root,'src/domain/documents/documentTypes.ts');
if(!fs.existsSync(commandFile)||!fs.existsSync(typeFile))throw new Error('unlink owners missing');
const c=fs.readFileSync(commandFile,'utf8'),t=fs.readFileSync(typeFile,'utf8');
function body(name){const needle=`function ${name}`;const start=c.indexOf(needle);if(start<0)return'';const brace=c.indexOf('{',start);let d=0,q=null,esc=false;for(let i=brace;i<c.length;i++){const ch=c[i];if(q){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===q)q=null;continue;}if(ch==='"'||ch==="'"||ch==='`'){q=ch;continue;}if(ch==='{')d++;else if(ch==='}'&&--d===0)return c.slice(brace+1,i);}return'';}
function requestFields(text){const out=new Set();for(const m of text.matchAll(/\brequest\.([A-Za-z_$][\w$]*)/g))out.add(m[1]);for(const m of text.matchAll(/\b(?:const|let)\s*\{([^}]+)\}\s*=\s*request\b/g)){for(const raw of m[1].split(',')){const k=raw.trim().split(/[:=]/)[0]?.trim();if(/^[A-Za-z_$][\w$]*$/.test(k))out.add(k);}}return [...out].sort();}
function typeBlock(name){const re=new RegExp(`(?:export\\s+)?(?:interface|type)\\s+${name}\\b[^\\{=]*[=]?\\s*\\{`);const m=re.exec(c)||re.exec(t);if(!m)return'';const src=m.input,start=src.indexOf('{',m.index);let d=0;for(let i=start;i<src.length;i++){if(src[i]==='{')d++;else if(src[i]==='}'&&--d===0)return src.slice(start+1,i);}return'';}
function fields(block){return [...block.matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:\s*([^;\n]+)/gm)].map(m=>({name:m[1],type:m[2].trim().replace(/\s+/g,' ').slice(0,160)}));}
const b=body('unlinkDocumentFromWorkInDatabase');
if(!b)throw new Error('unlink body unresolved');
const req=requestFields(b);
const typeFields=fields(typeBlock('UnlinkDocumentFromWorkRequest'));
const workspaceArrays=[...t.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:\s*([^;\n]*\[\][^;\n]*)/gm)].map(m=>({name:m[1],type:m[2].trim().replace(/\s+/g,' ').slice(0,160)})).filter(x=>/document|link|work/i.test(x.name+' '+x.type));
const result={state:'PASS',audit:'ORBITA_W7C_UNLINK_REQUEST_SHAPE_FORENSIC',requestFields:req,requestTypeFields:typeFields,documentRelationArrays:workspaceArrays,laws:['field names and type names only','no source snippets','no candidate mutation','use exact request and relation fields in throwaway proof']};
if(!req.length)throw new Error('unlink request fields unresolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
