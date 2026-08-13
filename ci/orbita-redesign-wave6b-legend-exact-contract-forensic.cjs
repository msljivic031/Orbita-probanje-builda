const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'workforce-legend-exact-contract.json');
const read=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const exists=f=>fs.existsSync(path.join(root,f));
const decls=s=>[...s.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|class|const|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const imports=s=>[...s.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
const functionMeta=s=>[...s.matchAll(/(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)/g)].map(m=>({name:m[1],parameters:m[2].split(',').map(x=>x.trim().split(':')[0].trim()).filter(Boolean),parameterCount:m[2].trim()?m[2].split(',').length:0}));
const interfaceFields=(s,name)=>{const m=s.match(new RegExp(`(?:export\\s+)?interface\\s+${name}\\s*\\{([\\s\\S]*?)\\n\\}`));if(!m)return[];return[...m[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map(x=>x[1]);};
const typeFields=(s,name)=>{const m=s.match(new RegExp(`(?:export\\s+)?type\\s+${name}\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`));if(!m)return[];return[...m[1].matchAll(/^\s*([A-Za-z_$][\w$]*)\??\s*:/gm)].map(x=>x[1]);};
const objectKeysNear=(s,needle,radius=4000)=>{const i=s.indexOf(needle);if(i<0)return[];const w=s.slice(Math.max(0,i-radius),Math.min(s.length,i+radius));return[...w.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[:,]/gm)].map(m=>m[1]);};
const callOrder=(s,re)=>[...s.matchAll(re)].map(m=>m[1]);
const all=[];(function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx)$/i.test(e.name))all.push(p)}})(path.join(root,'src'));
const rel=f=>path.relative(root,f).replaceAll('\\','/');
const filesMatching=re=>all.filter(f=>re.test(fs.readFileSync(f,'utf8'))).map(rel).sort();
const targets={
 workspaceTypes:'src/domain/workspace/workspaceTypes.ts',
 persistenceTypes:'src/shared/contracts/persistence/persistenceTypes.ts',
 schema:'src/main/persistence/schema/sqliteSchema.ts',
 a418:'src/main/persistence/schema/sqliteA418TemporalResponsibilitySchema.ts',
 organizationRepository:'src/main/persistence/repository/organizationRepository.ts',
 workspaceReadRepository:'src/main/persistence/repository/workspaceReadRepository.ts',
 workspaceRepository:'src/main/persistence/workspace/workspaceRepository.ts',
 repositoryIpcHandlers:'src/main/ipc/repositoryIpcHandlers.ts',
 ipcRegistry:'src/main/ipc/ipcRegistry.ts',
 orbitaApi:'src/preload/orbitaApi.ts',
 app:'src/renderer/App.tsx',
 appState:'src/renderer/app/appState.ts',
 actions:'src/renderer/app/workspaceActionContracts.ts',
 settings:'src/renderer/screens/podesavanja/PodesavanjaScreen.tsx'
};
for(const [k,v] of Object.entries(targets)) if(!exists(v)) throw Error(`Required target missing ${k}:${v}`);
const W=read(targets.workspaceTypes),P=read(targets.persistenceTypes),S=read(targets.schema),A=read(targets.a418),OR=read(targets.organizationRepository),WR=read(targets.workspaceReadRepository),WRepo=read(targets.workspaceRepository),IH=read(targets.repositoryIpcHandlers),IR=read(targets.ipcRegistry),API=read(targets.orbitaApi),APP=read(targets.app),AS=read(targets.appState),ACT=read(targets.actions),SET=read(targets.settings);
const result={
 audit:'ORBITA_WAVE6B_LEGEND_EXACT_CONTRACT_V1',sourceExposure:'SEMANTIC_METADATA_ONLY_NO_SOURCE_SNIPPETS',
 workspace:{file:targets.workspaceTypes,workspaceFields:[...new Set([...interfaceFields(W,'Workspace'),...typeFields(W,'Workspace')])],declaredSymbols:decls(W).filter(x=>/Workspace|Organization|People|Availability|Temporal|History/i.test(x))},
 persistenceContracts:{file:targets.persistenceTypes,declaredSymbols:decls(P).filter(x=>/Organization|Person|Team|Workspace|History|Repository|Command|Result/i.test(x)),organizationCommandLike:decls(P).filter(x=>/Organization.*(?:Create|Update)|(?:Create|Update).*Organization/i.test(x)),historyLike:decls(P).filter(x=>/History|Provenance/i.test(x))},
 schema:{file:targets.schema,imports:imports(S).filter(x=>/sqliteA4|schema/i.test(x)),ensureCalls:callOrder(S,/\b(ensureA\d+[A-Za-z0-9_]*Schema)\s*\(/g),a418Tables:[...A.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([A-Za-z0-9_]+)/gi)].map(m=>m[1]),a418Functions:functionMeta(A)},
 repository:{organization:{file:targets.organizationRepository,functions:functionMeta(OR),imports:imports(OR),historySignal:/history|semanticHistory|provenance/i.test(OR),transactionSignal:/transaction|BEGIN|COMMIT|ROLLBACK/i.test(OR)},workspaceRead:{file:targets.workspaceReadRepository,functions:functionMeta(WR),imports:imports(WR),returnKeys:[...new Set(objectKeysNear(WR,'readDemoWorkspaceThroughRepository'))]},workspaceRoot:{file:targets.workspaceRepository,functions:functionMeta(WRepo),imports:imports(WRepo),exports:decls(WRepo)}},
 ipc:{handlers:{file:targets.repositoryIpcHandlers,functions:functionMeta(IH),declaredSymbols:decls(IH),channelStrings:[...new Set([...IH.matchAll(/['"]([a-z0-9:_-]*(?:organization|people|workspace)[a-z0-9:_-]*)['"]/gi)].map(m=>m[1]))].slice(0,120)},registry:{file:targets.ipcRegistry,functions:functionMeta(IR),declaredSymbols:decls(IR)}},
 preload:{file:targets.orbitaApi,declaredSymbols:decls(API),methodKeys:[...new Set([...API.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*:\s*\(/gm)].map(m=>m[1]))].slice(0,160)},
 renderer:{app:{file:targets.app,declaredSymbols:decls(APP).filter(x=>/Organization|People|Workspace|Update|Create|Action/i.test(x)),apiMethodRefs:[...new Set([...APP.matchAll(/orbita\.(?:repository\.)?([A-Za-z_$][\w$]*)/g)].map(m=>m[1]))].slice(0,160)},appState:{file:targets.appState,declaredSymbols:decls(AS),workspaceRefs:(AS.match(/workspace/g)||[]).length},actions:{file:targets.actions,declaredSymbols:decls(ACT),peopleActionFields:[...new Set(objectKeysNear(ACT,'PeopleWorkspaceActions'))]},settings:{file:targets.settings,sectionIds:[...new Set([...SET.matchAll(/['"](workspace|appearance|workRules|responsibility|documents|reports|dataSafety|about)['"]/g)].map(m=>m[1]))],workspaceWrite:/isWorkspaceWriting/.test(SET),currentActor:/resolveCurrentActorPersonId|requireCurrentActorPersonId/.test(SET),organizationMutationRefs:[...new Set([...SET.matchAll(/on(?:Create|Update)DemoOrganization/g)].map(m=>m[0]))],declaredSymbols:decls(SET)}},
 search:{sqliteCommandCandidates:filesMatching(/INSERT\s+INTO\s+organizations|UPDATE\s+organizations|history_events_a418/).slice(0,80),repositoryHandlerCandidates:filesMatching(/createDemoOrganizationThroughRepository|updateDemoOrganizationThroughRepository/).slice(0,80),workspaceHydrationCandidates:filesMatching(/readDemoWorkspaceThroughRepository/).slice(0,80)},
 bindingDecision:{schema:'Add one next incremental schema installer after A4.18 using existing ensure-call chain.',types:'Extend Workspace and shared persistence contract once; no renderer-only legend truth.',write:'Add repository command(s) beside organization/workspace configuration commands and preserve current transaction/history conventions.',read:'Hydrate legend versions through readDemoWorkspaceThroughRepository and Workspace.',ipc:'Expose through existing repositoryIpcHandlers/ipcRegistry/orbitaApi chain.',renderer:'Extend existing workspace action contract/App binding/PodesavanjaScreen; Workforce projection resolves effective version by requested date.'}
};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
if(!result.schema.ensureCalls.some(x=>/A418/.test(x)))throw Error('A418 ensure call not found');
if(!result.repository.organization.functions.some(x=>/updateDemoOrganizationThroughRepository/.test(x.name)))throw Error('organization repository update convention missing');
if(!result.renderer.settings.workspaceWrite||!result.renderer.settings.currentActor)throw Error('Settings mutation boundary missing');
if(!result.workspace.workspaceFields.includes('availabilityEvents')||!result.workspace.workspaceFields.includes('temporalTeamMemberships'))throw Error('Workspace truth fields not parsed; exact contract scan incomplete');