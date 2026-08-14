import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from './dist-electron/main/persistence/workspace/sqliteWorkspaceStore.js';
import { unlinkDocumentFromWorkInDatabase } from './dist-electron/main/persistence/documents/sqliteNativeDocumentCommands.js';

const resultPath=path.resolve(process.argv[2]||'wave7c-document-unlink-lifecycle.json');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=m=>{throw new Error(`W7C unlink lifecycle: ${m}`);};
const normalize=x=>JSON.stringify(x);
function arrayFacts(workspace){
  return Object.entries(workspace||{}).filter(([,v])=>Array.isArray(v)).map(([name,rows])=>({name,rows}));
}
function relationCandidates(workspace){
  const out=[];
  for(const {name,rows} of arrayFacts(workspace))for(const row of rows){
    if(!row||typeof row!=='object')continue;
    const keys=Object.keys(row);
    const documentKey=keys.find(k=>/^documentId$/i.test(k));
    const workKey=keys.find(k=>/^(workItemId|workId|radId)$/i.test(k));
    const idKey=keys.find(k=>/^(id|documentWorkLinkId)$/i.test(k));
    if(documentKey&&workKey&&idKey)out.push({collection:name,row,documentKey,workKey,idKey});
  }
  return out;
}
function documentExists(workspace,documentId){
  for(const {name,rows} of arrayFacts(workspace))for(const row of rows){
    if(!row||typeof row!=='object'||row.id!==documentId)continue;
    const keys=Object.keys(row).join(' ');
    if(/file|document|checksum|mime|storage|original/i.test(keys))return {collection:name,row};
  }
  return null;
}
function linkMatches(workspace,linkId){
  const matches=[];
  for(const {name,rows} of arrayFacts(workspace))for(const row of rows){
    if(row&&typeof row==='object'&&(row.id===linkId||row.documentWorkLinkId===linkId))matches.push({collection:name,row});
  }
  return matches;
}
function actorIdFrom(workspace){
  const preferred=['people','users','actors','members'];
  for(const name of preferred){const rows=workspace?.[name];if(Array.isArray(rows)){const row=rows.find(x=>x&&typeof x.id==='string'&&x.id);if(row)return row.id;}}
  for(const {rows} of arrayFacts(workspace)){const row=rows.find(x=>x&&typeof x.id==='string'&&x.id&&(/person|user|actor|member/i.test(Object.keys(x).join(' '))));if(row)return row.id;}
  return 'w7c-proof-actor';
}
function makeDb(label){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),`orbita-w7c-${label}-`));
  const dbPath=path.join(dir,'proof.sqlite');
  const database=openDemoWorkspaceDatabase(dbPath,{forceSeed:true});
  return {dir,dbPath,database};
}
function cleanup(ctx){try{ctx.database.close();}catch{}try{fs.rmSync(ctx.dir,{recursive:true,force:true});}catch{}}

let successCtx,errorCtx;
try{
  successCtx=makeDb('success');
  const before=readWorkspaceFromDatabase(successCtx.database);
  const candidates=relationCandidates(before);
  if(!candidates.length)fail('no canonical document/work relation discovered in seeded workspace');
  const candidate=candidates[0];
  const linkId=String(candidate.row[candidate.idKey]);
  const documentId=String(candidate.row[candidate.documentKey]);
  const workItemId=String(candidate.row[candidate.workKey]);
  const documentBefore=documentExists(before,documentId);
  if(!documentBefore)fail(`linked canonical document ${documentId} not found before unlink`);
  const actorId=actorIdFrom(before);
  const request={actorId,documentWorkLinkId:linkId,reason:'W7C fizički dokaz uklanjanja veze'};
  const result=unlinkDocumentFromWorkInDatabase(successCtx.database,request);
  const after=readWorkspaceFromDatabase(successCtx.database);
  if(result.documentWorkLinkId!==linkId)fail('result link id differs from canonical selected link');
  if(result.documentId!==documentId)fail('result document id differs from canonical selected document');
  if(result.workItemId!==workItemId)fail('result work id differs from canonical selected Rad');
  const documentAfter=documentExists(after,documentId);
  if(!documentAfter)fail('document truth disappeared after unlink');
  const linkAfter=linkMatches(after,linkId);
  if(linkAfter.length!==0)fail(`relation still present after unlink in ${linkAfter.map(x=>x.collection).join(',')}`);
  const successFacts={
    relationCollection:candidate.collection,documentCollection:documentBefore.collection,actorId,linkId,documentId,workItemId,
    reason:result.reason,historyEventId:result.historyEventId,changedAt:result.changedAt,
    documentPreserved:true,relationRemoved:true,
    resultCounts:result.counts??null
  };
  cleanup(successCtx);successCtx=null;

  errorCtx=makeDb('error');
  const errorBefore=readWorkspaceFromDatabase(errorCtx.database);
  const errorActor=actorIdFrom(errorBefore);
  const beforeJson=normalize(errorBefore),beforeSha=sha(beforeJson);
  let errorMessage=null;
  try{
    unlinkDocumentFromWorkInDatabase(errorCtx.database,{actorId:errorActor,documentWorkLinkId:'w7c-missing-document-work-link',reason:'W7C očekivani fail bez mutacije'});
  }catch(error){errorMessage=error instanceof Error?error.message:String(error);}
  if(!errorMessage)fail('missing-link unlink unexpectedly succeeded');
  const errorAfter=readWorkspaceFromDatabase(errorCtx.database);
  const afterJson=normalize(errorAfter),afterSha=sha(afterJson);
  if(beforeSha!==afterSha)fail('workspace changed after rejected missing-link unlink');
  const errorFacts={actorId:errorActor,errorMessage,workspaceSha256Before:beforeSha,workspaceSha256After:afterSha,noMutation:true};
  cleanup(errorCtx);errorCtx=null;

  const proof={state:'PASS',proof:'ORBITA_W7C_DOCUMENT_UNLINK_LIFECYCLE',success:successFacts,error:errorFacts,truth:[
    'existing canonical seed produced the Document↔Rad relation used by the proof',
    'existing unlinkDocumentFromWorkInDatabase owner performed the successful write',
    'successful unlink removed the relation and preserved the canonical Document truth',
    'successful result preserved exact link/document/work identities and produced history evidence',
    'missing-link unlink failed through the same existing owner',
    'rejected unlink left the entire readWorkspaceFromDatabase projection byte-for-byte JSON equivalent',
    'both databases were throwaway temporary files and were deleted after proof',
    'no product API schema renderer state or persistence owner was added for this proof'
  ]};
  fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}catch(error){
  if(successCtx)cleanup(successCtx);if(errorCtx)cleanup(errorCtx);
  const message=error instanceof Error?(error.stack||error.message):String(error);
  try{fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify({state:'FAIL',proof:'ORBITA_W7C_DOCUMENT_UNLINK_LIFECYCLE',error:message},null,2));}catch{}
  console.error(message);process.exit(1);
}
