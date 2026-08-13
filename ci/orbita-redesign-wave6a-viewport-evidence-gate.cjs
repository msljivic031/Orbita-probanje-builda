const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(process.argv[2]||'.');
const runs=[{dir:'VISUAL_REDESIGN_W6A_1440',width:1440,height:900},{dir:'VISUAL_REDESIGN_W6A_1366',width:1366,height:768}];
function png(file){const b=fs.readFileSync(file);if(b.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('not png '+file);return{width:b.readUInt32BE(16),height:b.readUInt32BE(20),bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')}}
const out=[];
for(const run of runs){const mf=path.join(root,run.dir,'MANIFEST.json'),m=JSON.parse(fs.readFileSync(mf,'utf8'));if(m?.viewport?.width!==run.width||m?.viewport?.height!==run.height)throw Error(run.dir+' manifest viewport mismatch');const cap=(m.captures||[]).find(x=>String(x.label||'').includes('people-workforce-current-month'));if(!cap)throw Error(run.dir+' Workforce capture missing');const physical=png(path.join(root,run.dir,cap.screenshot));if(physical.width!==run.width||physical.height!==run.height)throw Error(`${run.dir} physical PNG ${physical.width}x${physical.height}`);out.push({...run,screenshot:cap.screenshot,...physical})}
if(out[0].sha256===out[1].sha256)throw Error('Workforce cross-viewport captures are byte-identical');
console.log(JSON.stringify({state:'PASS',proof:'W6A_PHYSICAL_WORKFORCE_VIEWPORT_GATE',captures:out},null,2));