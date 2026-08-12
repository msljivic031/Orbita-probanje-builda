const fs = require('fs');
const path = require('path');

const root = process.argv[2];
if (!root) throw new Error('candidate root required');
const scenarioPath = path.join(root, 'config', 'inspector', 'scenarios.json');
const doc = JSON.parse(fs.readFileSync(scenarioPath, 'utf8'));
const targets = new Set([
  'people-open-availability-surface',
  'people-availability-period-validation-and-layout',
]);
const scenarios = Array.isArray(doc) ? doc : doc.scenarios;
if (!Array.isArray(scenarios)) throw new Error('scenario array not found');
let repaired = 0;
for (const scenario of scenarios) {
  if (!targets.has(scenario.id)) continue;
  if (!Array.isArray(scenario.steps)) throw new Error(`${scenario.id}: steps missing`);
  const quickIndex = scenario.steps.findIndex((step) =>
    typeof step?.selector === 'string' && step.selector.includes('person-availability-quick')
  );
  if (quickIndex < 0) throw new Error(`${scenario.id}: quick availability boundary not found`);
  const already = scenario.steps.slice(Math.max(0, quickIndex - 3), quickIndex).some((step) =>
    step?.type === 'clickText' && step?.text === 'Dostupnost'
  );
  if (!already) {
    scenario.steps.splice(quickIndex, 0,
      { type: 'clickText', text: 'Dostupnost' },
      { type: 'wait', milliseconds: 180 }
    );
  }
  repaired += 1;
}
if (repaired !== 2) throw new Error(`expected 2 repaired scenarios, got ${repaired}`);
fs.writeFileSync(scenarioPath, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({
  successor: 'R13AQ_NON_PROMOTED',
  owner: 'config/inspector/scenarios.json',
  productSrcChanged: false,
  repairedScenarios: [...targets],
  repair: 'enter current Dostupnost tab before asserting legacy quick availability surface',
}, null, 2));
