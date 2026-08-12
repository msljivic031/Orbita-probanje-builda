const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'workforce-bounded-source.json');
const targets={
 'src/domain/people/availabilityEvents.ts':['isAvailabilityEventActiveOn','buildPersonAvailabilityFoundation','availabilityFromEventKind'],
 'src/domain/reports/responsibilityAvailabilitySnapshot.ts':['membershipActiveAt','activeMembershipsForPerson','availabilitySnapshot','buildResponsibilityAvailabilitySnapshotReport'],
 'src/domain/people/temporalTeamMembership.ts':['TemporalTeamMembership','boundaryConfidence','validFrom','validTo'],
 'src/renderer/screens/radovi/create/RadCreateModalDatePlanner.tsx':['weekend','radni','neradni','getDay'],
 'src/renderer/screens/radovi/dossier/edit/radDossierEditDatePlan.ts':['weekend','radni','neradni','getDay'],
 'src/domain/reports/reportExportPlan.ts':['export','format','scope','build'],
 'src/domain/reports/reportExportScope.ts':['export','scope','period'],
 'src/domain/reports/reportPeriod.ts':['buildReportPeriod','startDate','endDate'],
 'src/renderer/screens/ljudi/LjudiScreen.tsx':['mode','selectedOrganization','Dossier','workspace','primary'],
 'src/renderer/screens/podesavanja/PodesavanjaScreen.tsx':['SettingsSectionId','section','rules','report'],
 'src/main/persistence/history/sqliteSemanticHistoryStore.ts':['history','append','event','payload']
};
function window(s,at,before=1100,after=2600){return s.slice(Math.max(0,at-before),Math.min(s.length,at+after)).replace(/\r\n/g,'\n')}
function line(s,at){return s.slice(0,at).split(/\r?\n/).length}
const result={audit:'ORBITA_WAVE6_WORKFORCE_BOUNDED_SOURCE_FORENSIC',targets:{}};
for(const [rel,needles] of Object.entries(targets)){const p=path.join(root,rel);if(!fs.existsSync(p)){result.targets[rel]={missing:true};continue}const s=fs.readFileSync(p,'utf8');const low=s.toLowerCase(),hits=[];for(const needle of needles){let at=0,n=0,q=needle.toLowerCase();while((at=low.indexOf(q,at))>=0&&n<4){hits.push({needle,line:line(s,at),snippet:window(s,at)});at+=Math.max(q.length,1);n++;}}result.targets[rel]={size:s.length,hits};}
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({targets:Object.fromEntries(Object.entries(result.targets).map(([k,v])=>[k,v.hits?.length||0]))},null,2));