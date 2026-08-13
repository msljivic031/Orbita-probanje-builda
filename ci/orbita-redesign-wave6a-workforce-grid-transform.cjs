const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>{const p=path.join(root,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r\n/g,'\n'),'utf8');};
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
function insertBefore(file,anchor,extra,label){let s=read(file);if(s.includes(extra.trim()))return;const i=s.indexOf(anchor);if(i<0)throw Error(`${label}: anchor missing`);write(file,s.slice(0,i)+extra.trim()+'\n\n'+s.slice(i));}
function insertAfter(file,anchor,extra,label){let s=read(file);if(s.includes(extra.trim()))return;const i=s.indexOf(anchor);if(i<0)throw Error(`${label}: anchor missing`);const at=i+anchor.length;write(file,s.slice(0,at)+'\n'+extra.trim()+'\n'+s.slice(at));}

const workSchedule='src/domain/work/workSchedule.ts';
let ws=read(workSchedule);
if(!ws.includes('export function isCanonicalWorkingDay(')){
  const anchor='function firstWorkdayOfMonth';
  const i=ws.indexOf(anchor); if(i<0) throw Error('workSchedule firstWorkday owner missing');
  const helper=`export function isCanonicalWorkingDay(isoDate: string): boolean {\n  const day = isoToUtcDate(isoDate).getUTCDay();\n  return day !== 0 && day !== 6;\n}\n\n`;
  write(workSchedule,ws.slice(0,i)+helper+ws.slice(i));
}

const snapshot='src/domain/reports/responsibilityAvailabilitySnapshot.ts';
let snap=read(snapshot);
if(!snap.includes('export function membershipActiveAt(')){
  const from='function membershipActiveAt(membership: TemporalTeamMembership, asOfInstant: string): boolean {';
  const to='export function membershipActiveAt(membership: TemporalTeamMembership, asOfInstant: string): boolean {';
  const n=snap.split(from).length-1;if(n!==1)throw Error(`membershipActiveAt owner expected 1, got ${n}`);
  write(snapshot,snap.replace(from,to));
}

const domain='src/domain/people/workforceMonthlySheet.ts';
write(domain,`import type { Person, PersonAvailabilityEventKind } from './personTypes';
import type { Workspace } from '../workspace/workspaceTypes';
import { availabilityEventKindText, buildPersonAvailabilityFoundation } from './availabilityEvents';
import { membershipActiveAt } from '../reports/responsibilityAvailabilitySnapshot';
import { isCanonicalWorkingDay } from '../work/workSchedule';

export type WorkforceLegendSeed = {
  kind: PersonAvailabilityEventKind;
  token: string;
  name: string;
  category: 'available' | 'leave' | 'field' | 'blocked' | 'absence';
  order: number;
  provenance: 'system_default_v1';
};

// W6A fallback is intentionally version-labelled and is not the final configurable legend owner.
// W6B must replace/resolve this through persisted effective legend versions without rewriting history.
export const DEFAULT_WORKFORCE_LEGEND: WorkforceLegendSeed[] = [
  { kind: 'available', token: 'D', name: 'Dostupan', category: 'available', order: 10, provenance: 'system_default_v1' },
  { kind: 'annual_leave', token: 'GO', name: 'Godišnji', category: 'leave', order: 20, provenance: 'system_default_v1' },
  { kind: 'sick_leave', token: 'BO', name: 'Bolovanje', category: 'leave', order: 30, provenance: 'system_default_v1' },
  { kind: 'field_work', token: 'T', name: 'Teren', category: 'field', order: 40, provenance: 'system_default_v1' },
  { kind: 'day_off', token: 'SD', name: 'Slobodan dan', category: 'leave', order: 50, provenance: 'system_default_v1' },
  { kind: 'blocked', token: 'B', name: 'Blokada', category: 'blocked', order: 60, provenance: 'system_default_v1' },
  { kind: 'other_absence', token: 'O', name: 'Odsustvo', category: 'absence', order: 70, provenance: 'system_default_v1' },
];

export type WorkforceDay = { isoDate: string; day: number; workingDay: boolean };
export type WorkforceCell = { isoDate: string; inScope: boolean; boundaryConfidence?: 'known' | 'unknown_start'; kind?: PersonAvailabilityEventKind; label: string; token: string; workingDay: boolean };
export type WorkforceRow = { person: Person; cells: WorkforceCell[]; hasUnknownStart: boolean };

export function workforceMonthDays(monthKey: string): WorkforceDay[] {
  const match = /^(\\d{4})-(\\d{2})$/.exec(monthKey);
  if (!match) throw new Error('Workforce month must be YYYY-MM');
  const year = Number(match[1]); const month = Number(match[2]);
  const count = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => {
    const isoDate = \`${monthKey}-\${String(index + 1).padStart(2, '0')}\`;
    return { isoDate, day: index + 1, workingDay: isCanonicalWorkingDay(isoDate) };
  });
}

export function buildWorkforceMonthlyRows(args: { workspace: Workspace; monthKey: string; currentScopePeople: Person[]; scopeTeamIds: string[] }): { days: WorkforceDay[]; rows: WorkforceRow[] } {
  const { workspace, monthKey, currentScopePeople, scopeTeamIds } = args;
  const days = workforceMonthDays(monthKey);
  const currentIds = new Set(currentScopePeople.map((person) => person.id));
  const teamIds = new Set(scopeTeamIds);
  const temporal = workspace.temporalTeamMemberships.filter((membership) => teamIds.has(membership.teamId));
  const temporalByPerson = new Map<string, typeof temporal>();
  for (const membership of temporal) { const list = temporalByPerson.get(membership.personId) ?? []; list.push(membership); temporalByPerson.set(membership.personId, list); }
  const candidateIds = new Set(currentIds);
  for (const membership of temporal) if (days.some((day) => membershipActiveAt(membership, \`${day.isoDate}T12:00:00.000Z\`))) candidateIds.add(membership.personId);
  const peopleById = new Map(workspace.people.map((person) => [person.id, person]));
  const people = [...candidateIds].map((id) => peopleById.get(id)).filter((person): person is Person => Boolean(person)).sort((a,b)=>a.displayName.localeCompare(b.displayName,'sr'));
  const legendByKind = new Map(DEFAULT_WORKFORCE_LEGEND.map((entry) => [entry.kind, entry]));
  const rows = people.map((person): WorkforceRow => {
    const personMemberships = temporalByPerson.get(person.id) ?? [];
    const hasTemporalTruth = personMemberships.length > 0;
    let hasUnknownStart = false;
    const cells = days.map((day): WorkforceCell => {
      const activeMemberships = personMemberships.filter((membership) => membershipActiveAt(membership, \`${day.isoDate}T12:00:00.000Z\`));
      const inScope = hasTemporalTruth ? activeMemberships.length > 0 : currentIds.has(person.id);
      const unknown = activeMemberships.some((membership) => membership.boundaryConfidence === 'unknown_start');
      if (unknown) hasUnknownStart = true;
      if (!inScope) return { isoDate: day.isoDate, inScope: false, label: 'Nije u izabranom opsegu', token: '', workingDay: day.workingDay };
      const foundation = buildPersonAvailabilityFoundation(person, workspace.availabilityEvents, day.isoDate);
      const legend = legendByKind.get(foundation.currentKind);
      const label = foundation.currentLabel || availabilityEventKindText(foundation.currentKind);
      return { isoDate: day.isoDate, inScope: true, boundaryConfidence: unknown ? 'unknown_start' : 'known', kind: foundation.currentKind, label, token: legend?.token ?? label.slice(0,2).toUpperCase(), workingDay: day.workingDay };
    });
    return { person, cells, hasUnknownStart };
  });
  return { days, rows };
}
`);

const component='src/renderer/screens/ljudi/components/LjudiWorkforceSheet.tsx';
write(component,`import { useMemo, useState } from 'react';
import type { Person } from '../../../../domain/people/personTypes';
import type { Workspace } from '../../../../domain/workspace/workspaceTypes';
import { DEFAULT_WORKFORCE_LEGEND, buildWorkforceMonthlyRows } from '../../../../domain/people/workforceMonthlySheet';
import { localTodayIso } from '../../../../domain/work/workSchedule';
type Props = { workspace: Workspace; scopeLabel: string; scopePeople: Person[]; scopeTeamIds: string[] };
function monthKeyFromIso(isoDate: string) { return isoDate.slice(0, 7); }
function shiftMonth(monthKey: string, delta: number) { const [year, month] = monthKey.split('-').map(Number); const date = new Date(Date.UTC(year, month - 1 + delta, 1)); return \`${date.getUTCFullYear()}-\${String(date.getUTCMonth() + 1).padStart(2, '0')}\`; }
function monthLabel(monthKey: string) { const [year, month] = monthKey.split('-').map(Number); return new Intl.DateTimeFormat('sr-Latn-RS', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(year, month - 1, 1))); }
export function LjudiWorkforceSheet({ workspace, scopeLabel, scopePeople, scopeTeamIds }: Props) {
  const today = localTodayIso(); const [monthKey, setMonthKey] = useState(() => monthKeyFromIso(today));
  const projection = useMemo(() => buildWorkforceMonthlyRows({ workspace, monthKey, currentScopePeople: scopePeople, scopeTeamIds }), [workspace, monthKey, scopePeople, scopeTeamIds]);
  const isCurrentMonth = monthKey === monthKeyFromIso(today);
  return <section className="people-workforce-surface" data-orbita-workforce="monthly-sheet" data-orbita-workforce-month={monthKey} aria-label={\`Mesečni Workforce — \${scopeLabel} — \${monthLabel(monthKey)}\`}>
    <header className="people-workforce-header"><div className="people-workforce-title"><span className="eyebrow">WORKFORCE · MESEČNA PROJEKCIJA</span><h2>Mesečni pregled</h2><p>{scopeLabel} · dostupnost po danu iz kanonskih range događaja.</p></div><div className="people-workforce-month-controls" aria-label="Izbor meseca"><button type="button" onClick={() => setMonthKey((value) => shiftMonth(value, -1))} aria-label="Prethodni mesec">Prethodni</button><label><span>Mesec</span><input aria-label="Mesec i godina" type="month" value={monthKey} onChange={(event) => event.target.value && setMonthKey(event.target.value)} /></label><button type="button" onClick={() => setMonthKey((value) => shiftMonth(value, 1))} aria-label="Sledeći mesec">Sledeći</button><button type="button" className="people-workforce-current" disabled={isCurrentMonth} onClick={() => setMonthKey(monthKeyFromIso(today))}>Tekući mesec</button></div></header>
    <div className="people-workforce-legend" aria-label="Legenda statusa"><strong>Legenda</strong>{DEFAULT_WORKFORCE_LEGEND.slice().sort((a,b)=>a.order-b.order).map((entry) => <span key={entry.kind} data-kind={entry.kind}><b>{entry.token}</b>{entry.name}</span>)}<small>W6A sistemska legenda je fallback; W6B dodaje verzionisanu konfiguraciju. Vikendi su izdvojeni, praznici se ne izmišljaju bez zajedničkog holiday owner-a.</small></div>
    <p className="people-workforce-truth-note">Istorijski sastav koristi temporalna članstva gde postoje. Ako početak članstva nije pouzdano poznat, ORBITA ga ne izmišlja.</p>
    <div className="people-workforce-grid-region" role="region" tabIndex={0} aria-label={\`Tabela \${scopeLabel}, \${monthLabel(monthKey)}. Horizontalno pomeranje zadržava kolonu Osoba.\`}><table className="people-workforce-grid"><thead><tr><th className="people-workforce-person-col" scope="col">Osoba</th>{projection.days.map((day) => <th className={!day.workingDay ? 'is-nonworking' : day.isoDate === today ? 'is-today' : ''} key={day.isoDate} scope="col"><span>{day.day}</span><small>{new Intl.DateTimeFormat('sr-Latn-RS',{weekday:'short',timeZone:'UTC'}).format(new Date(day.isoDate+'T00:00:00.000Z')).replace('.','')}</small></th>)}</tr></thead><tbody>{projection.rows.map((row) => <tr key={row.person.id}><th className="people-workforce-person-col" scope="row"><span className="people-workforce-avatar" aria-hidden="true">{row.person.displayName.trim().slice(0,1).toUpperCase()}</span><span className="people-workforce-person-copy"><strong title={row.person.displayName}>{row.person.displayName}</strong>{row.hasUnknownStart ? <small title="Početak temporalnog članstva nije pouzdano poznat">Početak članstva: nije pouzdano poznat</small> : row.person.role ? <small>{row.person.role}</small> : null}</span></th>{row.cells.map((cell) => <td key={cell.isoDate} className={[!cell.workingDay?'is-nonworking':'',cell.isoDate===today?'is-today':'',!cell.inScope?'is-out-of-scope':'',cell.boundaryConfidence==='unknown_start'?'is-uncertain':''].filter(Boolean).join(' ')} aria-label={\`\${row.person.displayName} · \${cell.isoDate} · \${cell.label}\`} title={cell.boundaryConfidence === 'unknown_start' ? \`\${cell.label} · početak članstva nije pouzdano poznat\` : cell.label}>{cell.inScope ? <span className="people-workforce-token" data-kind={cell.kind}>{cell.token}</span> : <span aria-hidden="true">·</span>}</td>)}</tr>)}</tbody></table>{!projection.rows.length ? <div className="people-workforce-empty" role="status"><strong>Nema osoba u izabranom opsegu za ovaj mesec.</strong><span>Promenite jedinicu ili mesec; ORBITA neće popuniti nepostojeću istoriju.</span></div> : null}</div>
  </section>;
}
`);

const ljudi='src/renderer/screens/ljudi/LjudiScreen.tsx';
insertAfter(ljudi,'import { useLjudiRegistryCommands } from "./useLjudiRegistryCommands";','import { LjudiWorkforceSheet } from "./components/LjudiWorkforceSheet";','Workforce import');
replaceExact(ljudi,'  const [peopleDetailTab, setPeopleDetailTab] = useState<PeopleDetailTab>("overview");','  const [peopleDetailTab, setPeopleDetailTab] = useState<PeopleDetailTab>("overview");\n  const [isWorkforceOpen, setIsWorkforceOpen] = useState(false);','Workforce mode state');
const dossierAnchor=`          <section\n            className="people-dossier-surface"\n            aria-label="Dosije izabranog člana mreže"\n          >`;
const entry=`          {(registryMode === "organization" && selectedOrganization) || (registryMode === "team" && selectedTeam) ? (\n            <div className="people-workforce-entrybar" aria-label="Operativni prikaz ljudi">\n              <div><span className="eyebrow">Mesečni radni pregled</span><strong>Workforce</strong><small>Dnevna projekcija dostupnosti · bez paralelne truth baze.</small></div>\n              <button data-orbita-action="people-open-workforce" aria-pressed={isWorkforceOpen} onClick={() => setIsWorkforceOpen((value) => !value)} type="button">{isWorkforceOpen ? "Nazad na dosije" : "Otvori Workforce"}</button>\n            </div>\n          ) : null}\n\n          {isWorkforceOpen && registryMode === "organization" && selectedOrganization ? (\n            <LjudiWorkforceSheet workspace={workspace} scopeLabel={selectedOrganization.name} scopePeople={selectedOrganizationPeople} scopeTeamIds={selectedOrganizationTeams.map((team) => team.id)} />\n          ) : isWorkforceOpen && registryMode === "team" && selectedTeam ? (\n            <LjudiWorkforceSheet workspace={workspace} scopeLabel={selectedTeam.name} scopePeople={selectedTeamMembers} scopeTeamIds={[...selectedTeamScopeIds]} />\n          ) : null}\n`;
insertBefore(ljudi,dossierAnchor,entry,'Workforce entry and surface');
replaceExact(ljudi,dossierAnchor,`          <section\n            className="people-dossier-surface"\n            hidden={isWorkforceOpen && (registryMode === "organization" || registryMode === "team")}\n            aria-label="Dosije izabranog člana mreže"\n          >`,'Hide dossier only while Workforce scope is active');

const css='src/renderer/styles/canonical/people-operational-closure.css';
insertBefore(css,'@media',`
.people-workforce-entrybar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:10px 12px;border:1px solid rgba(76,119,176,.20);border-radius:12px;background:#f8fbff}.people-workforce-entrybar>div{display:grid;gap:2px;min-width:0}.people-workforce-entrybar .eyebrow{font-size:9px;letter-spacing:.09em;color:#6f84a0}.people-workforce-entrybar strong{font-size:13px;color:#19324e}.people-workforce-entrybar small{color:#6c7f97}.people-workforce-entrybar button{min-height:34px;padding:0 12px;border:1px solid rgba(43,114,214,.25);border-radius:9px;background:#fff;color:#245fae;font-weight:800}.people-workforce-entrybar button[aria-pressed="true"]{background:#eaf3ff;border-color:#2b72d6}
.people-workforce-surface{display:grid;gap:12px;min-width:0;padding:14px;border:1px solid rgba(72,108,151,.18);border-radius:14px;background:#fbfdff;box-shadow:0 10px 28px rgba(26,54,91,.06)}.people-workforce-header{display:flex;align-items:flex-end;justify-content:space-between;gap:16px}.people-workforce-title{display:grid;gap:3px;min-width:0}.people-workforce-title h2{margin:0;color:#142d49;font-size:18px}.people-workforce-title p{margin:0;color:#6d8097;font-size:12px}.people-workforce-month-controls{display:flex;align-items:flex-end;gap:6px;flex-wrap:wrap;justify-content:flex-end}.people-workforce-month-controls>button{min-width:34px;height:34px;padding:0 9px;border:1px solid rgba(70,108,155,.22);border-radius:8px;background:#fff;color:#274f7e;font-weight:850}.people-workforce-month-controls label{display:grid;gap:3px;color:#6c7e94;font-size:9px;font-weight:850;letter-spacing:.06em;text-transform:uppercase}.people-workforce-month-controls input{height:34px;border:1px solid rgba(70,108,155,.22);border-radius:8px;background:#fff;padding:0 9px;color:#173552;font:inherit}.people-workforce-current:disabled{opacity:.48}
.people-workforce-legend{display:flex;align-items:center;gap:7px;flex-wrap:wrap;padding:8px 10px;border:1px solid rgba(77,113,156,.15);border-radius:10px;background:#f5f8fc;color:#60758e;font-size:10px}.people-workforce-legend>strong{color:#203d5d}.people-workforce-legend>span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}.people-workforce-legend b{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 4px;border-radius:6px;background:#e9f1fb;color:#265d9f;font-size:9px}.people-workforce-legend small{margin-left:auto;max-width:430px;color:#7a8ca1}.people-workforce-truth-note{margin:0;color:#76899f;font-size:10px}.people-workforce-grid-region{min-width:0;max-width:100%;overflow:auto;overscroll-behavior-inline:contain;border:1px solid rgba(65,100,145,.18);border-radius:11px;background:#fff;outline:none}.people-workforce-grid-region:focus-visible{box-shadow:0 0 0 3px rgba(43,114,214,.22);border-color:#2b72d6}
.people-workforce-grid{border-collapse:separate;border-spacing:0;width:max-content;min-width:100%;font-size:10px}.people-workforce-grid th,.people-workforce-grid td{height:34px;min-width:34px;padding:0 3px;border-right:1px solid #e8eef5;border-bottom:1px solid #e8eef5;text-align:center;background:#fff}.people-workforce-grid thead th{position:sticky;top:0;z-index:3;background:#f4f7fb;color:#49647f;font-size:9px;font-weight:850}.people-workforce-grid thead th small{display:block;color:#8b9aac;font-size:8px}.people-workforce-grid .people-workforce-person-col{position:sticky;left:0;z-index:4;width:210px;min-width:210px;max-width:210px;padding:0 9px;text-align:left;background:#fff;box-shadow:1px 0 0 #dfe7f0}.people-workforce-grid thead .people-workforce-person-col{z-index:6;background:#eef3f9}.people-workforce-grid tbody .people-workforce-person-col{display:flex;align-items:center;gap:8px}.people-workforce-avatar{display:grid;place-items:center;flex:0 0 24px;height:24px;border-radius:50%;background:#eaf2fb;color:#2b64a5;font-size:9px;font-weight:900}.people-workforce-person-copy{display:grid;min-width:0}.people-workforce-person-copy strong,.people-workforce-person-copy small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.people-workforce-person-copy strong{color:#1b3857;font-size:10px}.people-workforce-person-copy small{color:#7c8fa5;font-size:8px}.people-workforce-grid .is-nonworking{background:#f6f7f9}.people-workforce-grid .is-today{box-shadow:inset 0 2px 0 #2b72d6}.people-workforce-grid td.is-out-of-scope{background:#fafbfc;color:#c0cad5}.people-workforce-grid td.is-uncertain{background-image:linear-gradient(135deg,rgba(78,111,151,.04) 25%,transparent 25%,transparent 50%,rgba(78,111,151,.04) 50%,rgba(78,111,151,.04) 75%,transparent 75%,transparent);background-size:8px 8px}.people-workforce-token{display:inline-grid;place-items:center;min-width:24px;height:22px;padding:0 3px;border-radius:6px;background:#eaf2fb;color:#245e9f;font-size:8px;font-weight:900}.people-workforce-token[data-kind="available"]{background:#edf6f2;color:#26735a}.people-workforce-token[data-kind="annual_leave"],.people-workforce-token[data-kind="day_off"]{background:#eef2fb;color:#425f9f}.people-workforce-token[data-kind="sick_leave"],.people-workforce-token[data-kind="other_absence"]{background:#f6f0fa;color:#72538d}.people-workforce-token[data-kind="field_work"]{background:#ebf4fb;color:#23688c}.people-workforce-token[data-kind="blocked"]{background:#fbefef;color:#9b4545}.people-workforce-empty{display:grid;gap:3px;padding:28px;text-align:center;color:#70849b}.people-workforce-empty strong{color:#284765}
@media(max-width:1390px){.people-workforce-surface{padding:11px;gap:10px}.people-workforce-header{align-items:flex-start;flex-direction:column}.people-workforce-month-controls{justify-content:flex-start}.people-workforce-grid .people-workforce-person-col{width:184px;min-width:184px;max-width:184px}.people-workforce-legend small{flex-basis:100%;margin-left:0}}
`,'Wave6A Workforce dense grid styles');
console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE6A_WORKFORCE_GRID_FOUNDATION',productStatus:'IMPLEMENTED_NOT_FULL_WAVE6_PASS',owners:{availability:'src/domain/people/availabilityEvents.ts',membership:snapshot,workingDay:workSchedule,renderer:ljudi,projection:domain},newFiles:[domain,component],truth:['range availability projection','temporal team membership as-of','unknown_start preserved','weekends from workSchedule owner','no holiday invention'],deliberatelyNotClaimed:['persisted/versioned legend','legend editing/settings','print','export','full Wave6 PASS']},null,2));