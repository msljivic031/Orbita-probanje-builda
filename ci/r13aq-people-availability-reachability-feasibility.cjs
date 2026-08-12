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

const modalOwnerPos = jsx.indexOf('person-availability-modal');
if (modalOwnerPos < 0 || modalOwnerPos <= markerPos) throw new Error('existing availability modal owner not found after legacy trigger');

const renderNeedle = 'availabilityCards.map(';
const renderPositions = [];
for (let p = jsx.indexOf(renderNeedle); p >= 0; p = jsx.indexOf(renderNeedle, p + renderNeedle.length)) renderPositions.push(p);
const eligibleRenderPositions = renderPositions.filter((p) => p > markerPos && p < modalOwnerPos);
if (eligibleRenderPositions.length !== 1) throw new Error(`expected exactly one current availabilityCards render between trigger and modal; found ${eligibleRenderPositions.length} eligible of ${renderPositions.length} total`);
const renderPos = eligibleRenderPositions[0];
const jsxExpressionStart = jsx.lastIndexOf('{', renderPos);
if (jsxExpressionStart < markerPos || jsxExpressionStart > renderPos) throw new Error('availabilityCards render JSX expression boundary not found');
const expressionPrefix = jsx.slice(jsxExpressionStart, renderPos);
if (!/^\{\s*$/.test(expressionPrefix)) throw new Error('availabilityCards render is not a direct JSX child expression');
const localWindow = jsx.slice(Math.max(markerPos, jsxExpressionStart - 1800), Math.min(modalOwnerPos, renderPos + 1800));
if (!/availabilitySummaryText|availabilityPeriod/.test(localWindow)) throw new Error('availabilityCards render is not adjacent to current availability summary/period owner');
if (localWindow.includes('data-orbita-action="person-availability-edit"')) throw new Error('current availability edit action already present near current render owner');

const insertion = `\n        <div className="people-availability-edit-action">${currentButton}</div>\n        `;
jsx = jsx.slice(0, jsxExpressionStart) + insertion + jsx.slice(jsxExpressionStart);
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
  renderAnchor: 'UNIQUE_AVAILABILITY_CARDS_MAP_BETWEEN_LEGACY_TRIGGER_AND_MODAL',
  renderAnchorEligibleCount: eligibleRenderPositions.length,
  currentAvailabilityEntry: 'person-availability-edit',
  currentAvailabilityTabSelector,
  tabPathEvidenceRun: 31600761746,
  canonicalScenariosChanged: changed
}));
