import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { createWorkforceOutputWindow } from './dist-electron/main/runtime/windowManager.js';
const out=path.resolve(process.env.ORBITA_W6C_PRINTER_PROBE_RESULT||'w6c-printer-probe.json');
const watchdog=setTimeout(()=>{try{fs.writeFileSync(out,JSON.stringify({state:'FAIL',audit:'ORBITA_W6C_ELECTRON_PRINTER_ENVIRONMENT',error:'watchdog'},null,2));}catch{};try{app.exit(124)}catch{};process.exit(124)},60000);
app.whenReady().then(async()=>{
 let win;
 try{
  win=await createWorkforceOutputWindow('<!doctype html><html><body><h1>ORBITA printer capability probe</h1></body></html>');
  const printers=await win.webContents.getPrintersAsync();
  const result={state:'PASS',audit:'ORBITA_W6C_ELECTRON_PRINTER_ENVIRONMENT',printerCount:printers.length,printers:printers.map((p)=>({name:p.name,displayName:p.displayName||p.name,isDefault:Boolean(p.isDefault)})),verdict:printers.length?'PRINTER_TARGET_AVAILABLE':'NO_PRINTER_TARGET_ON_HOSTED_RUNNER'};
  fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }catch(error){const message=error instanceof Error?error.message:String(error);fs.writeFileSync(out,JSON.stringify({state:'FAIL',audit:'ORBITA_W6C_ELECTRON_PRINTER_ENVIRONMENT',error:message},null,2));console.error(message);process.exitCode=1;}
 finally{clearTimeout(watchdog);if(win&&!win.isDestroyed())win.destroy();const code=process.exitCode||0;try{app.exit(code)}catch{};process.exit(code)}
}).catch((error)=>{clearTimeout(watchdog);console.error(error);try{app.exit(1)}catch{};process.exit(1)});
