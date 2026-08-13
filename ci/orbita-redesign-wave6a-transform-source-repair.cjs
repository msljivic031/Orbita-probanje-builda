const fs=require('fs'),path=require('path');
const target=path.resolve(process.argv[2]||'ci/orbita-redesign-wave6a-workforce-grid-transform.cjs');
let source=fs.readFileSync(target,'utf8');
function repairGeneratedTemplate(startMarker,endMarker,label){
  const start=source.indexOf(startMarker); if(start<0) throw Error(label+': start marker missing');
  const end=source.indexOf(endMarker,start+startMarker.length); if(end<0) throw Error(label+': end marker missing');
  const head=source.slice(0,start+startMarker.length);
  const body=source.slice(start+startMarker.length,end);
  const tail=source.slice(end);
  const repaired=body.replace(/(?<!\\)\$\{/g,'\\${');
  source=head+repaired+tail;
}
repairGeneratedTemplate('write(domain,`','`);\n\nconst component=','domain template');
repairGeneratedTemplate('write(component,`','`);\n\nconst ljudi=','component template');
fs.writeFileSync(target,source,'utf8');
console.log(JSON.stringify({state:'REPAIRED_PROOF_TRANSFORM_SOURCE',target:path.basename(target),rule:'Only unescaped ${ inside generated domain/component template bodies is escaped; product source semantics unchanged.'}));