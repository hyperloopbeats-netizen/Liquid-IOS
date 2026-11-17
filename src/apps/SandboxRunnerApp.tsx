import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Trash2 } from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import { vfs } from '../kernel/vfs';
import type { VFSFile } from '../types/os';
import { buildSandboxedSrcDoc } from '../utils/codeTools';

interface SandboxRunnerAppProps {
  targetFileName: string | null;
  onSelectFile: (fileName: string) => void;
}

interface SandboxLog {
  id: string;
  level: 'log' | 'warn' | 'error';
  text: string;
  time: string;
}

export function SandboxRunnerApp({ targetFileName, onSelectFile }: SandboxRunnerAppProps) {
  const [files, setFiles] = useState<VFSFile[]>([]);
  const [runNonce, setRunNonce] = useState(1);
  const [logs, setLogs] = useState<SandboxLog[]>([]);

  useEffect(() => {
    void vfs.init();
    const unsub = vfs.subscribe((nextFiles) => {
      setFiles(nextFiles);
      if (!targetFileName && nextFiles.length > 0) {
        const htmlDefault = nextFiles.find((f) => f.kind === 'html') ?? nextFiles[0];
        onSelectFile(htmlDefault.name);
      }
      setRunNonce((n) => n + 1);
    });
    return unsub;
  }, [targetFileName, onSelectFile]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data as {
        source?: string;
        fileName?: string;
        level?: 'log' | 'warn' | 'error';
        text?: string;
      } | null;
      if (!data || data.source !== 'aether-sandbox') return;
      const entry: SandboxLog = {
        id: `sbox-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        level: data.level ?? 'log',
        text: data.text ?? '',
        time: new Date().toTimeString().split(' ')[0],
      };
      setLogs((prev) => [entry, ...prev].slice(0, 80));
      if (entry.level === 'error') {
        neuralBus.publish('SANDBOX', 'RUNTIME_ERROR', `${data.fileName}: ${entry.text}`);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const activeFile =
    files.find((f) => f.name === targetFileName || f.path.endsWith(targetFileName ?? '')) ??
    files.find((f) => f.kind === 'html') ??
    files[0] ??
    null;

  const srcDoc = useMemo(() => {
    if (!activeFile) return '';
    return buildSandboxedSrcDoc(activeFile, files, runNonce);
  }, [activeFile, files, runNonce]);

  const handleExportStandaloneHtml = () => {
    if (!activeFile || !srcDoc) return;
    const blob = new Blob([srcDoc], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name.endsWith('.html')
      ? activeFile.name
      : `${activeFile.name.replace(/\.[^.]+$/, '')}-bundle.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3.5 overflow-y-auto md:overflow-hidden text-xs">
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="sandbox-file-select" className="text-[11px] text-slate-400">
            Entry File
          </label>
          <select
            id="sandbox-file-select"
            value={activeFile?.name ?? ''}
            onChange={(e) => {
              onSelectFile(e.target.value);
              vfs.setActiveFile(e.target.value);
            }}
            className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 outline-none cursor-pointer"
          >
            {files.map((f) => (
              <option key={f.id} value={f.name}>
                {f.path}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-slate-400">
            sandbox="allow-scripts" · auto-bundles sibling CSS/JS/TS
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportStandaloneHtml}
            disabled={!activeFile}
            title="Export self-contained single-file HTML bundle"
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export HTML</span>
          </button>
          <button
            type="button"
            onClick={() => setLogs([])}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
          <button
            type="button"
            onClick={() => setRunNonce((n) => n + 1)}
            className="px-3 py-1.5 rounded-lg bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/50 text-sky-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-run</span>
          </button>
        </div>
      </div>

      <div className="flex-none md:flex-1 md:min-h-0 flex flex-col md:grid md:grid-cols-12 gap-3">
        <div className="md:col-span-8 h-[280px] md:h-auto rounded-xl overflow-hidden border border-white/10 bg-[#040812] shrink-0 md:shrink">
          {activeFile ? (
            <iframe
              key={`${activeFile.id}-${runNonce}`}
              title={`Sandbox preview of ${activeFile.name}`}
              sandbox="allow-scripts"
              srcDoc={srcDoc}
              className="w-full h-full border-0 bg-[#040812]"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400">
              No workspace files available.
            </div>
          )}
        </div>

        <div className="md:col-span-4 aether-panel rounded-xl p-3 flex flex-col min-h-[180px] md:min-h-0">
          <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
            Sandboxed Console Logger ({logs.length})
          </div>
          <div className="flex-1 overflow-y-auto pt-2 space-y-1.5 font-mono text-[11px]">
            {logs.length === 0 ? (
              <div className="text-slate-500">Waiting for console.log / errors from iframe...</div>
            ) : (
              logs.map((l) => (
                <div
                  key={l.id}
                  className={`p-2 rounded-lg border border-white/5 ${
                    l.level === 'error'
                      ? 'bg-rose-500/10 text-rose-200'
                      : l.level === 'warn'
                      ? 'bg-amber-500/10 text-amber-200'
                      : 'bg-white/[0.03] text-slate-200'
                  }`}
                >
                  <div className="text-[10px] opacity-60 font-mono-tabular">
                    {l.time} · {l.level.toUpperCase()}
                  </div>
                  <div className="mt-0.5 break-words select-text">{l.text}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
