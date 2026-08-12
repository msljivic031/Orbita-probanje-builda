const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'redesign-evidence/wave2-precision.json');
const skip=new Set(['node_modules','dist','build','out','.git']);const files=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){if(skip.has(e.name))continue;const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(tsx?|css)$/.test(e.name))files.push(p)}}walk(root);const rel=p=>path.relative(root,p).replaceAll('\\','/');
function source(needles,filter=()=>true,radius=20){const out=[];for(const p of files.filter(x=>/\.tsx?$/.test(x)&&filter(rel(x)))){const s=fs.readFileSync(p,'utf8'),ls=s.split(/\r?\n/);for(const needle of needles)ls.forEach((t,i)=>{if(t.includes(needle)){const a=Math.max(0,i-radius),b=Math.min(ls.length,i+radius+1);out.push({needle,file:rel(p),line:i+1,text:ls.slice(a,b).map((x,j)=>`${a+j+1}: ${x}`).join('\n')})}})}return out}
function css(selectors){const out=[];for(const p of files.filter(x=>x.endsWith('.css'))){const s=fs.readFileSync(p,'utf8');for(const selector of selectors){let i=0;while((i=s.indexOf(selector,i))>=0){const a=s.lastIndexOf('}',i)+1,b=s.indexOf('}',i);if(b<0)break;const block=s.slice(a,b+1).trim();if(block.length<12000)out.push({selector,file:rel(p),line:s.slice(0,a).split(/\r?\n/).length,block});i+=selector.length}}}return out}
const report={audit:'ORBITA_REDESIGN_WAVE2_PRECISION',
 oiRailCss:css(['.oi-signal-strip','.oi-decision-signal-rail','.oi-decision-workspace','.oi-signal-card']),
 radoviCanonical:css([".app-shell[data-orbita-layout-packing='r4r15'] .radovi-list-head-with-action",".app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-shell",".app-shell[data-orbita-layout-packing='r4r15'] .radovi-work-row-select"]),
 settingsStatus:source(['StatusLifecycleEditor','<input','type="color"','type="checkbox"','aria-label','<label'],r=>r.includes('/podesavanja/'),28),
 reportsInputs:source(['report-check-filter','onlyOpen','onlyOverdue'],r=>r.includes('/izvestaji/'),20),
 peopleArchive:source(['people-workflow-close','Arhiviraj strukturu','selectedStructureName'],r=>r.includes('/ljudi/'),20),
 settingsModal:source(['settings-rules-modal-footer','rad-create-close','onClose'],r=>r.includes('/podesavanja/PodesavanjaRulesModal.tsx'),22)
};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(Object.fromEntries(Object.entries(report).filter(([k])=>k!=='audit').map(([k,v])=>[k,v.length]))));