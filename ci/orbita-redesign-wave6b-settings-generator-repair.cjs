const fs=require('fs'),path=require('path');
const file=path.resolve(__dirname,'orbita-redesign-wave6b-legend-settings-transform.cjs');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');

const templateFrom="{entry.effectiveFrom ? ` · važi od ${new Date(entry.effectiveFrom).toLocaleDateString('sr-RS')}` : ''}";
const templateTo="{entry.effectiveFrom ? ' · važi od ' + new Date(entry.effectiveFrom).toLocaleDateString('sr-RS') : ''}";
const templateCount=s.split(templateFrom).length-1;
if(templateCount!==1) throw new Error(`W6B Settings generator nested-template repair expected 1, got ${templateCount}`);
s=s.replace(templateFrom,templateTo);

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

const orgBlock=/const orgHook='src\/renderer\/app\/state\/useOrganizationCommandActions\.ts';[\s\S]*?write\(orgHook,oh\);/;
if(!orgBlock.test(s)) throw new Error('W6B Settings old organization aggregator mutation block missing');
s=s.replace(orgBlock,registryBlock);

fs.writeFileSync(file,s,'utf8');
console.log(JSON.stringify({state:'W6B_SETTINGS_GENERATOR_REPAIR_APPLIED',owner:'ci/orbita-redesign-wave6b-legend-settings-transform.cjs',repairs:['remove nested TSX template literal from generator body','move Workforce legend mutation binding from organization aggregator to physically proven useOrganizationRegistryActions owner','preserve Settings route while reusing bridge/write-state/workspace-refresh/fail-closed behavior'],physicalOwner:'src/renderer/app/state/useOrganizationRegistryActions.ts',generatedProductBindingChanged:true},null,2));
