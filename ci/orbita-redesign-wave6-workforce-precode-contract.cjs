const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const out = path.resolve(process.argv[3] || 'workforce-precode-contract.json');
const srcRoot = path.join(root, 'src');
const files = [];
(function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|cjs|css|sql|json)$/i.test(entry.name)) files.push(full);
  }
})(srcRoot);

const rel = (file) => path.relative(root, file).replaceAll('\\', '/');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const count = (s, re) => [...s.matchAll(re)].length;
const fileText = new Map(files.map((f) => [f, fs.readFileSync(f, 'utf8')]));
const filesMatching = (re) => files.filter((f) => re.test(fileText.get(f))).map(rel).sort();
const unique = (xs) => [...new Set(xs)];

const membershipFile = 'src/domain/reports/responsibilityAvailabilitySnapshot.ts';
const membership = read(membershipFile);
const temporalTypeFile = 'src/domain/people/temporalTeamMembership.ts';
const temporalType = read(temporalTypeFile);

const recurrenceTokenFiles = files.filter((f) => /first-workday|last-workday/i.test(fileText.get(f)));
const recurrence = recurrenceTokenFiles.map((f) => {
  const s = fileText.get(f);
  return {
    file: rel(f),
    tokenCount: count(s, /first-workday|last-workday/gi),
    executableDateMath: /setUTCDate|setDate|Date\.UTC|new Date\(/.test(s),
    weekdayInspection: /getUTCDay|getDay\(/.test(s),
    looping: /\bwhile\s*\(|\bfor\s*\(/.test(s),
    holidayTerms: /holiday|praznik|neradni|non[- ]working/i.test(s),
    materializationTerms: /materializ|occurrence|recurrence|schedule/i.test(s),
    uiOnlyShape: /\.tsx$/i.test(f) && !/setUTCDate|setDate|Date\.UTC/.test(s),
  };
});
const executableRecurrence = recurrence.filter((x) => x.executableDateMath && x.materializationTerms);

const holidayFiles = filesMatching(/holiday|praznik|neradni|non[- ]working/i);
const weekendLogicFiles = filesMatching(/getUTCDay\(\)|getDay\(\)/);

const settingsFile = 'src/renderer/screens/podesavanja/PodesavanjaScreen.tsx';
const settings = read(settingsFile);
const peopleFile = 'src/renderer/screens/ljudi/LjudiScreen.tsx';
const people = read(peopleFile);
const permissionFiles = filesMatching(/\bpermission\b|\bauthoriz|\badmin\b|isWorkspaceWriting|currentActor/i);

const printCallFiles = filesMatching(/window\.print\s*\(|webContents\.print\s*\(|printToPDF\s*\(/);
const browserDownloadFiles = filesMatching(/createObjectURL|download\s*=|showSaveFilePicker|writeFile\s*\(|saveAs\s*\(/);
const printCssFiles = filesMatching(/@media\s+print/i);
const csvXlsxPdfFiles = filesMatching(/\bcsv\b|\bxlsx\b|\bpdf\b/i);

const schemaFiles = files.filter((f) => /src[\\/]main[\\/]persistence[\\/]schema/i.test(f)).map(rel).sort();
const schemaText = schemaFiles.map((r) => read(r)).join('\n');
const legendTables = [...schemaText.matchAll(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["'`]?([A-Za-z0-9_]*(?:legend|workforce|attendance)[A-Za-z0-9_]*)/gi)].map((m) => m[1]);

const historyFile = 'src/main/persistence/history/sqliteSemanticHistoryStore.ts';
const history = read(historyFile);
const reportScopeFile = 'src/domain/reports/reportExportScope.ts';
const reportScope = read(reportScopeFile);

const contract = {
  audit: 'ORBITA_WAVE6_WORKFORCE_PRECODE_CONTRACT_V1',
  sourceExposure: 'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',
  membership: {
    owner: membershipFile,
    missingValidFromActsAsUnboundedPast: /!startsAt\s*\|\|\s*startsAt\s*<=\s*asOfInstant/.test(membership),
    validToUsesExclusiveComparison: /asOfInstant\s*<\s*endsAt/.test(membership),
    dateOnlyValidToExtendedToNextDay: /exclusiveEndBoundary/.test(membership) && /nextIsoDate/.test(membership),
    boundaryConfidencePresent: /boundaryConfidence/.test(membership) && /unknown_start/.test(temporalType),
    rule: 'Historical inclusion may use an unknown-start membership as active before a known end, but UI must preserve unknown_start confidence and never fabricate a start date.',
  },
  recurrenceWorkingDays: {
    tokenFiles: recurrence,
    executableCandidates: executableRecurrence.map((x) => x.file),
    holidaySignalFiles: holidayFiles,
    weekdayLogicFiles: weekendLogicFiles,
    conclusion: executableRecurrence.length === 0
      ? 'No executable first/last-workday materializer was located by physical token+date-math scan; visible recurrence labels are not a shared calendar owner.'
      : 'Executable recurrence candidates exist; inspect/centralize their weekday semantics before Workforce uses them.',
  },
  permissions: {
    settingsUsesWorkspaceWriteBoundary: /isWorkspaceWriting/.test(settings),
    peopleUsesWorkspaceWriteBoundary: /isWorkspaceWriting/.test(people),
    settingsResolvesCurrentActor: /resolveCurrentActorPersonId/.test(settings),
    peopleResolvesCurrentActor: /resolveCurrentActorPersonId|requireCurrentActorPersonId/.test(people),
    candidateFiles: permissionFiles.slice(0, 80),
    conclusion: 'Do not invent Workforce permissions. Reuse the current workspace write/actor boundary unless a stronger organization-admin permission owner is physically found.',
  },
  insertion: {
    peopleOwner: peopleFile,
    selectedOrganizationAnchorCount: count(people, /selectedOrganization/g),
    organizationDossierAnchorCount: count(people, /LjudiOrganizationDossier/g),
    personDossierAnchorCount: count(people, /LjudiPersonDossier/g),
    settingsOwner: settingsFile,
    settingsSectionUnionPresent: /type SettingsSectionId/.test(settings),
    reportsSectionPresent: /['"]reports['"]/.test(settings),
    recommendation: 'Add Workforce as a People/Organization mode and Workforce legend as a bounded section/capability inside existing Settings owner.',
  },
  legendPersistence: {
    dedicatedLegendTables: unique(legendTables),
    semanticHistorySupportsOrganizationEntity: /entityType:[^\n]*organization/.test(history) || /'organization'/.test(history),
    semanticHistorySupportsWorkspaceEntity: /'workspace'/.test(history),
    schemaFileCount: schemaFiles.length,
    schemaTail: schemaFiles.slice(-12),
    requirement: 'Create one versioned legend truth model/table family; history events may evidence changes but cannot replace versioned lookup truth.',
  },
  output: {
    admittedReportFileEngineExplicitlyAbsent: /No export\/file generation engine is admitted in CURRENT runtime/.test(reportScope),
    printCallFiles,
    printCssFiles,
    browserDownloadFiles: browserDownloadFiles.slice(0, 80),
    csvXlsxPdfSignalFiles: csvXlsxPdfFiles.slice(0, 80),
    rule: 'Do not expose Export until a real Workforce output owner writes a physical file. Print may only be shown if a real print path is bound and proven.',
  },
  decision: {
    dailyTruth: 'projection over person_availability_events; no duplicate daily status store',
    historicalMembership: 'reuse membershipActiveAt semantics; preserve unknown_start confidence',
    nonWorkingDays: executableRecurrence.length === 0 ? 'NEW_SHARED_DOMAIN_OWNER_REQUIRED' : 'EXTRACT_OR_REUSE_EXECUTABLE_RECURRENCE_OWNER',
    legend: unique(legendTables).length === 0 ? 'NEW_VERSIONED_LEGEND_PERSISTENCE_REQUIRED' : 'REUSE_EXISTING_LEGEND_OWNER',
    renderer: 'EXTEND_LJUDI_PEOPLE_ORGANIZATION_OWNER',
    settings: 'EXTEND_EXISTING_SETTINGS_OWNER',
    export: 'NEW_REAL_OUTPUT_OWNER_REQUIRED_BEFORE_EXPORT_UI',
  },
};

fs.writeFileSync(out, JSON.stringify(contract, null, 2));
console.log(JSON.stringify(contract, null, 2));
