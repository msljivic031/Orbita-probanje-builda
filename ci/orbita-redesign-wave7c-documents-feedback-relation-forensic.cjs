const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-documents-feedback-relation.json');
const file=path.join(root,'src/renderer/screens/dokumenti/DokumentiScreen.tsx');
if(!fs.existsSync(file))throw new Error('DokumentiScreen owner missing');
const s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const uniq=(xs)=>[...new Set(xs)].sort();
function body(name){
  const needles=[`function ${name}`,`const ${name} =`,`const ${name}=`,`async function ${name}`];
  let start=-1;for(const n of needles){start=s.indexOf(n);if(start>=0)break;}if(start<0)return'';
  const brace=s.indexOf('{',start);if(brace<0)return'';let depth=0,quote=null,esc=false;
  for(let i=brace;i<s.length;i++){const ch=s[i];if(quote){if(esc){esc=false;continue;}if(ch==='\\'){esc=true;continue;}if(ch===quote)quote=null;continue;}if(ch==='"'||ch==="'"||ch==='`'){quote=ch;continue;}if(ch==='{')depth++;else if(ch==='}'){depth--;if(depth===0)return s.slice(brace+1,i);}}
  return'';
}
function strings(text){return uniq([...text.matchAll(/(['"`])([^\n\r]{1,140}?)\1/g)].map(m=>m[2]).filter(v=>/dokument|fajl|rad|veza|uvoz|otvor|uspe|greš|gres|otkaz|poništ|ponist|managed|sha|važen|valid/i.test(v)));}
function setterCalls(text,setter){return uniq([...text.matchAll(new RegExp(`${setter}\\(([^;]{1,320})\\)`,'g'))].map(m=>m[1].replace(/\s+/g,' ').slice(0,280)));}
function objectFields(calls){const out=[];for(const c of calls){const m=/^\s*\{([\s\S]*)\}\s*$/.exec(c);if(!m)continue;for(const p of m[1].split(',')){const k=p.trim().split(/[:=]/)[0];if(/^[A-Za-z_$][\w$]*$/.test(k))out.push(k);}}return uniq(out);}
function actionInfo(id){const re=new RegExp(`<([A-Za-z][\\w.-]*)\\b([^>]*data-orbita-action=["']${id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}["'][^>]*)>([\\s\\S]{0,360}?)<\\/\\1>`,'g');const m=re.exec(s);if(!m)return null;const attrs=m[2],inner=m[3].replace(/<[^>]+>/g,' ').replace(/\{[^}]+\}/g,' ').replace(/\s+/g,' ').trim();const on=/onClick=\{([^}]+)\}/.exec(attrs);return {id,tag:m[1],handler:on?on[1].trim():null,label:inner.slice(0,140),disabled:/\bdisabled(?:=|\s|>)/.test(attrs)};}
const handlers=['handleImportDocument','handleOpenDocument','handleUnlinkDocument'];
const handlerFacts=Object.fromEntries(handlers.map(h=>{const b=body(h);return[h,{present:!!b,operationSetters:setterCalls(b,'setOperationState'),unlinkSetters:setterCalls(b,'setUnlinkReview'),strings:strings(b),nativeApiIdentifiers:uniq([...b.matchAll(/window\.orbita\.([A-Za-z_$][\w$]*)/g)].map(m=>m[1]))}]}));
const operationInit=/const \[operationState,\s*setOperationState\]\s*=\s*useState(?:<[^;]+?>)?\(([^;]*?)\);/.exec(s)?.[1]?.replace(/\s+/g,' ').slice(0,220)||null;
const unlinkInit=/const \[unlinkReview,\s*setUnlinkReview\]\s*=\s*useState(?:<[^;]+?>)?\(([^;]*?)\);/.exec(s)?.[1]?.replace(/\s+/g,' ').slice(0,220)||null;
const allUnlinkCalls=setterCalls(s,'setUnlinkReview');
const actions=['documents-import-native','documents-open-managed','documents-review-unlink','documents-confirm-unlink'].map(actionInfo);
const relevantCopy=strings(s);
const result={state:'PASS',audit:'ORBITA_WAVE7C_DOCUMENTS_FEEDBACK_RELATION_FORENSIC',owner:'src/renderer/screens/dokumenti/DokumentiScreen.tsx',stateShape:{operationInitializer:operationInit,unlinkInitializer:unlinkInit,unlinkFields:objectFields(allUnlinkCalls)},handlers:handlerFacts,actions,relevantCopy,laws:['semantic facts only; no source snippets','reuse operationState and unlinkReview if already present','do not add renderer file owner','unlink remains relation mutation','feedback must reflect native/repository result']};
for(const h of handlers)if(!result.handlers[h].present)throw new Error('handler unresolved '+h);
for(const a of actions)if(!a)throw new Error('action unresolved');
if(!result.handlers.handleOpenDocument.nativeApiIdentifiers.length)throw new Error('native open bridge unresolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
