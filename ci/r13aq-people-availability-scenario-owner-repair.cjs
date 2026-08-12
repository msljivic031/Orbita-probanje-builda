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

const found = new Map();
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (!Array.isArray(node) && targets.has(node.id)) {
    if (found.has(node.id)) throw new Error(`${node.id}: duplicate scenario owner`);
    found.set(node.id, node);
  }
  if (Array.isArray(node)) {
    for (const item of node) visit(item);
  } else {
    for (const value of Object.values(node)) visit(value);
  }
}
visit(doc);

for (const id of targets) {
  const scenario = found.get(id);
  if (!scenario) throw new Error(`${id}: scenario owner not found`);
  if (!Array.isArray(scenario.steps)) throw new Error(`${id}: steps missing`);
  const quickIndex = scenario.steps.findIndex((step) =>
    typeof step?.selector === 'string' && step.selector.includes('person-availability-quick')
  );
  if (quickIndex < 0) throw new Error(`${id}: quick availability boundary not found`);
  const already = scenario.steps.slice(Math.max(0, quickIndex - 4), quickIndex).some((step) =>
    step?.type === 'clickText' && step?.text === 'Dostupnost'
  );
  if (!already) {
    scenario.steps.splice(quickIndex, 0,
      { type: 'clickText', text: 'Dostupnost' },
      { type: 'wait', milliseconds: 180 }
    );
  }
}

fs.writeFileSync(scenarioPath, JSON.stringify(doc, null, 2) + '\n');
console.log(JSON.stringify({
  successor: 'R13AQ_NON_PROMOTED',
  owner: 'config/inspector/scenarios.json',
  productSrcChanged: false,
  repairedScenarios: [...targets],
  repair: 'enter current Dostupnost tab before asserting quick availability surface',
  foundScenarioOwners: [...found.keys()].sort(),
}, null, 2));
