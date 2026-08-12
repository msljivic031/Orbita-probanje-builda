const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
function appendOnce(file,marker,extra){let s=read(file);if(s.includes(marker))return;write(file,s.trimEnd()+'\n\n'+extra.trim()+'\n');}

const history='src/renderer/screens/ljudi/components/LjudiPersonResponsibilityHistory.tsx';
const templatePath=path.join(__dirname,'templates','LjudiPersonResponsibilityHistory.wave5.tsx');
if(!fs.existsSync(templatePath))throw Error(`Wave5 history template missing: ${templatePath}`);
write(history,fs.readFileSync(templatePath,'utf8'));

const dossier='src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx';
replaceExact(dossier,
`            <span className="eyebrow">Istorija</span>\n            <strong>Odgovornost i izvršenje</strong>`,
`            <span className="eyebrow">Istorija</span>\n            <strong>Dokaziva istorija</strong>`,
'Person history title');
replaceExact(dossier,
`          workCompletionRecords={workCompletionRecords}\n          personById={personById}\n          workTitleById={workTitleById}`,
`          workCompletionRecords={workCompletionRecords}\n          responsibilityRoutes={responsibilityRoutes}\n          availabilityEvents={availabilityEvents}\n          temporalTeamMemberships={temporalTeamMemberships}\n          organizationTeams={organizationTeams}\n          personById={personById}\n          workTitleById={workTitleById}`,
'Person history persisted sources');

const css='src/renderer/styles/canonical/people-operational-closure.css';
appendOnce(css,'.people-history-workspace{',`
/* Design Brain 0.5 · Wave 5: one evidence-backed Person history owner. */
.people-history-workspace{display:grid;gap:12px;min-width:0}
.people-history-projection{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid rgba(41,83,132,.12);border-radius:12px;background:#f7faff}
.people-history-projection>div{display:grid;gap:2px}.people-history-projection strong{color:#173453;font-size:13px}.people-history-projection small{max-width:520px;color:#687c94;font-size:11px;text-align:right}
.people-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.people-history-filters{display:flex;align-items:center;gap:5px;min-width:0;overflow-x:auto;padding:1px}
.people-history-filters button{min-height:32px;padding:0 10px;border:1px solid rgba(49,84,125,.13);border-radius:9px;background:#fff;color:#536981;font-size:11px;font-weight:750;white-space:nowrap}
.people-history-filters button.is-active{border-color:rgba(35,104,199,.30);background:#edf5ff;color:#155cb4;box-shadow:inset 0 -2px 0 #2b72d6}
.people-history-filters button:focus-visible,.people-history-open:focus-visible,.people-history-year select:focus-visible{outline:2px solid rgba(43,114,214,.72);outline-offset:2px}
.people-history-year{display:flex;align-items:center;gap:7px;flex:0 0 auto;color:#6a7d94;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.people-history-year select{min-height:32px;border:1px solid rgba(49,84,125,.14);border-radius:9px;background:#fff;padding:0 28px 0 9px;color:#29445f;font:inherit;text-transform:none;letter-spacing:0}
.people-history-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#778aa0;font-size:10px}.people-history-summary strong{color:#344f6b;font-size:11px}
.people-history-ledger{position:relative;display:grid;border:1px solid rgba(42,78,119,.11);border-radius:13px;background:#fff;overflow:hidden}
.people-history-row{display:grid;grid-template-columns:92px 18px minmax(0,1fr) auto;align-items:start;gap:9px;min-width:0;padding:11px 12px;border-bottom:1px solid rgba(41,78,119,.09)}
.people-history-row:last-child{border-bottom:0}.people-history-row>time{padding-top:3px;color:#667c94;font-size:10px;font-weight:750;font-variant-numeric:tabular-nums}
.people-history-rail{position:relative;align-self:stretch;display:flex;justify-content:center;min-height:48px}.people-history-rail::before{content:"";position:absolute;top:-12px;bottom:-12px;left:50%;width:1px;background:#dbe6f1}.people-history-row:first-child .people-history-rail::before{top:7px}.people-history-row:last-child .people-history-rail::before{bottom:calc(100% - 8px)}
.people-history-rail i{position:relative;z-index:1;width:9px;height:9px;margin-top:5px;border:2px solid #fff;border-radius:50%;background:#6e8eaf;box-shadow:0 0 0 2px #dbe7f3}
.people-history-row.is-route .people-history-rail i{background:#6a62c8}.people-history-row.is-availability .people-history-rail i{background:#25827d}.people-history-row.is-organization .people-history-rail i{background:#607b9b}.people-history-row.is-completion .people-history-rail i{background:#25825d}.people-history-row.is-responsibility .people-history-rail i{background:#2b72d6}
.people-history-copy{display:grid;gap:3px;min-width:0}.people-history-copy>div{display:flex;align-items:center;gap:7px;min-width:0}.people-history-copy strong{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#183552;font-size:12px;white-space:nowrap}.people-history-copy>b{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#0e2946;font-size:13px;white-space:nowrap}.people-history-copy small{color:#6b7f96;font-size:10.5px;line-height:1.35}.people-history-provenance{color:#8495a8!important}
.people-history-kind{flex:0 0 auto;padding:2px 6px;border:1px solid rgba(45,84,128,.10);border-radius:999px;background:#f5f8fb;color:#60758d;font-size:8.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase}
.people-history-open{align-self:center;min-height:32px;padding:0 10px;border:1px solid rgba(38,102,183,.18);border-radius:8px;background:#f4f8fd;color:#1e61ad;font-size:10px;font-weight:800}.people-history-open:hover{background:#eaf3ff}.people-history-record{align-self:center;color:#9aa8b6;font-size:9px;font-weight:750}
.people-history-empty{display:grid;gap:4px;padding:22px;border:1px dashed rgba(48,87,131,.18);border-radius:12px;background:#fafcfe;text-align:center}.people-history-empty strong{color:#314f6d;font-size:12px}.people-history-empty span{color:#7b8da0;font-size:10.5px}
@media(max-width:1100px){.people-history-projection{align-items:flex-start;flex-direction:column}.people-history-projection small{text-align:left}.people-history-toolbar{align-items:flex-start;flex-direction:column}.people-history-year{align-self:flex-end}.people-history-row{grid-template-columns:78px 16px minmax(0,1fr) auto;gap:7px;padding:10px}.people-history-copy>div{align-items:flex-start;flex-direction:column;gap:3px}}
`);

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE5_PERSON_HISTORY',owner:history,template:path.relative(process.cwd(),templatePath),truthSources:['ResponsibilityAssignment','WorkCompletionRecord','ResponsibilityRoute','PersonAvailabilityEvent','TemporalTeamMembership'],projection:'EffectiveResponsibilityProjection kept separate from persisted event ledger',thirdPartyCodeReuse:'NONE'},null,2));