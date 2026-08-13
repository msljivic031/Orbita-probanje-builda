const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>{const p=path.join(root,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r\n/g,'\n'),'utf8');};
function replaceOnce(file,from,to,label){const s=read(file),n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
function appendOnce(file,marker,extra){let s=read(file);if(s.includes(marker))return;write(file,s.trimEnd()+'\n'+extra.trim()+'\n');}

const historyTypes='src/domain/history/historyTypes.ts';
let ht=read(historyTypes);
if(!ht.includes("| 'workforce_legend_changed'")){
  const anchor="  | 'organization_created'";
  if(!ht.includes(anchor))throw Error('HistoryEventType organization anchor missing');
  ht=ht.replace(anchor,"  | 'workforce_legend_changed'\n"+anchor);
}
write(historyTypes,ht);

const schema='src/main/persistence/schema/sqliteA419WorkforceLegendSchema.ts';
let sc=read(schema);
if(!sc.includes('sqliteHistorySchemaSupport.js')) sc=sc.replace("import { DatabaseSync } from 'node:sqlite';","import { DatabaseSync } from 'node:sqlite';\nimport { readHistoryEventsTableSql } from './sqliteHistorySchemaSupport.js';");
if(!sc.includes('function ensureA419HistoryType')){
  const anchor='export function ensureA419WorkforceLegendSchema(database: DatabaseSync) {';
  const helper=`function ensureA419HistoryType(database: DatabaseSync) {\n  const currentSql = readHistoryEventsTableSql(database);\n  if (currentSql.includes("'workforce_legend_changed'")) return;\n  const typeCheck = /(type\\s+TEXT\\s+NOT\\s+NULL\\s+CHECK\\s*\\(\\s*type\\s+IN\\s*\\()([\\s\\S]*?)(\\)\\s*\\))/i;\n  if (!typeCheck.test(currentSql)) throw new Error('A4.19 history type CHECK boundary not found');\n  const nextSql = currentSql\n    .replace(/CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?history_events/i, 'CREATE TABLE history_events_a419')\n    .replace(typeCheck, (_match, open, values, close) => \`\${open}\${values.trimEnd()}, 'workforce_legend_changed'\${close}\`);\n  database.exec('PRAGMA foreign_keys = OFF;');\n  database.exec('BEGIN IMMEDIATE TRANSACTION;');\n  try {\n    database.exec('DROP TABLE IF EXISTS history_events_a419;');\n    database.exec(nextSql);\n    database.exec('INSERT INTO history_events_a419 SELECT * FROM history_events;');\n    database.exec('DROP TABLE history_events;');\n    database.exec('ALTER TABLE history_events_a419 RENAME TO history_events;');\n    database.exec('COMMIT;');\n  } catch (error) {\n    database.exec('ROLLBACK;');\n    throw error;\n  } finally {\n    database.exec('PRAGMA foreign_keys = ON;');\n  }\n}\n\n`;
  if(!sc.includes(anchor))throw Error('A419 ensure anchor missing');
  sc=sc.replace(anchor,helper+anchor);
}
if(!sc.includes('  ensureA419HistoryType(database);')){
  const anchor='export function ensureA419WorkforceLegendSchema(database: DatabaseSync) {';
  sc=sc.replace(anchor,anchor+'\n  ensureA419HistoryType(database);');
}
write(schema,sc);

const requestFile='src/shared/contracts/persistence/workforceLegendPersistenceTypes.ts';
write(requestFile,`import type { PersonAvailabilityEventKind } from '../../../domain/people/personTypes.js';\nimport type { WorkforceLegendSemanticCategory } from '../../../domain/people/workforceLegend.js';\n\nexport interface UpdateWorkforceLegendRequest {\n  availabilityKind: PersonAvailabilityEventKind;\n  token: string;\n  displayName: string;\n  semanticCategory: WorkforceLegendSemanticCategory;\n  sortOrder: number;\n  isArchived?: boolean;\n  effectiveFrom: string;\n  actorId: string;\n  correlationId?: string;\n  reasonCode?: string;\n  note?: string;\n}\n`);

const persistence='src/shared/contracts/persistence/persistenceTypes.ts';
let ps=read(persistence);
if(!ps.includes("from './workforceLegendPersistenceTypes.js'")){
  const exportAnchor="export type {\n  ChangeDemoTeamMembersRequest";
  if(!ps.includes(exportAnchor))throw Error('persistence organization export anchor missing');
  ps=ps.replace(exportAnchor,"export type { UpdateWorkforceLegendRequest } from './workforceLegendPersistenceTypes.js';\n"+exportAnchor);
}
if(!ps.includes("| 'update_workforce_legend'")){
  const op=" | 'move_person_structure';";
  if(!ps.includes(op))throw Error('WorkspaceWriteBridgeResult operation tail missing');
  ps=ps.replace(op," | 'move_person_structure' | 'update_workforce_legend';");
}
if(!ps.includes('workforceLegendVersionId?: string;')){
  const anchor='    previousRegistryValue?: unknown;';
  if(!ps.includes(anchor))throw Error('WorkspaceWriteBridgeResult registry fields anchor missing');
  ps=ps.replace(anchor,`    workforceLegendVersionId?: string;\n    workforceLegendSemanticId?: string;\n    workforceLegendAvailabilityKind?: string;\n    workforceLegendToken?: string;\n    workforceLegendEffectiveFrom?: string;\n    workforceLegendArchived?: boolean;\n${anchor}`);
}
write(persistence,ps);

const runtime='src/main/persistence/people/sqliteWorkforceLegendCommands.ts';
write(runtime,`import crypto from 'node:crypto';\nimport type { UpdateWorkforceLegendRequest } from '../../../shared/contracts/persistence/workforceLegendPersistenceTypes.js';\nimport { createDemoDatabasePath } from '../schema/sqliteSchema.js';\nimport { countRows, openDemoWorkspaceDatabase, readWorkspaceFromDatabase } from '../workspace/sqliteWorkspaceStore.js';\nimport { appendSemanticHistoryEvent, safeCommandCorrelationId } from '../history/sqliteSemanticHistoryStore.js';\n\ntype Row = Record<string, unknown>;\nconst CATEGORIES = new Set(['available','leave','field','blocked','absence']);\nconst KINDS = new Set(['available','annual_leave','sick_leave','field_work','day_off','blocked','other_absence']);\nfunction requiredText(value: string, label: string, max: number) { const clean=String(value??'').trim(); if(!clean||clean.length>max)throw new Error(\`Invalid \${label}\`); return clean; }\nfunction normalizeEffective(value: string) { const at=Date.parse(value); if(!Number.isFinite(at))throw new Error('Invalid Workforce legend effectiveFrom'); return new Date(at).toISOString(); }\nfunction rowValue(row: Row | undefined) { if(!row)return undefined; return { versionId:String(row.version_id), semanticId:String(row.semantic_id), availabilityKind:String(row.availability_kind), token:String(row.token), displayName:String(row.display_name), semanticCategory:String(row.semantic_category), sortOrder:Number(row.sort_order), isArchived:Number(row.is_archived)===1, effectiveFrom:String(row.effective_from), supersedesVersionId:row.supersedes_version_id==null?undefined:String(row.supersedes_version_id), provenance:String(row.provenance), actorPersonId:row.actor_person_id==null?undefined:String(row.actor_person_id), recordedAt:String(row.recorded_at) }; }\n\nexport function updateWorkforceLegendRuntime(request: UpdateWorkforceLegendRequest, databasePath = createDemoDatabasePath()) {\n  const database=openDemoWorkspaceDatabase(databasePath,{forceSeed:false});\n  const changedAt=new Date().toISOString();\n  const kind=requiredText(request.availabilityKind,'availabilityKind',40); if(!KINDS.has(kind))throw new Error('Unsupported Workforce legend availabilityKind');\n  const token=requiredText(request.token,'token',8);\n  const displayName=requiredText(request.displayName,'displayName',80);\n  const category=requiredText(request.semanticCategory,'semanticCategory',24); if(!CATEGORIES.has(category))throw new Error('Unsupported Workforce legend semanticCategory');\n  if(!Number.isInteger(request.sortOrder)||request.sortOrder<0||request.sortOrder>10000)throw new Error('Invalid Workforce legend sortOrder');\n  const effectiveFrom=normalizeEffective(request.effectiveFrom);\n  const actorId=requiredText(request.actorId,'actorId',200);\n  const actor=database.prepare('SELECT id FROM people WHERE id = ?').get(actorId) as Row|undefined; if(!actor){database.close();throw new Error(\`Actor does not exist: \${actorId}\`);}\n  const workspaceId=readWorkspaceFromDatabase(database).id;\n  const previous=database.prepare('SELECT * FROM workforce_legend_versions_a419 WHERE availability_kind = ? ORDER BY effective_from DESC, recorded_at DESC, version_id DESC LIMIT 1').get(kind) as Row|undefined;\n  if(previous && effectiveFrom<String(previous.effective_from)){database.close();throw new Error('Workforce legend versions cannot be backdated before the latest effective version');}\n  const previousValue=rowValue(previous);\n  const versionId=\`workforce-legend:\${kind}:\${crypto.randomUUID()}\`;\n  const semanticId=previous?String(previous.semantic_id):\`availability:\${kind}\`;\n  const correlationId=request.correlationId?.trim()||safeCommandCorrelationId();\n  const newValue={versionId,semanticId,availabilityKind:kind,token,displayName,semanticCategory:category,sortOrder:request.sortOrder,isArchived:Boolean(request.isArchived),effectiveFrom,supersedesVersionId:previous?String(previous.version_id):undefined,provenance:'user',actorPersonId:actorId,recordedAt:changedAt};\n  database.exec('BEGIN IMMEDIATE TRANSACTION;');\n  try {\n    database.prepare(\`INSERT INTO workforce_legend_versions_a419 (version_id,semantic_id,availability_kind,token,display_name,semantic_category,sort_order,is_archived,effective_from,supersedes_version_id,provenance,actor_person_id,recorded_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)\`).run(versionId,semanticId,kind,token,displayName,category,request.sortOrder,request.isArchived?1:0,effectiveFrom,previous?String(previous.version_id):null,'user',actorId,changedAt);\n    const historyEventId=appendSemanticHistoryEvent(database,{entityType:'workspace',entityId:workspaceId,type:'workforce_legend_changed',occurredAt:changedAt,actorPersonId:actorId,summary:request.isArchived?\`Workforce legenda arhivirana: \${displayName}.\`:\`Workforce legenda izmenjena: \${displayName} (\${token}).\`,previousValue,newValue,note:request.note,recordedAt:changedAt,source:'workforce_legend_settings',correlationId,reasonCode:request.reasonCode,eventVersion:1});\n    database.prepare('UPDATE workspace_metadata SET updated_at = ?').run(changedAt);\n    database.exec('COMMIT;');\n    const workspace=readWorkspaceFromDatabase(database),counts=countRows(database); database.close();\n    return {workspace,counts,versionId,semanticId,availabilityKind:kind,token,effectiveFrom,isArchived:Boolean(request.isArchived),previousRegistryValue:previousValue,newRegistryValue:newValue,historyEventId,correlationId,changedAt};\n  } catch(error) { database.exec('ROLLBACK;'); database.close(); throw error; }\n}\n`);

const repo='src/main/persistence/repository/workforceLegendRepository.ts';
write(repo,`import type { UpdateWorkforceLegendRequest, WorkspaceWriteBridgeResult } from '../../../shared/contracts/persistence/persistenceTypes.js';\nimport { PATCH4N_VIS_A4_3_3_E_BEHAVIORAL_RELEASE_GATE_BOUNDARY } from '../../../shared/contracts/persistence/persistenceTypes.js';\nimport { updateWorkforceLegendRuntime } from '../people/sqliteWorkforceLegendCommands.js';\n\nexport function updateWorkforceLegendThroughRepository(request: UpdateWorkforceLegendRequest): WorkspaceWriteBridgeResult {\n  const runtime=updateWorkforceLegendRuntime(request);\n  return {workspace:runtime.workspace,persistence:PATCH4N_VIS_A4_3_3_E_BEHAVIORAL_RELEASE_GATE_BOUNDARY,counts:runtime.counts,loadedAt:new Date().toISOString(),source:'sqlite_local_workspace_bridge',warning:'Workforce legend changes are append-only effective versions. Historic Workforce meaning is resolved as-of date; Print/Export remains outside this owner.',write:{operation:'update_workforce_legend',historyEventId:runtime.historyEventId,correlationId:runtime.correlationId,workforceLegendVersionId:runtime.versionId,workforceLegendSemanticId:runtime.semanticId,workforceLegendAvailabilityKind:runtime.availabilityKind,workforceLegendToken:runtime.token,workforceLegendEffectiveFrom:runtime.effectiveFrom,workforceLegendArchived:runtime.isArchived,previousRegistryValue:runtime.previousRegistryValue,newRegistryValue:runtime.newRegistryValue,createdAt:runtime.changedAt,changedAt:runtime.changedAt,truth:'SQLite appended one immutable Workforce legend version, appended one semantic history event, updated workspace metadata, then returned a freshly hydrated Workspace through the existing repository result shape.'}};\n}\n`);

const barrel='src/main/persistence/workspace/workspaceRepository.ts';
appendOnce(barrel,"export * from '../repository/workforceLegendRepository.js';","export * from '../repository/workforceLegendRepository.js';");

const handlers='src/main/ipc/repositoryIpcHandlers.ts';
let ih=read(handlers);
if(!ih.includes('updateWorkforceLegendThroughRepository')){
  const importTail="} from '../persistence/workspace/workspaceRepository.js';";
  const pos=ih.indexOf(importTail); if(pos<0)throw Error('repositoryIpcHandlers barrel import tail missing');
  ih=ih.slice(0,pos)+"  updateWorkforceLegendThroughRepository,\n"+ih.slice(pos);
  const mapAnchor="  'orbita:updateDemoOrganization': updateDemoOrganizationThroughRepository,";
  if(!ih.includes(mapAnchor))throw Error('repository handler organization map anchor missing');
  ih=ih.replace(mapAnchor,mapAnchor+"\n  'orbita:updateWorkforceLegend': updateWorkforceLegendThroughRepository,");
}
write(handlers,ih);

const allow='src/shared/security/channelAllowlist.ts';
let al=read(allow);
if(!al.includes("'orbita:updateWorkforceLegend'")){
  const a="  'orbita:updateDemoOrganization',"; if(!al.includes(a))throw Error('allowlist organization anchor missing');
  al=al.replace(a,a+"\n  'orbita:updateWorkforceLegend',");
}
write(allow,al);

const preload='src/preload/orbitaApi.ts';
let pr=read(preload);
if(!pr.includes('UpdateWorkforceLegendRequest')){
  const a='  UpdateDemoOrganizationRequest,'; if(!pr.includes(a))throw Error('preload request import anchor missing');
  pr=pr.replace(a,a+'\n  UpdateWorkforceLegendRequest,');
}
if(!pr.includes('updateWorkforceLegend: async')){
  const a="  updateDemoOrganization: async (request: UpdateDemoOrganizationRequest): Promise<WorkspaceWriteBridgeResult> => safeInvoke<WorkspaceWriteBridgeResult>('orbita:updateDemoOrganization', request),"; if(!pr.includes(a))throw Error('preload organization method anchor missing');
  pr=pr.replace(a,a+"\n  updateWorkforceLegend: async (request: UpdateWorkforceLegendRequest): Promise<WorkspaceWriteBridgeResult> => safeInvoke<WorkspaceWriteBridgeResult>('orbita:updateWorkforceLegend', request),");
}
write(preload,pr);

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE6B_LEGEND_WRITE',state:'IMPLEMENTED_NOT_ADMITTED',newOwners:[requestFile,runtime,repo],patchedOwners:[historyTypes,schema,persistence,barrel,handlers,allow,preload],truth:['new workforce_legend_changed history type','append-only write; no UPDATE/DELETE of legend truth','actor must exist','no backdating before latest effective version','existing WorkspaceWriteBridgeResult/repository IPC/preload chain reused'],notYetClaimed:['renderer Settings binding','critical-field channel-specific validator','W6B visual/human PASS','print/export']},null,2));
