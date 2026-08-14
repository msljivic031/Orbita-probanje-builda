const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7c-document-record-shape.json');
const typeFile=path.join(root,'src/domain/documents/documentTypes.ts');
const screenFile=path.join(root,'src/renderer/screens/dokumenti/DokumentiScreen.tsx');
if(!fs.existsSync(typeFile)||!fs.existsSync(screenFile))throw new Error('document owners missing');
const t=fs.readFileSync(typeFile,'utf8'),s=fs.readFileSync(screenFile,'utf8');
function block(name){const re=new RegExp(`(?:interface|type)\\s+${name}\\b[^\\{=]*[=]?\\s*\\{`);const m=re.exec(t);if(!m)return'';const start=t.indexOf('{',m.index);let d=0;for(let i=start;i<t.length;i++){if(t[i]==='{')d++;else if(t[i]==='}'&&--d===0)return t.slice(start+1,i);}return'';}
const b=block('DocumentRecord');if(!b)throw new Error('DocumentRecord unresolved');
const fields=[...b.matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map(m=>m[1]);
const humanCandidates=fields.filter(x=>/name|title|file|label|original/i.test(x));
const dossierAt=s.indexOf('document-dossier-head');
const region=dossierAt>=0?s.slice(Math.max(0,dossierAt-1200),Math.min(s.length,dossierAt+2200)):'';
const activeProps=[...region.matchAll(/activeDocument\.([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const docProps=[...region.matchAll(/\b(?:document|doc)\.([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const result={state:'PASS',audit:'ORBITA_W7C_DOCUMENT_RECORD_SHAPE_FORENSIC',documentRecordFields:[...new Set(fields)].sort(),humanNameCandidates:[...new Set(humanCandidates)].sort(),existingDossierActiveDocumentProperties:[...new Set(activeProps)].sort(),existingDossierDocumentProperties:[...new Set(docProps)].sort(),laws:['field names only; no source snippets','reuse existing human-name field','no type mutation']};
if(!result.humanNameCandidates.length)throw new Error('human-name candidate unresolved');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
