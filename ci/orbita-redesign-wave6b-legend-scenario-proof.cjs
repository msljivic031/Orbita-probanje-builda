const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));
let target=null;
function visit(node){if(!node||typeof node!=='object')return;if(!Array.isArray(node)&&node.id==='settings-appearance'){if(target)throw Error('duplicate settings-appearance');target=node;return}if(Array.isArray(node))node.forEach(visit);else Object.values(node).forEach(visit)}
visit(doc);
if(!target||!Array.isArray(target.steps))throw Error('settings-appearance scenario missing');
target.allowMutation=true;
target.allowFormInput=true;
const marker='settings-workforce-legend-after-save';
if(!target.steps.some(step=>step.type==='capture'&&step.label===marker)){
  target.steps.push(
    {type:'click',selector:'[data-orbita-settings-section="workforce"]'},
    {type:'wait',milliseconds:250},
    {type:'assertAttribute',selector:'[data-orbita-workforce-legend-settings="ready"]',attribute:'data-orbita-workforce-legend-settings',value:'ready'},
    {type:'capture',label:'settings-workforce-legend-before'},
    {type:'click',selector:'[data-orbita-workforce-legend-kind="available"] button'},
    {type:'wait',milliseconds:180},
    {type:'fill',selector:'input[aria-label="Workforce oznaka"]',value:'AV'},
    {type:'fill',selector:'input[aria-label="Workforce naziv"]',value:'Dostupan potvrđeno'},
    {type:'click',selector:'[data-orbita-action="settings-workforce-legend-save"]'},
    {type:'wait',milliseconds:800},
    {type:'assertAttribute',selector:'[data-orbita-workforce-legend-kind="available"]',attribute:'data-orbita-workforce-legend-token',value:'AV'},
    {type:'capture',label:'settings-workforce-legend-after-save'},
    {type:'click',selector:'[data-orbita-workforce-legend-kind="field_work"] button'},
    {type:'wait',milliseconds:180},
    {type:'click',selector:'[data-orbita-action="settings-workforce-legend-archive"]'},
    {type:'wait',milliseconds:800},
    {type:'assertAttribute',selector:'[data-orbita-workforce-legend-kind="field_work"]',attribute:'data-orbita-workforce-legend-source',value:'archived_fallback'},
    {type:'capture',label:'settings-workforce-legend-after-archive'},
    {type:'click',selector:'[data-orbita-route="ljudi"]'},
    {type:'wait',milliseconds:300},
    {type:'click',selector:'.people-network-org-button'},
    {type:'wait',milliseconds:260},
    {type:'click',selector:'[data-orbita-action="people-open-workforce"]'},
    {type:'wait',milliseconds:350},
    {type:'assertAttribute',selector:'[data-orbita-workforce="monthly-sheet"]',attribute:'data-orbita-workforce',value:'monthly-sheet'},
    {type:'assertVisible',selector:'[data-orbita-workforce-legend-token="D"]'},
    {type:'assertVisible',selector:'[data-orbita-workforce-legend-token="AV"]'},
    {type:'capture',label:'people-workforce-legend-current-versioned'},
    {type:'click',selector:'button[aria-label="Prethodni mesec"]'},
    {type:'wait',milliseconds:300},
    {type:'assertVisible',selector:'[data-orbita-workforce-legend-token="D"]'},
    {type:'assertHidden',selector:'[data-orbita-workforce-legend-token="AV"]'},
    {type:'capture',label:'people-workforce-legend-previous-stable'},
    {type:'click',selector:'[data-orbita-action="people-open-workforce"]'},
    {type:'wait',milliseconds:220}
  );
}
fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n');
console.log(JSON.stringify({scenario:target.id,required:target.required,allowMutation:target.allowMutation,allowFormInput:target.allowFormInput,settingsEntry:'semantic-section-id',directActions:['settings-workforce-legend-save','settings-workforce-legend-archive','people-open-workforce'],captures:['settings-workforce-legend-before','settings-workforce-legend-after-save','settings-workforce-legend-after-archive','people-workforce-legend-current-versioned','people-workforce-legend-previous-stable'],truth:['real Settings owner is used','Save appends AV effective version through real UI','Archive appends field_work archive through real UI','current month shows D and AV meanings','previous month hides AV and preserves D']},null,2));
