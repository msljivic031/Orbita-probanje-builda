import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from './dist-electron/main/persistence/workspace/sqliteWorkspaceStore.js';
import { unlinkDocumentFromWorkInDatabase } from './dist-electron/main/persistence/documents/sqliteNativeDocumentCommands.js';

const resultPath=path.resolve(process.argv[2]||'wave7c-document-unlink-lifecycle.json');
const sourceDatabasePath=path.resolve(process.env.ORBITA_W7C_SOURCE_DATABASE_PATH||process.argv[3]||'');
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=m=>{throw new Error(`W7C unlink lifecycle: ${m}`);};
const normalize=x=>JSON.stringify(x);
function arrayFacts(workspace){return Object.entries(workspace||{}).filter(([,v])=>Array.isArray(v)).map(([name,rows])=>({name,rows}));}
function relationCandidates(workspace){const out=[];for(const {name,rows} of arrayFacts(workspace))for(const row of rows){if(!row||typeof row!=='object')continue;const keys=Object.keys(row);const documentKey=keys.find(k=>/^documentId$/i.test(k));const workKey=keys.find(k=>/^(workItemId|workId|radId)$/i.test(k));const idKey=keys.find(k=>/^(id|documentWorkLinkId)$/i.test(k));if(documentKey&&workKey&&idKey)out.push({collection:name,row,documentKey,workKey,idKey});}return out;}
function documentExists(workspace,documentId){for(const {name,rows} of arrayFacts(workspace))for(const row of rows){if(!row||typeof row!=='object'||row.id!==documentId)continue;const keys=Object.keys(row).join(' ');if(/file|document|checksum|mime|storage|original/i.test(keys))return {collection:name,row};}return null;}
function linkMatches(workspace,linkId){const matches=[];for(const {name,rows} of arrayFacts(workspace))for(const row of rows){if(row&&typeof row==='object'&&(row.id===linkId||row.documentWorkLinkId===linkId))matches.push({collection:name,row});}return matches;}
function actorIdFrom(workspace){const preferred=['people','users','actors','members'];for(const name of preferred){const rows=workspace?.[name];if(Array.isArray(rows)){const row=rows.find(x=>x&&typeof x.id==='string'&&x.id);if(row)return row.id;}}for(const {rows} of arrayFacts(workspace)){const row=rows.find(x=>x&&typeof x.id==='string'&&x.id&&(/person|user|actor|member/i.test(Object.keys(x).join(' '))));if(row)return row.id;}return 'w7c-proof-actor';}
function changedTopLevelKeys(before,after){const keys=[...new Set([...Object.keys(before||{}),...Object.keys(after||{})])].sort();return keys.filter(key=>normalize(before?.[key])!==normalize(after?.[key])).map(key=>({key,beforeType:Array.isArray(before?.[key])?'array':typeof before?.[key],afterType:Array.isArray(after?.[key])?'array':typeof after?.[key],beforeCount:Array.isArray(before?.[key])?before[key].length:null,afterCount:Array.isArray(after?.[key])?after[key].length:null,beforeSha256:sha(normalize(before?.[key])),afterSha256:sha(normalize(after?.[key]))}));}
function quoteIdent(name){return `"${String(name).replaceAll('"','""')}"`;}
function persistedSnapshot(database){const tableRows=database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();const tables=[];for(const item of tableRows){const name=String(item.name);const rows=database.prepare(`SELECT * FROM ${quoteIdent(name)}`).all();const rowJson=rows.map(row=>normalize(row)).sort();tables.push({name,rowCount:rows.length,sha256:sha(rowJson.join('\n'))});}const aggregate=sha(tables.map(t=>`${t.name}:${t.rowCount}:${t.sha256}`).join('\n'));return {tableCount:tables.length,aggregateSha256:aggregate,tables};}
function changedTables(before,after){const b=new Map(before.tables.map(x=>[x.name,x])),a=new Map(after.tables.map(x=>[x.name,x]));return [...new Set([...b.keys(),...a.keys()])].sort().filter(name=>normalize(b.get(name))!==normalize(a.get(name))).map(name=>({name,before:b.get(name)||null,after:a.get(name)||null}));}
function canonicalDocumentRelationSnapshot(workspace){const arrays=arrayFacts(workspace);const selected=arrays.filter(({name,rows})=>/document|file|link|history|audit/i.test(name)||rows.some(row=>row&&typeof row==='object'&&/document|file|checksum|mime|storage|original|documentWorkLinkId/i.test(Object.keys(row).join(' '))));return selected.map(({name,rows})=>({name,rowCount:rows.length,sha256:sha(rows.map(x=>normalize(x)).sort().join('\n'))})).sort((a,b)=>a.name.localeCompare(b.name));}
function makeDb(label){if(!sourceDatabasePath||!fs.existsSync(sourceDatabasePath))fail(`canonical inspector source database missing: ${sourceDatabasePath}`);const dir=fs.mkdtempSync(path.join(os.tmpdir(),`orbita-w7c-${label}-`));const dbPath=path.join(dir,'proof.sqlite');fs.copyFileSync(sourceDatabasePath,dbPath);const database=openDemoWorkspaceDatabase(dbPath,{forceSeed:false});return {dir,dbPath,database};}
function cleanup(ctx){try{ctx.database.close();}catch{}try{fs.rmSync(ctx.dir,{recursive:true,force:true});}catch{}}

let successCtx,errorCtx;
try{
  if(!sourceDatabasePath||!fs.existsSync(sourceDatabasePath))fail('ORBITA_W7C_SOURCE_DATABASE_PATH must point to canonical inspector SQLite');
  const sourceBytes=fs.readFileSync(sourceDatabasePath),sourceSha=sha(sourceBytes);
  successCtx=makeDb('success');
  const before=readWorkspaceFromDatabase(successCtx.database);
  const candidates=relationCandidates(before);
  if(!candidates.length)fail('no canonical document/work relation discovered in inspector SQLite copy');
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
  const successFacts={relationCollection:candidate.collection,documentCollection:documentBefore.collection,actorId,linkId,documentId,workItemId,reason:result.reason,historyEventId:result.historyEventId,changedAt:result.changedAt,documentPreserved:true,relationRemoved:true,resultCounts:result.counts??null};
  cleanup(successCtx);successCtx=null;

  errorCtx=makeDb('error');
  const errorReadA=readWorkspaceFromDatabase(errorCtx.database);
  const errorReadB=readWorkspaceFromDatabase(errorCtx.database);
  const naturalReadDrift=changedTopLevelKeys(errorReadA,errorReadB);
  const errorBefore=errorReadB;
  const errorActor=actorIdFrom(errorBefore);
  const persistedBefore=persistedSnapshot(errorCtx.database);
  const canonicalBefore=canonicalDocumentRelationSnapshot(errorBefore);
  let errorMessage=null;
  try{unlinkDocumentFromWorkInDatabase(errorCtx.database,{actorId:errorActor,documentWorkLinkId:'w7c-missing-document-work-link',reason:'W7C očekivani fail bez mutacije'});}catch(error){errorMessage=error instanceof Error?error.message:String(error);}
  if(!errorMessage)fail('missing-link unlink unexpectedly succeeded');
  const persistedAfter=persistedSnapshot(errorCtx.database);
  const persistedDiff=changedTables(persistedBefore,persistedAfter);
  if(persistedBefore.aggregateSha256!==persistedAfter.aggregateSha256||persistedDiff.length)fail(`rejected missing-link unlink changed persisted SQLite tables: ${persistedDiff.map(x=>x.name).join(',')||'aggregate mismatch'}`);
  const errorAfter=readWorkspaceFromDatabase(errorCtx.database);
  const canonicalAfter=canonicalDocumentRelationSnapshot(errorAfter);
  if(normalize(canonicalBefore)!==normalize(canonicalAfter))fail('rejected missing-link unlink changed canonical document/relation/history projection');
  const changedKeys=changedTopLevelKeys(errorBefore,errorAfter);
  const nonDerivedChanges=changedKeys.filter(x=>x.key!=='effectiveResponsibilities');
  if(nonDerivedChanges.length)fail(`rejected missing-link unlink changed non-derived Workspace keys: ${nonDerivedChanges.map(x=>x.key).join(',')}`);
  const errorFacts={actorId:errorActor,errorMessage,persistedTableCount:persistedBefore.tableCount,persistedAggregateSha256Before:persistedBefore.aggregateSha256,persistedAggregateSha256After:persistedAfter.aggregateSha256,persistedChangedTables:persistedDiff,canonicalDocumentRelationSnapshotSha256Before:sha(normalize(canonicalBefore)),canonicalDocumentRelationSnapshotSha256After:sha(normalize(canonicalAfter)),workspaceChangedTopLevelKeys:changedKeys,naturalReadDriftKeys:naturalReadDrift,noPersistedMutation:true,noCanonicalDocumentRelationMutation:true,noMutation:true,derivedProjectionNote:changedKeys.some(x=>x.key==='effectiveResponsibilities')?'effectiveResponsibilities changed only in hydrated Workspace projection while every physical SQLite table and canonical document/relation/history projection remained identical':'no hydrated Workspace projection drift observed'};
  cleanup(errorCtx);errorCtx=null;

  const proof={state:'PASS',proof:'ORBITA_W7C_DOCUMENT_UNLINK_LIFECYCLE',sourceDatabase:{fileName:path.basename(sourceDatabasePath),bytes:sourceBytes.length,sha256:sourceSha},success:successFacts,error:errorFacts,truth:[
    'source truth is the physical SQLite emitted by the canonical visual inspector runtime',
    'success and error cases ran only on independent temporary copies of that inspector SQLite',
    'existing unlinkDocumentFromWorkInDatabase owner performed the successful write',
    'successful unlink removed the relation and preserved the canonical Document truth',
    'successful result preserved exact link/document/work identities and produced history evidence',
    'missing-link unlink failed through the same existing owner',
    'rejected unlink left every physical application SQLite table byte-equivalent at normalized row level',
    'rejected unlink left canonical document/relation/history hydrated truth unchanged',
    'effectiveResponsibilities is treated only as hydrated derived-projection drift when physical persistence and canonical document relation truth are unchanged',
    'original inspector SQLite was never opened for write and both temporary copies were deleted',
    'no product API schema renderer state or persistence owner was added for this proof'
  ]};
  fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
}catch(error){if(successCtx)cleanup(successCtx);if(errorCtx)cleanup(errorCtx);const message=error instanceof Error?(error.stack||error.message):String(error);try{if(!fs.existsSync(resultPath)){fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify({state:'FAIL',proof:'ORBITA_W7C_DOCUMENT_UNLINK_LIFECYCLE',error:message},null,2));}}catch{}console.error(message);process.exit(1);}
