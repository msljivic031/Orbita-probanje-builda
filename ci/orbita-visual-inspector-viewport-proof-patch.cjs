const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const file = path.join(root, 'tooling', 'inspector', 'visual-runtime-inspector.mjs');
let source = fs.readFileSync(file, 'utf8');

const marker = 'ORBITA_VIEWPORT_PROOF_EMULATION_V1';
if (source.includes(marker)) {
  console.log(JSON.stringify({ state: 'ALREADY_PATCHED', productSrcChanged: false, owner: 'tooling/inspector/visual-runtime-inspector.mjs', marker }));
  process.exit(0);
}

const captureMatch = source.match(/([A-Za-z_$][\w$]*)\.send\(\s*(['"])Page\.captureScreenshot\2/);
if (!captureMatch) throw new Error('Expected CDP Page.captureScreenshot owner not found');
const client = captureMatch[1];

const q = "['\"]";
const enablePattern = new RegExp(`await\\s+${client}\\.send\\(\\s*(${q})Page\\.enable\\1\\s*\\)\\s*;?`);
const enableMatch = source.match(enablePattern);
if (!enableMatch) throw new Error(`Expected ${client}.send('Page.enable') owner not found`);

const injection = `\n// ${marker}\nconst __orbitaViewportArg = (name, fallback) => {\n  const i = process.argv.indexOf(name);\n  const value = i >= 0 ? Number(process.argv[i + 1]) : fallback;\n  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;\n};\nconst __orbitaViewportWidth = __orbitaViewportArg('--width', 1440);\nconst __orbitaViewportHeight = __orbitaViewportArg('--height', 900);\nawait ${client}.send('Emulation.setDeviceMetricsOverride', {\n  width: __orbitaViewportWidth,\n  height: __orbitaViewportHeight,\n  deviceScaleFactor: 1,\n  mobile: false,\n  screenWidth: __orbitaViewportWidth,\n  screenHeight: __orbitaViewportHeight,\n});\nawait ${client}.send('Emulation.setVisibleSize', { width: __orbitaViewportWidth, height: __orbitaViewportHeight }).catch(() => undefined);\n`;

source = source.replace(enablePattern, (statement) => `${statement}${injection}`);
fs.writeFileSync(file, source, 'utf8');
console.log(JSON.stringify({
  state: 'PATCHED_PROOF_HARNESS_ONLY',
  productSrcChanged: false,
  owner: 'tooling/inspector/visual-runtime-inspector.mjs',
  marker,
  cdpClient: client,
  rule: 'Inspector CLI --width/--height now drive Chromium device metrics before scenario execution and capture.',
}));
