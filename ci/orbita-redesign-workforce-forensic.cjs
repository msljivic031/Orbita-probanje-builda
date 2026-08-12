const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'workforce-forensic.json');
const roots=['src','config'];const files=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|tsx|css|json|sql)$/.test(e.name))files.push(p)}}for(const r of roots)walk(path.join(root,r));
const groups={
 workforce:['workforce','radna snaga','evidencija prisustva','attendance','timesheet'],
 monthly:['monthly','month','mesec','mjesec','calendar month'],
 legend:['legend','legenda','token','oznaka','šifra','sifra'],
 availability:['availability','odsust','absence','leave','bolovanje','godišnji','godisnji'],
 daygrid:['day column','person column','weekend','non-working','neradn','radni dan'],
 export:['export','print','štamp','stamp','pdf','csv','xlsx'],
 history:['history','istor','effectivefrom','effectiveto','validfrom','validto']
};
const hits=[];
for(const f of files){const s=fs.readFileSync(f,'utf8'),low=s.toLowerCase(),matched={};let total=0;for(const [g,terms] of Object.entries(groups)){let n=0;for(const t of terms){let at=0;while((at=low.indexOf(t.toLowerCase(),at))>=0){n++;at+=t.length}}if(n){matched[g]=n;total+=n}}if(total){hits.push({file:path.relative(root,f).replaceAll('\\','/'),total,groups:matched});}}
hits.sort((a,b)=>b.total-a.total||a.file.localeCompare(b.file));
const candidateOwners=hits.filter(x=>/workforce|people|ljudi|settings|podesavanja|calendar|kalendar|report|izvest|legend|attendance|availability/i.test(x.file)).slice(0,120);
const exactNames=[];for(const x of candidateOwners){const p=path.join(root,x.file);if(!/\.(ts|tsx)$/.test(p))continue;const s=fs.readFileSync(p,'utf8');const names=[...s.matchAll(/(?:export\s+)?(?:function|class|const|type|interface)\s+([A-Za-z0-9_]*(?:Workforce|Attendance|Legend|Monthly|Availability)[A-Za-z0-9_]*)/g)].map(m=>m[1]);if(names.length)exactNames.push({file:x.file,names:[...new Set(names)]});}
const result={audit:'ORBITA_WORKFORCE_PHYSICAL_CAPABILITY_FORENSIC',candidateOwners,exactNames,signals:{dedicatedWorkforceFile:files.some(f=>/workforce|attendance|timesheet/i.test(f)),legendNamedSource:exactNames.some(x=>x.names.some(n=>/legend/i.test(n))),monthlyNamedSource:exactNames.some(x=>x.names.some(n=>/monthly/i.test(n))),exportSignals:candidateOwners.filter(x=>x.groups.export).map(x=>x.file).slice(0,30)},caution:'Text/source presence is not runtime closure. A monthly workforce UI must be proven separately before redesign implementation.'};
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({signals:result.signals,top:candidateOwners.slice(0,30)},null,2));