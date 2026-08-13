const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]||'.');
const runs=[{dir:'VISUAL_REDESIGN_W6B_1440',width:1440,height:900},{dir:'VISUAL_REDESIGN_W6B_1366',width:1366,height:768}];
const labels=['settings-workforce-legend-before','settings-workforce-legend-after-save','settings-workforce-legend-after-archive','people-workforce-legend-current-versioned','people-workforce-legend-previous-stable'];
function png(file){const b=fs.readFileSync(file);if(b.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('not png '+file);return{width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}}
function assertPersistedUserLegend(runDir,html){
  const tag=(html.match(/<article[^>]*data-orbita-workforce-legend-kind="available"[^>]*>/)||[])[0];
  if(!tag)throw Error(`${runDir} after-save available legend row missing`);
  if(!/data-orbita-workforce-legend-source="persisted"/.test(tag))throw Error(`${runDir} after-save available legend is not persisted`);
  if(!/data-orbita-workforce-legend-provenance="user"/.test(tag))throw Error(`${runDir} after-save available legend lost user provenance`);
  if(!/data-orbita-workforce-legend-has-visible-effective-from="true"/.test(tag))throw Error(`${runDir} after-save available legend has no visible effective date`);
  if(/data-orbita-workforce-legend-effective-from=""/.test(tag))throw Error(`${runDir} after-save available legend effective date is empty`);
  const start=html.indexOf(tag),end=html.indexOf('</article>',start);
  const row=end>=0?html.slice(start,end+10):html.slice(start,start+2000);
  if(!row.includes('Verzionisana postavka'))throw Error(`${runDir} after-save visible provenance label is not versioned user setting`);
  if(row.includes('Sistemska početna vrednost'))throw Error(`${runDir} after-save user version is mislabeled as system seed`);
}
function assertHumanTruth(runDir,cap,label){
  const dialogs=Array.isArray(cap.activeDialogs)?cap.activeDialogs:[];
  if(label.startsWith('settings-workforce-legend')&&dialogs.length)throw Error(`${runDir} ${label} captured behind dialog: ${dialogs.join(', ')}`);
  if(label.startsWith('settings-workforce-legend')&&String(cap.surface||'').startsWith('dialog:'))throw Error(`${runDir} ${label} surface is dialog, not Workforce Settings`);
  if(cap.html){const html=fs.readFileSync(path.join(root,runDir,cap.html),'utf8');if(/1\.\s*1\.\s*1970|1970-01-01/.test(html))throw Error(`${runDir} ${label} exposes internal system-default 1970 sentinel as user-facing history`);if(label==='settings-workforce-legend-after-save')assertPersistedUserLegend(runDir,html);}
}
const out=[];
for(const run of runs){
  const mf=path.join(root,run.dir,'MANIFEST.json'),m=JSON.parse(fs.readFileSync(mf,'utf8'));
  if(m?.viewport?.width!==run.width||m?.viewport?.height!==run.height)throw Error(run.dir+' manifest viewport mismatch');
  const captures={};
  for(const label of labels){const cap=(m.captures||[]).find(x=>String(x.label||'')===label||String(x.label||'').includes(label));if(!cap)throw Error(`${run.dir} capture missing ${label}`);assertHumanTruth(run.dir,cap,label);const physical=png(path.join(root,run.dir,cap.screenshot));if(physical.width!==run.width||physical.height!==run.height)throw Error(`${run.dir} ${label} physical PNG ${physical.width}x${physical.height}`);captures[label]={screenshot:cap.screenshot,...physical};}
  if(captures['people-workforce-legend-current-versioned'].sha256===captures['people-workforce-legend-previous-stable'].sha256)throw Error(run.dir+' current and previous Workforce legend captures are byte-identical');
  out.push({...run,captures});
}
for(const label of labels)if(out[0].captures[label].sha256===out[1].captures[label].sha256)throw Error(`${label} cross-viewport captures are byte-identical`);
console.log(JSON.stringify({state:'PASS',proof:'W6B_PHYSICAL_VERSIONED_LEGEND_VIEWPORT_GATE',humanTruthGuards:['Workforce Settings captures have no active dialog/overlay','required evidence HTML contains no internal 1970 system-default sentinel','after-save AV row is persisted user provenance with real visible effective date and visible versioned-setting label','current-vs-previous and cross-viewport PNGs are physically distinct'],captures:out},null,2));
