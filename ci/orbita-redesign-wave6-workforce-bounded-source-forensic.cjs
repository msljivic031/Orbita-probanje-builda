const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'workforce-bounded-source.json');
const targets={
 'src/domain/people/availabilityEvents.ts':['isAvailabilityEventActiveOn','buildPersonAvailabilityFoundation','availabilityFromEventKind'],
 'src/domain/reports/responsibilityAvailabilitySnapshot.ts':['membershipActiveAt','activeMembershipsForPerson','availabilitySnapshot','buildResponsibilityAvailabilitySnapshotReport'],
 'src/domain/people/temporalTeamMembership.ts':['TemporalTeamMembership','boundaryConfidence','validFrom','validTo'],
 'src/domain/history/historyTypes.ts':['HistoryEventType','organization_changed','status_definition_changed'],
 'src/domain/workspace/workspaceTypes.ts':['export interface Workspace','availabilityEvents','historyEvents'],
 'src/shared/contracts/persistence/persistenceTypes.ts':['WorkspaceWriteBridgeResult','UpdateDemoOrganizationRequest','operation:','previousRegistryValue'],
 'src/main/persistence/schema/sqliteSchema.ts':['ensureA418TemporalResponsibilitySchema','createDemoDatabasePath'],
 'src/main/persistence/schema/sqliteA418TemporalResponsibilitySchema.ts':['REQUIRED_HISTORY_TYPES','ensureHistoryTypes','ensureA418TemporalResponsibilitySchema'],
 'src/main/persistence/workspace/sqliteWorkspaceReader.ts':['readWorkspaceFromDatabase','availabilityEvents','temporalTeamMemberships'],
 'src/main/persistence/organization/sqliteOrganizationRegistryCommands.ts':['updateDemoOrganizationRuntime','appendSemanticHistoryEvent','history_events','readWorkspaceFromDatabase'],
 'src/main/persistence/repository/organizationRepository.ts':['updateDemoOrganizationThroughRepository','PATCH4N_VIS_A4_3_3_E_BEHAVIORAL_RELEASE_GATE_BOUNDARY','write:'],
 'src/main/ipc/repositoryIpcHandlers.ts':['orbita:updateDemoOrganization','ORBITA_REPOSITORY_IPC_HANDLERS','updateDemoOrganizationThroughRepository'],
 'src/main/ipc/ipcRegistry.ts':['ORBITA_REPOSITORY_IPC_HANDLERS','registerInvoke','RepositoryIpcHandler'],
 'src/preload/orbitaApi.ts':['updateDemoOrganization','safeInvoke','orbita:updateDemoOrganization'],
 'src/renderer/app/appState.ts':['useOrganizationCommandActions','organizationActions','updateDemoOrganization'],
 'src/renderer/App.tsx':['PodesavanjaScreen','LjudiScreen','updateDemoOrganization'],
 'src/renderer/app/workspaceActionContracts.ts':['PeopleWorkspaceActions','onUpdateDemoOrganization'],
 'src/renderer/screens/radovi/create/RadCreateModalDatePlanner.tsx':['weekend','radni','neradni','getDay'],
 'src/renderer/screens/radovi/dossier/edit/radDossierEditDatePlan.ts':['weekend','radni','neradni','getDay'],
 'src/domain/reports/reportExportPlan.ts':['export','format','scope','build'],
 'src/domain/reports/reportExportScope.ts':['export','scope','period'],
 'src/domain/reports/reportPeriod.ts':['buildReportPeriod','startDate','endDate'],
 'src/renderer/screens/ljudi/LjudiScreen.tsx':['mode','selectedOrganization','Dossier','workspace','primary'],
 'src/renderer/screens/podesavanja/PodesavanjaScreen.tsx':['SettingsSectionId','sections:','renderActiveSection','SettingsPanel'],
 'src/main/persistence/history/sqliteSemanticHistoryStore.ts':['history','append','event','payload']
};
function window(s,at,before=1300,after=3600){return s.slice(Math.max(0,at-before),Math.min(s.length,at+after)).replace(/\r\n/g,'\n')}
function line(s,at){return s.slice(0,at).split(/\r?\n/).length}
const result={audit:'ORBITA_WAVE6_WORKFORCE_BOUNDED_SOURCE_FORENSIC',targets:{}};
for(const [rel,needles] of Object.entries(targets)){const p=path.join(root,rel);if(!fs.existsSync(p)){result.targets[rel]={missing:true};continue}const s=fs.readFileSync(p,'utf8');const low=s.toLowerCase(),hits=[];for(const needle of needles){let at=0,n=0,q=needle.toLowerCase();while((at=low.indexOf(q,at))>=0&&n<4){hits.push({needle,line:line(s,at),snippet:window(s,at)});at+=Math.max(q.length,1);n++;}}result.targets[rel]={size:s.length,hits};}
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({targets:Object.fromEntries(Object.entries(result.targets).map(([k,v])=>[k,v.hits?.length||0]))},null,2));
