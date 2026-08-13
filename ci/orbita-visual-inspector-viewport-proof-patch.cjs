const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const file = path.join(root, 'tooling', 'inspector', 'visual-runtime-inspector.mjs');
let source = fs.readFileSync(file, 'utf8');

const marker = 'ORBITA_VIEWPORT_PROOF_EMULATION_V2';
if (source.includes(marker)) {
  console.log(JSON.stringify({ state: 'ALREADY_PATCHED', productSrcChanged: false, owner: 'tooling/inspector/visual-runtime-inspector.mjs', marker }));
  process.exit(0);
}

const captureMatch = source.match(/([A-Za-z_$][\w$]*)\.send\(\s*(['"])Page\.captureScreenshot\2/);
if (!captureMatch) throw new Error('Expected CDP Page.captureScreenshot owner not found');
const client = captureMatch[1];

const injection = `// ${marker}\nconst __orbitaViewportArg = (name, fallback) => {\n  const i = process.argv.indexOf(name);\n  const value = i >= 0 ? Number(process.argv[i + 1]) : fallback;\n  return Number.isFinite(value) && value > 0 ? Math.round(value) : fallback;\n};\nconst __orbitaViewportWidth = __orbitaViewportArg('--width', 1440);\nconst __orbitaViewportHeight = __orbitaViewportArg('--height', 900);\nawait ${client}.send('Emulation.setDeviceMetricsOverride', {\n  width: __orbitaViewportWidth,\n  height: __orbitaViewportHeight,\n  deviceScaleFactor: 1,\n  mobile: false,\n  screenWidth: __orbitaViewportWidth,\n  screenHeight: __orbitaViewportHeight,\n});\nawait ${client}.send('Emulation.setVisibleSize', { width: __orbitaViewportWidth, height: __orbitaViewportHeight }).catch(() => undefined);\nconst __orbitaViewportReadback = await ${client}.send('Runtime.evaluate', { expression: 'JSON.stringify({innerWidth:window.innerWidth,innerHeight:window.innerHeight,devicePixelRatio:window.devicePixelRatio})', returnByValue: true }).catch(() => undefined);\nconsole.log('ORBITA_VIEWPORT_READBACK', __orbitaViewportReadback?.result?.value ?? 'unavailable');\n`;

const q = "['\"]";
const enablePattern = new RegExp(`await\\s+${client}\\.send\\(\\s*(${q})Page\\.enable\\1\\s*\\)\\s*;?`);
const enableMatch = source.match(enablePattern);
let insertionPoint = 'before-first-capture';
if (enableMatch) {
  source = source.replace(enablePattern, (statement) => `${statement}\n${injection}`);
  insertionPoint = 'after-page-enable';
} else {
  const captureAt = source.indexOf(captureMatch[0]);
  const lineStart = source.lastIndexOf('\n', captureAt) + 1;
  source = source.slice(0, lineStart) + injection + source.slice(lineStart);
}

fs.writeFileSync(file, source, 'utf8');
console.log(JSON.stringify({
  state: 'PATCHED_PROOF_HARNESS_ONLY',
  productSrcChanged: false,
  owner: 'tooling/inspector/visual-runtime-inspector.mjs',
  marker,
  cdpClient: client,
  insertionPoint,
  rule: 'Inspector CLI --width/--height drive Chromium device metrics no later than the first capture; the first canonical capture establishes the viewport for subsequent scenario interaction.',
}));
