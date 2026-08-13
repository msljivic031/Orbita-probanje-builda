const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>{const p=path.join(root,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r\n/g,'\n'),'utf8')};
function once(s,from,to,label){const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);return s.replace(from,to)}
function walk(dir){if(!fs.existsSync(dir))return[];let out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out=out.concat(walk(p));else if(e.isFile()&&/\.(ts|tsx)$/.test(e.name))out.push(p)}return out}

const component='src/renderer/screens/podesavanja/WorkforceLegendSettings.tsx';
write(component,`import { useMemo, useState } from 'react';
import type { Workspace } from '../../../domain/workspace/workspaceTypes';
import { workforceLegendEntriesForDate } from '../../../domain/people/workforceLegend';
import type { EffectiveWorkforceLegendEntry, WorkforceLegendSemanticCategory } from '../../../domain/people/workforceLegend';
import type { UpdateWorkforceLegendRequest } from '../../../shared/contracts/persistence/persistenceTypes';

type Props = {
  workspace: Workspace;
  actorPersonId?: string;
  isWorkspaceWriting: boolean;
  onUpdateWorkforceLegend: (request: UpdateWorkforceLegendRequest) => Promise<void>;
};

type Editor = {
  kind: EffectiveWorkforceLegendEntry['kind'];
  token: string;
  displayName: string;
  semanticCategory: WorkforceLegendSemanticCategory;
  sortOrder: number;
};

const CATEGORY_OPTIONS: Array<{ value: WorkforceLegendSemanticCategory; label: string }> = [
  { value: 'available', label: 'Dostupnost' },
  { value: 'leave', label: 'Odsustvo / odmor' },
  { value: 'field', label: 'Teren' },
  { value: 'blocked', label: 'Blokada' },
  { value: 'absence', label: 'Drugo odsustvo' },
];

function sourceLabel(entry: EffectiveWorkforceLegendEntry) {
  if (entry.source === 'persisted') return 'Verzionisana postavka';
  if (entry.source === 'archived_fallback') return 'Arhivirana · sistemski fallback';
  return 'Sistemska početna vrednost';
}

export function WorkforceLegendSettings({ workspace, actorPersonId, isWorkspaceWriting, onUpdateWorkforceLegend }: Props) {
  const [editor, setEditor] = useState<Editor>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const now = new Date().toISOString();
  const entries = useMemo(() => workforceLegendEntriesForDate(workspace.workforceLegendVersions, now), [workspace.workforceLegendVersions, now.slice(0, 10)]);
  const blocked = isWorkspaceWriting || saving || !actorPersonId;

  function edit(entry: EffectiveWorkforceLegendEntry) {
    setError('');
    setEditor({ kind: entry.kind, token: entry.token, displayName: entry.name, semanticCategory: entry.category, sortOrder: entry.order });
  }

  async function commit(isArchived: boolean) {
    if (!editor || !actorPersonId || blocked) return;
    setSaving(true); setError('');
    try {
      await onUpdateWorkforceLegend({
        availabilityKind: editor.kind,
        token: editor.token.trim(),
        displayName: editor.displayName.trim(),
        semanticCategory: editor.semanticCategory,
        sortOrder: editor.sortOrder,
        isArchived,
        effectiveFrom: new Date().toISOString(),
        actorId: actorPersonId,
        reasonCode: isArchived ? 'settings_workforce_legend_archive' : 'settings_workforce_legend_version',
      });
      setEditor(undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Promena Workforce legende nije sačuvana.');
    } finally { setSaving(false); }
  }

  return (
    <div className="settings-workforce-legend" data-orbita-workforce-legend-settings="ready">
      <div className="settings-info-grid">
        <article><span>Istorijska istina</span><strong>Verzije po datumu</strong><p>Promena oznake ne prepisuje značenje prethodnih meseci.</p></article>
        <article><span>Vlasnik</span><strong>Workforce · Ljudi</strong><p>Legenda se koristi u istoj mesečnoj tabeli, bez paralelnog sistema.</p></article>
      </div>
      <div className="settings-rule-list" data-orbita-workforce-legend-list="true">
        {entries.map((entry) => (
          <article className="settings-rule-row" key={entry.kind} data-orbita-workforce-legend-kind={entry.kind}>
            <div><span>{sourceLabel(entry)}{entry.effectiveFrom ? ` · važi od ${new Date(entry.effectiveFrom).toLocaleDateString('sr-RS')}` : ''}</span><strong>{entry.token} · {entry.name}</strong><p>{CATEGORY_OPTIONS.find((item) => item.value === entry.category)?.label ?? entry.category} · redosled {entry.order}</p></div>
            <button type="button" disabled={blocked} onClick={() => edit(entry)}>Uredi verziju</button>
          </article>
        ))}
      </div>
      {editor ? (
        <section className="settings-rule-row settings-workforce-legend-editor" data-orbita-workforce-legend-editor={editor.kind}>
          <div>
            <span>Nova efektivna verzija · {editor.kind}</span>
            <strong>Istorija ostaje nepromenjena</strong>
            <div className="settings-workforce-legend-fields">
              <label>Oznaka<input aria-label="Workforce oznaka" maxLength={8} value={editor.token} onChange={(event) => setEditor({ ...editor, token: event.target.value })} /></label>
              <label>Naziv<input aria-label="Workforce naziv" maxLength={80} value={editor.displayName} onChange={(event) => setEditor({ ...editor, displayName: event.target.value })} /></label>
              <label>Kategorija<select aria-label="Workforce kategorija" value={editor.semanticCategory} onChange={(event) => setEditor({ ...editor, semanticCategory: event.target.value as WorkforceLegendSemanticCategory })}>{CATEGORY_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label>Redosled<input aria-label="Workforce redosled" type="number" min={0} max={10000} value={editor.sortOrder} onChange={(event) => setEditor({ ...editor, sortOrder: Number(event.target.value) })} /></label>
            </div>
            {error ? <p role="alert">{error}</p> : null}
          </div>
          <div className="people-work-impact-actions">
            <button type="button" onClick={() => setEditor(undefined)} disabled={saving}>Otkaži</button>
            <button type="button" data-orbita-action="settings-workforce-legend-archive" onClick={() => void commit(true)} disabled={blocked}>Arhiviraj od sada</button>
            <button type="button" data-orbita-action="settings-workforce-legend-save" onClick={() => void commit(false)} disabled={blocked || !editor.token.trim() || !editor.displayName.trim()}>{saving ? 'Čuvanje…' : 'Sačuvaj novu verziju'}</button>
          </div>
        </section>
      ) : null}
      {!actorPersonId ? <p role="status">Promena je zaključana jer trenutni akter nije pouzdano razrešen.</p> : null}
    </div>
  );
}
`);

const settings='src/renderer/screens/podesavanja/PodesavanjaScreen.tsx';
let set=read(settings);
if(!set.includes("UpdateWorkforceLegendRequest")) set=set.replace("import { PRIORITY_RULE_COUNT, SettingsRulesModal } from './PodesavanjaRulesModal';", "import type { UpdateWorkforceLegendRequest } from '../../../shared/contracts/persistence/persistenceTypes';\nimport { WorkforceLegendSettings } from './WorkforceLegendSettings';\nimport { PRIORITY_RULE_COUNT, SettingsRulesModal } from './PodesavanjaRulesModal';");
if(!set.includes("| 'workforce'")) set=once(set,"  | 'responsibility'\n  | 'documents'","  | 'responsibility'\n  | 'workforce'\n  | 'documents'",'SettingsSectionId workforce');
const oldSig="export function PodesavanjaScreen({ workspace, isWorkspaceWriting, onCreateDemoStatusDefinition, onUpdateDemoStatusDefinition, onDeactivateDemoStatusDefinition }: { workspace: Workspace; isWorkspaceWriting: boolean; onCreateDemoStatusDefinition: (request: CreateDemoStatusDefinitionRequest) => Promise<void>; onUpdateDemoStatusDefinition: (request: UpdateDemoStatusDefinitionRequest) => Promise<void>; onDeactivateDemoStatusDefinition: (request: DeactivateDemoStatusDefinitionRequest) => Promise<void> })";
const newSig="export function PodesavanjaScreen({ workspace, isWorkspaceWriting, onCreateDemoStatusDefinition, onUpdateDemoStatusDefinition, onDeactivateDemoStatusDefinition, onUpdateWorkforceLegend }: { workspace: Workspace; isWorkspaceWriting: boolean; onCreateDemoStatusDefinition: (request: CreateDemoStatusDefinitionRequest) => Promise<void>; onUpdateDemoStatusDefinition: (request: UpdateDemoStatusDefinitionRequest) => Promise<void>; onDeactivateDemoStatusDefinition: (request: DeactivateDemoStatusDefinitionRequest) => Promise<void>; onUpdateWorkforceLegend: (request: UpdateWorkforceLegendRequest) => Promise<void> })";
if(!set.includes('onUpdateWorkforceLegend }: { workspace')) set=once(set,oldSig,newSig,'PodesavanjaScreen signature');
if(!set.includes("{ id: 'workforce'")) set=once(set,"    { id: 'responsibility', label: 'Ljudi i odgovornost', detail: `${activePeople.length} osoba · ${activeTeams.length} jedinica` },","    { id: 'responsibility', label: 'Ljudi i odgovornost', detail: `${activePeople.length} osoba · ${activeTeams.length} jedinica` },\n    { id: 'workforce', label: 'Workforce legenda', detail: `${workspace.workforceLegendVersions?.length ?? 0} verzija · istorijski` },",'Settings section nav');
if(!set.includes("activeSection === 'workforce'")){
  const anchor="    if (activeSection === 'documents') {";
  if(!set.includes(anchor))throw Error('Settings documents render anchor missing');
  const branch=`    if (activeSection === 'workforce') {\n      return (\n        <SettingsPanel title=\"Workforce legenda\" kicker=\"verzionisana istina\" description=\"Oznake dostupnosti menjaju se novom efektivnom verzijom; prethodni meseci zadržavaju značenje koje su imali tog datuma.\">\n          <WorkforceLegendSettings workspace={workspace} actorPersonId={actorPersonId} isWorkspaceWriting={isWorkspaceWriting} onUpdateWorkforceLegend={onUpdateWorkforceLegend} />\n        </SettingsPanel>\n      );\n    }\n\n`;
  set=set.replace(anchor,branch+anchor);
}
write(settings,set);

const contracts='src/renderer/app/workspaceActionContracts.ts';
let wc=read(contracts);
if(!wc.includes("UpdateWorkforceLegendRequest")) wc=`import type { UpdateWorkforceLegendRequest } from '../../shared/contracts/persistence/persistenceTypes';\n`+wc;
if(!wc.includes('onUpdateWorkforceLegend:')) wc=once(wc,'  onUpdateDemoOrganization: (request: UpdateDemoOrganizationRequest) => Promise<void>;','  onUpdateDemoOrganization: (request: UpdateDemoOrganizationRequest) => Promise<void>;\n  onUpdateWorkforceLegend: (request: UpdateWorkforceLegendRequest) => Promise<void>;','PeopleWorkspaceActions legend write');
write(contracts,wc);

const orgHook='src/renderer/app/state/useOrganizationCommandActions.ts';
let oh=read(orgHook);
if(!oh.includes('UpdateWorkforceLegendRequest')) oh=`import type { UpdateWorkforceLegendRequest } from '../../../shared/contracts/persistence/persistenceTypes';\n`+oh;
if(!oh.includes('const updateWorkforceLegend = useCallback')){
  const start=oh.indexOf('  const updateDemoOrganization = useCallback');
  const end=oh.indexOf('  const createDemoPerson = useCallback',start);
  if(start<0||end<0)throw Error('organization action clone boundaries missing');
  let clone=oh.slice(start,end);
  clone=clone.replaceAll('UpdateDemoOrganizationRequest','UpdateWorkforceLegendRequest').replaceAll('updateDemoOrganization','updateWorkforceLegend');
  oh=oh.slice(0,end)+clone+oh.slice(end);
}
if(!/return\s*\{[\s\S]*updateWorkforceLegend,/.test(oh)){
  const ret=oh.lastIndexOf('  return {'); if(ret<0)throw Error('organization hook return missing');
  const tail=oh.slice(ret);
  const patched=once(tail,'    updateDemoOrganization,','    updateDemoOrganization,\n    updateWorkforceLegend,','organization hook return workforce');
  oh=oh.slice(0,ret)+patched;
}
write(orgHook,oh);

const appState='src/renderer/app/appState.ts';
let as=read(appState);
if(!as.includes('    updateWorkforceLegend,')){
  const matches=[...as.matchAll(/^    updateDemoOrganization,$/gm)];
  if(matches.length!==2)throw Error(`appState updateDemoOrganization line count expected 2, got ${matches.length}`);
  as=as.replace(/^    updateDemoOrganization,$/gm,'    updateDemoOrganization,\n    updateWorkforceLegend,');
}
write(appState,as);

const app='src/renderer/App.tsx';
let ap=read(app);
if(!ap.includes('onUpdateWorkforceLegend={state.updateWorkforceLegend}')) ap=once(ap,'      onUpdateDemoOrganization={state.updateDemoOrganization}','      onUpdateDemoOrganization={state.updateDemoOrganization}\n      onUpdateWorkforceLegend={state.updateWorkforceLegend}','App shell Workforce action');
write(app,ap);

const rendererFiles=walk(path.join(root,'src/renderer'));
const hosts=rendererFiles.filter(p=>fs.readFileSync(p,'utf8').includes('<PodesavanjaScreen'));
if(hosts.length!==1)throw Error(`PodesavanjaScreen host count expected 1, got ${hosts.length}: ${hosts.map(p=>path.relative(root,p)).join(',')}`);
const hostRel=path.relative(root,hosts[0]).replace(/\\/g,'/');
let host=fs.readFileSync(hosts[0],'utf8').replace(/\r\n/g,'\n');
if(!host.includes('onUpdateWorkforceLegend=')){
  const jsx=/^(\s*)onUpdateDemoStatusDefinition=\{([^}]+)\}/m.exec(host);
  if(!jsx)throw Error(`Settings host ${hostRel} missing status JSX anchor`);
  host=host.slice(0,jsx.index+jsx[0].length)+`\n${jsx[1]}onUpdateWorkforceLegend={onUpdateWorkforceLegend}`+host.slice(jsx.index+jsx[0].length);
}
if(!/(^|\n)\s*onUpdateWorkforceLegend,/.test(host)){
  const org=/^(\s*)onUpdateDemoOrganization,$/m.exec(host);
  const status=/^(\s*)onUpdateDemoStatusDefinition,$/m.exec(host);
  const anchor=org||status;
  if(!anchor)throw Error(`Settings host ${hostRel} has no destructured organization/status action anchor for Workforce`);
  host=host.slice(0,anchor.index+anchor[0].length)+`\n${anchor[1]}onUpdateWorkforceLegend,`+host.slice(anchor.index+anchor[0].length);
}
fs.writeFileSync(hosts[0],host,'utf8');

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE6B_LEGEND_SETTINGS',state:'IMPLEMENTED_NOT_ADMITTED',newOwner:component,settingsOwner:settings,actionOwner:contracts,stateOwner:appState,organizationHookOwner:orgHook,appOwner:app,settingsHost:hostRel,truth:['existing Settings root extended','current actor reused','existing workspace writing lock reused','PeopleWorkspaceActions/App chain reused','save/archive append new effective version through backend channel','no renderer-only legend truth'],notYetClaimed:['type/build PASS','runtime save through IPC','visual/human PASS','print/export']},null,2));
