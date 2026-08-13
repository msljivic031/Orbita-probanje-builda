const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const rel='src/renderer/screens/podesavanja/PodesavanjaRulesModal.tsx';
const file=path.join(root,rel);
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const marker='data-orbita-settings-modal-escape="enabled"';
if(!s.includes(marker)){
  const owner='className="settings-rules-modal-backdrop"';
  const count=s.split(owner).length-1;
  if(count!==1)throw Error(`Settings rules modal backdrop owner expected 1, got ${count}`);
  const at=s.indexOf(owner)+owner.length;
  const keyboard=' data-orbita-settings-modal-escape="enabled" onKeyDownCapture={(event) => { if (event.key === \'Escape\') { event.preventDefault(); event.stopPropagation(); onClose(); } }}';
  s=s.slice(0,at)+keyboard+s.slice(at);
}
if(!s.includes(marker)||!s.includes("event.key === 'Escape'")||!s.includes('onKeyDownCapture'))throw Error('Settings Escape-close semantics not established');
fs.writeFileSync(file,s,'utf8');
console.log(JSON.stringify({state:'SETTINGS_MODAL_KEYBOARD_REPAIR_APPLIED',owner:rel,behavior:'Escape is captured by the existing modal backdrop and routes through the existing onClose boundary',parallelOwner:false,routeMutation:false,truthMutation:false},null,2));
