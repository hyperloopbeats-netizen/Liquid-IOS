import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  Brain,
  Cpu,
  ExternalLink,
  Layers,
  RefreshCw,
  Repeat,
  Sparkles,
  Wand2,
  Waves,
} from 'lucide-react';
import {
  awarenessMatrixEngine,
  SUITE_APP_CATALOG,
  type AwarenessMatrixState,
  type SuiteAppId,
} from '../kernel/awarenessMatrixEngine';
import { codeClusterStore } from '../kernel/codeClusterStore';
import type { AppId } from '../types/os';

interface SuiteMatrixHostAppProps {
  suiteId: SuiteAppId;
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function SuiteMatrixHostApp({
  suiteId,
  onOpenApp,
  onShowToast,
}: SuiteMatrixHostAppProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [matrixState, setMatrixState] = useState<AwarenessMatrixState>(() =>
    awarenessMatrixEngine.getState()
  );
  const [reloadNonce, setReloadNonce] = useState(0);

  const meta = SUITE_APP_CATALOG[suiteId];
  const telem = matrixState.telemetry[suiteId];
  const drift = matrixState.drift;

  useEffect(() => {
    void awarenessMatrixEngine.syncSuiteAppsToVfs();
    return awarenessMatrixEngine.subscribe(setMatrixState);
  }, []);

  useEffect(() => {
    const frame = iframeRef.current;
    if (frame?.contentWindow) {
      awarenessMatrixEngine.registerSuiteFrame(suiteId, frame.contentWindow);
    }
    return () => {
      awarenessMatrixEngine.registerSuiteFrame(suiteId, null);
    };
  }, [suiteId, reloadNonce]);

  const handleFrameLoad = () => {
    const win = iframeRef.current?.contentWindow ?? null;
    awarenessMatrixEngine.registerSuiteFrame(suiteId, win);
  };

  const handleSelfImprove = () => {
    awarenessMatrixEngine.triggerSelfImprovement(suiteId);
    onShowToast?.(`Self-improvement pass applied to ${meta.shortTitle} & synced to OS kernel.`);
  };

  const handleAutoThink = () => {
    awarenessMatrixEngine.triggerAutonomousThinkCycle(
      suiteId,
      `Autonomous synthesis linked ${meta.shortTitle} runtime into Sentient Core.`
    );
    onShowToast?.(`Autonomous thinking pulse linked ${meta.shortTitle} -> Sentient Core.`);
  };

  const handleClusterHarvest = async () => {
    const count = await codeClusterStore.harvestFromVfsModules();
    onShowToast?.(
      count > 0
        ? `Harvested ${count} new module(s) from Suite into Playground Library Clusters.`
        : `${meta.shortTitle} symbols linked to Live Playground.`
    );
    onOpenApp('liveplayground');
  };

  const handleSynthesize = async () => {
    onShowToast?.(`AI Brain synthesizing Awareness Matrix for ${meta.shortTitle}...`);
    const rec = await awarenessMatrixEngine.synthesizeAwarenessMatrix(
      `Focus Full Awareness Matrix synthesis on ${meta.title} (${telem.headline} · ${telem.subMetric}) and synchronize all 14 suite apps.`
    );
    if (rec) {
      onShowToast?.(
        `Matrix "${rec.synthesisTitle}" (${rec.matrixCoherence}% coherence) synced.`
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 text-xs overflow-hidden">
      {/* Single-Line Integrated Suite & Self-Improvement Host Bar */}
      <div className="shrink-0 bg-slate-900/95 border-b border-white/10 px-3 py-1.5 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-2 min-w-0 shrink-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              telem.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-semibold text-slate-100 whitespace-nowrap">
            {meta.shortTitle}
          </span>
          <span className="text-slate-600 whitespace-nowrap" aria-hidden="true">/</span>
          <span className="font-mono tabular-nums text-cyan-300 whitespace-nowrap inline-flex items-center gap-1">
            <Activity className="w-3 h-3 shrink-0" />
            <span>{telem.fps} FPS</span>
          </span>
          <span className="text-slate-300 whitespace-nowrap hidden sm:inline">
            {telem.headline}
          </span>
          <span className="text-slate-400 font-mono tabular-nums whitespace-nowrap hidden xl:inline">
            · {telem.subMetric}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSelfImprove}
            title="Run autonomous self-improvement optimization pass on this app"
            className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/40 text-emerald-100 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            <span>Self-Improve</span>
          </button>

          <button
            type="button"
            onClick={handleAutoThink}
            title="Link this app telemetry to Sentient Autonomous Thinking"
            className="px-2.5 py-1 rounded-md bg-violet-500/15 hover:bg-violet-500/25 border border-violet-400/40 text-violet-100 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Cpu className="w-3 h-3" />
            <span>Auto-Think</span>
          </button>

          <button
            type="button"
            onClick={() => void handleClusterHarvest()}
            title="Harvest code into Live Playground Library Clusters"
            className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-sky-200 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3 h-3 text-sky-300" />
            <span className="hidden md:inline">To Clusters</span>
          </button>

          <button
            type="button"
            onClick={() => awarenessMatrixEngine.toggleFullAppLoop()}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors ${
              matrixState.fullAppLoopActive
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/15 text-slate-200'
            }`}
          >
            <Repeat className="w-3 h-3" />
            <span>{matrixState.fullAppLoopActive ? 'Loop ON' : 'Full Loop'}</span>
          </button>

          <button
            type="button"
            onClick={() => awarenessMatrixEngine.toggleDrift()}
            className={`px-2.5 py-1 rounded-md border text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer transition-colors ${
              drift.active
                ? 'bg-fuchsia-500/25 border-fuchsia-400/55 text-fuchsia-100'
                : 'bg-white/[0.05] hover:bg-white/[0.1] border-white/15 text-slate-200'
            }`}
          >
            <Waves className="w-3 h-3" />
            <span>{drift.active ? `Drift ${drift.intensity.toFixed(1)}x` : 'Drift'}</span>
          </button>

          <button
            type="button"
            disabled={matrixState.busySynthesis}
            onClick={() => void handleSynthesize()}
            className="px-2.5 py-1 rounded-md bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 hover:brightness-110 disabled:opacity-55 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles
              className={`w-3 h-3 ${matrixState.busySynthesis ? 'animate-spin' : ''}`}
            />
            <span>{matrixState.busySynthesis ? 'Syncing...' : 'AI Synthesize'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('sentientai')}
            title="Open Cohesive Sentient AI Nexus"
            className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-cyan-200 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <Brain className="w-3 h-3 text-cyan-300" />
            <span>Sentient</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('synthhybrid')}
            title="Open 10-Daemon Hybrid Synthesizer"
            className="px-2 py-1 rounded-md bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-[11px] whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer hidden xl:inline-flex"
          >
            <ExternalLink className="w-3 h-3 text-amber-300" />
            <span>Hybrid 10</span>
          </button>

          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            title="Reload Suite Runtime"
            className="p-1.5 rounded-md bg-white/[0.05] hover:bg-white/[0.12] border border-white/15 text-slate-300 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Suite App Viewport */}
      <div className="flex-1 min-h-0 relative bg-slate-950">
        <iframe
          key={`${suiteId}-${reloadNonce}`}
          ref={iframeRef}
          src={meta.url}
          title={meta.title}
          onLoad={handleFrameLoad}
          className="w-full h-full border-0 block bg-slate-950"
          allow="accelerometer; gyroscope; autoplay"
        />
      </div>
    </div>
  );
}
