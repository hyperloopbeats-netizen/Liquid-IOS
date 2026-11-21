import { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  ExternalLink,
  Link2,
  Play,
  Printer,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { OS_APPS } from '../kernel/appRegistry';
import { desktopFolderEngine } from '../kernel/desktopFolderEngine';
import {
  extractTitleFromHtml,
  normalizeHtml5Code,
  printedAppsStore,
} from '../kernel/printedAppsStore';
import type { AppId, PrintedAppDefinition } from '../types/os';
import { PrintedAppRuntime } from '../components/PrintedAppRuntime';

interface HtmlAppPrinterAppProps {
  openAppIds: string[];
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const SAMPLE_HTML5_BLUEPRINT = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Quantum Focus Timer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at top, #0f172a, #030712);
      color: #f8fafc;
      font-family: system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      gap: 14px;
    }
    .ring {
      width: 132px; height: 132px; border-radius: 50%;
      border: 3px solid #22d3ee;
      display: flex; align-items: center; justify-content: center;
      font-size: 28px; font-weight: 700; letter-spacing: 0.04em;
      box-shadow: 0 0 28px rgba(34, 211, 238, 0.35);
    }
    .row { display: flex; gap: 8px; }
    button {
      background: rgba(34,211,238,0.18); color: #cffafe;
      border: 1px solid rgba(34,211,238,0.45);
      padding: 6px 12px; border-radius: 8px; font-size: 12px; cursor: pointer;
    }
    button:hover { background: rgba(34,211,238,0.35); }
  </style>
</head>
<body>
  <div class="ring" id="clock">25:00</div>
  <div class="row">
    <button onclick="toggle()">Start / Pause</button>
    <button onclick="if(window.AetherOS) AetherOS.openApp('musicstudio')">Play Studio</button>
  </div>
  <script>
    let sec = 1500, timer = null;
    function render() {
      const m = String(Math.floor(sec / 60)).padStart(2, '0');
      const s = String(sec % 60).padStart(2, '0');
      document.getElementById('clock').textContent = m + ':' + s;
    }
    function toggle() {
      if (timer) { clearInterval(timer); timer = null; return; }
      if (window.AetherOS) AetherOS.publish('FOCUS_START', 'Quantum Focus session started');
      timer = setInterval(() => { if (sec > 0) { sec--; render(); } }, 1000);
    }
  </script>
</body>
</html>`;

export function HtmlAppPrinterApp({
  openAppIds,
  onOpenApp,
  onShowToast,
}: HtmlAppPrinterAppProps) {
  const [library, setLibrary] = useState<PrintedAppDefinition[]>(printedAppsStore.getApps());
  const [selectedId, setSelectedId] = useState<`printed:${string}` | null>(
    printedAppsStore.getApps()[0]?.id ?? null
  );
  const [draftName, setDraftName] = useState('Quantum Focus Timer');
  const [draftHtml, setDraftHtml] = useState(SAMPLE_HTML5_BLUEPRINT);
  const [improvingId, setImprovingId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'code' | 'preview'>('code');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [lastNote, setLastNote] = useState<string | null>(null);

  useEffect(() => {
    return printedAppsStore.subscribe((apps) => {
      setLibrary(apps);
    });
  }, []);

  const selectedApp = library.find((a) => a.id === selectedId) ?? library[0] ?? null;

  const handlePrintNew = async () => {
    if (!draftHtml.trim()) return;
    const autoName = draftName.trim() || extractTitleFromHtml(draftHtml) || 'Printed HTML5 App';
    const created = await printedAppsStore.printApp({
      name: autoName,
      html: normalizeHtml5Code(draftHtml, autoName),
      description: 'Printed from HTML5 App Printer · Connected via window.AetherOS',
    });
    setSelectedId(created.id);
    setViewMode('preview');
    onShowToast?.(`Printed "${created.shortName}" to Library & Desktop!`);
  };

  const handleSingleButtonImprove = async (target: PrintedAppDefinition) => {
    if (improvingId) return;
    setImprovingId(target.id);
    setLastNote(`Auto-improving "${target.shortName}" with cross-app AetherOS links...`);
    try {
      const res = await fetch('/api/printer/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: target.name,
          html: target.html,
          version: target.version,
          availableApps: OS_APPS.map((a) => `${a.id} (${a.shortName})`),
        }),
      });
      const data = (await res.json()) as {
        improvedHtml?: string;
        summary?: string;
        changelog?: string[];
        error?: string;
      };
      if (!res.ok || !data.improvedHtml) {
        throw new Error(data.error || 'Auto-improve failed.');
      }
      const updated = await printedAppsStore.printApp({
        id: target.id,
        name: target.name,
        description: target.description,
        html: data.improvedHtml,
        improvementNote: data.summary || 'Upgraded UI, safety, and cross-app AetherOS SDK hooks.',
      });
      setSelectedId(updated.id);
      if (selectedId === target.id) {
        setDraftName(updated.name);
        setDraftHtml(updated.html);
      }
      const changeSummary = data.changelog?.length ? ` · ${data.changelog.slice(0, 2).join('; ')}` : '';
      setLastNote(`v${updated.version}: ${data.summary || 'Upgraded'}${changeSummary}`);
      onShowToast?.(`"${updated.shortName}" upgraded to v${updated.version}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auto-improve failed.';
      setLastNote(msg);
      onShowToast?.(msg);
    } finally {
      setImprovingId(null);
    }
  };

  const handleLoadIntoEditor = (app: PrintedAppDefinition) => {
    setSelectedId(app.id);
    setDraftName(app.name);
    setDraftHtml(app.html);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/70 text-xs overflow-hidden">
      {/* Header Toolbar */}
      <div className="px-3 py-2 border-b border-white/10 bg-slate-900/75 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Printer className="w-4 h-4 text-emerald-300 shrink-0" />
          <span className="font-semibold text-slate-100 truncate">HTML5 App Printer</span>
          <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 text-[10px]">
            {library.length} in Library
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('code')}
            className={`px-2 py-1 rounded-md border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
              viewMode === 'code'
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Code2 className="w-3 h-3" />
            <span>HTML5 Source</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`px-2 py-1 rounded-md border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Play className="w-3 h-3" />
            <span>Live Bridge</span>
          </button>
          <button
            type="button"
            onClick={() => void handlePrintNew()}
            className="px-2.5 py-1 rounded-md bg-gradient-to-r from-emerald-500 to-cyan-600 hover:brightness-110 text-slate-950 font-semibold text-[11px] inline-flex items-center gap-1 cursor-pointer shadow"
          >
            <Printer className="w-3 h-3" />
            <span>Print App to Library</span>
          </button>
        </div>
      </div>

      {lastNote && (
        <div className="px-3 py-1.5 bg-cyan-950/45 border-b border-cyan-500/25 text-[11px] text-cyan-100 truncate shrink-0">
          {lastNote}
        </div>
      )}

      {/* Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Left: HTML5 Editor or Live Sandboxed Cross-App Preview */}
        <div className="md:col-span-7 flex flex-col min-h-0 border-b md:border-b-0 md:border-r border-white/10">
          {viewMode === 'code' ? (
            <>
              <div className="p-2 border-b border-white/10 flex items-center gap-2 bg-slate-900/50 shrink-0">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder="App name (e.g. Audio Reactor)"
                  className="flex-1 bg-slate-950/80 border border-white/15 rounded-md px-2.5 py-1 text-slate-100 focus:outline-none focus:border-cyan-400 text-[11px]"
                />
                {selectedApp && (
                  <button
                    type="button"
                    onClick={() => void handleSingleButtonImprove(selectedApp)}
                    disabled={Boolean(improvingId)}
                    title="Auto-improve selected library app with Gemini"
                    className="px-2.5 py-1 rounded-md bg-gradient-to-r from-amber-500/25 to-fuchsia-500/25 hover:from-amber-500/40 hover:to-fuchsia-500/40 border border-amber-400/45 text-amber-100 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
                  >
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>{improvingId === selectedApp.id ? 'Improving...' : 'Auto-Improve'}</span>
                  </button>
                )}
              </div>

              <textarea
                value={draftHtml}
                onChange={(e) => setDraftHtml(e.target.value)}
                spellCheck={false}
                placeholder="Paste any HTML5 code here..."
                className="flex-1 w-full bg-[#030711] text-slate-200 font-mono-tabular text-[11px] leading-relaxed p-3 resize-none focus:outline-none"
              />

              <div className="px-2.5 py-1.5 border-t border-white/10 bg-slate-900/60 flex items-center justify-between text-[10px] text-slate-400 shrink-0">
                <span className="inline-flex items-center gap-1 truncate">
                  <Link2 className="w-3 h-3 text-cyan-300" />
                  SDK injected automatically: AetherOS.publish / subscribe / openApp / getState / saveVfs
                </span>
                <button
                  type="button"
                  onClick={() => setDraftHtml(SAMPLE_HTML5_BLUEPRINT)}
                  className="text-cyan-300 hover:underline cursor-pointer shrink-0 ml-2"
                >
                  Load Blueprint
                </button>
              </div>
            </>
          ) : selectedApp ? (
            <PrintedAppRuntime
              app={selectedApp}
              openAppIds={openAppIds}
              onOpenApp={onOpenApp}
              onShowToast={onShowToast}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Print an HTML5 app to launch its bridged preview.
            </div>
          )}
        </div>

        {/* Right: Printed App Library (Connects to Desktop, Folders, and All OS Apps) */}
        <div className="md:col-span-5 flex flex-col min-h-0 bg-slate-950/40">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between shrink-0">
            <span className="font-semibold text-slate-200">Printed App Library</span>
            <span className="text-[10px] text-slate-400">Auto-linked to Desktop & Bus</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {library.map((item) => {
              const isSelected = selectedApp?.id === item.id;
              const isBusy = improvingId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => handleLoadIntoEditor(item)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-cyan-500/12 border-cyan-400/50 shadow-[0_0_20px_-6px_rgba(34,211,238,0.45)]'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2.5 h-2.5 rounded-full bg-gradient-to-br ${item.accentGradient} shrink-0`}
                        />
                        <span className="font-semibold text-slate-100 truncate">{item.name}</span>
                        <span className="px-1 py-0.2 rounded bg-white/10 text-[9.5px] font-mono-tabular text-cyan-200">
                          v{item.version}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 line-clamp-2 mt-0.5">
                        {item.lastImprovementNote || item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenApp(item.id);
                      }}
                      className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-100 text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer"
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Open Window</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSingleButtonImprove(item);
                      }}
                      disabled={Boolean(improvingId)}
                      className="px-2 py-1 rounded bg-gradient-to-r from-emerald-500/25 to-amber-500/25 hover:from-emerald-500/40 hover:to-amber-500/40 border border-emerald-400/45 text-emerald-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-amber-300" />
                      <span>{isBusy ? 'Upgrading...' : 'Auto-Improve'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        void navigator.clipboard?.writeText(item.html);
                        setCopiedId(item.id);
                        window.setTimeout(() => setCopiedId(null), 1500);
                      }}
                      title="Copy HTML5 source"
                      className="p-1 rounded bg-white/8 hover:bg-white/15 border border-white/10 text-slate-300 cursor-pointer"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3 h-3 text-emerald-300" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        desktopFolderEngine.purgeDeletedApp(item.id);
                        printedAppsStore.deleteApp(item.id);
                      }}
                      title="Remove from Library"
                      className="p-1 rounded bg-white/5 hover:bg-rose-500/25 border border-white/10 text-slate-400 hover:text-rose-200 cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
