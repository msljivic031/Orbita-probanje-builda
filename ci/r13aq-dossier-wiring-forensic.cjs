const fs=require('fs'),path=require('path');
const root=process.argv[2];if(!root)throw Error('candidate root required');
function shape(file,token,radius=28){const text=fs.readFileSync(path.join(root,file),'utf8'),lines=text.split(/\r?\n/),c=lines.findIndex(l=>l.includes(token));if(c<0)return{file,token,found:false};const out=[];for(let i=Math.max(0,c-radius);i<=Math.min(lines.length-1,c+radius);i++){const l=lines[i];const tags=[...l.matchAll(/<\/?([A-Za-z][A-Za-z0-9.]*)/g)].map(m=>m[1]);const strings=[...l.matchAll(/["'`]([^"'`\n]{1,100})["'`]/g)].map(m=>m[1]).filter(s=>/[A-Za-zČĆŽŠĐčćžšđ]/.test(s));const ids=[...l.matchAll(/\b([A-Za-z_$][A-Za-z0-9_$]{2,})\b/g)].map(m=>m[1]).filter(x=>!['className','return','const','button','section','true','false','null','undefined','type'].includes(x));const data=[...l.matchAll(/data-orbita-([a-z0-9-]+)\s*=\s*["']([^"']+)["']/gi)].map(m=>`data-orbita-${m[1]}=${m[2]}`);if(tags.length||strings.length||data.length||i===c||/[?:&|]/.test(l))out.push({line:i+1,relative:i-c,tags:[...new Set(tags)],strings:[...new Set(strings)].slice(0,8),identifiers:[...new Set(ids)].slice(0,20),dataAttrs:[...new Set(data)],tokenLine:i===c});}return{file,token,found:true,line:c+1,shape:out};}
const report={schemaVersion:1,audit:'R13AQ_DOSSIER_WIRING_SANITIZED_FORENSIC',items:[
 shape('src/renderer/screens/ljudi/LjudiScreen.tsx','<LjudiPersonDossier',34),
 shape('src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx','export function LjudiPersonDossier',30),
 shape('src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx','<LjudiAvailabilityFoundationPanel',34)
],state:'PASS'};
console.log(JSON.stringify(report,null,2));
