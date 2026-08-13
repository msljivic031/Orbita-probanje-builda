const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function once(s,a,b,label){if(s.includes(b))return s;const n=s.split(a).length-1;if(n!==1)throw Error(label+': '+n);return s.replace(a,b);}
const file='src/renderer/screens/ljudi/components/LjudiWorkforceSheet.tsx';
let s=read(file);
const workspaceImport="import type { Workspace } from '../../../../domain/workspace/workspaceTypes';";
if(!s.includes('WorkforceOutputRequest'))s=once(s,workspaceImport,workspaceImport+"\nimport type { WorkforceOutputRequest } from '../../../../shared/contracts/output/workforceOutputTypes.js';",'output request import');
s=once(s,'type Props = { workspace: Workspace; scopeLabel: string; scopePeople: Person[]; scopeTeamIds: string[] };','type Props = { workspace: Workspace; organizationId?: string; scopeLabel: string; scopePeople: Person[]; scopeTeamIds: string[] };','output props');
s=once(s,'export function LjudiWorkforceSheet({ workspace, scopeLabel, scopePeople, scopeTeamIds }: Props) {','export function LjudiWorkforceSheet({ workspace, organizationId, scopeLabel, scopePeople, scopeTeamIds }: Props) {','output destructure');
if(!s.includes('const [outputBusy, setOutputBusy]')){
 const a='  const isCurrentMonth = monthKey === monthKeyFromIso(today);';
 const x=`\n  const [outputBusy, setOutputBusy] = useState<'export' | 'print' | null>(null);\n  const [outputStatus, setOutputStatus] = useState('');\n  const outputRequest = useMemo<WorkforceOutputRequest>(() => ({ workspaceId: workspace.id, organizationId, unitIds: [...scopeTeamIds], personIds: scopePeople.map((person) => person.id), scopeLabel, monthKey }), [workspace.id, organizationId, scopeTeamIds, scopePeople, scopeLabel, monthKey]);`;
 if(!s.includes(a))throw Error('month anchor missing');s=s.replace(a,a+x);
}
if(!s.includes('async function exportPdf()')){
 const a='  return <section className="people-workforce-surface"';
 const x=`  async function exportPdf() {\n    if (outputBusy) return; setOutputBusy('export'); setOutputStatus('Otvaram izbor lokacije za PDF…');\n    try { const result = await window.orbita.exportWorkforcePdf(outputRequest); setOutputStatus(result.status === 'cancelled' ? 'Izvoz PDF-a je otkazan.' : \`PDF sačuvan: \${result.fileName}\`); }\n    catch { setOutputStatus('PDF nije sačuvan. Pokušajte ponovo.'); } finally { setOutputBusy(null); }\n  }\n  async function printSheet() {\n    if (outputBusy) return; setOutputBusy('print'); setOutputStatus('Otvaram sistemski dijalog za štampu…');\n    try { const result = await window.orbita.printWorkforce(outputRequest); setOutputStatus(result.status === 'submitted' ? 'Dokument je prosleđen sistemu za štampu.' : 'Štampanje nije završeno.'); }\n    catch { setOutputStatus('Štampanje nije završeno. Pokušajte ponovo.'); } finally { setOutputBusy(null); }\n  }\n`;
 const at=s.indexOf(a);if(at<0)throw Error('return anchor missing');s=s.slice(0,at)+x+s.slice(at);
}
const old='<button type="button" className="people-workforce-current" disabled={isCurrentMonth} onClick={() => setMonthKey(monthKeyFromIso(today))}>Tekući mesec</button></div></header>';
const neu='<button type="button" className="people-workforce-current" disabled={isCurrentMonth} onClick={() => setMonthKey(monthKeyFromIso(today))}>Tekući mesec</button></div><div className="people-workforce-output-actions" aria-label="Izlaz dokumenta" aria-busy={outputBusy !== null}><button type="button" data-orbita-workforce-output="export-pdf" onClick={exportPdf} disabled={outputBusy !== null}>{outputBusy === \'export\' ? \'Izvozim…\' : \'Izvezi PDF\'}</button><button type="button" data-orbita-workforce-output="print" onClick={printSheet} disabled={outputBusy !== null}>{outputBusy === \'print\' ? \'Štampam…\' : \'Štampaj\'}</button></div></header>{outputStatus ? <div className="people-workforce-output-status" role="status" aria-live="polite">{outputStatus}</div> : null}';
s=once(s,old,neu,'output toolbar');write(file,s);
const host='src/renderer/screens/ljudi/LjudiScreen.tsx';let h=read(host);
h=once(h,'<LjudiWorkforceSheet workspace={workspace} scopeLabel={selectedOrganization.name} scopePeople={selectedOrganizationPeople} scopeTeamIds={selectedOrganizationTeams.map((team) => team.id)} />','<LjudiWorkforceSheet workspace={workspace} organizationId={selectedOrganization.id} scopeLabel={selectedOrganization.name} scopePeople={selectedOrganizationPeople} scopeTeamIds={selectedOrganizationTeams.map((team) => team.id)} />','organization id');write(host,h);
console.log(JSON.stringify({state:'W6C_RENDERER_OUTPUT_BOUND_NOT_ADMITTED',owners:[file,host],truth:['existing Workforce renderer owner reused','typed scope/month/IDs only','organization id forwarded','busy duplicate prevention','aria-live result','file name only, no local path'],notYetClaimed:['type/build','visual','print runtime','W6C pass']},null,2));
