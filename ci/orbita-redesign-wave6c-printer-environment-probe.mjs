import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { createWorkforceOutputWindow } from './dist-electron/main/runtime/windowManager.js';
import { createDemoDatabasePath } from './dist-electron/main/persistence/schema/sqliteSchema.js';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from './dist-electron/main/persistence/workspace/sqliteWorkspaceStore.js';
import { printCanonicalWorkforce } from './dist-electron/main/output/workforceOutputCommands.js';
const out=path.resolve(process.env.ORBITA_W6C_PRINTER_PROBE_RESULT||'w6c-printer-probe.json');
const productMode=process.env.ORBITA_W6C_PRODUCT_PRINT==='1';
const watchdog=setTimeout(()=>{try{fs.writeFileSync(out,JSON.stringify({state:'FAIL',audit:productMode?'ORBITA_W6C_PLATFORM_PRINT_RUNTIME':'ORBITA_W6C_ELECTRON_PRINTER_ENVIRONMENT',error:'watchdog'},null,2));}catch{};try{app.exit(124)}catch{};process.exit(124)},70000);
function withTimeout(promise,ms){return Promise.race([promise,new Promise((_,reject)=>setTimeout(()=>reject(new Error('print callback timeout')),ms))]);}
app.whenReady().then(async()=>{
 let win;
 try{
  if(productMode){
    const dbPath=createDemoDatabasePath();
    if(!process.env.ORBITA_RUNTIME_SCREENSHOT_DATABASE_PATH||!fs.existsSync(dbPath))throw new Error('canonical inspector database missing');
    const db=openDemoWorkspaceDatabase(dbPath,{forceSeed:false});let workspace;try{workspace=readWorkspaceFromDatabase(db)}finally{db.close()}
    const scopes=workspace.organizations.map((organization)=>({organization,people:workspace.people.filter((person)=>person.organizationId===organization.id&&!person.archivedAt),teams:workspace.organizationTeams.filter((team)=>team.organizationId===organization.id&&!team.archivedAt)})).filter((x)=>x.people.length&&x.teams.length).sort((a,b)=>(b.people.length+b.teams.length)-(a.people.length+a.teams.length));
    const scope=scopes[0];if(!scope)throw new Error('canonical print scope missing');
    const request={workspaceId:workspace.id,organizationId:scope.organization.id,unitIds:scope.teams.map((team)=>team.id),personIds:scope.people.map((person)=>person.id),scopeLabel:scope.organization.name,monthKey:'2026-08'};
    console.log(JSON.stringify({stage:'product-print-start',people:request.personIds.length,units:request.unitIds.length}));
    const result=await withTimeout(printCanonicalWorkforce(request),60000);
    const proof={state:'PASS_CALLBACK',audit:'ORBITA_W6C_PLATFORM_PRINT_RUNTIME',submitted:result.submitted,failureReason:result.failureReason??null,generatedAt:result.generatedAt,workspaceId:workspace.id,organizationId:scope.organization.id,personCount:request.personIds.length,unitCount:request.unitIds.length};
    fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(proof,null,2));console.log(JSON.stringify(proof,null,2));
  }else{
    win=await createWorkforceOutputWindow('<!doctype html><html><body><h1>ORBITA printer capability probe</h1></body></html>');
    const printers=await win.webContents.getPrintersAsync();
    const result={state:'PASS',audit:'ORBITA_W6C_ELECTRON_PRINTER_ENVIRONMENT',printerCount:printers.length,printers:printers.map((p)=>({name:p.name,displayName:p.displayName||p.name,isDefault:Boolean(p.isDefault)})),verdict:printers.length?'PRINTER_TARGET_AVAILABLE':'NO_PRINTER_TARGET_ON_HOSTED_RUNNER'};
    fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
  }
 }catch(error){const message=error instanceof Error?error.stack||error.message:String(error);fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify({state:'FAIL',audit:productMode?'ORBITA_W6C_PLATFORM_PRINT_RUNTIME':'ORBITA_W6C_ELECTRON_PRINTER_ENVIRONMENT',error:message},null,2));console.error(message);process.exitCode=1;}
 finally{clearTimeout(watchdog);if(win&&!win.isDestroyed())win.destroy();const code=process.exitCode||0;try{app.exit(code)}catch{};process.exit(code)}
}).catch((error)=>{clearTimeout(watchdog);console.error(error);try{app.exit(1)}catch{};process.exit(1)});
