const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'config','inspector','scenarios.json');
const doc=JSON.parse(fs.readFileSync(file,'utf8'));

let settings=null,people=null,ownerArray=null,ownerArrayCount=0;
function visit(node){
  if(!node||typeof node!=='object')return;
  if(Array.isArray(node)){
    const hasSettings=node.some(x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.id==='settings-appearance');
    const hasPeople=node.some(x=>x&&typeof x==='object'&&!Array.isArray(x)&&x.id==='people-select-person');
    if(hasSettings&&hasPeople){ownerArray=node;ownerArrayCount++;}
    node.forEach(visit);return;
  }
  if(node.id==='settings-appearance'){if(settings)throw Error('duplicate settings-appearance');settings=node;}
  if(node.id==='people-select-person'){if(people)throw Error('duplicate people-select-person');people=node;}
  Object.values(node).forEach(visit);
}
visit(doc);
if(!settings||!Array.isArray(settings.steps))throw Error('settings-appearance scenario missing');
if(!people||!Array.isArray(people.steps))throw Error('people-select-person scenario missing');
if(ownerArrayCount!==1||!ownerArray)throw Error(`canonical scenario owner array expected 1, got ${ownerArrayCount}`);

let settingsIndex=ownerArray.indexOf(settings),peopleIndex=ownerArray.indexOf(people);
if(settingsIndex<0||peopleIndex<0)throw Error('canonical scenario owner membership missing');
if(settingsIndex>peopleIndex){ownerArray.splice(settingsIndex,1);peopleIndex=ownerArray.indexOf(people);ownerArray.splice(peopleIndex,0,settings);}
settingsIndex=ownerArray.indexOf(settings);peopleIndex=ownerArray.indexOf(people);
if(settingsIndex+1!==peopleIndex)throw Error('settings-appearance must execute immediately before people-select-person for W6B persisted projection proof');

settings.allowMutation=true;
settings.allowFormInput=true;
const settingsMarker='settings-workforce-legend-after-save';
if(!settings.steps.some(step=>step.type==='capture'&&step.label===settingsMarker)){
  settings.steps.push(
    {type:'click',selector:'button[aria-label="Zatvori"]'},
    {type:'wait',milliseconds:180},
    {type:'click',selector:'[data-orbita-settings-section="workforce"]'},
    {type:'wait',milliseconds:250},
    {type:'assertVisible',selector:'[data-orbita-workforce-legend-settings="ready"]'},
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
    {type:'capture',label:'settings-workforce-legend-after-archive'}
  );
}

const peopleMarker='people-workforce-legend-current-versioned';
if(!people.steps.some(step=>step.type==='capture'&&step.label===peopleMarker)){
  const w6aCurrent=people.steps.some(step=>step.type==='capture'&&step.label==='people-workforce-current-month');
  const w6aPrevious=people.steps.some(step=>step.type==='capture'&&step.label==='people-workforce-previous-month');
  if(!w6aCurrent||!w6aPrevious)throw Error('W6A people Workforce scenario foundation missing');
  people.steps.push(
    {type:'click',selector:'[data-orbita-action="people-open-workforce"]'},
    {type:'wait',milliseconds:260},
    {type:'assertAttribute',selector:'[data-orbita-workforce="monthly-sheet"]',attribute:'data-orbita-workforce',value:'monthly-sheet'},
    {type:'wait',milliseconds:300},
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
console.log(JSON.stringify({scenarios:[settings.id,people.id],executionOrder:'settings-appearance -> people-select-person',routeLaw:{settings:'podesavanja-only captures',people:'ljudi-only captures'},required:{settings:settings.required,people:people.required},settingsActions:['settings-workforce-legend-save','settings-workforce-legend-archive'],captures:['settings-workforce-legend-before','settings-workforce-legend-after-save','settings-workforce-legend-after-archive','people-workforce-legend-current-versioned','people-workforce-legend-previous-stable'],truth:['appearance modal is physically closed through its real accessible close control before Workforce evidence','Settings persists AV version and field_work archive through visible real UI before People projection scenario runs','no cross-route capture inside a canonical scenario','reopening Workforce resets to current month; current proves D and AV, previous preserves D and hides AV','strict canonical route invariant remains intact']},null,2));