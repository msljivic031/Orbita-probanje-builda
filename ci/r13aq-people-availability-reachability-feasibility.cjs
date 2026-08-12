const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const jsxPath = path.join(root, 'src/renderer/screens/ljudi/LjudiScreen.tsx');
const scenariosPath = path.join(root, 'config/inspector/scenarios.json');
let jsx = fs.readFileSync(jsxPath, 'utf8');

const quickMarker = 'data-orbita-action="person-availability-quick"';
if ((jsx.split(quickMarker).length - 1) !== 1) throw new Error('expected exactly one legacy quick marker');

const markerPos = jsx.indexOf(quickMarker);
const buttonStart = jsx.lastIndexOf('<button', markerPos);
const buttonEnd = jsx.indexOf('</button>', markerPos);
if (buttonStart < 0 || buttonEnd < 0) throw new Error('legacy availability button boundary not found');
const originalButton = jsx.slice(buttonStart, buttonEnd + '</button>'.length);
if (!originalButton.includes(quickMarker)) throw new Error('legacy button capture failed');
const currentButton = originalButton.replace(quickMarker, 'data-orbita-action="person-availability-edit"');
if (currentButton === originalButton) throw new Error('current edit marker replacement failed');

function findSectionEnd(source, start) {
  const token = /<section\b|<\/section>/g;
  token.lastIndex = start;
  let depth = 0;
  for (let m; (m = token.exec(source)); ) {
    if (m[0].startsWith('</')) depth -= 1; else depth += 1;
    if (depth === 0) return m.index;
  }
  return -1;
}

const availabilityPanelPos = jsx.indexOf('person-dossier-availability-panel');
if (availabilityPanelPos < 0) throw new Error('current availability panel owner not found');
const availabilitySectionStart = jsx.lastIndexOf('<section', availabilityPanelPos);
const availabilitySectionEnd = findSectionEnd(jsx, availabilitySectionStart);
if (availabilitySectionStart < 0 || availabilitySectionEnd < 0) throw new Error('current availability panel section boundary not found');
const currentPanel = jsx.slice(availabilitySectionStart, availabilitySectionEnd);
if (currentPanel.includes('data-orbita-action="person-availability-edit"')) throw new Error('current edit action already present in availability panel');
const insertion = `\n          <div className="person-dossier-availability-actions">${currentButton}</div>\n        `;
jsx = jsx.slice(0, availabilitySectionEnd) + insertion + jsx.slice(availabilitySectionEnd);
fs.writeFileSync(jsxPath, jsx, 'utf8');

const data = JSON.parse(fs.readFileSync(scenariosPath, 'utf8'));
const targets = new Set(['people-open-availability-surface', 'people-availability-period-validation-and-layout']);
const currentAvailabilityTabSelector = '.people-detail-tabs button:nth-child(3)';
let changed = 0;
function patchScenarios(v) {
  if (!v || typeof v !== 'object') return;
  if (Array.isArray(v)) { for (const x of v) patchScenarios(x); return; }
  if (targets.has(v.id) && Array.isArray(v.steps)) {
    if (v.steps.length < 4 || v.steps[0]?.type !== 'click' || v.steps[1]?.type !== 'wait') throw new Error('unexpected scenario prefix ' + v.id);
    const rest = v.steps.slice(2).map((step) => {
      const next = { ...step };
      if (typeof next.selector === 'string' && next.selector.includes('person-availability-quick')) next.selector = next.selector.replace('person-availability-quick', 'person-availability-edit');
      if (Array.isArray(next.selectors)) next.selectors = next.selectors.map((s) => typeof s === 'string' ? s.replace('person-availability-quick', 'person-availability-edit') : s);
      return next;
    });
    v.steps = [
      v.steps[0],
      v.steps[1],
      { type: 'click', selector: currentAvailabilityTabSelector },
      { type: 'wait', milliseconds: 300 },
      ...rest
    ];
    changed += 1;
  }
  for (const x of Object.values(v)) patchScenarios(x);
}
patchScenarios(data);
if (changed !== 2) throw new Error('expected 2 canonical People scenarios, changed ' + changed);
fs.writeFileSync(scenariosPath, JSON.stringify(data, null, 2) + '\n', 'utf8');

console.log(JSON.stringify({
  state: 'PATCHED_FOR_FEASIBILITY_ONLY',
  successorIntent: 'R13AQ_NON_PROMOTED',
  productSrcChanged: true,
  productOwner: 'src/renderer/screens/ljudi/LjudiScreen.tsx',
  proofOwner: 'config/inspector/scenarios.json',
  legacyActionbarChanged: false,
  modalOwnerChanged: false,
  currentAvailabilityEntry: 'person-availability-edit',
  currentAvailabilityTabSelector,
  tabPathEvidenceRun: 31600761746,
  canonicalScenariosChanged: changed
}));
