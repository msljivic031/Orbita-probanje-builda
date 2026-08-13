const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');const R=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');const must=(v,m)=>{if(!v)throw Error(m)};
const f={component:'src/renderer/screens/podesavanja/WorkforceLegendSettings.tsx',settings:'src/renderer/screens/podesavanja/PodesavanjaScreen.tsx',contracts:'src/renderer/app/workspaceActionContracts.ts',hook:'src/renderer/app/state/useOrganizationCommandActions.ts',state:'src/renderer/app/appState.ts',app:'src/renderer/App.tsx'};
for(const x of Object.values(f))must(fs.existsSync(path.join(root,x)),`missing ${x}`);
const C=R(f.component),S=R(f.settings),K=R(f.contracts),H=R(f.hook),ST=R(f.state),A=R(f.app);
must(C.includes('data-orbita-workforce-legend-settings="ready"'),'Settings legend surface missing');
must(C.includes('settings-workforce-legend-save')&&C.includes('settings-workforce-legend-archive'),'save/archive action identities missing');
must(C.includes('effectiveFrom: new Date().toISOString()')&&C.includes('actorId: actorPersonId'),'effective actor-bound mutation missing');
must(S.includes("| 'workforce'")&&S.includes("activeSection === 'workforce'"),'existing Settings root not extended');
must(S.includes('<WorkforceLegendSettings')&&S.includes('onUpdateWorkforceLegend={onUpdateWorkforceLegend}'),'Settings owner not bound to writer');
must(K.includes('onUpdateWorkforceLegend: (request: UpdateWorkforceLegendRequest)'),'PeopleWorkspaceActions contract missing');
must(H.includes('const updateWorkforceLegend = useCallback')&&H.includes('updateWorkforceLegend,'),'existing command hook not extended');
must((ST.match(/updateWorkforceLegend,/g)||[]).length>=2,'appState action not destructured and returned');
must(A.includes('onUpdateWorkforceLegend={state.updateWorkforceLegend}'),'App binding missing');
const hosts=[];for(const base of ['src/renderer']){const stack=[path.join(root,base)];while(stack.length){const d=stack.pop();for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())stack.push(p);else if(/\.tsx$/.test(e.name)){const s=fs.readFileSync(p,'utf8');if(s.includes('<PodesavanjaScreen'))hosts.push({p,s});}}}}
must(hosts.length===1,`Podesavanja host count ${hosts.length}`);must(hosts[0].s.includes('onUpdateWorkforceLegend={onUpdateWorkforceLegend}'),'Settings route host missing Workforce prop');
console.log(JSON.stringify({audit:'ORBITA_WAVE6B_LEGEND_SETTINGS_GATE',state:'PASS',checks:10,settingsHost:path.relative(root,hosts[0].p).replace(/\\/g,'/'),scope:'existing Settings/App/action chain extended; no parallel renderer truth'},null,2));
