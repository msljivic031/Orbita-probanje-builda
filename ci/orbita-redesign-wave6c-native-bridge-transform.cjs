const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>{const p=path.join(root,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r\n/g,'\n'),'utf8');};
function balancedEnd(s,start,open='{',close='}') { let d=0,q=null,e=false; for(let i=start;i<s.length;i++){const c=s[i];if(q){if(e)e=false;else if(c==='\\')e=true;else if(c===q)q=null;continue}if(c==='"'||c==="'"||c==='`'){q=c;continue}if(c===open)d++;else if(c===close&&--d===0)return i;} return -1; }

const contract='src/shared/contracts/output/workforceOutputTypes.ts';
write(contract,`export type WorkforceOutputRequest = {
  workspaceId: string;
  organizationId?: string;
  unitIds: string[];
  personIds: string[];
  scopeLabel: string;
  monthKey: string;
};

export type WorkforcePdfExportBridgeResult =
  | { status: 'cancelled' }
  | { status: 'saved'; fileName: string; bytes: number; sha256: string; generatedAt: string };

export type WorkforcePrintBridgeResult = {
  status: 'submitted' | 'failed';
  generatedAt: string;
  failureReason?: string;
};
`);

const command='src/main/output/workforceOutputCommands.ts';
write(command,`import type { Workspace } from '../../domain/workspace/workspaceTypes.js';
import type { WorkforceOutputRequest } from '../../shared/contracts/output/workforceOutputTypes.js';
import { buildWorkforceOutputSnapshot } from '../../domain/people/workforceOutputSnapshot.js';
import { createDemoDatabasePath } from '../persistence/schema/sqliteSchema.js';
import { openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from '../persistence/workspace/sqliteWorkspaceStore.js';
import { exportWorkforceSnapshotPdfToPath, printWorkforceSnapshot } from './workforceOutputService.js';

function cleanId(value: string, label: string): string {
  const clean=String(value??'').trim();
  if(!clean||clean.length>200) throw new Error('Invalid Workforce output '+label);
  return clean;
}
function cleanIds(values: string[], label: string): string[] {
  if(!Array.isArray(values)||values.length>5000) throw new Error('Invalid Workforce output '+label);
  const clean=values.map((value)=>cleanId(value,label));
  if(new Set(clean).size!==clean.length) throw new Error('Duplicate Workforce output '+label);
  return clean;
}
function normalizeRequest(request: WorkforceOutputRequest): WorkforceOutputRequest {
  if(!request||typeof request!=='object') throw new Error('Workforce output request is required');
  const monthKey=String(request.monthKey??'').trim();
  if(!/^\\d{4}-\\d{2}$/.test(monthKey)) throw new Error('Invalid Workforce output monthKey');
  const scopeLabel=String(request.scopeLabel??'').trim();
  if(!scopeLabel||scopeLabel.length>240) throw new Error('Invalid Workforce output scopeLabel');
  return {
    workspaceId:cleanId(request.workspaceId,'workspaceId'),
    organizationId:request.organizationId==null?undefined:cleanId(request.organizationId,'organizationId'),
    unitIds:cleanIds(request.unitIds,'unitIds'),
    personIds:cleanIds(request.personIds,'personIds'),
    scopeLabel,
    monthKey,
  };
}
function assertReferences(workspace: Workspace, request: WorkforceOutputRequest) {
  if(workspace.id!==request.workspaceId) throw new Error('Workforce output workspaceId does not match canonical workspace');
  const peopleById=new Map(workspace.people.map((person)=>[person.id,person]));
  const teamsById=new Map(workspace.organizationTeams.map((team)=>[team.id,team]));
  const organizationsById=new Map(workspace.organizations.map((organization)=>[organization.id,organization]));
  for(const id of request.personIds) if(!peopleById.has(id)) throw new Error('Unknown Workforce output personId: '+id);
  for(const id of request.unitIds) if(!teamsById.has(id)) throw new Error('Unknown Workforce output unitId: '+id);
  if(request.organizationId&&!organizationsById.has(request.organizationId)) throw new Error('Unknown Workforce output organizationId: '+request.organizationId);
  return { currentScopePeople:request.personIds.map((id)=>peopleById.get(id)!), scopeTeamIds:[...request.unitIds] };
}
function canonicalSnapshot(requestInput: WorkforceOutputRequest) {
  const request=normalizeRequest(requestInput);
  const database=openDemoWorkspaceDatabase(createDemoDatabasePath(),{forceSeed:false});
  try {
    const workspace=readWorkspaceFromDatabase(database);
    const scope=assertReferences(workspace,request);
    const generatedAt=new Date().toISOString();
    const snapshot=buildWorkforceOutputSnapshot({workspace,monthKey:request.monthKey,generatedAt,scope:{workspaceId:workspace.id,organizationId:request.organizationId,unitIds:[...request.unitIds],label:request.scopeLabel},currentScopePeople:scope.currentScopePeople,scopeTeamIds:scope.scopeTeamIds});
    return {snapshot,generatedAt};
  } finally { database.close(); }
}
export async function exportCanonicalWorkforcePdf(request: WorkforceOutputRequest, targetPath: string) {
  const {snapshot,generatedAt}=canonicalSnapshot(request);
  const output=await exportWorkforceSnapshotPdfToPath(snapshot,targetPath);
  return {...output,generatedAt};
}
export async function printCanonicalWorkforce(request: WorkforceOutputRequest) {
  const {snapshot,generatedAt}=canonicalSnapshot(request);
  const output=await printWorkforceSnapshot(snapshot);
  return {...output,generatedAt};
}
`);

const allow='src/shared/security/channelAllowlist.ts';let al=read(allow);
for(const channel of ['orbita:exportWorkforcePdf','orbita:printWorkforce'])if(!al.includes(`'${channel}'`)){
  const anchor="  'orbita:updateWorkforceLegend',";if(!al.includes(anchor))throw Error('W6C allowlist anchor missing');
  al=al.replace(anchor,anchor+`\n  '${channel}',`);
}
write(allow,al);

const access='src/shared/security/accessPolicy.ts';let ap=read(access);
for(const channel of ['orbita:exportWorkforcePdf','orbita:printWorkforce'])if(!ap.includes(`'${channel}'`)){
  const m=/(['"])orbita:getDemoWorkspace\1\s*:\s*\{/.exec(ap);if(!m)throw Error('accessPolicy getDemoWorkspace rule missing');
  const brace=ap.indexOf('{',m.index+m[0].length-1),end=balancedEnd(ap,brace);if(end<0)throw Error('accessPolicy workspace read rule unbalanced');
  const rule=ap.slice(brace,end+1);let at=end+1;while(/[\s]/.test(ap[at]||''))at++;if(ap[at]===',')at++;
  const indent=(ap.slice(ap.lastIndexOf('\n',m.index)+1,m.index).match(/^\s*/)||[''])[0];
  ap=ap.slice(0,at)+`\n${indent}'${channel}': ${rule},`+ap.slice(at);
}
write(access,ap);

const critical='src/main/security/ipcCriticalFieldValidationPolicy.ts';let cv=read(critical);
for(const channel of ['orbita:exportWorkforcePdf','orbita:printWorkforce'])if(!cv.includes(`'${channel}'`)){
  const m=/const\s+CRITICAL_FIELD_VALIDATORS[^=]*=\s*\{/.exec(cv);if(!m)throw Error('critical validator map missing');
  const brace=cv.indexOf('{',m.index),end=balancedEnd(cv,brace);if(end<0)throw Error('critical validator map unbalanced');
  const entry=`  '${channel}': (request: RequestRecord) => {\n    const workspaceId=request['workspaceId'], organizationId=request['organizationId'], unitIds=request['unitIds'], personIds=request['personIds'], scopeLabel=request['scopeLabel'], monthKey=request['monthKey'];\n    const ids=(value: unknown, label: string) => { if(!Array.isArray(value)||value.length>5000||value.some((item)=>typeof item!=='string'||!item.trim()||item.trim().length>200)||new Set(value).size!==value.length) throw new Error('Invalid ${channel} '+label); };\n    if(typeof workspaceId!=='string'||!workspaceId.trim()||workspaceId.trim().length>200) throw new Error('Invalid ${channel} workspaceId');\n    if(typeof organizationId!=='undefined'&&(typeof organizationId!=='string'||!organizationId.trim()||organizationId.trim().length>200)) throw new Error('Invalid ${channel} organizationId');\n    ids(unitIds,'unitIds'); ids(personIds,'personIds');\n    if(typeof scopeLabel!=='string'||!scopeLabel.trim()||scopeLabel.trim().length>240) throw new Error('Invalid ${channel} scopeLabel');\n    if(typeof monthKey!=='string'||!/^\\d{4}-\\d{2}$/.test(monthKey)) throw new Error('Invalid ${channel} monthKey');\n  },\n`;
  cv=cv.slice(0,end)+entry+cv.slice(end);
}
write(critical,cv);

const ipc='src/main/ipc/ipcRegistry.ts';let ip=read(ipc);
if(!ip.includes("from '../../shared/contracts/output/workforceOutputTypes.js'")) ip=`import { basename } from 'node:path';\nimport type { WorkforceOutputRequest, WorkforcePdfExportBridgeResult, WorkforcePrintBridgeResult } from '../../shared/contracts/output/workforceOutputTypes.js';\nimport { exportCanonicalWorkforcePdf, printCanonicalWorkforce } from '../output/workforceOutputCommands.js';\n`+ip;
if(!ip.includes("registerInvoke('orbita:exportWorkforcePdf'")){
  const anchor="  registerInvoke('orbita:pickAndImportNativeDocumentToWork'";const at=ip.indexOf(anchor);if(at<0)throw Error('native document registerInvoke anchor missing');
  const block=`  registerInvoke('orbita:exportWorkforcePdf', async (_event, request: WorkforceOutputRequest): Promise<WorkforcePdfExportBridgeResult> => {\n    const picked=await dialog.showSaveDialog({title:'Izvezi Workforce PDF',defaultPath:'ORBITA-Workforce-'+request.monthKey+'.pdf',filters:[{name:'PDF',extensions:['pdf']}]});\n    if(picked.canceled||!picked.filePath) return {status:'cancelled'};\n    const result=await exportCanonicalWorkforcePdf(request,picked.filePath);\n    return {status:'saved',fileName:basename(result.path),bytes:result.bytes,sha256:result.sha256,generatedAt:result.generatedAt};\n  });\n  registerInvoke('orbita:printWorkforce', async (_event, request: WorkforceOutputRequest): Promise<WorkforcePrintBridgeResult> => {\n    const result=await printCanonicalWorkforce(request);\n    return {status:result.submitted?'submitted':'failed',generatedAt:result.generatedAt,failureReason:result.failureReason};\n  });\n\n`;
  ip=ip.slice(0,at)+block+ip.slice(at);
}
write(ipc,ip);

const preload='src/preload/orbitaApi.ts';let pr=read(preload);
if(!pr.includes("from '../shared/contracts/output/workforceOutputTypes.js'")){
  const firstImport=pr.indexOf('import ');if(firstImport<0)throw Error('preload import owner missing');
  pr=pr.slice(0,firstImport)+"import type { WorkforceOutputRequest, WorkforcePdfExportBridgeResult, WorkforcePrintBridgeResult } from '../shared/contracts/output/workforceOutputTypes.js';\n"+pr.slice(firstImport);
}
if(!pr.includes('exportWorkforcePdf: async')){
  const m=/^(\s*)updateWorkforceLegend:\s*async[^\n]+$/m.exec(pr);if(!m)throw Error('preload Workforce legend method anchor missing');
  const extra=`\n${m[1]}exportWorkforcePdf: async (request: WorkforceOutputRequest): Promise<WorkforcePdfExportBridgeResult> => safeInvoke<WorkforcePdfExportBridgeResult>('orbita:exportWorkforcePdf', request),\n${m[1]}printWorkforce: async (request: WorkforceOutputRequest): Promise<WorkforcePrintBridgeResult> => safeInvoke<WorkforcePrintBridgeResult>('orbita:printWorkforce', request),`;
  pr=pr.slice(0,m.index+m[0].length)+extra+pr.slice(m.index+m[0].length);
}
write(preload,pr);

const rendererTypes='src/renderer/vite-env.d.ts';let rt=read(rendererTypes);
if(!rt.includes("from '../shared/contracts/output/workforceOutputTypes.js'")){
  const firstImport=rt.indexOf('import ');if(firstImport<0)throw Error('renderer API type import owner missing');
  rt=rt.slice(0,firstImport)+"import type { WorkforceOutputRequest, WorkforcePdfExportBridgeResult, WorkforcePrintBridgeResult } from '../shared/contracts/output/workforceOutputTypes.js';\n"+rt.slice(firstImport);
}
if(!rt.includes('exportWorkforcePdf:')){
  const m=/^(\s*)updateWorkforceLegend:\s*[^\n]+$/m.exec(rt);if(!m)throw Error('renderer API Workforce legend anchor missing');
  const extra=`\n${m[1]}exportWorkforcePdf: (request: WorkforceOutputRequest) => Promise<WorkforcePdfExportBridgeResult>;\n${m[1]}printWorkforce: (request: WorkforceOutputRequest) => Promise<WorkforcePrintBridgeResult>;`;
  rt=rt.slice(0,m.index+m[0].length)+extra+rt.slice(m.index+m[0].length);
}
write(rendererTypes,rt);

console.log(JSON.stringify({state:'W6C_NATIVE_BRIDGE_IMPLEMENTED_NOT_ADMITTED',owners:{contract,command,ipc,allow,access,critical,preload,rendererTypes},channels:['orbita:exportWorkforcePdf','orbita:printWorkforce'],truth:['renderer request contains scope/month/IDs only, never HTML or snapshot','main rehydrates canonical SQLite Workspace before building output snapshot','person/organizationTeam/organization references validated against canonical workspace','output channels mirror getDemoWorkspace read access class','explicit IPC critical-field validation','save dialog stays in existing ipcRegistry owner','raw local target path is not returned through preload','existing safeInvoke/preload/global renderer API owners extended','no repository mutation owner used'],notYetClaimed:['renderer Workforce buttons','physical PDF artifact proof','print runtime proof','W6C PASS']},null,2));
