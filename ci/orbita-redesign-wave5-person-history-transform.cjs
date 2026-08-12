const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>fs.writeFileSync(path.join(root,r),s.replace(/\r\n/g,'\n'),'utf8');
function replaceExact(file,from,to,label){let s=read(file);const n=s.split(from).length-1;if(n!==1)throw Error(`${label}: expected 1, got ${n}`);write(file,s.replace(from,to));}
function appendOnce(file,marker,extra){let s=read(file);if(s.includes(marker))return;write(file,s.trimEnd()+'\n\n'+extra.trim()+'\n');}

const history='src/renderer/screens/ljudi/components/LjudiPersonResponsibilityHistory.tsx';
const historySource=`import { useState } from "react";
import type { OrganizationTeam, Person, PersonAvailabilityEvent } from "../../../../domain/people/personTypes";
import type { TemporalTeamMembership } from "../../../../domain/people/temporalTeamMembership";
import type { EffectiveResponsibilityProjection, ResponsibilityAssignment, WorkCompletionRecord } from "../../../../domain/work/responsibilityTypes";
import type { ResponsibilityRoute } from "../../../../domain/work/temporalResponsibility";
import { formatOrbitaDate } from "../../../ui/primitives/OrbitaDateInput";
import { membershipRoleText, roleText } from "./LjudiPrimitives";

type HistoryCategory = "all" | "responsibility" | "route" | "availability" | "organization" | "completion";

type EvidenceRow = {
  id: string;
  category: Exclude<HistoryCategory, "all">;
  sortAt: string;
  dateLabel: string;
  title: string;
  subject: string;
  detail: string;
  provenance?: string;
  workItemId?: string;
};

type LjudiPersonResponsibilityHistoryProps = {
  personId: string;
  responsibilityAssignments: ResponsibilityAssignment[];
  effectiveResponsibilities: EffectiveResponsibilityProjection[];
  workCompletionRecords: WorkCompletionRecord[];
  responsibilityRoutes: ResponsibilityRoute[];
  availabilityEvents: PersonAvailabilityEvent[];
  temporalTeamMemberships: TemporalTeamMembership[];
  organizationTeams: OrganizationTeam[];
  personById: Map<string, Person>;
  workTitleById: Map<string, string>;
  onOpenWorkDossier?: (workItemId: string) => void;
};

const categoryLabel: Record<Exclude<HistoryCategory, "all">, string> = {
  responsibility: "Odgovornost",
  route: "Privremena ruta",
  availability: "Dostupnost",
  organization: "Organizacija",
  completion: "Završetak",
};

const availabilityKindLabel: Record<PersonAvailabilityEvent["kind"], string> = {
  available: "Dostupan",
  annual_leave: "Godišnji odmor",
  sick_leave: "Bolovanje",
  field_work: "Rad na terenu",
  day_off: "Slobodan dan",
  blocked: "Nedostupan",
  other_absence: "Drugo odsustvo",
};

const assignmentEndReasonLabel: Partial<Record<NonNullable<ResponsibilityAssignment["endReason"]>, string>> = {
  removed: "uklonjena odgovornost",
  replaced: "zamenjena odgovornost",
  role_changed: "promenjena uloga",
  work_completed: "Rad završen",
  correction: "ispravka zapisa",
  other: "drugi razlog",
};

const routeEndReasonLabel: Partial<Record<NonNullable<ResponsibilityRoute["endReason"]>, string>> = {
  manual_end: "ručno završena",
  period_ended: "period istekao",
  absence_cancelled: "odsustvo otkazano",
  correction: "ispravka zapisa",
  other: "drugi razlog",
};

function periodLabel(from: string, to?: string) {
  return to ? `${formatOrbitaDate(from)} — ${formatOrbitaDate(to)}` : `od ${formatOrbitaDate(from)} · aktivno`;
}

function personName(personById: Map<string, Person>, id?: string) {
  return id ? (personById.get(id)?.displayName ?? id) : "nije zabeleženo";
}

export function LjudiPersonResponsibilityHistory({
  personId,
  responsibilityAssignments,
  effectiveResponsibilities,
  workCompletionRecords,
  responsibilityRoutes,
  availabilityEvents,
  temporalTeamMemberships,
  organizationTeams,
  personById,
  workTitleById,
  onOpenWorkDossier,
}: LjudiPersonResponsibilityHistoryProps) {
  const [category, setCategory] = useState<HistoryCategory>("all");
  const [year, setYear] = useState("all");
  const teamById = new Map(organizationTeams.map((team) => [team.id, team]));

  const inheritedCoverage = effectiveResponsibilities.filter((projection) =>
    projection.status === "resolved" &&
    projection.primary?.category === "inherited" &&
    projection.primary.targetType === "person" &&
    projection.primary.personId === personId
  );

  const rows: EvidenceRow[] = [];

  for (const assignment of responsibilityAssignments) {
    if (assignment.personId !== personId) continue;
    const endReason = assignment.endReason ? assignmentEndReasonLabel[assignment.endReason] : undefined;
    rows.push({
      id: `assignment-${assignment.id}`,
      category: "responsibility",
      sortAt: assignment.effectiveTo ?? assignment.effectiveFrom,
      dateLabel: formatOrbitaDate(assignment.effectiveTo ?? assignment.effectiveFrom),
      title: `Odgovornost · ${roleText(assignment.role)}`,
      subject: workTitleById.get(assignment.workItemId) ?? assignment.workItemId,
      detail: periodLabel(assignment.effectiveFrom, assignment.effectiveTo),
      provenance: [
        assignment.businessAssignerPersonId ? `Dodelio: ${personName(personById, assignment.businessAssignerPersonId)}` : "Dodelilac nije zabeležen",
        endReason,
        assignment.reasonCode,
      ].filter(Boolean).join(" · "),
      workItemId: assignment.workItemId,
    });
  }

  for (const record of workCompletionRecords) {
    if (record.completedByPersonId !== personId) continue;
    rows.push({
      id: `completion-${record.id}`,
      category: "completion",
      sortAt: record.completedAt,
      dateLabel: formatOrbitaDate(record.completedAt),
      title: "Stvarni završetak Rada",
      subject: workTitleById.get(record.workItemId) ?? record.workItemId,
      detail: `Završeno ${formatOrbitaDate(record.completedAt)}`,
      provenance: record.commandActorPersonId ? `Komandu evidentirao: ${personName(personById, record.commandActorPersonId)}` : "Actor komande nije zabeležen",
      workItemId: record.workItemId,
    });
  }

  for (const route of responsibilityRoutes) {
    if (route.fromPersonId !== personId && route.toPersonId !== personId) continue;
    const incoming = route.toPersonId === personId;
    const peerId = incoming ? route.fromPersonId : route.toPersonId;
    const routeName = route.kind === "delegation" ? "Delegacija" : "Zamena";
    const direction = incoming ? `Preuzima od: ${personName(personById, peerId)}` : `Prosleđeno ka: ${personName(personById, peerId)}`;
    const endReason = route.endReason ? routeEndReasonLabel[route.endReason] : undefined;
    rows.push({
      id: `route-${route.id}`,
      category: "route",
      sortAt: route.validFrom,
      dateLabel: formatOrbitaDate(route.validFrom),
      title: routeName,
      subject: workTitleById.get(route.workItemId) ?? route.workItemId,
      detail: `${direction} · ${periodLabel(route.validFrom, route.validTo)}`,
      provenance: [route.status === "active" ? "aktivna ruta" : "završena ruta", route.routeNewAssignments ? "usmerava i nova zaduženja" : "samo pregledani Radovi", endReason, route.reasonCode].filter(Boolean).join(" · "),
      workItemId: route.workItemId,
    });
  }

  for (const event of availabilityEvents) {
    if (event.personId !== personId) continue;
    rows.push({
      id: `availability-${event.id}`,
      category: "availability",
      sortAt: event.startsAt,
      dateLabel: formatOrbitaDate(event.startsAt),
      title: availabilityKindLabel[event.kind],
      subject: "Dostupnost osobe",
      detail: periodLabel(event.startsAt, event.endsAt),
      provenance: [event.note, event.actorId ? `Actor: ${personName(personById, event.actorId)}` : undefined].filter(Boolean).join(" · ") || "Sačuvan vremenski zapis",
    });
  }

  for (const membership of temporalTeamMemberships) {
    if (membership.personId !== personId) continue;
    const team = teamById.get(membership.teamId);
    const unknownStart = membership.boundaryConfidence === "unknown_start";
    rows.push({
      id: `membership-${membership.id}`,
      category: "organization",
      sortAt: membership.validTo ?? membership.validFrom,
      dateLabel: unknownStart ? (membership.validTo ? `do ${formatOrbitaDate(membership.validTo)}` : "početak ?") : formatOrbitaDate(membership.validFrom),
      title: `Članstvo · ${membershipRoleText(membership.role)}`,
      subject: team?.name ?? membership.teamId,
      detail: unknownStart
        ? `Početak nije pouzdano poznat${membership.validTo ? ` · do ${formatOrbitaDate(membership.validTo)}` : " · aktivno"}`
        : periodLabel(membership.validFrom, membership.validTo),
      provenance: [membership.source, membership.reasonCode, membership.note].filter(Boolean).join(" · ") || "Sačuvan vremenski zapis članstva",
    });
  }

  rows.sort((left, right) => right.sortAt.localeCompare(left.sortAt) || left.id.localeCompare(right.id));
  const years = Array.from(new Set(rows.map((row) => row.sortAt.slice(0, 4)).filter((value) => /^\\d{4}$/.test(value)))).sort((a, b) => b.localeCompare(a));
  const visibleRows = rows.filter((row) => (category === "all" || row.category === category) && (year === "all" || row.sortAt.startsWith(year)));
  const categories: { id: HistoryCategory; label: string }[] = [
    { id: "all", label: "Sve" },
    { id: "responsibility", label: "Odgovornost" },
    { id: "route", label: "Rute" },
    { id: "availability", label: "Dostupnost" },
    { id: "organization", label: "Organizacija" },
    { id: "completion", label: "Završeci" },
  ];

  return (
    <div className="people-history-workspace" data-orbita-surface="person-evidence-history">
      <div className="people-history-projection" aria-label="Trenutna projekcija nasleđene odgovornosti">
        <div><span className="eyebrow">Trenutna projekcija</span><strong>{inheritedCoverage.length ? `${inheritedCoverage.length} nasleđenih pokrića` : "Nema nasleđenog pokrića"}</strong></div>
        <small>Efektivna odgovornost iz strukture Rada · projekcija, nije istorijski događaj.</small>
      </div>

      <div className="people-history-toolbar">
        <div className="people-history-filters" aria-label="Filtriraj dokazivu istoriju">
          {categories.map((item) => <button className={category === item.id ? "is-active" : ""} key={item.id} onClick={() => setCategory(item.id)} type="button">{item.label}</button>)}
        </div>
        <label className="people-history-year"><span>Godina</span><select aria-label="Godina istorije" onChange={(event) => setYear(event.target.value)} value={year}><option value="all">Sve godine</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      </div>

      <div className="people-history-summary"><strong>{visibleRows.length} zapisa</strong><span>Hronološki · najnovije prvo</span></div>

      {visibleRows.length ? (
        <div className="people-history-ledger" role="list">
          {visibleRows.map((row) => (
            <article className={`people-history-row is-${row.category}`} key={row.id} role="listitem">
              <time dateTime={row.sortAt}>{row.dateLabel}</time>
              <span aria-hidden="true" className="people-history-rail"><i /></span>
              <div className="people-history-copy">
                <div><span className="people-history-kind">{categoryLabel[row.category]}</span><strong>{row.title}</strong></div>
                <b>{row.subject}</b>
                <small>{row.detail}</small>
                {row.provenance ? <small className="people-history-provenance">{row.provenance}</small> : null}
              </div>
              {row.workItemId && onOpenWorkDossier ? <button aria-label={`Otvori Rad: ${row.subject}`} className="people-history-open" onClick={() => onOpenWorkDossier(row.workItemId!)} type="button">Otvori Rad</button> : <span className="people-history-record">Zapis</span>}
            </article>
          ))}
        </div>
      ) : <div className="people-history-empty"><strong>Nema sačuvanih istorijskih zapisa za izabrani period.</strong><span>Promeni filter ili godinu. ORBITA ne dopunjava istoriju pretpostavkama.</span></div>}
    </div>
  );
}
`;
write(history,historySource);

const dossier='src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx';
replaceExact(dossier,
`            <span className="eyebrow">Istorija</span>\n            <strong>Odgovornost i izvršenje</strong>`,
`            <span className="eyebrow">Istorija</span>\n            <strong>Dokaziva istorija</strong>`,
'Person history title');
replaceExact(dossier,
`          workCompletionRecords={workCompletionRecords}\n          personById={personById}\n          workTitleById={workTitleById}`,
`          workCompletionRecords={workCompletionRecords}\n          responsibilityRoutes={responsibilityRoutes}\n          availabilityEvents={availabilityEvents}\n          temporalTeamMemberships={temporalTeamMemberships}\n          organizationTeams={organizationTeams}\n          personById={personById}\n          workTitleById={workTitleById}`,
'Person history persisted sources');

const css='src/renderer/styles/canonical/people-operational-closure.css';
appendOnce(css,'.people-history-workspace{',`
/* Design Brain 0.5 · Wave 5: one evidence-backed Person history owner. */
.people-history-workspace{display:grid;gap:12px;min-width:0}
.people-history-projection{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:11px 13px;border:1px solid rgba(41,83,132,.12);border-radius:12px;background:#f7faff}
.people-history-projection>div{display:grid;gap:2px}.people-history-projection strong{color:#173453;font-size:13px}.people-history-projection small{max-width:520px;color:#687c94;font-size:11px;text-align:right}
.people-history-toolbar{display:flex;align-items:center;justify-content:space-between;gap:12px;min-width:0}
.people-history-filters{display:flex;align-items:center;gap:5px;min-width:0;overflow-x:auto;padding:1px}
.people-history-filters button{min-height:32px;padding:0 10px;border:1px solid rgba(49,84,125,.13);border-radius:9px;background:#fff;color:#536981;font-size:11px;font-weight:750;white-space:nowrap}
.people-history-filters button.is-active{border-color:rgba(35,104,199,.30);background:#edf5ff;color:#155cb4;box-shadow:inset 0 -2px 0 #2b72d6}
.people-history-filters button:focus-visible,.people-history-open:focus-visible,.people-history-year select:focus-visible{outline:2px solid rgba(43,114,214,.72);outline-offset:2px}
.people-history-year{display:flex;align-items:center;gap:7px;flex:0 0 auto;color:#6a7d94;font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em}
.people-history-year select{min-height:32px;border:1px solid rgba(49,84,125,.14);border-radius:9px;background:#fff;padding:0 28px 0 9px;color:#29445f;font:inherit;text-transform:none;letter-spacing:0}
.people-history-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#778aa0;font-size:10px}.people-history-summary strong{color:#344f6b;font-size:11px}
.people-history-ledger{position:relative;display:grid;border:1px solid rgba(42,78,119,.11);border-radius:13px;background:#fff;overflow:hidden}
.people-history-row{display:grid;grid-template-columns:92px 18px minmax(0,1fr) auto;align-items:start;gap:9px;min-width:0;padding:11px 12px;border-bottom:1px solid rgba(41,78,119,.09)}
.people-history-row:last-child{border-bottom:0}.people-history-row>time{padding-top:3px;color:#667c94;font-size:10px;font-weight:750;font-variant-numeric:tabular-nums}
.people-history-rail{position:relative;align-self:stretch;display:flex;justify-content:center;min-height:48px}.people-history-rail::before{content:"";position:absolute;top:-12px;bottom:-12px;left:50%;width:1px;background:#dbe6f1}.people-history-row:first-child .people-history-rail::before{top:7px}.people-history-row:last-child .people-history-rail::before{bottom:calc(100% - 8px)}
.people-history-rail i{position:relative;z-index:1;width:9px;height:9px;margin-top:5px;border:2px solid #fff;border-radius:50%;background:#6e8eaf;box-shadow:0 0 0 2px #dbe7f3}
.people-history-row.is-route .people-history-rail i{background:#6a62c8}.people-history-row.is-availability .people-history-rail i{background:#25827d}.people-history-row.is-organization .people-history-rail i{background:#607b9b}.people-history-row.is-completion .people-history-rail i{background:#25825d}.people-history-row.is-responsibility .people-history-rail i{background:#2b72d6}
.people-history-copy{display:grid;gap:3px;min-width:0}.people-history-copy>div{display:flex;align-items:center;gap:7px;min-width:0}.people-history-copy strong{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#183552;font-size:12px;white-space:nowrap}.people-history-copy>b{min-width:0;overflow:hidden;text-overflow:ellipsis;color:#0e2946;font-size:13px;white-space:nowrap}.people-history-copy small{color:#6b7f96;font-size:10.5px;line-height:1.35}.people-history-provenance{color:#8495a8!important}
.people-history-kind{flex:0 0 auto;padding:2px 6px;border:1px solid rgba(45,84,128,.10);border-radius:999px;background:#f5f8fb;color:#60758d;font-size:8.5px;font-weight:850;letter-spacing:.04em;text-transform:uppercase}
.people-history-open{align-self:center;min-height:32px;padding:0 10px;border:1px solid rgba(38,102,183,.18);border-radius:8px;background:#f4f8fd;color:#1e61ad;font-size:10px;font-weight:800}.people-history-open:hover{background:#eaf3ff}.people-history-record{align-self:center;color:#9aa8b6;font-size:9px;font-weight:750}
.people-history-empty{display:grid;gap:4px;padding:22px;border:1px dashed rgba(48,87,131,.18);border-radius:12px;background:#fafcfe;text-align:center}.people-history-empty strong{color:#314f6d;font-size:12px}.people-history-empty span{color:#7b8da0;font-size:10.5px}
@media(max-width:1100px){.people-history-projection{align-items:flex-start;flex-direction:column}.people-history-projection small{text-align:left}.people-history-toolbar{align-items:flex-start;flex-direction:column}.people-history-year{align-self:flex-end}.people-history-row{grid-template-columns:78px 16px minmax(0,1fr) auto;gap:7px;padding:10px}.people-history-copy>div{align-items:flex-start;flex-direction:column;gap:3px}}
`);

console.log(JSON.stringify({wave:'ORBITA_REDESIGN_WAVE5_PERSON_HISTORY',owner:history,truthSources:['ResponsibilityAssignment','WorkCompletionRecord','ResponsibilityRoute','PersonAvailabilityEvent','TemporalTeamMembership'],projection:'EffectiveResponsibilityProjection kept separate from persisted event ledger',thirdPartyCodeReuse:'NONE'},null,2));