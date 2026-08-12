const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate'),out=path.resolve(process.argv[3]||'wave4-people-ui-snippets.json');
const targets={
 'src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx':['person-availability-quick','LjudiAvailabilityFoundationPanel','LjudiTemporalResponsibilityDossier','LjudiPersonResponsibilityHistory'],
 'src/renderer/screens/ljudi/components/LjudiAvailabilityModal.tsx':['Period','Zamena','Radovi','Potvrda','PersonAvailabilityImpactPreview','availability-period-next','availability-back-or-cancel'],
 'src/renderer/screens/ljudi/components/LjudiAvailabilityFoundationPanel.tsx':['Dostup','availability','odsust','upcoming','past'],
 'src/renderer/screens/ljudi/components/LjudiPersonResponsibilityHistory.tsx':['responsib','history','deleg','timeline','istor'],
 'src/renderer/screens/ljudi/components/LjudiOrgTree.tsx':['tree','expand','collapse','organization','team'],
 'src/renderer/screens/ljudi/components/LjudiOrganizationDossier.tsx':['member','responsib','availability','active','late'],
 'src/renderer/screens/ljudi/LjudiScreen.tsx':['people-primary-organization','people-primary-team','LjudiPersonDossier','LjudiOrganizationDossier','LjudiAvailabilityModal'],
 'src/renderer/screens/radovi/components/RadoviResponsibilityPanel.tsx':['conflict','availability','responsib','assign'],
 'src/renderer/ui/assignment/DirectAssignmentReviewModal.tsx':['ReviewModal','assign','responsib','confirm'],
 'src/renderer/screens/ljudi/components/useTeamMembershipImpactReview.ts':['impact','affected','review','confirm']
};
function lineAt(s,i){return s.slice(0,i).split(/\r?\n/).length}
function win(s,i,b=1300,a=2200){return s.slice(Math.max(0,i-b),Math.min(s.length,i+a)).replace(/\r\n/g,'\n')}
const result={audit:'ORBITA_WAVE4_PEOPLE_BOUNDED_UI_SNIPPETS',targets:{},css:[]};
for(const [r,needles] of Object.entries(targets)){const p=path.join(root,r);if(!fs.existsSync(p)){result.targets[r]={missing:true};continue}const s=fs.readFileSync(p,'utf8'),hits=[];for(const needle of needles){let at=0,count=0;const low=s.toLowerCase(),nl=needle.toLowerCase();while((at=low.indexOf(nl,at))>=0&&count<4){hits.push({needle,line:lineAt(s,at),snippet:win(s,at)});at+=needle.length;count++;}}result.targets[r]={hits};}
const cssFiles=[];function walk(d){if(!fs.existsSync(d))return;for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.css'))cssFiles.push(p)}}walk(path.join(root,'src/renderer/styles'));
const classes=['people-','ljudi-','availability-','person-','organization-','responsibility-','temporal-'];
for(const f of cssFiles){const s=fs.readFileSync(f,'utf8');for(const cls of classes){let at=0;while((at=s.indexOf('.'+cls,at))>=0){const open=s.indexOf('{',at);if(open<0)break;const selector=s.slice(Math.max(s.lastIndexOf('}',at)+1,s.lastIndexOf('/*',at)+1),open).replace(/\/\*[\s\S]*?\*\//g,'').replace(/\s+/g,' ').trim();let depth=0,end=-1;for(let i=open;i<s.length;i++){if(s[i]==='{')depth++;else if(s[i]==='}'){depth--;if(depth===0){end=i+1;break}}}if(end<0)break;const body=s.slice(open+1,end-1).split(';').map(x=>x.trim()).filter(Boolean).filter(x=>/display|grid|flex|width|height|min-|max-|overflow|gap|padding|margin|position|color|background|border|font|line-height|align|justify/.test(x)).slice(0,24);if(body.length)result.css.push({file:path.relative(root,f).replaceAll('\\','/'),selector:selector.slice(0,300),decl:body});at=end;if(result.css.length>420)break}if(result.css.length>420)break}if(result.css.length>420)break}
fs.writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify({targets:Object.fromEntries(Object.entries(result.targets).map(([k,v])=>[k,v.hits?.length||0])),css:result.css.length},null,2));