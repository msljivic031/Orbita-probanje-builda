from pathlib import Path
import json, re, hashlib, sys

r = Path(sys.argv[1]).resolve()
R13AP_ID = '8c8e411e679b93e3994b3b64425bb83ef03318eb4316937ca3a28a0be18e5704'

def rd(p): return (r / p).read_text(encoding='utf-8')
def wr(p, s):
    with (r / p).open('w', encoding='utf-8', newline='\n') as f: f.write(s)
def j(p): return json.loads(rd(p))
def wj(p, o): wr(p, json.dumps(o, ensure_ascii=False, indent=2) + '\n')
def rep(p, a, b):
    s = rd(p)
    if a not in s: raise SystemExit(f'missing pattern {p}: {a[:100]}')
    wr(p, s.replace(a, b))

boundary = j('.orbita-code-boundary.json')
if boundary.get('sourceDirectoryIdentitySha256') != R13AP_ID:
    raise SystemExit('formalize requires exact R13AP predecessor ledger before R13AQ patches')

jsx = rd('src/renderer/screens/ljudi/LjudiScreen.tsx')
if 'data-orbita-action="person-availability-tab"' not in jsx or 'data-orbita-action="person-availability-edit"' not in jsx:
    raise SystemExit('R13AQ People availability reachability patch is not present')
inspector = rd('tooling/inspector/visual-runtime-inspector.mjs')
if 'electron dist-electron/main/main.js' in inspector:
    raise SystemExit('R13AQ app-root inspector repair is not present')

pkg = j('package.json')
pkg['description'] = ('Orbita OI Pro ORBITA 2 authoritative product identity R4R21R14 with non-promoted R13AQ visual-runtime and People availability reachability repair successor over R13AP. '
    'R13AQ preserves the R13AP sandbox:true bundled CommonJS preload.cjs boundary, repairs the canonical visual inspector to launch Electron from the app root, restores a visible current Dostupnost-pane entry to the existing availability modal without reviving the hidden legacy actionbar, and rebinds the two canonical People availability scenarios to the current UI path. '
    'Exact R13AQ Windows dependency/typecheck/governance/build/package/runtime plus full visual admission is required before any promotion. Product current remains R4R21R14, Canon A4.25, release=false.')
wj('package.json', pkg)

truth = j('config/architecture/current-truth-authority.json')
truth['development'] = {
    'head': 'R13AQ_NON_PROMOTED',
    'predecessor': 'R13AP_NON_PROMOTED',
    'kind': 'VISUAL_INSPECTOR_APP_ROOT_AND_PEOPLE_AVAILABILITY_REACHABILITY_REPAIR_CANDIDATE',
    'promotionAllowed': False
}
truth['buildAdmission']['windowsGovernance'] = 'NOT_RUN_R13AQ; PREDECESSOR_R13AP_PASS_RUN_31590050913'
truth['buildAdmission']['productionBuild'] = 'NOT_RUN_R13AQ; PREDECESSOR_R13AP_PASS_RUN_31590050913'
truth['buildAdmission']['windowsPackage'] = 'NOT_RUN_R13AQ; PREDECESSOR_R13AP_PASS_RUN_31590050913'
truth['buildAdmission']['windowsRuntime'] = 'NOT_RUN_R13AQ; PREDECESSOR_R13AP_PACKAGED_SANDBOX_RUNTIME_PASS_RUN_31590050913'
truth['buildAdmission']['pixelVisualAdmission'] = 'NOT_RUN_R13AQ; PREDECESSOR_R13AP_VISUAL_FAIL_RUN_31598481795'
truth['actorContract']['blocker'] = 'R13AQ_WINDOWS_FULL_CHECK_BUILD_PACKAGE_RUNTIME_VISUAL_ADMISSION_BEFORE_ACTOR_CONTRACT_MIGRATION'
truth['nextPromotionGate'] = [
    'R13AQ Windows npm run check PASS',
    'R13AQ production build PASS',
    'R13AQ NSIS+portable x64 package PASS',
    'R13AQ sandboxed packaged orbita://app+preload+IPC+SQLite runtime PASS',
    'R13AQ full canonical pixel/visual admission PASS',
    'fresh MIE exact-current rebind before release promotion'
]
truth['releaseGovernance']['sourceCandidateCurrent'] = 'PASS_R13AQ_SOURCE_GOVERNANCE_VISUAL_REACHABILITY_REPAIR_CANDIDATE; EXACT_WINDOWS_R13AQ_ADMISSION_REQUIRED; EXACT_VISUAL_R13AQ_ADMISSION_REQUIRED'
truth['visualRepairCandidate'] = {
    'head': 'R13AQ_NON_PROMOTED',
    'predecessorVisualRun': 31598481795,
    'predecessorFailure': 'R13AP launch repair exposed two required People availability reachability scenario failures',
    'inspectorLaunchOwner': 'tooling/inspector/visual-runtime-inspector.mjs',
    'peopleOwner': 'src/renderer/screens/ljudi/LjudiScreen.tsx',
    'scenarioOwner': 'config/inspector/scenarios.json',
    'legacyActionbarRevived': False,
    'exactAdmission': 'REQUIRED'
}
wj('config/architecture/current-truth-authority.json', truth)

dep = j('config/architecture/dependency-build-admission-current.json')
dep['status'] = 'R13AQ_VISUAL_REACHABILITY_REPAIR_WINDOWS_ADMISSION_REQUIRED'
dep['developmentHead'] = 'R13AQ_NON_PROMOTED'
dep['currentAdmission']['productionBuild'] = 'NOT_RUN_R13AQ'
dep['currentAdmission']['windowsPackage'] = 'NOT_RUN_R13AQ'
dep['predecessorR13apWindowsEvidence'] = {
    'runId': 31590050913,
    'npmCi': 'PASS',
    'fullTypecheck': 'PASS',
    'fullGovernance': 'PASS',
    'productionBuild': 'PASS',
    'windowsPackage': 'PASS',
    'packagedSandboxRuntime': 'PASS'
}
wj('config/architecture/dependency-build-admission-current.json', dep)

rel = j('config/architecture/release-promotion-state-machine-current.json')
rel['status'] = 'CURRENT_R13I_GOVERNANCE_APPLIED_TO_R13AQ_NON_PROMOTED'
rel['developmentHead'] = 'R13AQ_NON_PROMOTED'
for st in rel['stages']:
    if st['id'] == 'SOURCE_CANDIDATE':
        st['evidence'] = 'R13AQ app-root visual inspector plus current People availability reachability repair candidate over exact-Windows-admitted R13AP; exact R13AQ Windows and visual admission required.'
    if st['id'] == 'PRODUCTION_BUILD':
        st['state'] = 'NOT_RUN'
        st['requires'] = ['FULL_TYPECHECK:PASS', 'R13AQ_WINDOWS_FULL_CHECK_RERUN:PASS']
    if st['id'] in ('WINDOWS_PACKAGE_RUNTIME_NATIVE_IO', 'PIXEL_VISUAL_ADMISSION'):
        st['state'] = 'NOT_RUN'
wj('config/architecture/release-promotion-state-machine-current.json', rel)

actor = j('config/architecture/actor-contract-migration-controlled-draft-current.json')
actor['promotionBlocker'] = 'R13AQ_WINDOWS_FULL_CHECK_BUILD_PACKAGE_RUNTIME_VISUAL_ADMISSION'
wj('config/architecture/actor-contract-migration-controlled-draft-current.json', actor)

biz = j('config/architecture/business-actor-claim-boundary-current.json')
detail = biz.get('remainingDebt', {}).get('detail', '')
detail = detail.replace('R13AP Windows full-check + build/package/runtime admission', 'R13AQ Windows full-check + build/package/runtime/visual admission')
biz['remainingDebt']['detail'] = detail
wj('config/architecture/business-actor-claim-boundary-current.json', biz)

fixtures = j('config/fixtures/regression-fixture-catalog-current.json')
fixtures['developmentHead'] = 'R13AQ_NON_PROMOTED'
wj('config/fixtures/regression-fixture-catalog-current.json', fixtures)

subs = {
    'tooling/admission/run-exact-admission.mjs': [
        ("developmentHeadUnderTest: 'R13AP_NON_PROMOTED'", "developmentHeadUnderTest: 'R13AQ_NON_PROMOTED'")
    ],
    'tooling/quality/check-current-truth-authority.mjs': [
        ("truth.development.head==='R13AP_NON_PROMOTED'&&/R13AP/.test(pkg.description),'R13AP_NON_PROMOTED'", "truth.development.head==='R13AQ_NON_PROMOTED'&&/R13AQ/.test(pkg.description),'R13AQ_NON_PROMOTED'"),
        ("String(truth.buildAdmission.productionBuild||'').startsWith('NOT_RUN_R13AP')", "String(truth.buildAdmission.productionBuild||'').startsWith('NOT_RUN_R13AQ')"),
        ("String(truth.buildAdmission.windowsRuntime||'').startsWith('NOT_RUN_R13AP')", "String(truth.buildAdmission.windowsRuntime||'').startsWith('NOT_RUN_R13AQ')"),
        ("'R13AP build/package/runtime remain fail-closed pending exact Windows admission'", "'R13AQ build/package/runtime/visual remain fail-closed pending exact Windows and visual admission'"),
        ("truth.actorContract.blocker==='R13AP_WINDOWS_FULL_CHECK_BUILD_PACKAGE_RUNTIME_ADMISSION_BEFORE_ACTOR_CONTRACT_MIGRATION','R13AP actor migration blocker aligned to current head'", "truth.actorContract.blocker==='R13AQ_WINDOWS_FULL_CHECK_BUILD_PACKAGE_RUNTIME_VISUAL_ADMISSION_BEFORE_ACTOR_CONTRACT_MIGRATION','R13AQ actor migration blocker aligned to current head'"),
        ("String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('R13AP_SOURCE_GOVERNANCE')&&String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('EXACT_WINDOWS_R13AP_ADMISSION_REQUIRED'),'R13AP source candidate truth aligned; exact Windows admission required'", "String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('R13AQ_SOURCE_GOVERNANCE')&&String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('EXACT_WINDOWS_R13AQ_ADMISSION_REQUIRED'),'R13AQ source candidate truth aligned; exact Windows admission required'")
    ],
    'tooling/quality/check-actor-contract-migration-readiness.mjs': [
        ("config.promotionBlocker==='R13AP_WINDOWS_FULL_CHECK_BUILD_PACKAGE_RUNTIME_ADMISSION'", "config.promotionBlocker==='R13AQ_WINDOWS_FULL_CHECK_BUILD_PACKAGE_RUNTIME_VISUAL_ADMISSION'")
    ],
    'tooling/quality/check-release-promotion-boundary.mjs': [
        ("r.developmentHead==='R13AP_NON_PROMOTED'", "r.developmentHead==='R13AQ_NON_PROMOTED'"),
        ("by.PRODUCTION_BUILD.state==='NOT_RUN'&&Array.isArray(by.PRODUCTION_BUILD.requires)&&by.PRODUCTION_BUILD.requires.includes('R13AP_WINDOWS_FULL_CHECK_RERUN:PASS'),'NOT_RUN pending R13AP Windows full-check rerun'", "by.PRODUCTION_BUILD.state==='NOT_RUN'&&Array.isArray(by.PRODUCTION_BUILD.requires)&&by.PRODUCTION_BUILD.requires.includes('R13AQ_WINDOWS_FULL_CHECK_RERUN:PASS'),'NOT_RUN pending R13AQ Windows full-check rerun'")
    ],
    'tooling/quality/check-dependency-admission-boundary.mjs': [
        ("String(config.currentAdmission?.productionBuild||'').startsWith('NOT_RUN_R13AP')", "String(config.currentAdmission?.productionBuild||'').startsWith('NOT_RUN_R13AQ')"),
        ("String(config.currentAdmission?.windowsPackage||'').startsWith('NOT_RUN_R13AP')", "String(config.currentAdmission?.windowsPackage||'').startsWith('NOT_RUN_R13AQ')"),
        ("script.includes(\"developmentHeadUnderTest: 'R13AP_NON_PROMOTED'\"), 'exact admission labels R13AP as head under test'", "script.includes(\"developmentHeadUnderTest: 'R13AQ_NON_PROMOTED'\"), 'exact admission labels R13AQ as head under test'")
    ],
    'tooling/quality/check-windows-launch-build-readiness.mjs': [
        ("String(truth.buildAdmission.productionBuild||'').startsWith('NOT_RUN_R13AP')", "String(truth.buildAdmission.productionBuild||'').startsWith('NOT_RUN_R13AQ')")
    ]
}
for p, pairs in subs.items():
    s = rd(p)
    for a, b in pairs:
        if a not in s: raise SystemExit(f'missing {p}: {a[:80]}')
        s = s.replace(a, b)
    wr(p, s)

cmd = rd('POKRENI_ORBITU.cmd')
wr('POKRENI_ORBITU.cmd', cmd.replace('R13AP_', 'R13AQ_'))

boundary = j('.orbita-code-boundary.json')
boundary['developmentSuccessor'] = {
    'lineage': 'R13AQ',
    'kind': 'NON_PROMOTED_VISUAL_INSPECTOR_APP_ROOT_AND_PEOPLE_AVAILABILITY_REACHABILITY_REPAIR_CANDIDATE',
    'predecessor': 'R13AP_NON_PROMOTED',
    'incorporatesEvidenceWave': 'R13AP_EXACT_WINDOWS_PASS_RUN_31590050913_PLUS_VISUAL_FAIL_RUN_31598481795_ROOT_CAUSE_REPAIR',
    'promotion': 'FORBIDDEN_UNTIL_EXACT_R13AQ_WINDOWS_VISUAL_AND_MIE_GATES_PASS'
}
src_count = sum(1 for q in (r / 'src').rglob('*') if q.is_file())
boundary['protectedTruth']['src'] = f'{src_count} FILES; R13AQ changes only the current People availability reachability/instrumentation path in product src; all unrelated domain semantics preserved from R13AP'
boundary['protectedTruth']['windowsFullCheck'] = 'R13AQ EXACT RERUN_REQUIRED; predecessor R13AP PASS RUN 31590050913'
boundary['protectedTruth']['productionBuild'] = 'R13AQ NOT_RUN; predecessor R13AP PASS RUN 31590050913'
boundary['protectedTruth']['windowsPackage'] = 'R13AQ NOT_RUN; predecessor R13AP PASS RUN 31590050913'
boundary['protectedTruth']['pixelVisualAdmission'] = 'R13AQ NOT_RUN; predecessor R13AP FAIL RUN 31598481795; app-root and People reachability root causes repaired in candidate source'

excluded = set(boundary.get('generatedRootsExcluded', []))
files = []
for q in r.rglob('*'):
    if not q.is_file(): continue
    relp = q.relative_to(r).as_posix()
    if relp == '.orbita-code-boundary.json' or relp.split('/')[0] in excluded: continue
    dat = q.read_bytes()
    files.append({'path': relp, 'bytes': len(dat), 'sha256': hashlib.sha256(dat).hexdigest()})
files.sort(key=lambda x: x['path'])
identity = hashlib.sha256(''.join(f"{x['path']}\t{x['bytes']}\t{x['sha256']}\n" for x in files).encode()).hexdigest()
boundary['files'] = files
boundary['sourceDirectoryIdentitySha256'] = identity
wj('.orbita-code-boundary.json', boundary)
print(json.dumps({'head':'R13AQ_NON_PROMOTED','identity':identity,'files':len(files),'srcFiles':src_count}))
