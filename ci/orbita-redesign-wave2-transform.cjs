const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]||''); if(!root)throw Error('candidate root required');
const read=r=>fs.readFileSync(path.join(root,r),'utf8'); const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1 exact match, got ${n}`);write(file,s.replace(from,to));}
function replaceBlock(file,selector,newBlock,label){let s=read(file);const needle=selector+' {';let at=s.indexOf(needle);if(at<0)throw Error(`${label}: selector not found`);if(s.indexOf(needle,at+1)>=0)throw Error(`${label}: selector duplicated`);const open=s.indexOf('{',at);let depth=0,end=-1;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)throw Error(`${label}: unterminated block`);write(file,s.slice(0,at)+newBlock+s.slice(end));}
function insertAfterBlock(file,selector,extra,label){let s=read(file);const needle=selector+' {';const at=s.indexOf(needle);if(at<0||s.indexOf(needle,at+1)>=0)throw Error(`${label}: owner block ambiguous`);const open=s.indexOf('{',at);let depth=0,end=-1;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)throw Error(`${label}: unterminated`);if(s.includes(extra.trim()))throw Error(`${label}: extra already present`);write(file,s.slice(0,end)+'\n\n'+extra.trim()+'\n'+s.slice(end));}

const radComponent='src/renderer/screens/radovi/workspace/RadoviWorkTable.tsx';
const radCss='src/renderer/styles/canonical/orbita-full-canvas-layout-packing.css';
const oiCss='src/renderer/styles/canonical/orbita-reports-oi-operational-premium.css';
const settingsModal='src/renderer/screens/podesavanja/PodesavanjaRulesModal.tsx';
const statusEditor='src/renderer/screens/podesavanja/StatusLifecycleEditor.tsx';
const reports='src/renderer/screens/izvestaji/IzvestajiScreen.tsx';
const peopleArchive='src/renderer/screens/ljudi/components/LjudiArchiveModal.tsx';

// Radovi: stop treating the narrow central pane as a five-column spreadsheet. Preserve all facts in a two-level work summary.
replaceExact(radComponent,
`          <div className="radovi-idle-list-head radovi-list-head-with-action">\n            <span>Naziv</span>\n            <span>Status</span>\n            <span>Rok</span>\n            <span>Prioritet</span>\n            <span>Akcija</span>\n          </div>`,
`          <div className="radovi-idle-list-head radovi-list-head-with-action">\n            <span>Rad</span>\n            <span>Akcija</span>\n          </div>`,
'Radovi compact header');
replaceExact(radComponent,
`                  <strong>\n                    <OrbitaLineIcon paths={["M6 5h12v14H6z", "M9 9h6", "M9 13h4"]} />\n                    {work.title}\n                    {isWorkSeriesSource(work) ? <small className="radovi-series-kind">Serija</small> : isMaterializedWorkOccurrence(work) ? <small className={\`radovi-series-kind occurrence-${work.seriesContext?.occurrenceState ?? "active"}\`}>Pojava {work.seriesContext?.sourceDate} · {work.seriesContext?.occurrenceState === "skipped" ? "preskočena" : work.seriesContext?.occurrenceState === "cancelled" ? "otkazana" : "aktivna"}</small> : null}\n                  </strong>\n                  <span>{getStatusName(work)}</span>\n                  <span>{formatWorkScheduleCompact(work.schedule, work.mainDueDate)}</span>\n                  <span>{priorityLabel[work.priority]}</span>`,
`                  <div className="radovi-work-row-summary">\n                    <strong>\n                      <OrbitaLineIcon paths={["M6 5h12v14H6z", "M9 9h6", "M9 13h4"]} />\n                      <span className="radovi-work-row-title">{work.title}</span>\n                      {isWorkSeriesSource(work) ? <small className="radovi-series-kind">Serija</small> : isMaterializedWorkOccurrence(work) ? <small className={\`radovi-series-kind occurrence-${work.seriesContext?.occurrenceState ?? "active"}\`}>Pojava {work.seriesContext?.sourceDate} · {work.seriesContext?.occurrenceState === "skipped" ? "preskočena" : work.seriesContext?.occurrenceState === "cancelled" ? "otkazana" : "aktivna"}</small> : null}\n                    </strong>\n                    <span className="radovi-work-row-meta">\n                      <span className="radovi-work-status">{getStatusName(work)}</span>\n                      <span>{formatWorkScheduleCompact(work.schedule, work.mainDueDate)}</span>\n                      <span>{priorityLabel[work.priority]}</span>\n                    </span>\n                  </div>`,
'Radovi row information hierarchy');
replaceBlock(radCss,".app-shell[data-orbita-layout-packing='r4r15'] .radovi-list-head-with-action",
`.app-shell[data-orbita-layout-packing='r4r15'] .radovi-list-head-with-action {\n  grid-template-columns: minmax(0, 1fr) 88px !important;\n  gap: 8px;\n}`,'Radovi canonical header packing');
replaceBlock(radCss,".app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-shell",
`.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-shell {\n  grid-template-columns: minmax(0, 1fr) 88px !important;\n  gap: 8px;\n}`,'Radovi canonical shell packing');
replaceBlock(radCss,".app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-select",
`.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-select {\n  display: block !important;\n  min-width: 0;\n  padding: 8px 10px !important;\n}`,'Radovi canonical row packing');
insertAfterBlock(radCss,".app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-select",
`.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-summary { min-width: 0; display: grid; gap: 5px; }\n.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-summary > strong { min-width: 0; display: flex; align-items: center; gap: 7px; color: #10243f; font-size: 12px; font-weight: 950; }\n.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }\n.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-meta { min-width: 0; display: flex; align-items: center; gap: 7px; color: #60748d; font-size: 10px; font-weight: 800; white-space: nowrap; }\n.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-meta > span { min-width: 0; overflow: hidden; text-overflow: ellipsis; }\n.app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-status { color: #245a9f; font-weight: 900; }`,
'Radovi canonical compact-row owner');

// OI: content-safe signal rail and readable metadata on a light decision surface.
replaceBlock(oiCss,'.oi-decision-signal-rail',
`.oi-decision-signal-rail { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; grid-auto-rows: minmax(82px, auto) !important; align-items: stretch !important; min-height: 82px !important; gap: 8px !important; overflow: visible !important; }`,
'OI signal rail content-safe owner');
replaceBlock(oiCss,'.oi-signal-card',
`.oi-signal-card {\n--signal-tone: var(--decision-blue); min-width: 0; height: auto !important; min-height: 82px !important; border: 1px solid rgba(38,61,98,.10); border-radius: 14px; background: rgba(255,255,255,.96); color: #63748a; display: grid; grid-template-columns: 32px minmax(0,1fr); grid-template-rows: auto auto; align-content: center; column-gap: 8px; row-gap: 5px; padding: 9px 10px; overflow: visible !important; text-align: left; cursor: pointer; font: inherit; transition: border-color .16s ease, background .16s ease, box-shadow .16s ease, transform .16s ease;\n}`,
'OI signal card content-safe owner');
insertAfterBlock(oiCss,'.oi-decision-hero .oi-focus-meta',
`.oi-decision-hero .oi-focus-meta span { padding: 5px 8px; border: 1px solid rgba(49,91,145,.12); border-radius: 999px; background: #eef4fc; color: #365777; font-size: 11px; font-weight: 850; }`,
'OI focus metadata contrast owner');

// Settings: keep the footer text close action, turn duplicated top text action into the standard icon close with an explicit name.
replaceExact(settingsModal,
`          <button className="rad-create-close" onClick={onClose} type="button">Zatvori</button>`,
`          <button aria-label="Zatvori" className="rad-create-close" onClick={onClose} title="Zatvori" type="button">×</button>`,
'Settings top close semantics');

// Status lifecycle: every editable control receives a stable programmatic name, including conditional deactivate controls.
replaceExact(statusEditor,
`        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Na proveri" />`,
`        <input aria-label="Naziv novog statusa" value={name} onChange={(event) => setName(event.target.value)} placeholder="Na proveri" />`,
'Status new name label');
replaceExact(statusEditor,
`        <select value={meaning} onChange={(event) => setMeaning(event.target.value as SystemStatusMeaning)}>`,
`        <select aria-label="Sistemsko značenje novog statusa" value={meaning} onChange={(event) => setMeaning(event.target.value as SystemStatusMeaning)}>`,
'Status new meaning label');
replaceExact(statusEditor,
`        <input value={name} disabled={!active || isWorkspaceWriting} onChange={(event) => setName(event.target.value)} />`,
`        <input aria-label={\`Naziv statusa ${status.name}\`} value={name} disabled={!active || isWorkspaceWriting} onChange={(event) => setName(event.target.value)} />`,
'Status row name label');
replaceExact(statusEditor,
`      <select value={meaning} disabled={!active || system || isWorkspaceWriting} onChange={(event) => setMeaning(event.target.value as SystemStatusMeaning)}>`,
`      <select aria-label={\`Sistemsko značenje statusa ${status.name}\`} value={meaning} disabled={!active || system || isWorkspaceWriting} onChange={(event) => setMeaning(event.target.value as SystemStatusMeaning)}>`,
'Status row meaning label');
replaceExact(statusEditor,
`            <select value={replacementStatusId} onChange={(event) => setReplacementStatusId(event.target.value)}>`,
`            <select aria-label={\`Zamenski status za ${status.name}\`} value={replacementStatusId} onChange={(event) => setReplacementStatusId(event.target.value)}>`,
'Status replacement label');
replaceExact(statusEditor,
`            <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Poslovni razlog" />`,
`            <input aria-label={\`Razlog deaktivacije statusa ${status.name}\`} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Poslovni razlog" />`,
'Status deactivate reason label');

// Reports: make checkbox intent explicit for both the inspector and assistive technology.
replaceExact(reports,
`<input type="checkbox" checked={reportFilters.onlyOpen} onChange={(event) => updateFilter('onlyOpen', event.target.checked)} /> Samo otvoreni`,
`<input aria-label="Samo otvoreni Radovi" type="checkbox" checked={reportFilters.onlyOpen} onChange={(event) => updateFilter('onlyOpen', event.target.checked)} /> Samo otvoreni`,
'Reports open checkbox name');
replaceExact(reports,
`<input type="checkbox" checked={reportFilters.onlyOverdue} onChange={(event) => updateFilter('onlyOverdue', event.target.checked)} /> Samo oni koji kasne`,
`<input aria-label="Samo Radovi koji kasne" type="checkbox" checked={reportFilters.onlyOverdue} onChange={(event) => updateFilter('onlyOverdue', event.target.checked)} /> Samo oni koji kasne`,
'Reports overdue checkbox name');

// People lifecycle modal: icon-only close must always have a name.
replaceExact(peopleArchive,
`          <button className="people-workflow-close" disabled={isWorkspaceWriting} onClick={onClose} type="button"><OrbitaIcon icon="act-close" size={18} /></button>`,
`          <button aria-label="Zatvori" className="people-workflow-close" disabled={isWorkspaceWriting} onClick={onClose} title="Zatvori" type="button"><OrbitaIcon icon="act-close" size={18} /></button>`,
'People archive close name');

// Recompute physical source identity for this non-promoted successor.
const boundaryPath=path.join(root,'.orbita-code-boundary.json'),boundary=JSON.parse(fs.readFileSync(boundaryPath,'utf8')),excluded=new Set(boundary.generatedRootsExcluded||[]),files=[];
function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const full=path.join(d,e.name);if(e.isDirectory()){walk(full);continue}const rel=path.relative(root,full).replaceAll('\\','/');if(rel==='.orbita-code-boundary.json'||excluded.has(rel.split('/')[0]))continue;const data=fs.readFileSync(full);files.push({path:rel,bytes:data.length,sha256:crypto.createHash('sha256').update(data).digest('hex')})}}
walk(root);files.sort((a,b)=>a.path.localeCompare(b.path));const material=files.map(x=>`${x.path}\t${x.bytes}\t${x.sha256}\n`).join(''),identity=crypto.createHash('sha256').update(material).digest('hex');boundary.files=files;boundary.sourceDirectoryIdentitySha256=identity;boundary.developmentSuccessor={lineage:'ORBITA_REDESIGN_WAVE2',kind:'NON_PROMOTED_DESIGNER_BRAIN_0_4_PRODUCT_UX_VISUAL_CANDIDATE',predecessor:'ORBITA_REDESIGN_WAVE1',promotion:'FORBIDDEN_UNTIL_FULL_WINDOWS_VISUAL_FUNCTION_UX_AND_GOVERNANCE_GATES_PASS'};fs.writeFileSync(boundaryPath,JSON.stringify(boundary,null,2)+'\n');
console.log(JSON.stringify({state:'PATCHED_NOT_PROMOTED',sourceIdentitySha256:identity,changedOwners:[radComponent,radCss,oiCss,settingsModal,statusEditor,reports,peopleArchive],intent:['Radovi compact work hierarchy','OI signal content safety','OI light-surface metadata contrast','Settings duplicate-close hierarchy','zero unlabeled known controls']},null,2));