param(
  [string]$EvidenceDir = 'evidence-w6c-c2c'
)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force $EvidenceDir | Out-Null
function Run-Logged([string]$Name,[scriptblock]$Command){
  & $Command 2>&1 | Tee-Object (Join-Path $EvidenceDir "$Name.log")
  if($LASTEXITCODE-ne0){throw "$Name failed: $LASTEXITCODE"}
}
$bh=(Get-FileHash $env:ORBITA_BRIDGE_ZIP -Algorithm SHA256).Hash.ToLowerInvariant(); if($bh-ne$env:ORBITA_BRIDGE_SHA256){throw "bridge $bh"}
Expand-Archive $env:ORBITA_BRIDGE_ZIP bridge -Force
$eh=(Get-FileHash $env:ORBITA_ENCRYPTED_FILE -Algorithm SHA256).Hash.ToLowerInvariant(); if($eh-ne$env:ORBITA_ENCRYPTED_SHA256){throw "enc $eh"}
@'
const fs=require('fs'),crypto=require('crypto');const k=Buffer.from(process.env.ORBITA_CI_AES256_KEY_B64||'','base64');if(k.length!==32)throw Error('secret');const b=fs.readFileSync(process.env.ORBITA_ENCRYPTED_FILE),n=b.subarray(8,20),x=b.subarray(20),tag=x.subarray(x.length-16),ct=x.subarray(0,x.length-16),d=crypto.createDecipheriv('aes-256-gcm',k,n);d.setAAD(Buffer.from(process.env.ORBITA_AAD));d.setAuthTag(tag);const p=Buffer.concat([d.update(ct),d.final()]);const s=crypto.createHash('sha256').update(p).digest('hex');if(s!==process.env.ORBITA_BASE_R13AN_SHA256)throw Error(s);fs.writeFileSync('candidate.zip',p);console.log(s);
'@ | Set-Content decrypt.cjs -Encoding utf8
Run-Logged 'r13an-decrypt' { node decrypt.cjs }
Expand-Archive candidate.zip candidate -Force
Run-Logged 'r13ao' { node ci/r13ao-tooling-patch.cjs candidate }
Run-Logged 'r13ap' { python ci/r13ap-transform.py candidate }
$p=Get-Content candidate/.orbita-code-boundary.json -Raw | ConvertFrom-Json
if($p.sourceDirectoryIdentitySha256-ne$env:ORBITA_R13AP_SOURCE_IDENTITY){throw "identity $($p.sourceDirectoryIdentitySha256)"}
Run-Logged 'r13ar' { node ci/r13ar-people-availability-live-entry-repair.cjs candidate }
Run-Logged 'r13aq' { node ci/r13aq-people-availability-scenario-owner-repair.cjs candidate }
Run-Logged 'root' { node ci/r13ap-visual-inspector-root-launch-patch.cjs candidate }
Run-Logged 'viewport-proof-patch' { node ci/orbita-visual-inspector-viewport-proof-patch.cjs candidate }
Run-Logged 'w1' { node ci/orbita-redesign-wave1-transform.cjs candidate }
Run-Logged 'w2' { node ci/orbita-redesign-wave2-run.cjs candidate }
Run-Logged 'w3' { node ci/orbita-redesign-wave3-run.cjs candidate }
Run-Logged 'w4' { node ci/orbita-redesign-wave4-people-transform.cjs candidate }
Run-Logged 'w4-scenario' { node ci/orbita-redesign-wave4-people-scenario-proof.cjs candidate }
Run-Logged 'w5' { node ci/orbita-redesign-wave5-person-history-transform.cjs candidate }
Run-Logged 'w5-scenario' { node ci/orbita-redesign-wave5-person-history-scenario-proof.cjs candidate }
Run-Logged 'w6a' { node ci/orbita-redesign-wave6a-workforce-grid-transform-v2.cjs candidate }
Run-Logged 'w6a-ux' { node ci/orbita-redesign-wave6a-ux-repair.cjs candidate }
Run-Logged 'w6a-scenario' { node ci/orbita-redesign-wave6a-workforce-scenario-proof.cjs candidate }
Run-Logged 'w6b-core' { node ci/orbita-redesign-wave6b-workforce-legend-core-transform.cjs candidate }
Run-Logged 'w6b-core-repair' { node ci/orbita-redesign-wave6b-core-type-repair.cjs candidate }
Run-Logged 'w6b-core-gate' { node ci/orbita-redesign-wave6b-core-contract-gate.cjs candidate }
Run-Logged 'w6b-write' { node ci/orbita-redesign-wave6b-legend-write-transform.cjs candidate }
Run-Logged 'w6b-write-gate' { node ci/orbita-redesign-wave6b-legend-write-gate.cjs candidate }
Run-Logged 'w6b-settings-generator-repair' { node ci/orbita-redesign-wave6b-settings-generator-repair.cjs }
Run-Logged 'w6b-settings-syntax' { node --check ci/orbita-redesign-wave6b-legend-settings-transform.cjs }
Run-Logged 'w6b-settings' { node ci/orbita-redesign-wave6b-legend-settings-transform.cjs candidate }
Run-Logged 'w6b-settings-evidence' { node ci/orbita-redesign-wave6b-settings-evidence-repair.cjs candidate }
Run-Logged 'w6b-settings-gate' { node ci/orbita-redesign-wave6b-legend-settings-gate.cjs candidate }
Run-Logged 'w6b-scenario' { node ci/orbita-redesign-wave6b-legend-scenario-proof.cjs candidate }
Run-Logged 'w6c-snapshot' { node ci/orbita-redesign-wave6c-output-snapshot-transform.cjs candidate }
Run-Logged 'w6c-snapshot-gate' { node ci/orbita-redesign-wave6c-output-snapshot-gate.cjs candidate }
Run-Logged 'w6c-binding-forensic' { node ci/orbita-redesign-wave6c-native-output-binding-forensic.cjs candidate (Join-Path $EvidenceDir 'native-binding.json') }
Run-Logged 'w6c-native-transform-syntax' { node --check ci/orbita-redesign-wave6c-native-output-transform.cjs }
Run-Logged 'w6c-native-transform' { node ci/orbita-redesign-wave6c-native-output-transform.cjs candidate }
Run-Logged 'w6c-bridge-transform-syntax' { node --check ci/orbita-redesign-wave6c-native-bridge-transform.cjs }
Run-Logged 'w6c-bridge-transform' { node ci/orbita-redesign-wave6c-native-bridge-transform.cjs candidate }
Run-Logged 'w6c-bridge-gate' { node ci/orbita-redesign-wave6c-native-bridge-gate.cjs candidate }
@{
  state='PASS';
  proof='W6C_RECONSTRUCT_THROUGH_C2B';
  sourceIdentity=$p.sourceDirectoryIdentitySha256;
  candidate='candidate';
} | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $EvidenceDir 'reconstruction.json') -Encoding utf8
