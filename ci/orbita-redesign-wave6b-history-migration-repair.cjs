const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const a419File=path.join(root,'src/main/persistence/schema/sqliteA419WorkforceLegendSchema.ts');
const a418File=path.join(root,'src/main/persistence/schema/sqliteA418TemporalResponsibilitySchema.ts');
let a419=fs.readFileSync(a419File,'utf8').replace(/\r\n/g,'\n');
const a418=fs.readFileSync(a418File,'utf8').replace(/\r\n/g,'\n');
function functionBlock(source,name){const m=new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*(?::\\s*[^\\{]+)?\\s*\\{`).exec(source);if(!m)throw Error(`function ${name} missing`);const start=m.index,brace=source.indexOf('{',m.index),q=[];let quote=null,esc=false,depth=0;for(let i=brace;i<source.length;i++){const c=source[i];if(quote){if(esc)esc=false;else if(c==='\\')esc=true;else if(c===quote)quote=null;continue}if(c==='"'||c==="'"||c==='`'){quote=c;continue}if(c==='{')depth++;else if(c==='}'&&--depth===0)return{start,end:i+1,text:source.slice(start,i+1)}}throw Error(`function ${name} unbalanced`)}
const source=functionBlock(a418,'ensureHistoryTypes').text;
let clone=source
  .replace('function ensureHistoryTypes','function ensureA419HistoryType')
  .replace('if (REQUIRED_HISTORY_TYPES.every((type) => readHistoryEventsTableSql(database).includes(type))) return;',`if (readHistoryEventsTableSql(database).includes("'workforce_legend_changed'")) return;`)
  .replaceAll('history_events_a418','history_events_a419');
const historyAnchor="        'organization_created', 'organization_changed', 'team_created',";
if(!clone.includes(historyAnchor))throw Error('A4.18 organization history type anchor missing');
clone=clone.replace(historyAnchor,"        'organization_created', 'organization_changed', 'workforce_legend_changed', 'team_created',");
if(!clone.includes("'workforce_legend_changed'"))throw Error('A4.19 cloned history type missing');
const current=functionBlock(a419,'ensureA419HistoryType');
a419=a419.slice(0,current.start)+clone+a419.slice(current.end);
if(!a419.includes('ensureA419HistoryType(database);'))throw Error('A4.19 ensure call missing after repair');
fs.writeFileSync(a419File,a419,'utf8');
console.log(JSON.stringify({state:'W6B_A419_HISTORY_MIGRATION_REPAIR_APPLIED',owner:'src/main/persistence/schema/sqliteA419WorkforceLegendSchema.ts',sourcePattern:'src/main/persistence/schema/sqliteA418TemporalResponsibilitySchema.ts::ensureHistoryTypes',repair:'reuse the physically proven A4.18 explicit history_events rebuild pattern, with only workforce_legend_changed added and a419 temporary-table identity',productSemanticsChanged:false,noSqliteMasterCreateTableRegex:true},null,2));
