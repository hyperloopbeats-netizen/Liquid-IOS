import { useEffect, useState } from 'react';
import { ArrowUpRight, Play, Workflow, Zap } from 'lucide-react';
import { engineBlocks } from '../kernel/engineBlocks';
import { trilateralMatrix } from '../kernel/trilateralMatrix';
import type { AppId, EngineBlockDefinition, TrilateralAxis, TrilateralState } from '../types/os';

interface EngineBlocksAppProps {
  onOpenApp: (id: AppId) => void;
  onActivateTriad: (preset: 'research' | 'flow' | 'resilience') => void;
}

export function EngineBlocksApp({ onOpenApp, onActivateTriad }: EngineBlocksAppProps) {
  const [blocks, setBlocks] = useState<EngineBlockDefinition[]>(engineBlocks.getBlocks());
  const [matrix, setMatrix] = useState<TrilateralState>(trilateralMatrix.getState());
  const [axisFilter, setAxisFilter] = useState<'all' | TrilateralAxis>('all');
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [lastInvokeMsg, setLastInvokeMsg] = useState('');

  useEffect(() => {
    const u1 = engineBlocks.subscribe(setBlocks);
    const u2 = trilateralMatrix.subscribe(setMatrix);
    return () => {
      u1();
      u2();
    };
  }, []);

  const filteredBlocks =
    axisFilter === 'all' ? blocks : blocks.filter((b) => b.axis === axisFilter);

  const handleInvoke = async (blockId: string) => {
    const res = await engineBlocks.invokeBlock(blockId, onOpenApp);
    setLastInvokeMsg(`${blockId}: ${res.output} (${res.latencyMs}ms)`);
  };

  const handleRunPipeline = async () => {
    if (pipelineRunning) return;
    setPipelineRunning(true);
    await trilateralMatrix.runTrilateralPipeline();
    setPipelineRunning(false);
  };

  const axisColor = (axis: TrilateralAxis) =>
    axis === 'cognitive'
      ? 'text-cyan-300'
      : axis === 'spatial'
      ? 'text-violet-300'
      : 'text-emerald-300';

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      {/* Top Trilateral Header & Triad Presets */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Trilateral Expansion Matrix & 10 Smart Engine Blocks
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Tri-Axis Coherence: <strong className="text-cyan-300 font-mono-tabular">{matrix.coherence.toFixed(3)}</strong>
            {' · '}Cognitive {Math.round(matrix.cognitiveEnergy * 100)}% · Spatial {Math.round(matrix.spatialEnergy * 100)}% · Persistence {Math.round(matrix.persistenceEnergy * 100)}%
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onActivateTriad('research')}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium cursor-pointer"
          >
            Research Triad
          </button>
          <button
            type="button"
            onClick={() => onActivateTriad('flow')}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium cursor-pointer"
          >
            Flow Triad
          </button>
          <button
            type="button"
            onClick={() => onActivateTriad('resilience')}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium cursor-pointer"
          >
            Resilience Triad
          </button>
          <button
            type="button"
            onClick={handleRunPipeline}
            disabled={pipelineRunning}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Workflow className="w-3.5 h-3.5" />
            <span>{pipelineRunning ? 'Executing Pipeline...' : 'Run 3-Axis Pipeline'}</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Matrix Topology & Rules, Right 10 Engine Blocks */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Column: Trilateral Topology + Automation Rules + Pipeline Log */}
        <div className="lg:col-span-5 flex flex-col gap-3 min-h-0 overflow-y-auto pr-1">
          {/* Interactive Trilateral Topology SVG */}
          <div className="aether-panel rounded-xl p-3 shrink-0">
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200 mb-2">
              <span>Trilateral Node Topology</span>
              <span className="font-mono-tabular text-slate-400">
                Preset: {matrix.activePreset}
              </span>
            </div>
            <svg viewBox="0 0 320 175" className="w-full h-40 rounded-lg bg-slate-950/75 border border-white/8">
              {/* Connecting edges */}
              <line
                x1="160"
                y1="28"
                x2="58"
                y2="142"
                stroke="rgba(56,189,248,0.45)"
                strokeWidth={1.5 + matrix.cognitiveEnergy * 2}
              />
              <line
                x1="160"
                y1="28"
                x2="262"
                y2="142"
                stroke="rgba(16,185,129,0.45)"
                strokeWidth={1.5 + matrix.persistenceEnergy * 2}
              />
              <line
                x1="58"
                y1="142"
                x2="262"
                y2="142"
                stroke="rgba(167,139,250,0.45)"
                strokeWidth={1.5 + matrix.spatialEnergy * 2}
              />

              {/* Cognitive Node */}
              <g
                className="cursor-pointer"
                onClick={() => setAxisFilter((f) => (f === 'cognitive' ? 'all' : 'cognitive'))}
              >
                <circle cx="160" cy="28" r="16" fill="rgba(14,165,233,0.22)" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="160" y="32" textAnchor="middle" fill="#e0f2fe" fontSize="10" fontFamily="JetBrains Mono">
                  {Math.round(matrix.cognitiveEnergy * 100)}%
                </text>
                <text x="160" y="57" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="600">
                  COGNITIVE AXIS
                </text>
              </g>

              {/* Spatial Node */}
              <g
                className="cursor-pointer"
                onClick={() => setAxisFilter((f) => (f === 'spatial' ? 'all' : 'spatial'))}
              >
                <circle cx="58" cy="142" r="16" fill="rgba(139,92,246,0.22)" stroke="#a78bfa" strokeWidth="1.5" />
                <text x="58" y="146" textAnchor="middle" fill="#ede9fe" fontSize="10" fontFamily="JetBrains Mono">
                  {Math.round(matrix.spatialEnergy * 100)}%
                </text>
                <text x="64" y="168" textAnchor="middle" fill="#c4b5fd" fontSize="10" fontWeight="600">
                  SPATIAL AXIS
                </text>
              </g>

              {/* Persistence Node */}
              <g
                className="cursor-pointer"
                onClick={() => setAxisFilter((f) => (f === 'persistence' ? 'all' : 'persistence'))}
              >
                <circle cx="262" cy="142" r="16" fill="rgba(16,185,129,0.22)" stroke="#34d399" strokeWidth="1.5" />
                <text x="262" y="146" textAnchor="middle" fill="#d1fae5" fontSize="10" fontFamily="JetBrains Mono">
                  {Math.round(matrix.persistenceEnergy * 100)}%
                </text>
                <text x="256" y="168" textAnchor="middle" fill="#6ee7b7" fontSize="10" fontWeight="600">
                  PERSISTENCE AXIS
                </text>
              </g>
            </svg>
          </div>

          {/* Signal Router Rules */}
          <div className="aether-panel rounded-xl p-3 space-y-2 shrink-0">
            <div className="text-[11px] font-semibold text-slate-200">
              Trilateral Cross-Axis Signal Rules
            </div>
            {matrix.rules.map((r) => (
              <div
                key={r.id}
                className="p-2.5 rounded-lg bg-white/[0.03] border border-white/8 flex items-start justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100">{r.name}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">{r.description}</div>
                  <div className="text-[10px] text-slate-500 font-mono-tabular mt-1">
                    {r.sourceAxis} → {r.targetAxis} · Triggered {r.triggersCount}x
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={() => trilateralMatrix.toggleRule(r.id)}
                  className="mt-1 accent-cyan-400 cursor-pointer shrink-0"
                />
              </div>
            ))}
          </div>

          {/* Pipeline Output Log */}
          <div className="aether-panel rounded-xl p-3 flex-1 min-h-[120px] flex flex-col">
            <div className="text-[11px] font-semibold text-slate-200 pb-1.5 border-b border-white/10 shrink-0">
              Cross-Block Pipeline Execution Trace
            </div>
            <div className="flex-1 overflow-y-auto pt-2 space-y-1 font-mono text-[11px] text-slate-300">
              {matrix.lastPipelineLog.map((line, i) => (
                <div key={i} className="leading-relaxed">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: 10 Smart Engine Blocks Grid */}
        <div className="lg:col-span-7 aether-panel rounded-xl p-3 flex flex-col min-h-0">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-1.5">
              {(['all', 'cognitive', 'spatial', 'persistence'] as const).map((ax) => (
                <button
                  key={ax}
                  type="button"
                  onClick={() => setAxisFilter(ax)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                    axisFilter === ax
                      ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
                  }`}
                >
                  {ax === 'all' ? `All Blocks (${blocks.length})` : ax}
                </button>
              ))}
            </div>
            {lastInvokeMsg && (
              <span className="text-[11px] text-emerald-300 truncate max-w-[260px]">{lastInvokeMsg}</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pt-2.5 grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredBlocks.map((block) => (
              <div
                key={block.id}
                className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex flex-col justify-between gap-2.5"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular">
                    <span className={`font-semibold uppercase ${axisColor(block.axis)}`}>{block.axis}</span>
                    <span className="text-slate-400">
                      v{block.version} · {block.invocations} calls · {block.lastLatencyMs}ms
                    </span>
                  </div>
                  <div className="font-semibold text-slate-100 mt-1">{block.name}</div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{block.role}</p>
                  <div className="text-[10px] font-mono text-slate-500 mt-1.5">
                    {block.capabilities.join(' · ')}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => void handleInvoke(block.id)}
                    className="px-2.5 py-1 rounded-lg bg-cyan-500/18 hover:bg-cyan-500/28 border border-cyan-400/35 text-cyan-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3" />
                    <span>Invoke Block</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenApp(block.appId)}
                    className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span>Open UI</span>
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
