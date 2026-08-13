const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(process.argv[2] || '.');
const runs = [
  { dir: 'VISUAL_REDESIGN_W5_1440', width: 1440, height: 900 },
  { dir: 'VISUAL_REDESIGN_W5_1366', width: 1366, height: 768 },
];

function pngSize(file) {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('hex', 0, 8) !== '89504e470d0a1a0a') throw new Error(`not png: ${file}`);
  return {
    width: b.readUInt32BE(16),
    height: b.readUInt32BE(20),
    bytes: b.length,
    sha256: crypto.createHash('sha256').update(b).digest('hex'),
  };
}

const result = [];
for (const run of runs) {
  const manifestFile = path.join(root, run.dir, 'MANIFEST.json');
  const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
  if (manifest?.viewport?.width !== run.width || manifest?.viewport?.height !== run.height) {
    throw new Error(`${run.dir}: manifest viewport mismatch ${JSON.stringify(manifest?.viewport)}`);
  }
  const capture = (manifest.captures || []).find((item) => String(item.label || '').includes('people-person-unified-history'));
  if (!capture) throw new Error(`${run.dir}: unified history capture missing`);
  const screenshot = path.join(root, run.dir, capture.screenshot);
  const size = pngSize(screenshot);
  if (size.width !== run.width || size.height !== run.height) {
    throw new Error(`${run.dir}: physical PNG is ${size.width}x${size.height}, expected ${run.width}x${run.height}`);
  }
  result.push({ ...run, screenshot: capture.screenshot, ...size });
}

if (result[0].sha256 === result[1].sha256) throw new Error('Cross-viewport unified-history screenshots are byte-identical');

console.log(JSON.stringify({
  state: 'PASS',
  proof: 'PHYSICAL_PNG_VIEWPORT_GATE',
  productSrcChanged: false,
  captures: result,
}, null, 2));
