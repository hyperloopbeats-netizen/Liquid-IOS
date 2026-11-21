import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowRightLeft,
  ArrowUpRight,
  Brain,
  CheckCircle2,
  FolderKanban,
  Play,
  Repeat,
  Sliders,
  Sparkles,
  Wand2,
  Waves,
} from 'lucide-react';
import {
  awarenessMatrixEngine,
  BUILT_IN_DRIFT_PRESETS,
  SUITE_APP_CATALOG,
  type AwarenessMatrixState,
  type SuiteAppId,
} from '../kernel/awarenessMatrixEngine';
import { desktopFolderEngine } from '../kernel/desktopFolderEngine';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { masterBrainEngine } from '../kernel/masterBrainEngine';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { swarmEngine } from '../kernel/swarmEngine';
import { vfs } from '../kernel/vfs';
import type { AppId, DaemonConfig, MasterBrainPlan, ModelBackend } from '../types/os';

interface MasterBrainAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

type BrainMainTab = 'matrix-drift' | 'sorter-daemons';

const SUITE_IDS: SuiteAppId[] = ['aimworkstation', 'fractalcsp', 'heliocell', 'aimspacejet'];

export function MasterBrainApp({ onOpenApp, onShowToast }: MasterBrainAppProps) {
  const [brainState, setBrainState] = useState(masterBrainEngine.getState());
  const [matrixState, setMatrixState] = useState<AwarenessMatrixState>(() =>
    awarenessMatrixEngine.getState()
  );
  const [daemons, setDaemons] = useState<DaemonConfig[]>(swarmEngine.getDaemons());
  const [mainTab, setMainTab] = useState<BrainMainTab>('matrix-drift');

  const [directive, setDirective] = useState('');
  const [matrixDirective, setMatrixDirective] = useState('');
  const [driftPrompt, setDriftPrompt] = useState(
    'Oscillate thermal flux, solar array tracking, crimson camera sweeps, and planet cosmos drift in continuous harmony.'
  );

  const [counts, setCounts] = useState({
    vfs: vfs.getFiles().length,
    json: jsonKnowledgeStore.getEntries().length,
    printed: printedAppsStore.getApps().length,
    folders: desktopFolderEngine.getFolders().length,
  });

  useEffect(() => {
    void awarenessMatrixEngine.syncSuiteAppsToVfs();
    const unsubBrain = masterBrainEngine.subscribe(setBrainState);
    const unsubMatrix = awarenessMatrixEngine.subscribe(setMatrixState);
    const unsubSwarm = swarmEngine.subscribe((d) => setDaemons(d));
    const unsubVfs = vfs.subscribe((f) => setCounts((c) => ({ ...c, vfs: f.length })));
    const unsubJson = jsonKnowledgeStore.subscribe((st) =>
      setCounts((c) => ({ ...c, json: st.entries.length }))
    );
    const unsubPrinted = printedAppsStore.subscribe((p) =>
      setCounts((c) => ({ ...c, printed: p.length }))
    );
    const unsubFolders = desktopFolderEngine.subscribe((st) =>
      setCounts((c) => ({ ...c, folders: st.folders.length }))
    );

    return () => {
      unsubBrain();
      unsubMatrix();
      unsubSwarm();
      unsubVfs();
      unsubJson();
      unsubPrinted();
      unsubFolders();
    };
  }, []);

  const [daemonTab, setDaemonTab] = useState<'all-linked' | 'brain-sorter' | 'unificator-support'>('all-linked');
  const brainLinkedDaemons = daemons.filter(
    (d) =>
      d.category === 'brain-sorter' || d.category === 'unificator-support'
  );
  const visibleBrainDaemons =
    daemonTab === 'all-linked'
      ? brainLinkedDaemons
      : brainLinkedDaemons.filter((d) => d.category === daemonTab);
  const latestPlan: MasterBrainPlan | null = brainState.plans[0] ?? null;

  const handleMasterSort = async () => {
    const plan = await masterBrainEngine.runMasterSort(directive);
    if (plan) {
      onShowToast?.(`Master Brain achieved ${plan.coherenceScore}% coherence & archived sort report.`);
    }
  };

  const handleSynthesizeAwareness = async () => {
    const rec = await awarenessMatrixEngine.synthesizeAwarenessMatrix(matrixDirective);
    if (rec) {
      onShowToast?.(
        `Awareness Matrix "${rec.synthesisTitle}" (${rec.matrixCoherence}% coherence) active across all 4 suite apps.`
      );
    }
  };

  const handleGenerateDrift = async () => {
    const res = await awarenessMatrixEngine.generateCustomDriftMode(driftPrompt);
    if (res) {
      onShowToast?.(`Drift Mode "${res.presetName}" (${res.intensity.toFixed(2)}x) engaged across full apps loop.`);
    }
  };

  const handleApplyFolderAction = (folderName: string, appIds: string[]) => {
    const existing = desktopFolderEngine
      .getFolders()
      .find((f) => f.name.toLowerCase() === folderName.toLowerCase());
    const targetFolder = existing ?? desktopFolderEngine.createFolder(folderName);
    appIds.forEach((appId) => {
      desktopFolderEngine.moveAppIntoFolder(appId as AppId, targetFolder.id);
    });
    onShowToast?.(`Organized ${appIds.length} app(s) into "${targetFolder.name}".`);
  };

  const connectedSuiteCount = SUITE_IDS.filter(
    (id) => matrixState.telemetry[id]?.connected
  ).length;
  const drift = matrixState.drift;
  const latestSynthesis = matrixState.latestSynthesis;

  return (
    <div className="h-full flex flex-col gap-2.5 p-3 overflow-hidden text-xs">
      {/* Top Command Banner */}
      <div className="aether-panel rounded-xl p-3 flex flex-col gap-2.5 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-cyan-500 flex items-center justify-center shadow-[0_0_18px_rgba(168,85,247,0.45)]">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                AI Brain · Awareness Matrix, Full Drift &amp; {daemons.length} Daemons
              </h2>
              <p className="text-[10px] text-slate-400 font-mono-tabular">
                Coherence {brainState.coherenceScore}% · Live Suite {connectedSuiteCount}/4 · Loop Cycles {matrixState.loopTickCount} · {counts.vfs} VFS · {counts.json} Vault
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMainTab('matrix-drift')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                mainTab === 'matrix-drift'
                  ? 'bg-fuchsia-500/25 border-fuchsia-400/50 text-fuchsia-100'
                  : 'bg-white/[0.05] hover:bg-white/10 border-white/15 text-slate-300'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Awareness Matrix &amp; Drift</span>
            </button>
            <button
              type="button"
              onClick={() => setMainTab('sorter-daemons')}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1.5 whitespace-nowrap ${
                mainTab === 'sorter-daemons'
                  ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-100'
                  : 'bg-white/[0.05] hover:bg-white/10 border-white/15 text-slate-300'
              }`}
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Brain Sorter &amp; Daemons ({brainLinkedDaemons.length})</span>
            </button>
          </div>
        </div>

        {(brainState.lastError || matrixState.lastError) && (
          <div className="px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-400/35 text-rose-200 text-[11px]">
            {matrixState.lastError || brainState.lastError}
          </div>
        )}
      </div>

      {/* TAB 1: AWARENESS MATRIX SYNTHESIS & FULL DRIFT MODE GENERATOR */}
      {mainTab === 'matrix-drift' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
          {/* Awareness Matrix Controls */}
          <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="text"
              value={matrixDirective}
              onChange={(e) => setMatrixDirective(e.target.value)}
              placeholder="Optional Awareness Matrix directive (links Workstation, Fractal CSP, HelioCell Hellcat & AIM Space Jet)..."
              className="flex-1 min-w-[220px] bg-slate-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400/60"
            />
            <button
              type="button"
              onClick={() => void handleSynthesizeAwareness()}
              disabled={matrixState.busySynthesis}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-fuchsia-500 hover:brightness-110 disabled:opacity-60 text-white font-bold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-[0_0_16px_rgba(56,189,248,0.35)]"
            >
              <Sparkles className={`w-3.5 h-3.5 ${matrixState.busySynthesis ? 'animate-spin' : ''}`} />
              <span>{matrixState.busySynthesis ? 'Synthesizing Matrix...' : 'Synthesize Awareness Matrix'}</span>
            </button>
            <button
              type="button"
              onClick={() => awarenessMatrixEngine.toggleFullAppLoop()}
              className={`px-3 py-1.5 rounded-xl border text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                matrixState.fullAppLoopActive
                  ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100'
                  : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200'
              }`}
            >
              <Repeat className={`w-3.5 h-3.5 ${matrixState.fullAppLoopActive ? 'animate-spin' : ''}`} />
              <span>{matrixState.fullAppLoopActive ? 'Full Apps Loop ON' : 'Start Full Apps Loop'}</span>
            </button>
          </div>

          {/* Live 4-App Suite Telemetry Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
            {SUITE_IDS.map((sid) => {
              const meta = SUITE_APP_CATALOG[sid];
              const telem = matrixState.telemetry[sid];
              return (
                <div
                  key={sid}
                  className="aether-panel rounded-xl p-2.5 flex flex-col justify-between gap-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          telem.connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                        }`}
                      />
                      <span className="font-semibold text-slate-100 truncate">{meta.shortTitle}</span>
                    </div>
                    <span className="font-mono-tabular text-[10.5px] text-cyan-300 shrink-0 inline-flex items-center gap-1">
                      <Activity className="w-3 h-3" />
                      {telem.fps} FPS
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-200 truncate">{telem.headline}</div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                    <span className="text-[10px] font-mono-tabular text-slate-400 truncate">
                      {telem.subMetric}
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenApp(sid)}
                      className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-[10px] font-medium inline-flex items-center gap-0.5 cursor-pointer shrink-0"
                    >
                      <span>Launch</span>
                      <ArrowUpRight className="w-2.5 h-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lower Split: Full Drift Mode Generator (Left) + Latest Matrix Synthesis & Directives (Right) */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* Drift Mode Generator Panel */}
            <div className="lg:col-span-6 aether-panel rounded-xl p-3 flex flex-col min-h-0 overflow-y-auto space-y-2.5">
              <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2">
                  <Waves className="w-4 h-4 text-fuchsia-300" />
                  <div>
                    <div className="font-semibold text-slate-100">Full Drift Mode Generator</div>
                    <div className="text-[10px] text-slate-400">
                      Preset: {drift.presetName} · Phase {drift.phase.toFixed(1)} rad
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => awarenessMatrixEngine.toggleDrift()}
                  className={`px-3 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer whitespace-nowrap ${
                    drift.active
                      ? 'bg-fuchsia-500/25 border-fuchsia-400/55 text-fuchsia-100 shadow-[0_0_14px_rgba(217,70,239,0.35)]'
                      : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/15 text-slate-200'
                  }`}
                >
                  {drift.active ? 'Drift ENGAGED' : 'Engage Drift Mode'}
                </button>
              </div>

              {/* 5 Built-in Drift Presets */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {BUILT_IN_DRIFT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => awarenessMatrixEngine.applyDriftPreset(preset.id)}
                    className={`p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                      drift.presetName === preset.name && drift.active
                        ? 'bg-fuchsia-500/18 border-fuchsia-400/50 text-fuchsia-100'
                        : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/10 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[11px] truncate">{preset.name}</span>
                      <span className="font-mono-tabular text-[10px] text-cyan-300 shrink-0">
                        {preset.intensity.toFixed(2)}x
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {preset.description}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Gemini Drift Prompt */}
              <div className="space-y-1.5 pt-1">
                <label className="text-[10.5px] font-medium text-slate-300 block">
                  AI Drift Mode Synthesizer Prompt
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={driftPrompt}
                    onChange={(e) => setDriftPrompt(e.target.value)}
                    placeholder="Describe harmonic drift across Workstation, Solar CSP, Hellcat & Jet..."
                    className="flex-1 bg-slate-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-fuchsia-400/60"
                  />
                  <button
                    type="button"
                    disabled={matrixState.busyDriftGen}
                    onClick={() => void handleGenerateDrift()}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-indigo-600 hover:brightness-110 disabled:opacity-55 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Wand2 className={`w-3.5 h-3.5 ${matrixState.busyDriftGen ? 'animate-spin' : ''}`} />
                    <span>{matrixState.busyDriftGen ? 'Generating...' : 'Generate Drift Mode'}</span>
                  </button>
                </div>
              </div>

              {/* Real-Time Drift Oscillator Sliders */}
              <div className="p-2.5 rounded-lg bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center gap-1.5 text-[10.5px] font-semibold text-slate-300">
                  <Sliders className="w-3 h-3 text-cyan-300" />
                  <span>Harmonic Oscillator Parameters</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <label className="space-y-1 block">
                    <div className="flex justify-between text-[10px] text-slate-300 font-mono-tabular">
                      <span>Intensity</span>
                      <span>{drift.intensity.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={2.0}
                      step={0.05}
                      value={drift.intensity}
                      onChange={(e) =>
                        awarenessMatrixEngine.setDriftParams({ intensity: Number(e.target.value) })
                      }
                      className="w-full accent-fuchsia-400 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <div className="flex justify-between text-[10px] text-slate-300 font-mono-tabular">
                      <span>Phase Velocity</span>
                      <span>{drift.phaseVelocity.toFixed(2)}x</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={3.0}
                      step={0.05}
                      value={drift.phaseVelocity}
                      onChange={(e) =>
                        awarenessMatrixEngine.setDriftParams({ phaseVelocity: Number(e.target.value) })
                      }
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </label>

                  <label className="space-y-1 block">
                    <div className="flex justify-between text-[10px] text-slate-300 font-mono-tabular">
                      <span>Hue Shift</span>
                      <span>{drift.colorShiftDeg}°</span>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={2}
                      value={drift.colorShiftDeg}
                      onChange={(e) =>
                        awarenessMatrixEngine.setDriftParams({ colorShiftDeg: Number(e.target.value) })
                      }
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={drift.autoCameraDrift}
                      onChange={(e) =>
                        awarenessMatrixEngine.setDriftParams({ autoCameraDrift: e.target.checked })
                      }
                      className="accent-fuchsia-400 cursor-pointer"
                    />
                    <span>Auto Camera Drift (3D Rigs &amp; Movie Moves)</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={drift.thermalOscillation}
                      onChange={(e) =>
                        awarenessMatrixEngine.setDriftParams({ thermalOscillation: e.target.checked })
                      }
                      className="accent-cyan-400 cursor-pointer"
                    />
                    <span>Thermal &amp; Shader Sinusoidal Modulation</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Right: Awareness Matrix Synthesis Feed & Cross-App Directives */}
            <div className="lg:col-span-6 aether-panel rounded-xl p-3 flex flex-col min-h-0 overflow-y-auto space-y-2.5">
              {latestSynthesis ? (
                <>
                  <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-400/30">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-cyan-200">
                        {latestSynthesis.synthesisTitle}
                      </span>
                      <span className="font-mono-tabular text-[10.5px] text-emerald-300 shrink-0">
                        Coherence {latestSynthesis.matrixCoherence}%
                      </span>
                    </div>
                    <p className="text-slate-200 mt-1.5 leading-relaxed">
                      {latestSynthesis.awarenessSummary}
                    </p>
                  </div>

                  {latestSynthesis.crossAppDirectives.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10.5px] font-semibold text-indigo-300 inline-flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Live Cross-App Matrix Directives</span>
                      </div>
                      {latestSynthesis.crossAppDirectives.map((dir, i) => (
                        <div
                          key={`${dir.appId}-${i}`}
                          className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-100">
                                {SUITE_APP_CATALOG[dir.appId as SuiteAppId]?.shortTitle || dir.appId}
                              </span>
                              <span className="text-[10px] text-slate-400">· {dir.loopRole}</span>
                            </div>
                            <div className="text-[10.5px] text-slate-300 mt-0.5">{dir.directive}</div>
                            {dir.cliCommand && (
                              <div className="text-[10px] font-mono text-cyan-300 mt-0.5">
                                CMD: {dir.cliCommand}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                awarenessMatrixEngine.dispatchDirectiveToSuite(
                                  dir.appId as SuiteAppId,
                                  dir.directive,
                                  dir.cliCommand
                                )
                              }
                              className="px-2 py-1 rounded bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 text-[10px] cursor-pointer"
                            >
                              Dispatch
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenApp(dir.appId as AppId)}
                              className="px-2 py-1 rounded bg-white/[0.07] hover:bg-white/[0.15] border border-white/15 text-slate-100 text-[10px] cursor-pointer"
                            >
                              Open
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {latestSynthesis.bridgePatchJs && (
                    <div className="p-2 rounded-lg bg-slate-950/80 border border-white/10">
                      <div className="text-[10px] font-mono text-slate-400 mb-1">
                        VFS Loop Hook · /workspace/suite-apps/awareness-matrix-loop.js
                      </div>
                      <pre className="text-[10px] font-mono text-emerald-300 overflow-x-auto max-h-28 selectable whitespace-pre-wrap">
                        {latestSynthesis.bridgePatchJs}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2.5">
                  <Waves className="w-9 h-9 text-cyan-400/75" />
                  <div className="font-semibold text-slate-100">
                    Full Awareness Matrix &amp; Drift Standby
                  </div>
                  <p className="text-[11px] max-w-sm leading-relaxed">
                    Synthesize the Awareness Matrix to fuse Workstation, Home Fractal CSP, HelioCell Hellcat, and AIM Space Jet with the AI Brain, or choose any Drift preset on the left to start full continuous cross-app loops.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 pt-1">
                    {SUITE_IDS.map((sid) => (
                      <button
                        key={sid}
                        type="button"
                        onClick={() => onOpenApp(sid)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-200 text-[11px] cursor-pointer"
                      >
                        Open {SUITE_APP_CATALOG[sid].shortTitle}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: BRAIN SORTER & 30 LINKED DAEMONS */}
      {mainTab === 'sorter-daemons' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center gap-2 shrink-0">
            <input
              type="text"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              placeholder="Optional directive for Master Brain (or leave blank to sort all games, JSON, & folders)..."
              className="flex-1 min-w-[200px] bg-slate-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-indigo-400/60"
            />
            <button
              type="button"
              onClick={() => void swarmEngine.runUnificatorSupportDaemons()}
              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-[11px] font-medium cursor-pointer"
            >
              Run 20 Support
            </button>
            <button
              type="button"
              onClick={() => void swarmEngine.runBrainSorterDaemons()}
              className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 text-[11px] font-medium cursor-pointer"
            >
              Run 10 Sorters
            </button>
            <button
              type="button"
              onClick={() => void handleMasterSort()}
              disabled={brainState.busy}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-cyan-500 hover:brightness-110 text-white font-bold shadow-[0_0_20px_rgba(129,140,248,0.45)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
            >
              <Sparkles className={`w-3.5 h-3.5 ${brainState.busy ? 'animate-spin' : ''}`} />
              <span>{brainState.busy ? 'Master Sorting...' : 'Master Brain: Sort Everything Out'}</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
            {/* Left: 30 Brain-Linked Daemons */}
            <div className="lg:col-span-6 aether-panel rounded-xl p-2.5 flex flex-col min-h-0">
              <div className="flex flex-wrap items-center justify-between gap-1.5 pb-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-1">
                  {(
                    [
                      ['all-linked', `Linked (${brainLinkedDaemons.length})`],
                      ['unificator-support', 'Support (20)'],
                      ['brain-sorter', 'Sorters (10)'],
                    ] as const
                  ).map(([tabKey, label]) => (
                    <button
                      key={tabKey}
                      type="button"
                      onClick={() => setDaemonTab(tabKey)}
                      className={`px-2 py-0.5 rounded border text-[10px] cursor-pointer ${
                        daemonTab === tabKey
                          ? 'bg-indigo-500/25 border-indigo-400/50 text-indigo-100'
                          : 'bg-white/[0.03] border-white/10 text-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenApp('swarm')}
                  className="text-[10px] text-cyan-300 hover:underline cursor-pointer"
                >
                  Open Full Swarm ({daemons.length})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1.5 pt-2 pr-1">
                {visibleBrainDaemons.map((d) => (
                  <div
                    key={d.role}
                    className="p-2 rounded-lg bg-white/[0.03] border border-white/10 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-100">{d.name}</span>
                      <span
                        className={`text-[10px] font-mono-tabular ${
                          d.status === 'scanning'
                            ? 'text-cyan-300'
                            : d.status === 'error'
                            ? 'text-rose-300'
                            : 'text-emerald-300'
                        }`}
                      >
                        {d.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400">{d.description}</div>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <select
                        value={d.backend}
                        onChange={(e) => swarmEngine.setDaemonBackend(d.role, e.target.value as ModelBackend)}
                        className="bg-slate-950 border border-white/15 rounded px-1.5 py-0.5 text-[10px] text-slate-200 outline-none cursor-pointer"
                      >
                        <option value="edge-ast">Edge AST</option>
                        <option value="gemini-cloud">Gemini Cloud</option>
                        <option value="ollama-local">Ollama</option>
                      </select>
                      <span className="text-[10px] text-slate-400 truncate flex-1">{d.lastSummary}</span>
                      <button
                        type="button"
                        onClick={() => void swarmEngine.runDaemon(d.role)}
                        disabled={d.status === 'scanning'}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] text-slate-100 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Play className="w-2.5 h-2.5" />
                        <span>Run</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Master Brain Sort Blueprint & Cross-App Wiring */}
            <div className="lg:col-span-6 aether-panel rounded-xl p-2.5 flex flex-col min-h-0 overflow-y-auto space-y-2.5">
              {latestPlan ? (
                <>
                  <div className="p-2.5 rounded-lg bg-indigo-950/35 border border-indigo-400/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300">
                        Latest Orchestration Report
                      </span>
                      <span className="font-mono-tabular text-[10px] text-emerald-200">
                        Coherence {latestPlan.coherenceScore}%
                      </span>
                    </div>
                    <p className="text-slate-100 mt-1.5 leading-relaxed">{latestPlan.summary}</p>
                  </div>

                  {latestPlan.crossAppLinks.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-cyan-300 inline-flex items-center gap-1">
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Auto-Connected Cross-App Links</span>
                      </div>
                      {latestPlan.crossAppLinks.map((link, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-slate-100">
                              {link.sourceApp} → {link.targetApp}
                            </div>
                            <div className="text-[10px] text-slate-400">{link.payloadSummary}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenApp(link.targetApp as AppId)}
                            className="px-2 py-1 rounded bg-cyan-500/20 border border-cyan-400/40 text-cyan-100 text-[10px] shrink-0 cursor-pointer"
                          >
                            Open
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {latestPlan.folderActions.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-semibold text-fuchsia-300 inline-flex items-center gap-1">
                        <FolderKanban className="w-3 h-3" />
                        <span>Organic Folder Organization Plan</span>
                      </div>
                      {latestPlan.folderActions.map((fa, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-slate-100">{fa.folderName}</div>
                            <div className="text-[10px] text-slate-400">{fa.reason}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleApplyFolderAction(fa.folderName, fa.appIds)}
                            className="px-2 py-1 rounded bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 text-[10px] shrink-0 cursor-pointer"
                          >
                            Apply Folder
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {latestPlan.researchRecommendations.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-semibold text-amber-300">
                        Research &amp; Optimization Notes
                      </div>
                      {latestPlan.researchRecommendations.map((rec, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-amber-950/20 border border-amber-400/20 text-[11px] text-amber-100 flex items-start gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-300 shrink-0 mt-0.5" />
                          <span>{rec}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-slate-400 space-y-2">
                  <Brain className="w-8 h-8 text-indigo-400/70" />
                  <div className="font-semibold text-slate-200">Master Brain Ready</div>
                  <p className="text-[11px] max-w-sm">
                    Click &quot;Master Brain: Sort Everything Out&quot; above to synthesize VFS files, JSON Vault research, printed games, organic folders, and all 10 sorting daemons.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
