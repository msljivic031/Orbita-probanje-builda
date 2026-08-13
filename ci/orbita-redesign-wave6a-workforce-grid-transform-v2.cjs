const path=require('path'),{spawnSync}=require('child_process');
const here=__dirname;
const target=path.join(here,'orbita-redesign-wave6a-workforce-grid-transform.cjs');
const repair=path.join(here,'orbita-redesign-wave6a-transform-source-repair.cjs');
let result=spawnSync(process.execPath,[repair,target],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);
result=spawnSync(process.execPath,[target,...process.argv.slice(2)],{stdio:'inherit'});process.exit(result.status??1);