import { useEffect, useMemo, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Code2,
  Cpu,
  Play,
  Printer,
  RefreshCw,
  Repeat,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { hybridSynthEngine, type HybridSynthState } from '../kernel/hybridSynthEngine';
import { HYBRID_10_SPECS, swarmEngine } from '../kernel/swarmEngine';
import type { AppId, DaemonConfig, HybridAppBuild } from '../types/os';

interface SyntheticHybridAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function SyntheticHybridApp({ onOpenApp, onShowToast }: SyntheticHybridAppProps) {
  const [state, setState] = useState<HybridSynthState>(() => hybridSynthEngine.getState());
  const [hybridDaemons, setHybridDaemons] = useState<DaemonConfig[]>(() =>
    swarmEngine.getDaemons().filter((d) => d.category === 'hybrid-synth')
  );
  const [prompt, setPrompt] = useState(
    'Fuse WebGL Bloom Shader, Audio DSP Spectrum, and Boids Swarm vectors into an interactive reactive Cybernetic Field Console.'
  );
  const [newCodeSnippet, setNewCodeSnippet] = useState(
    `// Optional new function or shader logic to fuse with harvested suite code\nfunction computeResonance(t, energy) {\n  return Math.sin(t * 2.2) * 0.5 + energy * 0.8;\n}`
  );
  const [includeHarvested, setIncludeHarvested] = useState(true);
  const [viewMode, setViewMode] = useState<'preview' | 'daemons' | 'code'>('preview');

  useEffect(() => {
    const unsubH = hybridSynthEngine.subscribe(setState);
    const unsubS = swarmEngine.subscribe((daemons) => {
      setHybridDaemons(daemons.filter((d) => d.category === 'hybrid-synth'));
    });
    return () => {
      unsubH();
      unsubS();
    };
  }, []);

  const activeBuild: HybridAppBuild | undefined = useMemo(
    () => state.builds.find((b) => b.id === state.activeBuildId) ?? state.builds[0],
    [state.builds, state.activeBuildId]
  );

  const handleSynthesize = async () => {
    const built = await hybridSynthEngine.synthesizeHybridApp({
      prompt,
      newCodeSnippet,
      includeHarvestedCode: includeHarvested,
    });
    if (built) {
      onShowToast?.(`10 Hybrid Daemons synthesized "${built.appName}" successfully.`);
      setViewMode('preview');
    }
  };

  const handleAutoImprove = async () => {
    if (!activeBuild) return;
    const upgraded = await hybridSynthEngine.autoImproveBuild(activeBuild.id);
    if (upgraded) {
      onShowToast?.(`Upgraded "${upgraded.appName}" to pass v${upgraded.improvementPass}.`);
    }
  };

  const handlePublish = async () => {
    if (!activeBuild) return;
    const published = await hybridSynthEngine.publishBuildToLibrary(activeBuild.id);
    if (published?.printedAppId) {
      onShowToast?.(`Published "${published.appName}" to Library & Desktop.`);
      onOpenApp(published.printedAppId);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 text-xs overflow-hidden">
      {/* Top Bar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-display font-semibold text-sm text-slate-100 whitespace-nowrap">
            Synthetic Hybrid App Builder
          </span>
          <span className="text-slate-600">/</span>
          <span className="font-mono tabular-nums text-slate-300 whitespace-nowrap">
            {hybridDaemons.length} Dedicated Daemons · {state.builds.length} Builds
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => hybridSynthEngine.toggleAutonomousMode()}
            className={`px-3 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer ${
              state.autonomousMode
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200'
            }`}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>
              {state.autonomousMode
                ? `Auto Synth ON (${state.autonomousCycles})`
                : 'Enable Auto Loop'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('liveplayground')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-300" />
            <span>Open Playground</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('sentientai')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sentient Core</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Input + 10 Daemons Overview + History */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-slate-200">
              Synthesis Goal (Fuses Available & New Code Automatically)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="w-full rounded-lg bg-slate-900 border border-white/15 p-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-400 resize-y"
            />

            <label className="block text-[11px] font-medium text-slate-300">
              New Code Input (Optional — Combined with Suite/VFS/Cluster Code)
            </label>
            <textarea
              value={newCodeSnippet}
              onChange={(e) => setNewCodeSnippet(e.target.value)}
              rows={4}
              spellCheck={false}
              className="w-full rounded-lg bg-slate-900/90 border border-white/15 p-2 font-mono text-[11px] text-cyan-100 focus:outline-none focus:border-cyan-400 resize-y"
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHarvested}
                  onChange={(e) => setIncludeHarvested(e.target.checked)}
                  className="accent-cyan-500 rounded"
                />
                <span>Harvest Suite & Library Clusters</span>
              </label>

              <button
                type="button"
                disabled={state.busy}
                onClick={() => void handleSynthesize()}
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Cpu className={`w-3.5 h-3.5 ${state.busy ? 'animate-spin' : ''}`} />
                <span>{state.busy ? '10 Daemons Building…' : 'Synthesize Hybrid App'}</span>
              </button>
            </div>

            {state.lastError && (
              <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-md px-2.5 py-1.5">
                {state.lastError}
              </div>
            )}
          </div>

          {/* 10 Hybrid Daemons Checklist */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-emerald-400" />
                <span>10 Mounted Hybrid Synthesis Daemons</span>
              </h3>
              <button
                type="button"
                onClick={() => void swarmEngine.runHybridSynthDaemons('Manual 10-Daemon Audit')}
                className="text-[11px] text-cyan-300 hover:underline cursor-pointer"
              >
                Run Audit
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {HYBRID_10_SPECS.map(([role, name]) => {
                const live = hybridDaemons.find((d) => d.role === role);
                const shortLabel = name.replace('Hybrid ', '').replace(' Daemon', '');
                return (
                  <div
                    key={role}
                    title={live?.lastSummary || name}
                    className="px-2.5 py-1.5 rounded-md bg-slate-900/70 border border-white/10 flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-[11px] text-slate-200">{shortLabel}</span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Synthesized Builds History */}
          {state.builds.length > 0 && (
            <div className="border-t border-white/10 pt-3 space-y-1.5">
              <h3 className="text-xs font-semibold text-slate-200">Recent Hybrid Builds</h3>
              <div className="divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden bg-slate-900/50">
                {state.builds.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => hybridSynthEngine.selectBuild(b.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 cursor-pointer ${
                      b.id === activeBuild?.id ? 'bg-cyan-500/15' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100 truncate">{b.appName}</div>
                      <div className="text-[10.5px] text-slate-400 truncate">
                        {b.sourcesUsed.length} sources · Pass v{b.improvementPass}
                      </div>
                    </div>
                    {b.printedAppId && (
                      <span className="text-[10px] font-mono text-emerald-300 shrink-0">
                        Library
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Hybrid App Preview + Daemon Report + Source */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-2 border-b border-white/10 bg-slate-900/60 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Live Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('daemons')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'daemons' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Bot className="w-3 h-3" />
                <span>10-Daemon Report</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('code')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                  viewMode === 'code' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Source Code</span>
              </button>
            </div>

            {activeBuild && (
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  disabled={state.busy}
                  onClick={() => void handleAutoImprove()}
                  className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-emerald-200 text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Auto-Improve (v{activeBuild.improvementPass})</span>
                </button>
                <button
                  type="button"
                  onClick={() => void handlePublish()}
                  className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3 h-3" />
                  <span>{activeBuild.printedAppId ? 'Update & Launch' : 'Publish to Library'}</span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 relative bg-slate-950">
            {!activeBuild ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <RefreshCw className="w-8 h-8 text-cyan-400/70" />
                <div className="text-sm font-semibold text-slate-200">
                  No Hybrid Build Synthesized Yet
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  Click "Synthesize Hybrid App" to deploy all 10 Hybrid Daemons across harvested
                  suite modules, Playground Library Clusters, and your new code.
                </p>
              </div>
            ) : viewMode === 'preview' ? (
              <iframe
                key={`${activeBuild.id}-${activeBuild.improvementPass}`}
                srcDoc={activeBuild.html5Code}
                title={activeBuild.appName}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0 block bg-slate-950"
              />
            ) : viewMode === 'daemons' ? (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                <div className="border border-white/10 rounded-lg bg-slate-900/70 p-3 space-y-1">
                  <div className="font-semibold text-slate-100">{activeBuild.appName}</div>
                  <div className="text-slate-300">{activeBuild.architectureSummary}</div>
                  <div className="text-[11px] text-slate-400 font-mono">
                    Clusters: {activeBuild.clustersUsed.join(', ') || 'Core'}
                  </div>
                </div>
                <div className="divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden">
                  {activeBuild.daemonReports.map((rep) => (
                    <div key={rep.role} className="px-3 py-2.5 bg-slate-900/40">
                      <div className="font-semibold text-cyan-200 text-[11px]">{rep.name}</div>
                      <div className="text-slate-300 mt-0.5">{rep.contribution}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <pre className="h-full overflow-auto p-4 font-mono text-[11px] text-slate-200 bg-slate-950">
                {activeBuild.html5Code}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
