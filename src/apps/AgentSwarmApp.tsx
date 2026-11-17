import { useEffect, useState } from 'react';
import { Check, Play, RefreshCw, Send, ShieldAlert, Sparkles, Wrench } from 'lucide-react';
import { swarmEngine } from '../kernel/swarmEngine';
import { vfs } from '../kernel/vfs';
import type { DaemonConfig, DaemonFinding, DaemonRole, ModelBackend } from '../types/os';

interface AgentSwarmAppProps {
  onOpenFileInDrive: (fileName: string) => void;
  onRunFileInSandbox: (fileName: string) => void;
}

export function AgentSwarmApp({ onOpenFileInDrive, onRunFileInSandbox }: AgentSwarmAppProps) {
  const [daemons, setDaemons] = useState<DaemonConfig[]>(swarmEngine.getDaemons());
  const [findings, setFindings] = useState<DaemonFinding[]>(swarmEngine.getFindings());
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [geminiOnline, setGeminiOnline] = useState<boolean | null>(null);
  const [cognitionPrompt, setCognitionPrompt] = useState('');
  const [cognitionReply, setCognitionReply] = useState('');
  const [cognitionBusy, setCognitionBusy] = useState(false);
  const [scanningAll, setScanningAll] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'core' | 'upgrade'>('all');

  useEffect(() => {
    const unsub = swarmEngine.subscribe((d, f) => {
      setDaemons(d);
      setFindings(f);
      if (f.length > 0) {
        setSelectedFindingId((prev) => (prev && f.some((item) => item.id === prev) ? prev : f[0].id));
      }
    });

    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setGeminiOnline(Boolean(data.geminiConfigured)))
      .catch(() => setGeminiOnline(false));

    return unsub;
  }, []);

  const selectedFinding = findings.find((f) => f.id === selectedFindingId) ?? null;
  const visibleDaemons =
    categoryFilter === 'all' ? daemons : daemons.filter((d) => d.category === categoryFilter);

  const handleRunAll = async () => {
    setScanningAll(true);
    await swarmEngine.runAllEnabled();
    setScanningAll(false);
  };

  const handleRunUpgrades = async () => {
    setScanningAll(true);
    await swarmEngine.runUpgradeDaemons();
    setScanningAll(false);
  };

  const handleRunSingle = async (role: DaemonRole) => {
    await swarmEngine.runDaemon(role);
  };

  const handleAskCognition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cognitionPrompt.trim() || cognitionBusy) return;
    setCognitionBusy(true);
    setCognitionReply('');
    try {
      await vfs.init();
      const files = vfs.getFiles();
      const contextSummary = files
        .map((f) => `File: ${f.name} (${f.kind}, ${f.size} B)\n${f.content.slice(0, 600)}`)
        .join('\n\n');
      const res = await fetch('/api/cognition/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cognitionPrompt.trim(), contextSummary }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cognition query failed.');
      setCognitionReply(data.reply || 'No response received.');
    } catch (err) {
      setCognitionReply(err instanceof Error ? err.message : 'Unable to reach Cognition Core.');
    } finally {
      setCognitionBusy(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      {/* Top Mesh Toolbar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            13-Daemon AI Agent Swarm (3 Core + 10 Heal & Upgrade)
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Cloud Gemini: {geminiOnline === null ? 'Checking...' : geminiOnline ? 'Connected (Server-Side)' : 'Unavailable'} · Local Ollama & Edge AST Mesh
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleRunUpgrades}
            disabled={scanningAll}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Run 10 Upgrade Daemons</span>
          </button>
          <button
            type="button"
            onClick={handleRunAll}
            disabled={scanningAll}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanningAll ? 'animate-spin' : ''}`} />
            <span>{scanningAll ? 'Scanning...' : 'Run All (13)'}</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left: Daemons Configuration */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 overflow-y-auto pr-1">
          <div className="flex items-center gap-1.5 shrink-0">
            {(
              [
                ['all', `All (${daemons.length})`],
                ['upgrade', 'Heal & Upgrade (10)'],
                ['core', 'Core Audit (3)'],
              ] as const
            ).map(([cat, label]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                    : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {visibleDaemons.map((d) => (
            <div key={d.role} className="aether-panel rounded-xl p-3 space-y-2.5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold text-slate-100">{d.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{d.description}</div>
                </div>
                <span
                  className={`text-[11px] font-mono-tabular shrink-0 ${
                    d.status === 'error'
                      ? 'text-rose-300'
                      : d.status === 'scanning'
                      ? 'text-cyan-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {d.status.toUpperCase()}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[11px] text-slate-400" htmlFor={`backend-${d.role}`}>
                  Model Node
                </label>
                <select
                  id={`backend-${d.role}`}
                  value={d.backend}
                  onChange={(e) => swarmEngine.setDaemonBackend(d.role, e.target.value as ModelBackend)}
                  className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] text-slate-100 outline-none cursor-pointer"
                >
                  <option value="edge-ast">Edge AST Engine (Local In-Browser)</option>
                  <option value="gemini-cloud">Gemini Cloud (gemini-4-hydrogen)</option>
                  <option value="ollama-local">Local Ollama HTTP</option>
                </select>

                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={d.autoPatch}
                    onChange={(e) => swarmEngine.updateDaemon(d.role, { autoPatch: e.target.checked })}
                    className="accent-cyan-400"
                  />
                  Auto-Patch
                </label>
              </div>

              {d.backend === 'ollama-local' && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <input
                    type="text"
                    value={d.ollamaUrl}
                    onChange={(e) => swarmEngine.updateDaemon(d.role, { ollamaUrl: e.target.value })}
                    placeholder="http://localhost:11434"
                    className="bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 outline-none"
                  />
                  <input
                    type="text"
                    value={d.ollamaModel}
                    onChange={(e) => swarmEngine.updateDaemon(d.role, { ollamaModel: e.target.value })}
                    placeholder="qwen2.5-coder:7b"
                    className="bg-slate-900/90 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200 outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                <span className="text-[11px] text-slate-400 truncate">{d.lastSummary}</span>
                <button
                  type="button"
                  onClick={() => handleRunSingle(d.role)}
                  disabled={d.status === 'scanning'}
                  className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium inline-flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  <span>Scan</span>
                </button>
              </div>
            </div>
          ))}

          {/* Quad-Cognition Query Box */}
          <form onSubmit={handleAskCognition} className="aether-panel rounded-xl p-3 space-y-2">
            <div className="font-semibold text-slate-200">Quad-Cognition Mesh Query</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={cognitionPrompt}
                onChange={(e) => setCognitionPrompt(e.target.value)}
                placeholder="Ask the swarm about workspace files or architecture..."
                className="flex-1 bg-slate-900/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none"
              />
              <button
                type="submit"
                disabled={cognitionBusy}
                className="px-3 py-1.5 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/40 text-indigo-100 font-medium inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{cognitionBusy ? '...' : 'Ask'}</span>
              </button>
            </div>
            {cognitionReply && (
              <div className="p-2.5 rounded-lg bg-slate-950/80 border border-white/10 text-[11px] text-slate-200 whitespace-pre-wrap max-h-36 overflow-y-auto leading-relaxed">
                {cognitionReply}
              </div>
            )}
          </form>
        </div>

        {/* Right: Findings & Real-Time Patch Inspector */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-0">
          <div className="aether-panel rounded-xl p-3 flex flex-col min-h-0 flex-1">
            <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
              <span className="font-semibold text-slate-100">
                Diagnostic Findings ({findings.length})
              </span>
              <span className="text-[11px] text-slate-400">
                Patches write directly to IndexedDB & hot-reload Sandbox
              </span>
            </div>

            {findings.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <ShieldAlert className="w-8 h-8 mb-2 text-slate-500" />
                <div className="font-medium text-slate-200">No active scan findings yet</div>
                <p className="text-[11px] mt-1 max-w-sm">
                  Click "Run Swarm Scan" above to inspect workspace scripts in Aether Drive for runtime bugs, XSS risks, and schema issues.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3 pt-2.5">
                <div className="md:col-span-5 overflow-y-auto space-y-1.5 pr-1">
                  {findings.map((f) => {
                    const active = f.id === selectedFindingId;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFindingId(f.id)}
                        className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                          active
                            ? 'bg-white/10 border-cyan-400/50'
                            : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular">
                          <span
                            className={
                              f.severity === 'critical'
                                ? 'text-rose-300 font-semibold'
                                : f.severity === 'warning'
                                ? 'text-amber-300 font-semibold'
                                : 'text-sky-300'
                            }
                          >
                            {f.severity.toUpperCase()}
                          </span>
                          <span className="text-slate-400">{f.applied ? 'Patched' : f.daemonRole}</span>
                        </div>
                        <div className="font-medium text-slate-100 mt-1 truncate">{f.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{f.fileName}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="md:col-span-7 flex flex-col min-h-0 bg-slate-950/75 rounded-xl border border-white/10 p-3">
                  {selectedFinding ? (
                    <>
                      <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-100">{selectedFinding.title}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {selectedFinding.fileName} · {selectedFinding.backendUsed}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenFileInDrive(selectedFinding.fileName)}
                            className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 text-[11px] text-slate-200 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => onRunFileInSandbox(selectedFinding.fileName)}
                            className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 text-[11px] text-slate-200 cursor-pointer"
                          >
                            Run
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-300 py-2 leading-relaxed shrink-0">
                        {selectedFinding.detail}
                      </p>

                      {selectedFinding.patchedContent ? (
                        <div className="flex-1 min-h-0 flex flex-col gap-2">
                          <div className="text-[11px] font-medium text-emerald-300">
                            Proposed Real-Time Patch
                          </div>
                          <pre className="flex-1 min-h-0 overflow-auto rounded-lg bg-black/70 border border-white/10 p-2.5 font-mono text-[11px] text-emerald-100 select-text">
                            {selectedFinding.patchedContent}
                          </pre>
                          <div className="flex justify-end shrink-0">
                            <button
                              type="button"
                              disabled={selectedFinding.applied}
                              onClick={() => swarmEngine.applyFindingPatch(selectedFinding.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-200 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              {selectedFinding.applied ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Patch Applied to Drive</span>
                                </>
                              ) : (
                                <>
                                  <Wrench className="w-3.5 h-3.5" />
                                  <span>Apply Real-Time Patch</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-500 text-[11px]">
                          Informational audit item — no code modification required.
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
