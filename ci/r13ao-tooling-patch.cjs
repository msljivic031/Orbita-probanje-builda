const fs=require('fs'); const path=require('path'); const crypto=require('crypto');
const root=path.resolve(process.argv[2]||'candidate');
const read=t=>fs.readFileSync(path.join(root,t),'utf8');
const write=(t,s)=>fs.writeFileSync(path.join(root,t),s);
const json=t=>JSON.parse(read(t));
const writeJson=(t,o)=>write(t,JSON.stringify(o,null,2)+'\n');
const replaceExact=(file,from,to)=>{let s=read(file); if(!s.includes(from)) throw new Error(`Expected source pattern missing in ${file}`); s=s.replace(from,to); write(file,s);};
const boundary0=json('.orbita-code-boundary.json');
if(boundary0.developmentSuccessor?.lineage!=='R13AN') throw new Error(`Expected R13AN input, got ${boundary0.developmentSuccessor?.lineage}`);

// Repair the brittle packaged-runtime path gate. Product src/** is intentionally untouched.
replaceExact('tooling/quality/check-packaged-runtime-paths.mjs',
`add(\n  'MAIN_PASSES_ELECTRON_APP_PATH',\n  mainSource.includes('createMainWindow({ appPath: app.getAppPath() })'),\n  'app.getAppPath()',\n);`,
`const mainPassesElectronAppPath = /createMainWindow\\s*\\(\\s*\\{[\\s\\S]*?appPath\\s*:\\s*app\\.getAppPath\\(\\)/m.test(mainSource);\nadd(\n  'MAIN_PASSES_ELECTRON_APP_PATH',\n  mainPassesElectronAppPath,\n  'createMainWindow options include appPath: app.getAppPath()',\n);`);

write('POKRENI_ORBITU.cmd',read('POKRENI_ORBITU.cmd').replaceAll('R13AN_','R13AO_'));

const pkg=json('package.json');
pkg.description='Orbita OI Pro ORBITA 2 authoritative product identity R4R21R14 with non-promoted R13AO Windows packaged-runtime path gate false-negative repair successor over R13AN. R13AO repairs the packaged-runtime quality owner so createMainWindow may carry additional options while still requiring appPath: app.getAppPath(); it preserves R13AN native content-signature hardening, R13AM 61/61 real-source IPC result witness, R13AL result enforcement and prior Electron hardening. R13AN exact Windows evidence proved npm ci, dependency-backed typecheck and full governance PASS, then production build stopped at the stale exact-string packaged-runtime gate; R13AO production build/package/runtime/pixel rerun remains required. Product current and Canon are not promoted.';
writeJson('package.json',pkg);

const truth=json('config/architecture/current-truth-authority.json');
truth.development={head:'R13AO_NON_PROMOTED',predecessor:'R13AN_NON_PROMOTED',kind:'WINDOWS_PACKAGED_RUNTIME_PATH_GATE_FALSE_NEGATIVE_REPAIR',promotionAllowed:false};
truth.buildAdmission.windowsGovernance='PASS_R13AN_GITHUB_ACTIONS_EXACT_CANDIDATE_RUN_31585597019';
truth.buildAdmission.productionBuild='NOT_RUN_R13AO; PREDECESSOR_R13AN_FAIL_PACKAGED_RUNTIME_PATH_GATE_FALSE_NEGATIVE';
truth.buildAdmission.windowsPackage='NOT_RUN'; truth.buildAdmission.windowsRuntime='NOT_RUN'; truth.buildAdmission.pixelVisualAdmission='NOT_RUN';
truth.buildAdmission.predecessorR13anWindowsEvidence={runId:31585597019,candidateSha256:'140846e9be04d3da222996fed9701771c4cb1be1c8395e766512ece153ba399a',exactDecryptAndSourceSha:'PASS',npmCi:'PASS',dependencyBackedTypecheck:'PASS',fullGovernance:'PASS',productionBuild:'FAIL_AT_CHECK_PACKAGED_RUNTIME_PATHS_MAIN_PASSES_ELECTRON_APP_PATH_FALSE_NEGATIVE',windowsPackage:'NOT_RUN_FAIL_CLOSED'};
truth.actorContract.blocker='R13AO_WINDOWS_FULL_CHECK_AND_PRODUCTION_BUILD_ADMISSION_BEFORE_ACTOR_CONTRACT_MIGRATION';
truth.nextPromotionGate=['R13AO Windows npm run check rerun PASS','R13AO production build PASS','Windows package/runtime persistence/native-IO regression PASS','pixel/visual admission for exact successor','fresh MIE exact-current rebind before release promotion'];
truth.releaseGovernance.sourceCandidateCurrent='PASS_R13AO_SOURCE_GOVERNANCE_PACKAGED_RUNTIME_GATE_FALSE_NEGATIVE_REPAIR_WITH_R13AN_NATIVE_CONTENT_SIGNATURE_AND_R13AM_ALL61_RESULT_WITNESS_PRESERVED; WINDOWS_BUILD_RERUN_REQUIRED';
writeJson('config/architecture/current-truth-authority.json',truth);

const dep=json('config/architecture/dependency-build-admission-current.json');
dep.status='R13AO_PACKAGED_RUNTIME_GATE_FALSE_NEGATIVE_REPAIR_WINDOWS_BUILD_RERUN_REQUIRED'; dep.developmentHead='R13AO_NON_PROMOTED'; dep.currentAdmission.productionBuild='NOT_RUN_R13AO'; dep.currentAdmission.windowsPackage='NOT_RUN';
dep.predecessorR13anWindowsEvidence={runId:31585597019,npmCi:'PASS',fullTypecheck:'PASS',fullGovernance:'PASS',productionBuild:'FAIL_PACKAGED_RUNTIME_PATH_GATE_FALSE_NEGATIVE',windowsPackage:'NOT_RUN_FAIL_CLOSED'};
writeJson('config/architecture/dependency-build-admission-current.json',dep);

const rel=json('config/architecture/release-promotion-state-machine-current.json'); rel.status='CURRENT_R13I_GOVERNANCE_APPLIED_TO_R13AO_NON_PROMOTED'; rel.developmentHead='R13AO_NON_PROMOTED';
for(const st of rel.stages){if(st.id==='SOURCE_CANDIDATE')st.evidence='R13AO non-promoted tooling successor over R13AN repairs the Windows packaged-runtime path gate false negative; R13AN exact Windows evidence proved npm ci, typecheck and full governance PASS before the gate stopped production build. Product current remains R4R21R14.'; if(st.id==='PRODUCTION_BUILD'){st.state='NOT_RUN';st.requires=['FULL_TYPECHECK:PASS','R13AO_WINDOWS_FULL_CHECK_RERUN:PASS'];}}
rel.predecessorEvidence={R13AN_WINDOWS_RUN_31585597019:'NPM_CI_PASS_TYPECHECK_PASS_FULL_GOVERNANCE_PASS_PRODUCTION_BUILD_FAIL_PACKAGED_RUNTIME_GATE_FALSE_NEGATIVE'}; writeJson('config/architecture/release-promotion-state-machine-current.json',rel);

const fix=json('config/fixtures/regression-fixture-catalog-current.json'); fix.developmentHead='R13AO_NON_PROMOTED'; writeJson('config/fixtures/regression-fixture-catalog-current.json',fix);
const actor=json('config/architecture/actor-contract-migration-controlled-draft-current.json'); actor.promotionBlocker='R13AO_WINDOWS_FULL_CHECK_AND_PRODUCTION_BUILD_ADMISSION'; writeJson('config/architecture/actor-contract-migration-controlled-draft-current.json',actor);
const business=json('config/architecture/business-actor-claim-boundary-current.json'); business.remainingDebt.detail=business.remainingDebt.detail.replace('until R13AN Windows full-check + production build admission','until R13AO Windows full-check + production build admission'); writeJson('config/architecture/business-actor-claim-boundary-current.json',business);

replaceExact('tooling/admission/run-exact-admission.mjs',"developmentHeadUnderTest: 'R13AN_NON_PROMOTED'","developmentHeadUnderTest: 'R13AO_NON_PROMOTED'");
replaceExact('tooling/quality/check-current-truth-authority.mjs',"truth.development.head==='R13AN_NON_PROMOTED'&&/R13AN/.test(pkg.description),'R13AN_NON_PROMOTED'","truth.development.head==='R13AO_NON_PROMOTED'&&/R13AO/.test(pkg.description),'R13AO_NON_PROMOTED'");
replaceExact('tooling/quality/check-current-truth-authority.mjs',"truth.buildAdmission.productionBuild==='NOT_RUN'&&truth.buildAdmission.windowsRuntime==='NOT_RUN'","String(truth.buildAdmission.productionBuild||'').startsWith('NOT_RUN_R13AO')&&truth.buildAdmission.windowsRuntime==='NOT_RUN'");
replaceExact('tooling/quality/check-current-truth-authority.mjs',"'dependency + full typecheck evidence admitted; R13AN Windows full-check/build/windows not admitted'","'dependency + full typecheck + R13AN governance evidence admitted; R13AO build/windows not admitted'");
replaceExact('tooling/quality/check-current-truth-authority.mjs',"truth.actorContract.blocker==='R13AN_WINDOWS_FULL_CHECK_AND_PRODUCTION_BUILD_ADMISSION_BEFORE_ACTOR_CONTRACT_MIGRATION','R13AN actor migration blocker aligned to current head'","truth.actorContract.blocker==='R13AO_WINDOWS_FULL_CHECK_AND_PRODUCTION_BUILD_ADMISSION_BEFORE_ACTOR_CONTRACT_MIGRATION','R13AO actor migration blocker aligned to current head'");
replaceExact('tooling/quality/check-current-truth-authority.mjs',"'R13AG launch/build readiness evidence preserved through R13AN; Windows rerun required'","'R13AG launch/build readiness evidence preserved through R13AO; Windows rerun required'");
replaceExact('tooling/quality/check-current-truth-authority.mjs',"String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('R13AN_SOURCE_GOVERNANCE')&&String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('USER_WINDOWS_RERUN_REQUIRED'),'R13AN source candidate truth aligned; Windows rerun still required'","String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('R13AO_SOURCE_GOVERNANCE')&&String(truth.releaseGovernance.sourceCandidateCurrent||'').includes('WINDOWS_BUILD_RERUN_REQUIRED'),'R13AO source candidate truth aligned; Windows build rerun still required'");
replaceExact('tooling/quality/check-actor-contract-migration-readiness.mjs',"config.promotionBlocker==='R13AN_WINDOWS_FULL_CHECK_AND_PRODUCTION_BUILD_ADMISSION'","config.promotionBlocker==='R13AO_WINDOWS_FULL_CHECK_AND_PRODUCTION_BUILD_ADMISSION'");
replaceExact('tooling/quality/check-release-promotion-boundary.mjs',"r.developmentHead==='R13AN_NON_PROMOTED'","r.developmentHead==='R13AO_NON_PROMOTED'");
replaceExact('tooling/quality/check-release-promotion-boundary.mjs',"by.PRODUCTION_BUILD.state==='NOT_RUN'&&Array.isArray(by.PRODUCTION_BUILD.requires)&&by.PRODUCTION_BUILD.requires.includes('R13AN_WINDOWS_FULL_CHECK_RERUN:PASS'),'NOT_RUN pending R13AN Windows full-check rerun'","by.PRODUCTION_BUILD.state==='NOT_RUN'&&Array.isArray(by.PRODUCTION_BUILD.requires)&&by.PRODUCTION_BUILD.requires.includes('R13AO_WINDOWS_FULL_CHECK_RERUN:PASS'),'NOT_RUN pending R13AO Windows full-check rerun'");
replaceExact('tooling/quality/check-dependency-admission-boundary.mjs',"config.currentAdmission?.productionBuild==='NOT_RUN'","String(config.currentAdmission?.productionBuild||'').startsWith('NOT_RUN_R13AO')");
replaceExact('tooling/quality/check-dependency-admission-boundary.mjs',"script.includes(\"developmentHeadUnderTest: 'R13AN_NON_PROMOTED'\"), 'exact admission labels R13AN as head under test'","script.includes(\"developmentHeadUnderTest: 'R13AO_NON_PROMOTED'\"), 'exact admission labels R13AO as head under test'");
replaceExact('tooling/quality/check-windows-launch-build-readiness.mjs',"truth.buildAdmission.productionBuild==='NOT_RUN'","String(truth.buildAdmission.productionBuild||'').startsWith('NOT_RUN_R13AO')");

const b=boundary0;
b.developmentSuccessor={lineage:'R13AO',kind:'NON_PROMOTED_WINDOWS_PACKAGED_RUNTIME_PATH_GATE_FALSE_NEGATIVE_REPAIR',predecessor:'R13AN_NON_PROMOTED',incorporatesEvidenceWave:'R13AN_GITHUB_ACTIONS_EXACT_WINDOWS_NPM_CI_TYPECHECK_GOVERNANCE_PASS_PLUS_PACKAGED_RUNTIME_GATE_FALSE_NEGATIVE_FINDING',promotion:'FORBIDDEN_UNTIL_RELEASE_STATE_MACHINE_ALL_REQUIRED_PHYSICAL_GATES_PASS'};
Object.assign(b.protectedTruth,{src:'413 FILES; PRODUCT SRC UNCHANGED FROM R13AN; PRODUCT CURRENT NOT PROMOTED',main:'113/113 FILES; PRODUCT MAIN SOURCE UNCHANGED; R13AN NATIVE CONTENT POLICY + PRIOR SECURITY OWNERS PRESERVED',currentTruthGate:'R13AO HEAD/TRUTH ALIGNMENT; R13AN WINDOWS GOVERNANCE PASS + PRODUCTION BUILD GATE FALSE-NEGATIVE RECORDED',governanceComposite:'R13AO LOCAL SOURCE/GOVERNANCE OWNER REPAIR; FULL DEPENDENCY WINDOWS GOVERNANCE RERUN REQUIRED ON EXACT R13AO',windowsFullCheck:'R13AN GITHUB ACTIONS EXACT CANDIDATE PASS; R13AO RERUN_REQUIRED',productionBuild:'R13AN FAIL_AT_PACKAGED_RUNTIME_PATH_FALSE_NEGATIVE; R13AO NOT_RUN',windowsPackage:'NOT_RUN'}); b.mie='MIE0.28.3_STALE_PARENT_EXACT_BOUND_TO_R4R21_NOT_R13AO';
const excluded=new Set(b.generatedRootsExcluded||[]), sha=x=>crypto.createHash('sha256').update(x).digest('hex'), files=[];
function walk(dir,rel=''){for(const ent of fs.readdirSync(dir,{withFileTypes:true})){if(!rel&&(excluded.has(ent.name)||ent.name==='.orbita-code-boundary.json'))continue;const r=rel?`${rel}/${ent.name}`:ent.name,f=path.join(dir,ent.name);if(ent.isDirectory())walk(f,r);else if(ent.isFile()){const d=fs.readFileSync(f);files.push({path:r.replaceAll('\\','/'),bytes:d.length,sha256:sha(d)});}}}
walk(root); files.sort((a,b)=>a.path<b.path?-1:a.path>b.path?1:0); const identity=sha(Buffer.from(files.map(x=>`${x.path}\t${x.bytes}\t${x.sha256}\n`).join(''),'utf8')); b.files=files;b.sourceDirectoryIdentitySha256=identity;writeJson('.orbita-code-boundary.json',b);
console.log(JSON.stringify({successor:'R13AO_NON_PROMOTED',productSrcChanged:false,files:files.length,sourceIdentitySha256:identity},null,2));
