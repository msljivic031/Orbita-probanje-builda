const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const targets = ['people-open-availability-surface', 'people-availability-period-validation-and-layout'];
const allowedExt = new Set(['.json', '.mjs', '.js', '.cjs', '.ts', '.tsx']);
const skipDirs = new Set(['node_modules', 'dist', 'dist-electron', 'release', '.git']);
const out = { schemaVersion: 1, audit: 'R13AP_SANITIZED_PEOPLE_SCENARIO_FORENSIC', files: [] };

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory() && skipDirs.has(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full);
    else if (allowedExt.has(path.extname(ent.name).toLowerCase())) inspect(full);
  }
}

function classifySelector(v) {
  if (typeof v !== 'string') return null;
  if (v.includes('person-availability-quick')) return 'PERSON_AVAILABILITY_QUICK';
  if (v.includes('availability-period')) return 'AVAILABILITY_PERIOD';
  if (v.includes('availability-period-next')) return 'AVAILABILITY_PERIOD_NEXT';
  if (v.includes('orbita-person-node')) return 'PERSON_NODE';
  return 'OTHER_REDACTED';
}

function sanitizeScenario(obj) {
  const safe = {
    id: obj.id,
    keys: Object.keys(obj).sort(),
    required: typeof obj.required === 'boolean' ? obj.required : null,
    allowMutation: typeof obj.allowMutation === 'boolean' ? obj.allowMutation : null,
    allowFormInput: typeof obj.allowFormInput === 'boolean' ? obj.allowFormInput : null,
    routePresent: typeof obj.route === 'string',
    steps: []
  };
  if (Array.isArray(obj.steps)) {
    safe.steps = obj.steps.map((s, index) => ({
      index: index + 1,
      type: typeof s.type === 'string' ? s.type : null,
      keys: Object.keys(s).sort(),
      selectorKind: classifySelector(s.selector),
      selectorAnyKinds: Array.isArray(s.selectors) ? s.selectors.map(classifySelector) : null,
      actionKind: classifySelector(s.action),
      milliseconds: Number.isFinite(s.milliseconds) ? s.milliseconds : null,
      hasTextValue: typeof s.text === 'string',
      hasValue: Object.prototype.hasOwnProperty.call(s, 'value'),
      hasLabel: typeof s.label === 'string'
    }));
  }
  return safe;
}

function findScenarioObjects(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  if (!Array.isArray(value) && targets.includes(value.id)) found.push(sanitizeScenario(value));
  if (Array.isArray(value)) for (const item of value) findScenarioObjects(item, found);
  else for (const v of Object.values(value)) findScenarioObjects(v, found);
  return found;
}

function count(text, token) { return text.split(token).length - 1; }

function inspect(full) {
  let text;
  try { text = fs.readFileSync(full, 'utf8'); } catch { return; }
  const presentTargets = targets.filter((t) => text.includes(t));
  if (!presentTargets.length) return;
  const rel = path.relative(root, full).split(path.sep).join('/');
  const entry = {
    path: rel,
    bytes: Buffer.byteLength(text),
    presentTargets,
    tokenCounts: {
      personAvailabilityQuick: count(text, 'person-availability-quick'),
      availabilityPeriodNext: count(text, 'availability-period-next'),
      orbitaPersonNode: count(text, 'orbita-person-node'),
      waitForVisibleSelector: count(text, 'waitForVisibleSelector'),
      clickSelector: count(text, 'clickSelector'),
      clickText: count(text, 'clickText'),
      clickAny: count(text, 'clickAny'),
      assertVisible: count(text, 'assertVisible'),
      capture: count(text, 'capture')
    },
    jsonScenarios: []
  };
  if (path.extname(full).toLowerCase() === '.json') {
    try { entry.jsonScenarios = findScenarioObjects(JSON.parse(text)); } catch {}
  }
  out.files.push(entry);
}

walk(root);
out.files.sort((a,b) => a.path.localeCompare(b.path));
out.state = out.files.length ? 'PASS' : 'FAIL';
console.log(JSON.stringify(out, null, 2));
if (!out.files.length) process.exit(2);
