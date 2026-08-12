const fs=require('fs'),path=require('path'),Module=require('module');
const root=path.resolve(process.argv[2]||'');if(!root)throw Error('candidate root required');
const file=path.join(root,'src/renderer/styles/canonical/orbita-reports-oi-operational-premium.css');
let s=fs.readFileSync(file,'utf8');const needle='.oi-decision-signal-rail {';const indexes=[];let i=0;while((i=s.indexOf(needle,i))>=0){indexes.push(i);i+=needle.length}if(indexes.length!==3)throw Error(`expected 3 OI signal rail owners (base + 2 media), got ${indexes.length}`);
let seen=0;s=s.replace(/\.oi-decision-signal-rail \{/g,()=>++seen===1?'.oi-decision-signal-rail {':'.oi-decision-signal-rail{');fs.writeFileSync(file,s,'utf8');
const transformPath=path.join(__dirname,'orbita-redesign-wave2-transform.cjs');let code=fs.readFileSync(transformPath,'utf8');code=code.replaceAll('${work.','\\${work.').replaceAll('${status.','\\${status.');
process.argv[2]=root;const m=new Module(transformPath,module);m.filename=transformPath;m.paths=module.paths;m._compile(code,transformPath);