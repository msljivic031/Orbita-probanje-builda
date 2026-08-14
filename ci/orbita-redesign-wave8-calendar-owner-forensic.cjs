const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const src=path.join(root,'src');
if(!fs.existsSync(src))throw new Error('candidate src missing');
function walk(dir){const out=[];for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())out.push(...walk(p));else if(/\.(ts|tsx)$/.test(e.name))out.push(p);}return out;}
function rel(p){return path.relative(root,p).replace(/\\/g,'/');}
function uniq(a){return [...new Set(a)].sort();}
const files=walk(src);
const semantic=[];
for(const file of files){const text=fs.readFileSync(file,'utf8');const r=rel(file);const relevant=/calendar|kalendar|occurrence|series|recurr|scheduled|schedule|datum|rok/i.test(r+' '+text);if(!relevant)continue;
 const exports=uniq([...text.matchAll(/export\s+(?:async\s+)?(?:function|const|class|type|interface|enum)\s+([A-Za-z0-9_]+)/g)].map(m=>m[1]));
 const actions=uniq([...text.matchAll(/data-orbita-action=["'`]([^"'`]+)["'`]/g)].map(m=>m[1]).filter(x=>/calendar|date|schedule|occurr|series/i.test(x)));
 const facts={file:r,exports,actions,routeCalendar:/['"`]kalendar['"`]|['"`]calendar['"`]/i.test(text),selectedDay:/selectedDay|focusedDay|selectedDate|focusedDate/i.test(text),createForDate:/createForFocusedDay|create.*date|calendar-create-for-focused-day/i.test(text),openRad:/calendar-open-(?:primary|next)-dossier|open.*dossier/i.test(text),move:/\bmove\b|premest|pomeri/i.test(text),copy:/\bcopy\b|kopir/i.test(text),series:/series|serij/i.test(text),occurrence:/occurrence|pojavlj|ponavlj/i.test(text),recurrence:/recurr|repeat|ponavlj/i.test(text),drag:/drag|drop|dnd/i.test(text)};
 if(facts.actions.length||facts.routeCalendar||facts.selectedDay||facts.createForDate||facts.openRad||facts.series||facts.occurrence||/calendar|kalendar/i.test(r))semantic.push(facts);
}
const ranked=semantic.sort((a,b)=>{const score=x=>x.actions.length*5+x.exports.length+(x.routeCalendar?4:0)+(x.selectedDay?3:0)+(x.createForDate?3:0)+(x.openRad?3:0)+(x.series?2:0)+(x.occurrence?2:0);return score(b)-score(a);}).slice(0,40);
const summary={state:'PASS',audit:'ORBITA_WAVE8_CALENDAR_OWNER_FORENSIC',sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',candidateFilesScanned:files.length,ownerCandidates:ranked.length,owners:ranked,actionIds:uniq(ranked.flatMap(x=>x.actions)),truth:{singleRouteOwnerCandidates:ranked.filter(x=>x.routeCalendar).map(x=>x.file),selectedDayOwners:ranked.filter(x=>x.selectedDay).map(x=>x.file),createForDateOwners:ranked.filter(x=>x.createForDate).map(x=>x.file),radContinuityOwners:ranked.filter(x=>x.openRad).map(x=>x.file),seriesOwners:ranked.filter(x=>x.series).map(x=>x.file),occurrenceOwners:ranked.filter(x=>x.occurrence).map(x=>x.file),moveOwners:ranked.filter(x=>x.move).map(x=>x.file),copyOwners:ranked.filter(x=>x.copy).map(x=>x.file),dragOwners:ranked.filter(x=>x.drag).map(x=>x.file)},verdict:'READ_ONLY_OWNER_MAP_NOT_WAVE8_ADMISSION'};
console.log(JSON.stringify(summary,null,2));
