const fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'orbita-redesign-wave6b-legend-settings-transform.cjs');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');

const replaceOnce=(from,to,label)=>{
  if(s.includes(to)) return false;
  const count=s.split(from).length-1;
  if(count!==1) throw new Error(`${label} expected 1 legacy owner, got ${count}`);
  s=s.replace(from,to);
  return true;
};

const repairs=[];
const fixedTemplate="{entry.effectiveFrom ? ' · važi od ' + new Date(entry.effectiveFrom).toLocaleDateString('sr-RS') : ''}";
if(!s.includes(fixedTemplate)){
  const startMarker='{entry.effectiveFrom ?';
  const endMarker='}</span><strong>{entry.token}';
  const startCount=s.split(startMarker).length-1;
  if(startCount!==1) throw new Error(`W6B Settings effectiveFrom expression expected 1, got ${startCount}`);
  const start=s.indexOf(startMarker);
  const end=s.indexOf(endMarker,start);
  if(end<0) throw new Error('W6B Settings effectiveFrom expression end boundary missing');
  const current=s.slice(start,end+1);
  if(!current.includes("new Date(entry.effectiveFrom).toLocaleDateString('sr-RS')")) throw new Error('W6B Settings effectiveFrom expression changed outside admitted semantic shape');
  s=s.slice(0,start)+fixedTemplate+s.slice(end+1);
  repairs.push('normalize generated effective-date expression without nested template literal');
}

const callbackText=`  const updateWorkforceLegend = useCallback(async (request: UpdateWorkforceLegendRequest): Promise<void> => {
    const attemptAt = new Date().toISOString();
    setWorkspaceWriteState({ status: 'changing', message: 'Ažuriram Workforce legendu kroz kontrolisani lokalni persistence bridge.', lastAttemptAt: attemptAt });
    if (!window.orbita?.updateWorkforceLegend) {
      const message = 'Electron/SQLite bridge nema operaciju updateWorkforceLegend. Orbita je u read-only recovery režimu; nijedan lokalni fallback upis nije izvršen.';
      setWorkspaceWriteState(failedWorkspaceWriteState(message, attemptAt, 'window.orbita.updateWorkforceLegend unavailable'));
      throw new Error(message);
    }
    try {
      const result = await window.orbita.updateWorkforceLegend(request);
      setWorkspace(result.workspace);
      setWorkspaceLoadState(loadedWorkspaceStateFromResult(result, attemptAt));
      setWorkspaceWriteState(changedWorkspaceWriteStateFromResult(result, attemptAt));
    } catch (error) {
      const message = (error as Error).message;
      setWorkspaceWriteState(failedWorkspaceWriteState('Update Workforce legend failed. ' + message, attemptAt, message));
      throw error;
    }
  }, [workspace.mode]);`;

const registryBlock=`const orgHook='src/renderer/app/state/useOrganizationRegistryActions.ts';
let oh=read(orgHook);
if(!oh.includes('UpdateWorkforceLegendRequest')) {
  const importFrom="import type { CreateDemoOrganizationRequest, UpdateDemoOrganizationRequest, CreateDemoPersonRequest, UpdateDemoPersonRequest, MovePersonStructureRequest } from '../../../shared/contracts/persistence/persistenceTypes';";
  const importTo="import type { CreateDemoOrganizationRequest, UpdateDemoOrganizationRequest, CreateDemoPersonRequest, UpdateDemoPersonRequest, MovePersonStructureRequest, UpdateWorkforceLegendRequest } from '../../../shared/contracts/persistence/persistenceTypes';";
  oh=once(oh,importFrom,importTo,'organization registry Workforce request import');
}
if(!oh.includes('const updateWorkforceLegend = useCallback')) {
  const anchor='  const createDemoPerson = useCallback';
  const at=oh.indexOf(anchor);
  if(at<0)throw Error('organization registry createDemoPerson anchor missing');
  const callback=${JSON.stringify(callbackText)};
  oh=oh.slice(0,at)+callback+'\\n\\n'+oh.slice(at);
}
if(!/return\\s*\\{[^}]*updateWorkforceLegend/.test(oh)) {
  oh=once(oh,'return { createDemoOrganization, updateDemoOrganization,','return { createDemoOrganization, updateDemoOrganization, updateWorkforceLegend,','organization registry return Workforce action');
}
write(orgHook,oh);`;

const registryMarker="const orgHook='src/renderer/app/state/useOrganizationRegistryActions.ts';";
if(!s.includes(registryMarker)){
  const orgBlock=/const orgHook='src\/renderer\/app\/state\/useOrganizationCommandActions\.ts';[\s\S]*?write\(orgHook,oh\);/;
  if(!orgBlock.test(s)) throw new Error('W6B Settings organization action owner is neither admitted registry owner nor known legacy aggregator');
  s=s.replace(orgBlock,registryBlock);
  repairs.push('move Workforce legend mutation binding to useOrganizationRegistryActions owner');
}

const jsxAnchorFrom="  const jsx=/^(\\s*)onUpdateDemoStatusDefinition=\\{([^}]+)\\}/m.exec(host);";
const jsxAnchorTo="  const jsx=/(\\s*)<PodesavanjaScreen\\b/m.exec(host);";
if(replaceOnce(jsxAnchorFrom,jsxAnchorTo,'W6B Settings AppShell JSX owner anchor repair')) repairs.push('bind Settings through unique PodesavanjaScreen JSX owner without a line-start assumption');

const jsxErrorFrom="  if(!jsx)throw Error(`Settings host ${hostRel} missing status JSX anchor`);";
const jsxErrorTo="  if(!jsx)throw Error(`Settings host ${hostRel} missing PodesavanjaScreen JSX owner anchor`);";
replaceOnce(jsxErrorFrom,jsxErrorTo,'W6B Settings AppShell JSX error repair');

const jsxInsertFrom="  host=host.slice(0,jsx.index+jsx[0].length)+`\\n${jsx[1]}onUpdateWorkforceLegend={onUpdateWorkforceLegend}`+host.slice(jsx.index+jsx[0].length);";
const jsxInsertTo="  host=host.slice(0,jsx.index+jsx[0].length)+`\\n${jsx[1]}  onUpdateWorkforceLegend={onUpdateWorkforceLegend}`+host.slice(jsx.index+jsx[0].length);";
replaceOnce(jsxInsertFrom,jsxInsertTo,'W6B Settings AppShell JSX insertion repair');

const cascadeMarker='W6B_TYPE_BINDING_CASCADE_REPAIR_V1';
if(!s.includes(cascadeMarker)){
  const anchor="fs.writeFileSync(hosts[0],host,'utf8');\n\nconsole.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE6B_LEGEND_SETTINGS'";
  if(!s.includes(anchor)) throw new Error('W6B Settings transform final AppShell write anchor missing');
  const cascade=`fs.writeFileSync(hosts[0],host,'utf8');\n\n// W6B_TYPE_BINDING_CASCADE_REPAIR_V1\nconst globalTypes='src/shared/types/global.d.ts';\nlet gt=read(globalTypes);\nif(!gt.includes('updateWorkforceLegend:')) {\n  const sibling=/^(\\s*)updateDemoOrganization:\\s*[^\\n]+$/m.exec(gt);\n  if(!sibling) throw Error('global.d.ts updateDemoOrganization API sibling missing');\n  const siblingCount=(gt.match(/^\\s*updateDemoOrganization:\\s*[^\\n]+$/gm)||[]).length;\n  if(siblingCount!==1) throw Error('global.d.ts updateDemoOrganization API sibling expected 1, got '+siblingCount);\n  const declaration=sibling[1]+\"updateWorkforceLegend: (request: import('../contracts/persistence/persistenceTypes.js').UpdateWorkforceLegendRequest) => Promise<import('../contracts/persistence/persistenceTypes.js').WorkspaceWriteBridgeResult>;\";\n  gt=gt.slice(0,sibling.index+sibling[0].length)+'\\n'+declaration+gt.slice(sibling.index+sibling[0].length);\n}\nwrite(globalTypes,gt);\n\nlet boundHost=fs.readFileSync(hosts[0],'utf8').replace(/\\r\\n/g,'\\n');\nconst organizationProp='onUpdateDemoOrganization={onUpdateDemoOrganization}';\nlet searchAt=0,organizationSinks=0;\nwhile(true){\n  const at=boundHost.indexOf(organizationProp,searchAt);\n  if(at<0)break;\n  organizationSinks++;\n  const tagStart=boundHost.lastIndexOf('<',at),tagEnd=boundHost.indexOf('>',at);\n  if(tagStart<0||tagEnd<0)throw Error('AppShell organization JSX sink boundary missing');\n  const tag=boundHost.slice(tagStart,tagEnd+1);\n  if(!tag.includes('onUpdateWorkforceLegend={onUpdateWorkforceLegend}')) {\n    const insertAt=at+organizationProp.length;\n    const lineStart=boundHost.lastIndexOf('\\n',at)+1;\n    const prefix=boundHost.slice(lineStart,at);\n    const indent=(/^\\s*/.exec(prefix)||[''])[0];\n    boundHost=boundHost.slice(0,insertAt)+'\\n'+indent+'onUpdateWorkforceLegend={onUpdateWorkforceLegend}'+boundHost.slice(insertAt);\n    searchAt=insertAt+1;\n  } else searchAt=tagEnd+1;\n}\nif(organizationSinks<1)throw Error('AppShell has no organization JSX action sink for Workforce binding');\nfor(const match of boundHost.matchAll(/onUpdateDemoOrganization=\\{onUpdateDemoOrganization\\}/g)){\n  const tagStart=boundHost.lastIndexOf('<',match.index),tagEnd=boundHost.indexOf('>',match.index);\n  if(!boundHost.slice(tagStart,tagEnd+1).includes('onUpdateWorkforceLegend={onUpdateWorkforceLegend}'))throw Error('AppShell organization sink still lacks Workforce writer');\n}\nfs.writeFileSync(hosts[0],boundHost,'utf8');\n\nconsole.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE6B_LEGEND_SETTINGS'`;
  s=s.replace(anchor,cascade);
  repairs.push('extend generated Settings transform with renderer API type + AppShell People action binding cascade');
}

if(!s.includes(fixedTemplate)) throw new Error('W6B Settings effective-date normalized form not established');
if(!s.includes(registryMarker)) throw new Error('W6B Settings registry action owner not established');
if(!s.includes(jsxAnchorTo)) throw new Error('W6B Settings PodesavanjaScreen JSX owner anchor not established');
if(!s.includes(jsxErrorTo)) throw new Error('W6B Settings structural JSX failure guard not established');
if(!s.includes(jsxInsertTo)) throw new Error('W6B Settings structural JSX insertion not established');
if(!s.includes(cascadeMarker)) throw new Error('W6B renderer API/AppShell type binding cascade not established');

fs.writeFileSync(file,s,'utf8');
console.log(JSON.stringify({state:'W6B_SETTINGS_GENERATOR_REPAIR_APPLIED',owner:'ci/orbita-redesign-wave6b-legend-settings-transform.cjs',repairs,alreadyAdmittedParts:repairs.length===0,physicalOwner:'src/renderer/app/state/useOrganizationRegistryActions.ts',settingsHostOwner:'unique <PodesavanjaScreen host; no line-start assumption',typeBindingOwners:['src/shared/types/global.d.ts','src/renderer/shell/AppShell.tsx'],rules:['idempotent on already-repaired generator','bounded effective-date normalization','renderer API type follows existing updateDemoOrganization sibling','every AppShell organization JSX sink receives Workforce writer','no optional-contract weakening','no parallel product owner','fail closed on unknown semantic drift'],generatedProductBindingChanged:true},null,2));