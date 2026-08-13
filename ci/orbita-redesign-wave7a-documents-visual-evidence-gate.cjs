const fs=require('fs'),path=require('path');
const [,,rootArg,widthArg,heightArg]=process.argv;
const root=path.resolve(rootArg||'VISUAL_W7A_DOCS_1440');
const width=Number(widthArg||1440),height=Number(heightArg||900);
function all(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...all(p));else out.push(p);}return out;}
function pngSize(file){const b=fs.readFileSync(file);if(b.length<24||b.toString('ascii',1,4)!=='PNG')throw new Error('invalid PNG '+file);return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};}
const files=all(root);const pngs=files.filter(f=>f.endsWith('.png')),htmls=files.filter(f=>f.endsWith('.html'));
const required=[
 {key:'route',pattern:/route-dokumenti\.png$/,html:/route-dokumenti\.html$/,tokens:['data-orbita-documents-workspace="r4r21"','documents-open-import']},
 {key:'selected',pattern:/documents-selected-document\.png$/,html:/documents-selected-document\.html$/,tokens:['document-dossier-panel','documents-open-managed','documents-review-unlink']},
 {key:'import',pattern:/documents-r4r21-import-workflow\.png$/,html:/documents-r4r21-import-workflow\.html$/,tokens:['documents-import-workflow','documents-import-native','Rad za dokument','Folder dokumenta']},
 {key:'managed',pattern:/documents-r4r21-selected-managed-state\.png$/,html:/documents-r4r21-selected-managed-state\.html$/,tokens:['document-dossier-panel','documents-open-managed']}
];
const evidence=[];
for(const req of required){
 const p=pngs.find(f=>req.pattern.test(f.replace(/\\/g,'/')));if(!p)throw new Error('missing Documents screenshot '+req.key);
 const size=pngSize(p);if(size.width!==width||size.height!==height)throw new Error(`wrong viewport ${req.key} ${size.width}x${size.height}`);
 const h=htmls.find(f=>req.html.test(f.replace(/\\/g,'/')));if(!h)throw new Error('missing Documents HTML '+req.key);
 const text=fs.readFileSync(h,'utf8');for(const token of req.tokens)if(!text.includes(token))throw new Error(`missing ${req.key} HTML invariant ${token}`);
 evidence.push({key:req.key,screenshot:path.relative(root,p).replace(/\\/g,'/'),html:path.relative(root,h).replace(/\\/g,'/'),viewport:size});
}
console.log(JSON.stringify({state:'PASS',gate:'ORBITA_W7A_DOCUMENTS_VISUAL_EVIDENCE',viewport:{width,height},evidence},null,2));
