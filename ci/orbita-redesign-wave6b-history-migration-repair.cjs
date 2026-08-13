const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const file=path.join(root,'src/main/persistence/schema/sqliteA419WorkforceLegendSchema.ts');
let s=fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n');
const old="    .replace(/CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?history_events/i, 'CREATE TABLE history_events_a419')";
const next="    .replace(/CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:[\\\"'`\\[])?history_events(?:[\\\"'`\\]])?/i, 'CREATE TABLE history_events_a419')";
const n=s.split(old).length-1;if(n!==1)throw Error(`A4.19 history table rename regex anchor expected 1, got ${n}`);
s=s.replace(old,next);
const execAnchor="  const nextSql = currentSql\n    .replace";
if(!s.includes(execAnchor))throw Error('A4.19 nextSql anchor missing');
const oldExec="  database.exec('PRAGMA foreign_keys = OFF;');";
const guard="  if (/CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?(?:[\\\"'`\\[])?history_events(?:[\\\"'`\\]])?/i.test(nextSql)) {\n    throw new Error('A4.19 history migration failed to rename source table');\n  }\n  database.exec('PRAGMA foreign_keys = OFF;');";
if(!s.includes("A4.19 history migration failed to rename source table")){
  const c=s.split(oldExec).length-1;if(c!==1)throw Error(`A4.19 migration guard anchor expected 1, got ${c}`);s=s.replace(oldExec,guard);
}
fs.writeFileSync(file,s,'utf8');
console.log(JSON.stringify({state:'W6B_A419_HISTORY_MIGRATION_REPAIR_APPLIED',owner:'src/main/persistence/schema/sqliteA419WorkforceLegendSchema.ts',repair:'accept quoted or unquoted sqlite_master history_events CREATE TABLE names and fail closed if rename is not materialized before exec',productSemanticsChanged:false},null,2));
