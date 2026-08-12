const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(process.argv[2] || '');
if (!root) throw new Error('candidate root required');

function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function write(rel, text) { fs.writeFileSync(path.join(root, rel), text.replace(/\r\n/g, '\n'), 'utf8'); }
function exactlyOne(text, re, label) {
  const matches = [...text.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))];
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, got ${matches.length}`);
  return matches[0];
}

const dossierPath = 'src/renderer/screens/ljudi/components/LjudiPersonDossier.tsx';
const screenPath = 'src/renderer/screens/ljudi/LjudiScreen.tsx';

let dossier = read(dossierPath);
let screen = read(screenPath);

if (dossier.includes('data-orbita-action="person-availability-quick"')) {
  throw new Error('live dossier already owns person-availability-quick');
}

// 1) Extend the live dossier contract with exactly one availability action callback.
const propLine = exactlyOne(dossier, /^\s*onOpenWorkDossier\s*:\s*\(workItemId\s*:\s*string\)\s*=>\s*void\s*[,;]?\s*$/m, 'dossier prop anchor');
dossier = dossier.slice(0, propLine.index + propLine[0].length) + '\n  onOpenAvailability: () => void;' + dossier.slice(propLine.index + propLine[0].length);

// 2) Destructure the new callback next to the existing dossier action callback.
const destructureLine = exactlyOne(dossier, /^\s*onOpenWorkDossier\s*,?\s*$/m, 'dossier destructure anchor');
dossier = dossier.slice(0, destructureLine.index + destructureLine[0].length) + '\n  onOpenAvailability,' + dossier.slice(destructureLine.index + destructureLine[0].length);

// 3) Put the real availability command in the current Dostupnost tab header.
const pillToken = 'people-availability-pill';
const pillIndex = dossier.indexOf(pillToken);
if (pillIndex < 0) throw new Error('availability pill anchor missing');
const pillClose = dossier.indexOf('</span>', pillIndex);
if (pillClose < 0) throw new Error('availability pill closing span missing');
const insertion = `\n          <button\n            className="primary-action"\n            data-orbita-action="person-availability-quick"\n            type="button"\n            onClick={onOpenAvailability}\n          >\n            Status / odsustvo\n          </button>`;
dossier = dossier.slice(0, pillClose + '</span>'.length) + insertion + dossier.slice(pillClose + '</span>'.length);

// 4) Wire the live dossier to the existing single modal owner.
const invocationStart = screen.indexOf('<LjudiPersonDossier');
if (invocationStart < 0) throw new Error('LjudiPersonDossier invocation missing');
const invocationEnd = screen.indexOf('/>', invocationStart);
if (invocationEnd < 0) throw new Error('LjudiPersonDossier invocation closing missing');
const invocation = screen.slice(invocationStart, invocationEnd);
if (invocation.includes('onOpenAvailability=')) throw new Error('dossier invocation already wired');
screen = screen.slice(0, invocationEnd) + '  onOpenAvailability={() => openAvailabilityModal(selectedPerson)}\n          ' + screen.slice(invocationEnd);

// 5) Remove the stale hidden command-focus button so the action has one live UI owner.
const legacyRe = /\n\s*<button\s+className="primary-action"\s+data-orbita-action="person-availability-quick"[\s\S]*?<\/button>/g;
const legacyMatches = [...screen.matchAll(legacyRe)];
if (legacyMatches.length !== 1) throw new Error(`legacy quick action: expected 1 match, got ${legacyMatches.length}`);
screen = screen.replace(legacyRe, '');

write(dossierPath, dossier);
write(screenPath, screen);

// 6) Refresh exact physical boundary identity without claiming promotion.
const boundaryPath = path.join(root, '.orbita-code-boundary.json');
const boundary = JSON.parse(fs.readFileSync(boundaryPath, 'utf8'));
const excluded = new Set(boundary.generatedRootsExcluded || []);
const files = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const rel = path.relative(root, full).replaceAll('\\', '/');
    if (rel === '.orbita-code-boundary.json' || excluded.has(rel.split('/')[0])) continue;
    const data = fs.readFileSync(full);
    files.push({ path: rel, bytes: data.length, sha256: crypto.createHash('sha256').update(data).digest('hex') });
  }
}
walk(root);
files.sort((a,b) => a.path.localeCompare(b.path));
const identityMaterial = files.map(x => `${x.path}\t${x.bytes}\t${x.sha256}\n`).join('');
const identity = crypto.createHash('sha256').update(identityMaterial).digest('hex');
boundary.files = files;
boundary.sourceDirectoryIdentitySha256 = identity;
boundary.developmentSuccessor = {
  lineage: 'R13AR',
  kind: 'NON_PROMOTED_PEOPLE_AVAILABILITY_LIVE_ENTRY_REPAIR_FEASIBILITY',
  predecessor: 'R13AP_NON_PROMOTED',
  promotion: 'FORBIDDEN_UNTIL_FULL_WINDOWS_VISUAL_AND_GOVERNANCE_GATES_PASS'
};
fs.writeFileSync(boundaryPath, JSON.stringify(boundary, null, 2) + '\n', 'utf8');

const verifyDossier = read(dossierPath);
const verifyScreen = read(screenPath);
const actionCount = (verifyDossier.match(/data-orbita-action="person-availability-quick"/g) || []).length + (verifyScreen.match(/data-orbita-action="person-availability-quick"/g) || []).length;
if (actionCount !== 1) throw new Error(`expected exactly one person-availability-quick owner, got ${actionCount}`);
if (!verifyDossier.includes('onClick={onOpenAvailability}')) throw new Error('live dossier callback not wired');
if (!verifyScreen.includes('onOpenAvailability={() => openAvailabilityModal(selectedPerson)}')) throw new Error('screen-to-modal wiring missing');

console.log(JSON.stringify({
  successor: 'R13AR_NON_PROMOTED_FEASIBILITY',
  productSrcChanged: true,
  changedOwners: [dossierPath, screenPath],
  modalOwnerPreserved: 'src/renderer/screens/ljudi/components/LjudiAvailabilityModal.tsx',
  actionOwnerCount: actionCount,
  sourceIdentitySha256: identity,
  state: 'PATCHED_NOT_PROMOTED'
}, null, 2));
