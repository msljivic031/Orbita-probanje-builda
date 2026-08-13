const fs=require('fs'),path=require('path');
const root=path.resolve(process.argv[2]||'candidate');
const read=r=>fs.readFileSync(path.join(root,r),'utf8').replace(/\r\n/g,'\n');
const write=(r,s)=>{const p=path.join(root,r);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s.replace(/\r\n/g,'\n'),'utf8');};
const windowFile='src/main/runtime/windowManager.ts';
let windowSource=read(windowFile);
if(!/new\s+BrowserWindow\s*\(/.test(windowSource))throw Error('existing BrowserWindow owner not proven in windowManager');
if(!windowSource.includes('export async function createWorkforceOutputWindow(')){
  windowSource += `\n\nexport async function createWorkforceOutputWindow(html: string): Promise<BrowserWindow> {\n  const outputWindow = new BrowserWindow({\n    show: false,\n    width: 1200,\n    height: 900,\n    webPreferences: {\n      contextIsolation: true,\n      nodeIntegration: false,\n      sandbox: true,\n    },\n  });\n  await outputWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));\n  return outputWindow;\n}\n`;
}
write(windowFile,windowSource);

const service='src/main/output/workforceOutputService.ts';
write(service,`import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createWorkforceOutputWindow } from '../runtime/windowManager.js';
import type { WorkforceOutputSnapshot } from '../../domain/people/workforceOutputSnapshot.js';

export type WorkforcePdfExportResult = {
  path: string;
  bytes: number;
  sha256: string;
};

export type WorkforcePrintResult = {
  submitted: boolean;
  failureReason?: string;
};

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function dateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return day + '.' + month + '.' + year + '.';
}

export function renderWorkforceSnapshotHtml(snapshot: WorkforceOutputSnapshot): string {
  const headCells = snapshot.days.map((day) => '<th title="' + escapeHtml(day.isoDate) + '">' + escapeHtml(day.day) + '</th>').join('');
  const bodyRows = snapshot.rows.map((row) => {
    const cells = row.cells.map((cell) => '<td class="' + (cell.workingDay ? '' : 'weekend') + '" title="' + escapeHtml(cell.isoDate + ' · ' + cell.label) + '">' + escapeHtml(cell.token || '—') + '</td>').join('');
    return '<tr><th class="person">' + escapeHtml(row.displayName) + (row.hasUnknownStart ? '<small>nepoznat početak članstva</small>' : '') + '</th>' + cells + '</tr>';
  }).join('');
  const legendRows = snapshot.legendByDay.map((day) => {
    const entries = day.entries.map((entry) => '<span><b>' + escapeHtml(entry.token) + '</b> ' + escapeHtml(entry.name) + '</span>').join(' · ');
    return '<tr><th>' + escapeHtml(dateLabel(day.isoDate)) + '</th><td>' + entries + '</td></tr>';
  }).join('');
  const unitText = snapshot.scope.unitIds.length ? snapshot.scope.unitIds.join(', ') : 'sve jedinice u izabranom scope-u';
  return '<!doctype html><html lang="sr"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'"><title>ORBITA Workforce ' + escapeHtml(snapshot.monthKey) + '</title><style>' +
    '@page{size:A4 landscape;margin:8mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0;font-size:9px}h1{font-size:18px;margin:0 0 4px}h2{font-size:12px;margin:14px 0 6px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px 16px;margin-bottom:10px}.note{margin:8px 0;padding:6px 8px;border:1px solid #cbd5e1;background:#f8fafc}table{width:100%;border-collapse:collapse}th,td{border:1px solid #cbd5e1;padding:3px;text-align:center;vertical-align:middle}.person{text-align:left;min-width:145px;white-space:nowrap}.person small{display:block;font-weight:400;color:#64748b}.weekend{background:#f1f5f9;color:#64748b}.legend th{width:76px;text-align:left}.legend td{text-align:left}.legend span{white-space:nowrap}' +
    '</style></head><body><h1>Workforce · ' + escapeHtml(snapshot.monthKey) + '</h1><div class="meta"><div><b>Scope:</b> ' + escapeHtml(snapshot.scope.label) + '</div><div><b>Workspace:</b> ' + escapeHtml(snapshot.scope.workspaceId) + '</div><div><b>Organizacija:</b> ' + escapeHtml(snapshot.scope.organizationId ?? 'nije posebno sužena') + '</div><div><b>Jedinice:</b> ' + escapeHtml(unitText) + '</div><div><b>Generisano:</b> ' + escapeHtml(snapshot.generatedAt) + '</div><div><b>Schema:</b> ' + escapeHtml(snapshot.schema) + '</div></div><div class="note">' + escapeHtml(snapshot.truthNotes.noHolidayInvention) + '</div><table><thead><tr><th class="person">Osoba</th>' + headCells + '</tr></thead><tbody>' + bodyRows + '</tbody></table><h2>Legenda po datumima</h2><table class="legend"><tbody>' + legendRows + '</tbody></table></body></html>';
}

export async function exportWorkforceSnapshotPdfToPath(snapshot: WorkforceOutputSnapshot, targetPath: string): Promise<WorkforcePdfExportResult> {
  if (!targetPath.trim()) throw new Error('Workforce PDF target path is required');
  const outputWindow = await createWorkforceOutputWindow(renderWorkforceSnapshotHtml(snapshot));
  try {
    const pdf = await outputWindow.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true });
    if (!pdf.length) throw new Error('Electron returned an empty Workforce PDF');
    await writeFile(targetPath, pdf);
    return { path: targetPath, bytes: pdf.length, sha256: createHash('sha256').update(pdf).digest('hex') };
  } finally {
    if (!outputWindow.isDestroyed()) outputWindow.destroy();
  }
}

export async function printWorkforceSnapshot(snapshot: WorkforceOutputSnapshot): Promise<WorkforcePrintResult> {
  const outputWindow = await createWorkforceOutputWindow(renderWorkforceSnapshotHtml(snapshot));
  try {
    return await new Promise<WorkforcePrintResult>((resolve) => {
      outputWindow.webContents.print({ silent: false, printBackground: true }, (success, failureReason) => {
        resolve({ submitted: success, failureReason: failureReason || undefined });
      });
    });
  } finally {
    if (!outputWindow.isDestroyed()) outputWindow.destroy();
  }
}
`);
console.log(JSON.stringify({state:'W6C_NATIVE_OUTPUT_ENGINE_IMPLEMENTED_NOT_ADMITTED',owners:{window:'src/main/runtime/windowManager.ts',service},truth:['existing BrowserWindow owner extended, no second window owner','hidden output window keeps contextIsolation=true/nodeIntegration=false/sandbox=true','one deterministic snapshot HTML representation','real Electron printToPDF','physical node:fs PDF write','real webContents.print with platform dialog','dialog/save-path intentionally remains outside service'],notYetClaimed:['IPC binding','save dialog','renderer commands','physical PDF runtime proof','print runtime proof','W6C PASS']},null,2));
