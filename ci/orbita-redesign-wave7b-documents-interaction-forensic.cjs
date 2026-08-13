const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const out=path.resolve(process.argv[3]||'wave7b-documents-interaction-forensic.json');
const file=path.join(root,'src','renderer','screens','dokumenti','DokumentiScreen.tsx');
if(!fs.existsSync(file))throw new Error('DokumentiScreen owner missing');
const s=fs.readFileSync(file,'utf8');
const names=[...s.matchAll(/\b(?:const|function)\s+([A-Za-z_$][\w$]*(?:Import|Document|Link|Unlink|Managed|Folder|Search|Open|Selected)[\w$]*)/g)].map(m=>m[1]);
const states=[...s.matchAll(/const\s*\[\s*([A-Za-z_$][\w$]*)\s*,\s*([A-Za-z_$][\w$]*)\s*\]\s*=\s*useState/g)].map(m=>({value:m[1],setter:m[2]})).filter(x=>/(import|document|folder|search|selected|link|valid|role)/i.test(x.value+x.setter));
const actions=[...s.matchAll(/data-orbita-action=["'`]([^"'`]+)["'`]/g)].map(m=>m[1]);
const aria=[...s.matchAll(/aria-label=["'`]([^"'`]+)["'`]/g)].map(m=>m[1]).filter(x=>/(dokument|fajl|folder|rad|važen|uloga|pretra)/i.test(x));
const result={
 state:'PASS',audit:'ORBITA_WAVE7B_DOCUMENTS_INTERACTION_FORENSIC',owner:'src/renderer/screens/dokumenti/DokumentiScreen.tsx',
 stateHooks:states,
 interactionIdentifiers:[...new Set(names)].sort(),
 canonicalActions:[...new Set(actions)].sort(),
 relevantAriaLabels:[...new Set(aria)].sort(),
 structuralSignals:{
  importWorkflowClass:(s.match(/documents-import-workflow/g)||[]).length,
  importFieldsClass:(s.match(/documents-import-fields/g)||[]).length,
  importActionsClass:(s.match(/documents-import-actions/g)||[]).length,
  selectedDocumentReferences:(s.match(/selectedDocument/g)||[]).length,
  nativeImportAction:(s.match(/documents-import-native/g)||[]).length,
  managedOpenAction:(s.match(/documents-open-managed/g)||[]).length,
  unlinkReviewAction:(s.match(/documents-review-unlink/g)||[]).length,
  directBlobPaths:(s.match(/new Blob|URL\.createObjectURL|download=/g)||[]).length
 },
 laws:['semantic identifier evidence only; no source snippets','existing state/handlers must be reused','progressive import may change presentation but not native command ownership','link/unlink remains relation review']
};
if(result.structuralSignals.importWorkflowClass!==1)throw new Error('import workflow owner count');
if(result.structuralSignals.nativeImportAction!==1)throw new Error('native import action owner count');
if(result.structuralSignals.managedOpenAction!==1)throw new Error('managed open action owner count');
if(result.structuralSignals.unlinkReviewAction!==1)throw new Error('unlink review action owner count');
if(result.structuralSignals.directBlobPaths!==0)throw new Error('renderer fake file path detected');
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
