const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const out = path.resolve(process.argv[3] || 'workforce-final-precode.json');
const src = path.join(root, 'src');
const files = [];
(function walk(dir){
  if(!fs.existsSync(dir)) return;
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
    const p=path.join(dir,e.name);
    if(e.isDirectory()) walk(p);
    else if(/\.(ts|tsx|js|mjs|cjs|sql)$/i.test(e.name)) files.push(p);
  }
})(src);
const rel=f=>path.relative(root,f).replaceAll('\\','/');
const text=f=>fs.readFileSync(path.join(root,f),'utf8').replace(/\r\n/g,'\n');
const symbols=s=>[...s.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|class|const|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]);
const imports=s=>[...s.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
const matchFiles=re=>files.filter(f=>re.test(fs.readFileSync(f,'utf8'))).map(rel).sort();

const workFile='src/domain/work/workSchedule.ts';
const work=text(workFile);
const weekdayIndexes=[...new Set([...work.matchAll(/(?:getUTCDay|getDay)\s*\(\s*\)\s*(?:===|==|!==|!=)\s*(\d)/g)].map(m=>Number(m[1])))].sort();
const moduloIndexes=[...new Set([...work.matchAll(/(?:day|weekday|weekDay)\s*(?:===|==|!==|!=)\s*(\d)/gi)].map(m=>Number(m[1])))].sort();
const dayIndexes=[...new Set([...weekdayIndexes,...moduloIndexes])].sort();
const exportedWorkSymbols=symbols(work).filter(n=>/work|day|date|schedule|recurr|material|first|last/i.test(n));

const accessTargets=[
 'src/shared/security/accessPolicy.ts',
 'src/main/security/commandScopePolicy.ts',
 'src/main/security/ipcAccessPolicy.ts',
 'src/main/security/accessContextProvider.ts',
 'src/main/security/businessActorClaimPolicy.ts'
];
const access=accessTargets.filter(f=>fs.existsSync(path.join(root,f))).map(f=>{
  const s=text(f);
  return {
    file:f,
    symbols:symbols(s).filter(n=>/access|permission|scope|role|admin|write|actor|policy|authorize/i.test(n)),
    hasAdminLiteral:/['"`]admin(?:istrator)?['"`]/i.test(s),
    hasOwnerLiteral:/['"`]owner['"`]/i.test(s),
    hasManagerLiteral:/['"`]manager['"`]/i.test(s),
    hasWorkspaceWrite:/isWorkspaceWriting|workspace.*write|write.*workspace/i.test(s),
    hasOrganizationScope:/organizationId|organization.*scope|scope.*organization/i.test(s),
    hasTeamScope:/teamId|team.*scope|scope.*team/i.test(s),
  };
});

const peopleTargets=[
 'src/renderer/screens/ljudi/LjudiScreen.tsx',
 'src/renderer/screens/ljudi/useLjudiSelectionProjection.ts',
 'src/renderer/screens/ljudi/useLjudiWorkspaceProjection.ts',
 'src/domain/people/organizationalMembership.ts',
 'src/domain/people/temporalTeamMembership.ts',
 'src/main/persistence/organization/sqliteOrganizationalMembershipReader.ts'
];
const people=peopleTargets.filter(f=>fs.existsSync(path.join(root,f))).map(f=>{
  const s=text(f);
  return {
    file:f,
    symbols:symbols(s).filter(n=>/select|projection|organization|membership|team|person|active|scope/i.test(n)),
    selectedOrganizationRefs:(s.match(/selectedOrganization/g)||[]).length,
    organizationIdRefs:(s.match(/organizationId/g)||[]).length,
    teamIdRefs:(s.match(/teamId/g)||[]).length,
    temporalRefs:(s.match(/TemporalTeamMembership|temporalTeamMembership/gi)||[]).length,
    activeAtRefs:(s.match(/activeAt|membershipActiveAt|asOf/gi)||[]).length,
  };
});

const settingsFile='src/renderer/screens/podesavanja/PodesavanjaScreen.tsx';
const settings=text(settingsFile);
const settingsImports=imports(settings).filter(i=>/config|setting|repository|ipc|rule|status|report|workspace|people|organization/i.test(i));
const ipcCandidates=matchFiles(/showSaveDialog|dialog\.showSaveDialog|printToPDF|webContents\.print\s*\(|writeFileSync|fs\.promises\.writeFile|fs\.writeFile\s*\(/);
const preloadCandidates=matchFiles(/contextBridge|ipcRenderer\.invoke|ipcMain\.handle/);

const schemaFile='src/main/persistence/schema/sqliteSchema.ts';
const schema=text(schemaFile);
const schemaImports=imports(schema).filter(i=>/schema|migration|sqlite/i.test(i));
const latestSchemaFiles=files.map(rel).filter(f=>/src\/main\/persistence\/schema\//.test(f)).sort();

const repositoryFiles=files.map(rel).filter(f=>/src\/main\/persistence\/repository\//.test(f)).sort();
const configRepoCandidates=repositoryFiles.filter(f=>/setting|config|workspace|status|rule|report|people|organization/i.test(f));

const result={
 audit:'ORBITA_WAVE6_WORKFORCE_FINAL_PRECODE_V1',
 sourceExposure:'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',
 workingDayOwner:{
   file:workFile,
   exportedSymbols:exportedWorkSymbols,
   inspectsWeekday:/getUTCDay\s*\(|getDay\s*\(/.test(work),
   comparedDayIndexes:dayIndexes,
   saturdaySundayPattern:dayIndexes.includes(0)&&dayIndexes.includes(6),
   hasHolidayLookup:/holiday|praznik|neradni|non[- ]working/i.test(work),
   firstWorkday:/first-workday/i.test(work),
   lastWorkday:/last-workday/i.test(work),
   loopsForward:/first-workday[\s\S]{0,500}(?:\+\+|\+\s*1|add)/i.test(work),
   loopsBackward:/last-workday[\s\S]{0,500}(?:--|-\s*1|subtract)/i.test(work),
   decision:'Reuse/extract the domain workSchedule working-day predicate as the single current business-day owner; do not invent holiday semantics while no holiday source exists.'
 },
 accessPolicy:{
   targets:access,
   organizationAdminLiteralExists:access.some(x=>x.hasAdminLiteral&&x.hasOrganizationScope),
   organizationScopedPolicyExists:access.some(x=>x.hasOrganizationScope),
   workspaceWritePolicyExists:access.some(x=>x.hasWorkspaceWrite),
   decision:'Workforce read follows existing People/Organization read context. Legend mutation must enter the existing workspace-write/current-actor policy; add no parallel Workforce permission model unless a stronger existing organization-scoped command policy is proven by these targets.'
 },
 organizationScope:{
   targets:people,
   temporalMembershipOwnerPresent:people.some(x=>x.temporalRefs>0),
   selectedOrganizationProjectionPresent:people.some(x=>x.selectedOrganizationRefs>0),
   decision:'Renderer scope starts from the existing People selected organization/team projection; historical row/day membership must be derived by temporal membership/as-of owners, not current-only renderer filtering.'
 },
 settingsInsertion:{
   file:settingsFile,
   sectionUnion:/type SettingsSectionId/.test(settings),
   imports:settingsImports,
   decision:'Extend the existing Settings section union and current repository/IPC path; no new Settings root.'
 },
 persistenceInsertion:{
   schemaOwner:schemaFile,
   schemaImports:schemaImports,
   latestSchemaFiles:latestSchemaFiles.slice(-20),
   repositoryCandidates:configRepoCandidates,
   decision:'Add one incremental schema capability after current admitted schema tail and bind it through existing repository/IPC conventions.'
 },
 outputOwner:{
   nativeFileOrPrintCandidates:ipcCandidates,
   ipcBridgeCandidates:preloadCandidates.slice(0,80),
   hasShowSaveDialog:ipcCandidates.some(f=>/dialog|ipc|main/i.test(f)) && matchFiles(/showSaveDialog/).length>0,
   hasPrintToPDF:matchFiles(/printToPDF/).length>0,
   hasWebContentsPrint:matchFiles(/webContents\.print\s*\(/).length>0,
   decision:'No reusable admitted output engine is assumed. If Wave 6 adds Export, create a bounded native output command through the existing IPC bridge and physically prove a written file; otherwise omit Export until that owner exists.'
 }
};
fs.writeFileSync(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

if(!result.workingDayOwner.firstWorkday||!result.workingDayOwner.lastWorkday||!result.workingDayOwner.inspectsWeekday) throw new Error('Working-day materialization owner still not exact enough');
if(!result.accessPolicy.workspaceWritePolicyExists) throw new Error('Existing workspace write policy not physically proven');
if(!result.organizationScope.selectedOrganizationProjectionPresent) throw new Error('People organization insertion scope not physically proven');
