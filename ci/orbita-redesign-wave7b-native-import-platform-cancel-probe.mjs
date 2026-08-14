import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from './dist-electron/main/persistence/workspace/sqliteWorkspaceStore.js';
import { registerIpcHandlers } from './dist-electron/main/ipc/ipcRegistry.js';
import { createMainWindow } from './dist-electron/main/runtime/windowManager.js';

const resultPath=process.env.ORBITA_W7B_CANCEL_RESULT?path.resolve(process.env.ORBITA_W7B_CANCEL_RESULT):null;
const dbPath=process.env.ORBITA_RUNTIME_SCREENSHOT_DATABASE_PATH?path.resolve(process.env.ORBITA_RUNTIME_SCREENSHOT_DATABASE_PATH):null;
const write=(obj)=>{if(resultPath){fs.mkdirSync(path.dirname(resultPath),{recursive:true});fs.writeFileSync(resultPath,JSON.stringify(obj,null,2));}};
const fail=(message)=>{write({state:'FAIL',message});console.error(message);app.exit(1);};
function arrays(workspace){return Object.entries(workspace||{}).filter(([,v])=>Array.isArray(v)).map(([name,rows])=>({name,rows}));}
function relationCandidate(workspace){for(const {rows} of arrays(workspace))for(const row of rows){if(!row||typeof row!=='object')continue;const keys=Object.keys(row);const workKey=keys.find(k=>/^(workItemId|workId|radId)$/i.test(k));const roleKey=keys.find(k=>/^role$/i.test(k));const documentKey=keys.find(k=>/^documentId$/i.test(k));if(workKey&&roleKey&&documentKey)return {workItemId:String(row[workKey]),role:String(row[roleKey])};}return null;}
function actorIdFrom(workspace){if(Array.isArray(workspace?.people)){const p=workspace.people.find(x=>x&&typeof x.id==='string'&&x.id);if(p)return p.id;}for(const {rows} of arrays(workspace)){const r=rows.find(x=>x&&typeof x.id==='string'&&x.id&&/person|user|actor|member/i.test(Object.keys(x).join(' ')));if(r)return r.id;}return null;}
function onceLoaded(win){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('main window load timeout')),20000);if(!win.webContents.isLoading()){clearTimeout(timer);resolve();return;}win.webContents.once('did-finish-load',()=>{clearTimeout(timer);resolve();});win.webContents.once('did-fail-load',(_e,code,desc)=>{clearTimeout(timer);reject(new Error(`main window load failed ${code} ${desc}`));});});}

try{
 if(!dbPath||!fs.existsSync(dbPath))throw new Error('ORBITA_RUNTIME_SCREENSHOT_DATABASE_PATH missing');
 const db=openDemoWorkspaceDatabase(dbPath,{forceSeed:false});const workspace=readWorkspaceFromDatabase(db);db.close();
 const relation=relationCandidate(workspace);const actorId=actorIdFrom(workspace);if(!relation||!actorId)throw new Error('canonical actor/work/role truth missing');
 await app.whenReady();
 registerIpcHandlers();
 const win=createMainWindow({appPath:app.getAppPath()});
 await onceLoaded(win);
 const apiReady=await win.webContents.executeJavaScript(`typeof window.orbita?.pickAndImportNativeDocumentToWork === 'function'`,true);
 if(!apiReady)throw new Error('real preload native import method unavailable');
 write({state:'DIALOG_PENDING',actorId,workItemId:relation.workItemId,role:relation.role,apiReady:true});
 const request={actorId,workItemId:relation.workItemId,role:relation.role};
 const result=await win.webContents.executeJavaScript(`window.orbita.pickAndImportNativeDocumentToWork(${JSON.stringify(request)})`,true);
 const canceled=Boolean(result?.canceled??result?.cancelled);
 write({state:canceled?'PASS_CANCELLED':'FAIL_NOT_CANCELLED',actorId,workItemId:relation.workItemId,role:relation.role,apiReady:true,canceled,resultShape:result&&typeof result==='object'?Object.keys(result).sort():typeof result});
 win.destroy();
 app.exit(canceled?0:2);
}catch(error){fail(error instanceof Error?(error.stack||error.message):String(error));}
