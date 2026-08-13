const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else out.push(p);}return out;}
const marker='/* ORBITA W7A DOCUMENTS VISUAL ARCHITECTURE */';
const cssFiles=walk(path.join(root,'src','renderer','styles')).filter(f=>f.endsWith('.css'));
const owners=cssFiles.filter(f=>fs.readFileSync(f,'utf8').includes(marker));
if(owners.length!==1)throw new Error(`W7A CSS owner count ${owners.length}`);
const owner=owners[0];
let css=fs.readFileSync(owner,'utf8').replace(/\r\n/g,'\n');
const oldList=`.documents-workspace-screen .documents-file-list{\n  min-width:0;\n  padding:14px 14px 0;\n  background:#fff;\n}`;
const newList=`.documents-workspace-screen .documents-file-list{\n  display:flex;\n  flex-direction:column;\n  align-items:stretch;\n  justify-content:flex-start;\n  min-width:0;\n  padding:14px 14px 0;\n  background:#fff;\n}`;
if(css.includes(oldList))css=css.replace(oldList,newList);else if(!css.includes(newList))throw new Error('W7A documents-file-list anchor mismatch');
const oldBody=`.documents-workspace-screen .documents-list-body{\n  border-top:1px solid rgba(65,99,139,.08);\n}`;
const newBody=`.documents-workspace-screen .documents-list-body{\n  flex:0 0 auto;\n  align-self:stretch;\n  margin-top:0;\n  border-top:1px solid rgba(65,99,139,.08);\n}`;
if(css.includes(oldBody))css=css.replace(oldBody,newBody);else if(!css.includes(newBody))throw new Error('W7A documents-list-body anchor mismatch');
fs.writeFileSync(owner,css,'utf8');
console.log(JSON.stringify({state:'W7A_ROW_FLOW_REPAIRED_NOT_ADMITTED',owner:path.relative(root,owner).replace(/\\/g,'/'),humanFailClosed:'registry rows no longer allowed to bottom-align inside central column',truthTouched:false},null,2));
