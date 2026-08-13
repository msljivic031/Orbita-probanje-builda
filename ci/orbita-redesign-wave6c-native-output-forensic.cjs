const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'candidate');
const out = path.resolve(process.argv[3] || 'wave6c-native-output-forensic.json');
const read = (rel) => {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : '';
};
const imports = (s) => [...s.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
const symbols = (s) => [...s.matchAll(/(?:export\s+)?(?:async\s+)?(?:function|class|const|type|interface|enum)\s+([A-Za-z_$][\w$]*)/g)].map((m) => m[1]);
const channels = (s) => [...new Set([...s.matchAll(/['"`](orbita:[A-Za-z0-9:_-]+)['"`]/g)].map((m) => m[1]))].sort();

const owners = {
  windowManager: 'src/main/runtime/windowManager.ts',
  ipcRegistry: 'src/main/ipc/ipcRegistry.ts',
  repositoryIpc: 'src/main/ipc/repositoryIpcHandlers.ts',
  channelAllowlist: 'src/shared/security/channelAllowlist.ts',
  documentStorage: 'src/main/persistence/documents/documentStorage.ts',
  orbitaApi: 'src/preload/orbitaApi.ts',
  preload: 'src/preload/preload.ts',
  reportExport: 'src/domain/reports/reportExport.ts',
  reportExportPlan: 'src/domain/reports/reportExportPlan.ts',
  reportExportScope: 'src/domain/reports/reportExportScope.ts',
  workforceProjection: 'src/domain/people/workforceMonthlySheet.ts',
  workforceLegend: 'src/domain/people/workforceLegend.ts'
};

const source = Object.fromEntries(Object.entries(owners).map(([key, rel]) => [key, read(rel)]));
const missing = Object.entries(source).filter(([, s]) => !s).map(([key]) => key);

function electronFacts(rel, s) {
  return {
    file: rel,
    exportedSymbols: symbols(s).filter((name) => /window|ipc|handler|channel|document|storage|api|preload|print|export|file|path/i.test(name)).slice(0, 100),
    electronImports: imports(s).filter((name) => name === 'electron' || name.startsWith('node:')).slice(0, 40),
    channels: channels(s),
    usesBrowserWindow: /\bBrowserWindow\b/.test(s),
    constructsBrowserWindow: /new\s+BrowserWindow\s*\(/.test(s),
    usesWebContentsPrint: /webContents\.print\s*\(/.test(s),
    usesPrintToPDF: /printToPDF\s*\(/.test(s),
    usesShowSaveDialog: /showSaveDialog\s*\(/.test(s),
    usesDialog: /\bdialog\b/.test(s),
    usesShell: /\bshell\b/.test(s),
    usesWriteFile: /\bwriteFileSync\b|\bwriteFile\s*\(|fs\.promises\.writeFile|createWriteStream\s*\(/.test(s),
    usesMkdir: /\bmkdirSync\b|\bmkdir\s*\(/.test(s),
    usesIpcHandle: /ipcMain\.handle\s*\(/.test(s),
    usesSafeInvoke: /safeInvoke\s*</.test(s) || /safeInvoke\s*\(/.test(s),
    usesContextBridge: /contextBridge/.test(s),
    contextIsolationTrue: /contextIsolation\s*:\s*true/.test(s),
    nodeIntegrationFalse: /nodeIntegration\s*:\s*false/.test(s),
    sandboxTrue: /sandbox\s*:\s*true/.test(s),
    loadsUrl: /\.loadURL\s*\(/.test(s),
    loadsFile: /\.loadFile\s*\(/.test(s)
  };
}

const windowFacts = electronFacts(owners.windowManager, source.windowManager);
const ipcFacts = electronFacts(owners.ipcRegistry, source.ipcRegistry);
const repositoryFacts = electronFacts(owners.repositoryIpc, source.repositoryIpc);
const allowlistFacts = electronFacts(owners.channelAllowlist, source.channelAllowlist);
const documentFacts = electronFacts(owners.documentStorage, source.documentStorage);
const apiFacts = electronFacts(owners.orbitaApi, source.orbitaApi);
const preloadFacts = electronFacts(owners.preload, source.preload);

const reportFacts = [owners.reportExport, owners.reportExportPlan, owners.reportExportScope]
  .filter((rel) => read(rel))
  .map((rel) => {
    const s = read(rel);
    return {
      file: rel,
      exportedSymbols: symbols(s).filter((name) => /report|export|format|scope|plan|section|file|output|artifact/i.test(name)).slice(0, 80),
      physicalWrite: /\bwriteFileSync\b|\bwriteFile\s*\(|fs\.promises\.writeFile|createWriteStream\s*\(/.test(s),
      browserDownload: /Blob\s*\(|URL\.createObjectURL|download\s*=/.test(s),
      nativePrint: /webContents\.print\s*\(|printToPDF\s*\(/.test(s)
    };
  });

const workforceFacts = [owners.workforceProjection, owners.workforceLegend]
  .filter((rel) => read(rel))
  .map((rel) => {
    const s = read(rel);
    return {
      file: rel,
      exportedSymbols: symbols(s).filter((name) => /workforce|legend|month|sheet|build|resolve|effective|date/i.test(name)).slice(0, 100),
      hasAsOfOrDateResolution: /asOf|effectiveFrom|forDate|date/i.test(s),
      hasPhysicalOutput: /\bwriteFileSync\b|\bwriteFile\s*\(|webContents\.print\s*\(|printToPDF\s*\(/.test(s)
    };
  });

const result = {
  audit: 'ORBITA_WAVE6C_NATIVE_OUTPUT_FORENSIC_V1',
  sourceExposure: 'SEMANTIC_FACTS_ONLY_NO_SOURCE_SNIPPETS',
  missingOwners: missing,
  windowOwner: windowFacts,
  ipcOwner: ipcFacts,
  repositoryIpcOwner: repositoryFacts,
  channelAllowlistOwner: allowlistFacts,
  physicalWriterPrecedent: documentFacts,
  preloadApiOwner: apiFacts,
  preloadRootOwner: preloadFacts,
  reportPlanningOwners: reportFacts,
  workforceTruthOwners: workforceFacts,
  verdict: {
    singleExistingBrowserWindowOwner: windowFacts.usesBrowserWindow && windowFacts.constructsBrowserWindow,
    existingWindowSecurityShape: {
      contextIsolationTrue: windowFacts.contextIsolationTrue,
      nodeIntegrationFalse: windowFacts.nodeIntegrationFalse,
      sandboxTrue: windowFacts.sandboxTrue
    },
    existingIpcRegistrationOwner: ipcFacts.usesIpcHandle,
    existingChannelAllowlistOwner: allowlistFacts.channels.length > 0,
    existingPreloadSafeInvokeOwner: apiFacts.usesSafeInvoke || preloadFacts.usesSafeInvoke,
    existingPhysicalWriterPrecedent: documentFacts.usesWriteFile,
    existingShowSaveDialog: [windowFacts, ipcFacts, repositoryFacts].some((x) => x.usesShowSaveDialog),
    existingWebContentsPrint: [windowFacts, ipcFacts, repositoryFacts].some((x) => x.usesWebContentsPrint),
    existingPrintToPDF: [windowFacts, ipcFacts, repositoryFacts].some((x) => x.usesPrintToPDF),
    reportPlanningIsPhysicalOutput: reportFacts.some((x) => x.physicalWrite || x.browserDownload || x.nativePrint),
    workforceTruthAlreadyWritesOutput: workforceFacts.some((x) => x.hasPhysicalOutput),
    rule: 'W6C must build one deterministic period-correct Workforce snapshot, reuse the existing Window/IPC/allowlist/preload security boundaries, and add one bounded native output service only where no admitted capability exists. Generic document storage is a writer precedent, not the Workforce output owner. No renderer Blob, fake success, or duplicate truth.'
  }
};

fs.writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));

if (!source.windowManager) throw new Error('windowManager owner missing');
if (!source.ipcRegistry) throw new Error('ipcRegistry owner missing');
if (!source.channelAllowlist) throw new Error('channelAllowlist owner missing');
if (!source.documentStorage) throw new Error('documentStorage writer precedent missing');
if (!source.orbitaApi || !source.preload) throw new Error('preload owner missing');
if (!result.verdict.singleExistingBrowserWindowOwner) throw new Error('single existing BrowserWindow owner not proven');
if (!result.verdict.existingIpcRegistrationOwner) throw new Error('existing IPC registration owner not proven');
if (!result.verdict.existingPreloadSafeInvokeOwner) throw new Error('existing preload safeInvoke owner not proven');
if (!result.verdict.existingPhysicalWriterPrecedent) throw new Error('physical writer precedent not proven');
