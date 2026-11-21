import { useEffect, useState } from 'react';
import {
  Boxes,
  Brain,
  CheckCircle2,
  Flame,
  Merge,
  Network,
  Play,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { aimSpaceStore } from '../kernel/aimSpaceStore';
import { hyperfaceStudioStore } from '../kernel/hyperfaceStudioStore';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { masterBrainEngine } from '../kernel/masterBrainEngine';
import { neuralBus } from '../kernel/neuralBus';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import { smartSortEngine } from '../kernel/smartSortEngine';
import { swarmEngine } from '../kernel/swarmEngine';
import { unificatorEngine } from '../kernel/unificatorEngine';
import type { AppId, DaemonConfig, PrintedAppDefinition } from '../types/os';

interface MeshUnificatorAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function MeshUnificatorApp({ onOpenApp, onShowToast }: MeshUnificatorAppProps) {
  const [daemons, setDaemons] = useState<DaemonConfig[]>(swarmEngine.getDaemons());
  const [brainState, setBrainState] = useState(masterBrainEngine.getState());
  const [printedApps, setPrintedApps] = useState<PrintedAppDefinition[]>(printedAppsStore.getApps());
  const [goal, setGoal] = useState(
    'Fuse Kinetic 2D Physics, Voxel 3D Arena, Smart Brain Items, Sprite Lab skins, and HyperFace 3D into a unified cross-engine game build'
  );
  const [customAdapterCode, setCustomAdapterCode] = useState(
    `// Cross-Engine Pulse Sync Hook\napi.addScore(5);\nif (Math.random() < dt * 0.5) api.spawnOrb?.('#22d3ee');`
  );
  const [includeKinetic, setIncludeKinetic] = useState(true);
  const [includeVoxel, setIncludeVoxel] = useState(true);
  const [includeSmartItems, setIncludeSmartItems] = useState(true);
  const [includeHyperFace, setIncludeHyperFace] = useState(true);
  const [fusing, setFusing] = useState(false);
  const [bundleResult, setBundleResult] = useState<{
    title: string;
    summary: string;
    requirements: string[];
    bridgeCode: string;
    html: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubSwarm = swarmEngine.subscribe((d) => setDaemons(d));
    const unsubBrain = masterBrainEngine.subscribe(setBrainState);
    const unsubPrinted = printedAppsStore.subscribe(setPrintedApps);
    return () => {
      unsubSwarm();
      unsubBrain();
      unsubPrinted();
    };
  }, []);

  const supportDaemons = daemons.filter((d) => d.category === 'unificator-support');

  const handleRun20DaemonsAndBrain = async () => {
    await swarmEngine.runUnificatorSupportDaemons();
    smartSortEngine.syncSmartGroupsToDesktopFolders(printedApps);
    const plan = await masterBrainEngine.runMasterSort(
      'Link all 20 Unificator Support Daemons, Kinetic 2D, Voxel 3D, and Smart Tab cleanly.'
    );
    onShowToast?.(
      plan
        ? `20 Support Daemons + Master Brain calibrated (${plan.coherenceScore}% coherence).`
        : '20 Support Daemons finished verification sweep.'
    );
  };

  const handleMeshFuse = async () => {
    if (fusing) return;
    setFusing(true);
    setErrorMsg(null);

    try {
      const items = smartBrainItemStore.getState().items.slice(0, 5);
      const sprites = jsonKnowledgeStore.getSprites().slice(0, 5);
      const phys = jsonKnowledgeStore.getPhysics();
      const hf = hyperfaceStudioStore.getState();

      const assetsSummary = JSON.stringify({
        engines: { kinetic2D: includeKinetic, voxel3D: includeVoxel },
        physicsPreset: phys,
        smartBrainItems: includeSmartItems ? items.map((i) => ({ name: i.name, category: i.category, color: i.iconColor })) : [],
        sprites: sprites.map((s) => ({ name: s.name, role: s.role })),
        hyperfaceStage: includeHyperFace ? hf.stageTitle : 'disabled',
        daemonCount: supportDaemons.length,
      });

      const res = await fetch('/api/unificator/mesh-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          assetsSummary,
          codeSnippet: customAdapterCode,
        }),
      });
      const data = (await res.json()) as {
        bundleTitle?: string;
        synthesisSummary?: string;
        detectedRequirements?: string[];
        bridgeCode?: string;
        unifiedHtml5Game?: string;
        error?: string;
      };

      if (!res.ok || !data.unifiedHtml5Game) {
        throw new Error(data.error || 'Cross-engine mesh fusion failed.');
      }

      const title = data.bundleTitle || 'Unified Cross-Engine Build';
      const summary = data.synthesisSummary || 'Fused multiple OS engines and assets.';
      const bridgeCode = data.bridgeCode || customAdapterCode;

      setBundleResult({
        title,
        summary,
        requirements: Array.isArray(data.detectedRequirements) ? data.detectedRequirements : [],
        bridgeCode,
        html: data.unifiedHtml5Game,
      });

      if (includeKinetic) unificatorEngine.setKineticHookCode(bridgeCode);
      if (includeVoxel) unificatorEngine.setVoxelHookCode(bridgeCode);

      await printedAppsStore.printApp({
        name: title,
        description: summary,
        html: data.unifiedHtml5Game,
        improvementNote: 'Fused by Cross-Engine Mesh Unificator (#2).',
      });

      await swarmEngine.runDaemon('cross-game-exporter');
      await swarmEngine.runDaemon('coherence-calibrator');
      neuralBus.publish('FORGE', 'MESH_UNIFY_DONE', `Fused "${title}" across OS engines & Library.`);
      onShowToast?.(`Fused "${title}" into Library & synced engines!`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Mesh fusion failed.');
    } finally {
      setFusing(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400/30 to-violet-500/30 border border-emerald-400/50 flex items-center justify-center text-emerald-200 shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100 truncate">
              Cross-Engine Mesh &amp; Brain Unificator (#2)
            </h2>
            <p className="text-[10.5px] text-slate-400 truncate">
              Coherence {brainState.coherenceScore}% · {supportDaemons.length} Support Daemons · Fuses Kinetic 2D, Voxel 3D, Smart Brain &amp; HyperFace
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            disabled={brainState.busy}
            onClick={() => void handleRun20DaemonsAndBrain()}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/45 text-indigo-100 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Brain className="w-3.5 h-3.5" />
            <span>Sync 20 Daemons + Brain</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('codeunifier')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Merge className="w-3.5 h-3.5" />
            <span>Code Unifier #1</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('masterbrain')}
            className="px-2.5 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/45 text-violet-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Master Brain</span>
          </button>

          <button
            type="button"
            onClick={() => {
              aimSpaceStore.queueRestructureInput({
                sourceName: bundleResult?.title || 'Cross-Engine Mesh Unifier',
                sourceCode: bundleResult?.html || customAdapterCode,
                directive: goal,
              });
              onOpenApp('aimspace');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Merge className="w-3.5 h-3.5" />
            <span>Restructure in AIM Space</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3 py-2 text-rose-100 shrink-0">
          {errorMsg}
        </div>
      )}

      {/* Main Split */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-2.5">
        {/* Left: Subsystem Matrix + 20 Support Daemons */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 lg:min-h-0">
          <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
            <div className="font-semibold text-emerald-200">Unified Subsystem Matrix</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeKinetic}
                  onChange={(e) => setIncludeKinetic(e.target.checked)}
                  className="accent-orange-400"
                />
                <Flame className="w-3.5 h-3.5 text-orange-300" />
                <span>Kinetic 2D</span>
              </label>
              <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVoxel}
                  onChange={(e) => setIncludeVoxel(e.target.checked)}
                  className="accent-sky-400"
                />
                <Boxes className="w-3.5 h-3.5 text-sky-300" />
                <span>Voxel 3D</span>
              </label>
              <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSmartItems}
                  onChange={(e) => setIncludeSmartItems(e.target.checked)}
                  className="accent-violet-400"
                />
                <Sparkles className="w-3.5 h-3.5 text-violet-300" />
                <span>Smart Brain Items</span>
              </label>
              <label className="flex items-center gap-1.5 p-1.5 rounded-lg bg-white/[0.03] border border-white/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeHyperFace}
                  onChange={(e) => setIncludeHyperFace(e.target.checked)}
                  className="accent-cyan-400"
                />
                <Shapes className="w-3.5 h-3.5 text-cyan-300" />
                <span>HyperFace 3D</span>
              </label>
            </div>

            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full bg-[#040914] border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-100 outline-none"
            />

            <textarea
              rows={3}
              value={customAdapterCode}
              onChange={(e) => setCustomAdapterCode(e.target.value)}
              spellCheck={false}
              className="w-full rounded-lg bg-[#040812] border border-white/10 p-2 font-mono text-[10.5px] text-emerald-100 resize-none outline-none"
            />

            <button
              type="button"
              disabled={fusing}
              onClick={() => void handleMeshFuse()}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/35 to-violet-500/35 hover:from-emerald-500/45 hover:to-violet-500/45 border border-emerald-400/50 text-emerald-50 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{fusing ? 'Fusing Engines & Brain...' : 'Fuse Multi-Engine Build'}</span>
            </button>
          </div>

          {/* 20 Brain-Linked Unificator Support Daemons */}
          <div className="aether-panel rounded-xl p-2.5 flex-1 min-h-[160px] lg:min-h-0 flex flex-col gap-1.5 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="font-semibold text-slate-100">
                20 Support Daemons ({supportDaemons.length})
              </span>
              <button
                type="button"
                onClick={() => onOpenApp('swarm')}
                className="text-[10.5px] text-cyan-300 hover:underline cursor-pointer"
              >
                Full Swarm ({daemons.length})
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1 pr-1">
              {supportDaemons.map((d) => (
                <div
                  key={d.role}
                  className="p-1.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100 truncate">{d.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{d.lastSummary}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void swarmEngine.runDaemon(d.role)}
                    disabled={d.status === 'scanning'}
                    className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-200 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {d.status === 'scanning' ? '...' : 'Run'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Fused Output Stage */}
        <div className="lg:col-span-7 flex flex-col gap-2.5 min-h-[260px] lg:min-h-0">
          {!bundleResult ? (
            <div className="aether-panel rounded-xl p-6 flex-1 flex flex-col items-center justify-center text-center gap-3">
              <Network className="w-10 h-10 text-emerald-300/75" />
              <div className="max-w-md space-y-1">
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Cross-Engine Mesh Unificator Ready
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Select any mix of Kinetic 2D, Voxel 3D, Smart Brain Items, and HyperFace 3D stages on the left. Click <strong>Fuse Multi-Engine Build</strong> to bridge all layers via the 20 Support Daemons and Master Brain.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-hidden">
              <div className="aether-panel rounded-xl p-2.5 space-y-1.5 shrink-0">
                <div className="font-semibold text-emerald-200">{bundleResult.title}</div>
                <p className="text-slate-300">{bundleResult.summary}</p>
                <div className="flex flex-wrap gap-1">
                  {bundleResult.requirements.slice(0, 4).map((r, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 text-[10px] text-emerald-200 inline-flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-2.5 h-2.5" />
                      <span>{r}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex-1 min-h-[200px] rounded-xl overflow-hidden border border-emerald-400/30 bg-[#03060c]">
                <iframe
                  title={bundleResult.title}
                  srcDoc={bundleResult.html}
                  sandbox="allow-scripts allow-forms allow-modals allow-downloads"
                  className="w-full h-full border-0 block"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
