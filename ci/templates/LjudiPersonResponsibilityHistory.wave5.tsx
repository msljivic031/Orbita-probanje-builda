import { useState } from "react";
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
    const routeWorkId = route.workItemId;
    const routeSubject = routeWorkId ? (workTitleById.get(routeWorkId) ?? routeWorkId) : "Ruta odgovornosti";
    rows.push({
      id: `route-${route.id}`,
      category: "route",
      sortAt: route.validFrom,
      dateLabel: formatOrbitaDate(route.validFrom),
      title: routeName,
      subject: routeSubject,
      detail: `${direction} · ${periodLabel(route.validFrom, route.validTo)}`,
      provenance: [route.status === "active" ? "aktivna ruta" : "završena ruta", route.routeNewAssignments ? "usmerava i nova zaduženja" : "samo pregledani Radovi", endReason, route.reasonCode].filter(Boolean).join(" · "),
      workItemId: routeWorkId,
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
    const membershipStart = membership.validFrom;
    const membershipEnd = membership.validTo;
    const membershipSortAt = membershipEnd ?? membershipStart ?? membership.createdAt;
    const unknownStart = membership.boundaryConfidence === "unknown_start" || !membershipStart;
    rows.push({
      id: `membership-${membership.id}`,
      category: "organization",
      sortAt: membershipSortAt,
      dateLabel: unknownStart ? (membershipEnd ? `do ${formatOrbitaDate(membershipEnd)}` : "početak ?") : formatOrbitaDate(membershipStart),
      title: `Članstvo · ${membershipRoleText(membership.role)}`,
      subject: team?.name ?? membership.teamId,
      detail: unknownStart
        ? `Početak nije pouzdano poznat${membershipEnd ? ` · do ${formatOrbitaDate(membershipEnd)}` : " · aktivno"}`
        : periodLabel(membershipStart, membershipEnd),
      provenance: [membership.source, membership.reasonCode, membership.note].filter(Boolean).join(" · ") || "Sačuvan vremenski zapis članstva",
    });
  }

  rows.sort((left, right) => right.sortAt.localeCompare(left.sortAt) || left.id.localeCompare(right.id));
  const years = Array.from(new Set(rows.map((row) => row.sortAt.slice(0, 4)).filter((value) => /^\d{4}$/.test(value)))).sort((a, b) => b.localeCompare(a));
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
          {categories.map((item) => <button className={category === item.id ? "is-active" : ""} data-history-filter={item.id} key={item.id} onClick={() => setCategory(item.id)} type="button">{item.label}</button>)}
        </div>
        <label className="people-history-year"><span>Godina</span><select aria-label="Godina istorije" data-history-year onChange={(event) => setYear(event.target.value)} value={year}><option value="all">Sve godine</option>{years.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
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
