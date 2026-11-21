import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bot,
  Check,
  Copy,
  Database,
  FolderSync,
  HardDrive,
  Layers,
  Minimize2,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import { OS_APPS } from '../kernel/appRegistry';
import { kernelHealer } from '../kernel/healerEngine';
import { masterBrainEngine } from '../kernel/masterBrainEngine';
import { microFractalKernel } from '../kernel/microFractalKernel';
import { neuralBus } from '../kernel/neuralBus';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import { storageTelemetryEngine } from '../kernel/storageTelemetryEngine';
import { swarmEngine } from '../kernel/swarmEngine';
import { unificatorEngine } from '../kernel/unificatorEngine';
import { vfs } from '../kernel/vfs';
import { AppIcon } from '../components/AppIcon';
import { PrintedAppRuntime } from '../components/PrintedAppRuntime';
import type {
  AppId,
  DaemonConfig,
  EnvironmentSynthesisResult,
  NeuralBusEvent,
  PrintedAppDefinition,
  SmartGameItem,
  StorageTelemetrySnapshot,
} from '../types/os';

interface SmartCompanionAppProps {
  openAppIds: AppId[];
  onOpenApp: (id: AppId) => void;
  onTileApps: (ids: AppId[]) => void;
  onCleanDesktop: () => void;
  onShowToast: (msg: string) => void;
}

const COLLABORATOR_APP_IDS: AppId[] = [
  'aimspace',
  'aimworkstation',
  'fractalcsp',
  'heliocell',
  'aimspacejet',
  'hyperface',
  'kineticengine',
  'voxelengine',
  'gameforge',
  'smartbrain',
  'codeunifier',
  'meshunifier',
  'masterbrain',
  'musicstudio',
  'jsonvault',
  'htmlprinter',
  'architect',
];

const ENVIRONMENT_PRESETS = [
  {
    label: 'Orbital 3D Cyber Arena',
    prompt:
      'Build an interactive 3D orbital reactor arena with floating energy cores, kinetic bounce drones, live audio-reactive lighting, and keyboard/touch thrusters.',
    apps: ['voxelengine', 'hyperface', 'kineticengine', 'smartbrain', 'codeunifier'] as AppId[],
  },
  {
    label: 'Bio-Luminescent Ecosystem',
    prompt:
      'Synthesize an organic living fluid ecosystem simulation where autonomous bioluminescent creatures flock toward cursor ripples and evolve via Smart Brain upgrades.',
    apps: ['kineticengine', 'smartbrain', 'jsonvault', 'musicstudio', 'htmlprinter'] as AppId[],
  },
  {
    label: 'Voxel Relic Observatory',
    prompt:
      'Construct a playable Three.js 3D relic observatory with rotating crystal artifacts, orbit camera controls, shader fog tuning, and live HUD telemetry.',
    apps: ['hyperface', 'voxelengine', 'meshunifier', 'masterbrain'] as AppId[],
  },
  {
    label: 'Autonomous Swarm Command',
    prompt:
      'Create an interactive mission dashboard & 2D spatial simulation visualizing real-time daemon dispatches, VFS storage streams, and tactical node defense.',
    apps: ['codeunifier', 'kineticengine', 'masterbrain', 'smartbrain', 'architect'] as AppId[],
  },
];

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function SmartCompanionApp({
  openAppIds,
  onOpenApp,
  onTileApps,
  onCleanDesktop,
  onShowToast,
}: SmartCompanionAppProps) {
  const [storage, setStorage] = useState<StorageTelemetrySnapshot>(() => storageTelemetryEngine.getState());
  const [busEvents, setBusEvents] = useState<NeuralBusEvent[]>(() => neuralBus.getEvents());
  const [daemons, setDaemons] = useState<DaemonConfig[]>(() => swarmEngine.getDaemons());
  const [smartState, setSmartState] = useState(() => smartBrainItemStore.getState());
  const [brainState, setBrainState] = useState(() => masterBrainEngine.getState());
  const [unifyState, setUnifyState] = useState(() => unificatorEngine.getState());
  const [printedApps, setPrintedApps] = useState<PrintedAppDefinition[]>(() => printedAppsStore.getApps());
  const [kernelHealth, setKernelHealth] = useState(() => kernelHealer.getState().health);
  const [fps, setFps] = useState(() => microFractalKernel.getState().measuredFps);

  const [promptInput, setPromptInput] = useState(ENVIRONMENT_PRESETS[0].prompt);
  const [selectedApps, setSelectedApps] = useState<AppId[]>(ENVIRONMENT_PRESETS[0].apps);
  const [busyMode, setBusyMode] = useState<'idle' | 'synthesizing' | 'building'>('idle');
  const [buildError, setBuildError] = useState<string | null>(null);
  const [latestBuild, setLatestBuild] = useState<EnvironmentSynthesisResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const [rightView, setRightView] = useState<'telemetry' | 'stage'>('telemetry');
  const [updateFilter, setUpdateFilter] = useState<'all' | 'synthesis' | 'daemons' | 'storage'>('all');

  useEffect(() => {
    const unsubStorage = storageTelemetryEngine.subscribe(setStorage);
    const unsubBus = neuralBus.subscribe((all) => setBusEvents([...all]));
    const unsubSwarm = swarmEngine.subscribe((d) => setDaemons([...d]));
    const unsubSmart = smartBrainItemStore.subscribe(setSmartState);
    const unsubBrain = masterBrainEngine.subscribe(setBrainState);
    const unsubUnify = unificatorEngine.subscribe(setUnifyState);
    const unsubPrinted = printedAppsStore.subscribe(setPrintedApps);
    const unsubHeal = kernelHealer.subscribe((h) => setKernelHealth(h.health));
    const unsubFps = microFractalKernel.subscribe((m) => setFps(m.measuredFps));

    return () => {
      unsubStorage();
      unsubBus();
      unsubSwarm();
      unsubSmart();
      unsubBrain();
      unsubUnify();
      unsubPrinted();
      unsubHeal();
      unsubFps();
    };
  }, []);

  const toggleCollaboratorApp = (appId: AppId) => {
    setSelectedApps((prev) =>
      prev.includes(appId) ? (prev.length > 1 ? prev.filter((id) => id !== appId) : prev) : [...prev, appId]
    );
  };

  const activeScanningDaemons = useMemo(
    () => daemons.filter((d) => d.status === 'scanning' || d.status === 'patching'),
    [daemons]
  );

  const filteredUpdates = useMemo(() => {
    return busEvents
      .filter((ev) => {
        if (updateFilter === 'synthesis') {
          return (
            ev.channel === 'FORGE' ||
            ev.channel === 'SANDBOX' ||
            /SYNTH|ITEM|BUILD|PRINT|UNIFY|GAME/i.test(ev.type)
          );
        }
        if (updateFilter === 'daemons') {
          return ev.channel === 'SWARM' || ev.channel === 'HEALER' || /BRAIN|DAEMON/i.test(ev.type);
        }
        if (updateFilter === 'storage') {
          return ev.channel === 'VFS' || /SNAPSHOT|COMPACT|STORAGE|CHECKPOINT/i.test(ev.type);
        }
        return true;
      })
      .slice(0, 32);
  }, [busEvents, updateFilter]);

  const handleSynthesize = async (mode: 'synthesize-prompt' | 'build-environment') => {
    if (!promptInput.trim() || busyMode !== 'idle') return;
    setBusyMode(mode === 'synthesize-prompt' ? 'synthesizing' : 'building');
    setBuildError(null);

    neuralBus.publish(
      'SYSTEM',
      mode === 'synthesize-prompt' ? 'COMPANION_PROMPT_SYNTH' : 'COMPANION_ENV_BUILD_START',
      mode === 'synthesize-prompt'
        ? `Synthesizing structured multi-app prompt from "${promptInput.slice(0, 64)}..."`
        : `Building full multi-app environment across ${selectedApps.length} OS apps...`
    );

    try {
      const appDescriptors = selectedApps.map((id) => {
        const def = OS_APPS.find((a) => a.id === id);
        return {
          id,
          name: def?.name ?? id,
          role: def?.category ?? '',
        };
      });

      const vfsSummary = vfs
        .getFiles()
        .slice(0, 12)
        .map((f) => `${f.path} (${f.size} B)`)
        .join('\n');

      const storageSummary = `Tracked Workspace: ${formatBytes(storage.totalTrackedBytes)} / Browser Usage: ${formatBytes(
        storage.browserUsageBytes
      )} / Allocated Quota: ${formatBytes(storage.quotaBytes)} (${storage.subsystems.length} stores)`;

      const res = await fetch('/api/companion/build-environment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          userPrompt: promptInput.trim(),
          selectedApps: appDescriptors,
          vfsSummary,
          storageSummary,
        }),
      });

      const data = (await res.json()) as {
        environmentName?: string;
        synthesizedPrompt?: string;
        architectureSummary?: string;
        orchestratedApps?: Array<{ appId: string; appName: string; roleInEnvironment: string }>;
        vfsFiles?: Array<{ name: string; path: string; content: string }>;
        hookCode?: string;
        environmentHtml5?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Environment synthesis request failed.');
      }

      const writtenFiles: Array<{ name: string; path: string; size: number }> = [];
      if (Array.isArray(data.vfsFiles)) {
        for (const vf of data.vfsFiles.slice(0, 4)) {
          if (!vf.name || typeof vf.content !== 'string') continue;
          const saved = await vfs.saveFile({
            name: vf.name,
            path: vf.path?.startsWith('/workspace/') ? vf.path : `/workspace/environments/${vf.name}`,
            content: vf.content,
            patchedBy: 'Smart AI Companion',
          });
          writtenFiles.push({ name: saved.name, path: saved.path, size: saved.size });
        }
      }

      if (data.hookCode && data.hookCode.trim()) {
        if (selectedApps.includes('kineticengine')) {
          unificatorEngine.setKineticHookCode(data.hookCode);
        }
        if (selectedApps.includes('voxelengine')) {
          unificatorEngine.setVoxelHookCode(data.hookCode);
        }
      }

      let printedId: AppId | undefined;
      const html5 = (data.environmentHtml5 || '').trim();
      if (mode === 'build-environment' && html5.length > 80) {
        const printed = await printedAppsStore.printApp({
          name: data.environmentName || 'Synthesized Environment',
          description: data.architectureSummary || promptInput.trim().slice(0, 140),
          html: html5,
          improvementNote: `Built by Smart AI Companion across ${selectedApps.join(', ')}`,
        });
        printedId = printed.id;
      }

      const result: EnvironmentSynthesisResult = {
        id: `env-${Date.now()}`,
        mode,
        environmentName: data.environmentName || 'Synthesized Workspace Environment',
        userPrompt: promptInput.trim(),
        synthesizedPrompt: data.synthesizedPrompt || promptInput.trim(),
        architectureSummary: data.architectureSummary || 'Multi-app synthesis ready.',
        orchestratedApps: Array.isArray(data.orchestratedApps)
          ? data.orchestratedApps.map((o) => ({
              appId: o.appId as AppId,
              appName: o.appName,
              roleInEnvironment: o.roleInEnvironment,
            }))
          : appDescriptors.map((a) => ({
              appId: a.id,
              appName: a.name,
              roleInEnvironment: a.role || 'Participating subsystem',
            })),
        vfsFilesWritten: writtenFiles,
        hookCode: data.hookCode || '',
        environmentHtml5: html5,
        printedAppId: printedId,
        createdAt: Date.now(),
      };

      setLatestBuild(result);
      await storageTelemetryEngine.sampleNow(true);

      if (mode === 'build-environment' && printedId) {
        setRightView('stage');
        onShowToast(`Built "${result.environmentName}" & saved ${writtenFiles.length} VFS file(s).`);
      } else {
        onShowToast(`Synthesized prompt & persisted ${writtenFiles.length} spec artifact(s).`);
      }

      neuralBus.publish(
        'FORGE',
        mode === 'build-environment' ? 'COMPANION_ENV_BUILT' : 'COMPANION_PROMPT_READY',
        `${result.environmentName}: ${result.architectureSummary}`
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synthesis failed.';
      setBuildError(msg);
      onShowToast(msg);
    } finally {
      setBusyMode('idle');
    }
  };

  const handleAutoSynthSweep = async () => {
    onShowToast('Running Smart Brain Auto-Synthesis + Master Brain coherence sweep...');
    const blank = smartState.blanks[0];
    await Promise.all([
      smartBrainItemStore.generateItems({
        mode: 'auto-blank-fill',
        prompt: blank?.suggestedPrompt,
        targetGame: blank?.targetGame,
        blankTitle: blank?.title,
      }),
      masterBrainEngine.runMasterSort('Auto-synthesize missing blanks and balance workspace telemetry.'),
    ]);
    await storageTelemetryEngine.sampleNow(true);
    onShowToast('Auto-synthesis & Brain sweep completed.');
  };

  const handleCopyPrompt = async () => {
    const text = latestBuild?.synthesizedPrompt || promptInput;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPrompt(true);
      onShowToast('Synthesized prompt copied to clipboard.');
      window.setTimeout(() => setCopiedPrompt(false), 1800);
    } catch {
      onShowToast('Copy blocked by browser permissions.');
    }
  };

  // Build SVG path for real-time Volume Growth sparkline
  const growthChart = useMemo(() => {
    const pts = storage.growthHistory;
    if (pts.length === 0) return null;
    const width = 340;
    const height = 74;
    const vals = pts.map((p) => p.trackedBytes);
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals, minV + 1024);
    const span = Math.max(1, maxV - minV);

    const coords = pts.map((p, idx) => {
      const x = pts.length === 1 ? width / 2 : (idx / (pts.length - 1)) * width;
      const y = height - 8 - ((p.trackedBytes - minV) / span) * (height - 18);
      return { x, y, point: p };
    });

    const linePath = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height} L ${coords[0].x.toFixed(1)} ${height} Z`;

    return { width, height, linePath, areaPath, minV, maxV, coords };
  }, [storage.growthHistory]);

  const activeStagePrintedApp = useMemo(() => {
    if (!latestBuild?.printedAppId) return null;
    return printedApps.find((p) => p.id === latestBuild.printedAppId) ?? null;
  }, [latestBuild, printedApps]);

  const quotaUsedBarPct = Math.min(100, Math.max(0.6, storage.percentAllocatedUsed));
  const autoSynthItems: SmartGameItem[] = smartState.items.slice(0, 4);

  return (
    <div className="h-full flex flex-col bg-[#060b16] text-slate-100 overflow-hidden">
      {/* Unified Header Strip */}
      <div className="px-4 py-2.5 border-b border-white/10 bg-[#091020] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-sm sm:text-base font-semibold tracking-tight text-slate-100 truncate">
              Smart AI Companion & Environment Architect
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-tabular text-slate-400 mt-0.5">
            <span className={kernelHealth >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
              Health {kernelHealth}%
            </span>
            <span aria-hidden="true">·</span>
            <span>{daemons.length} Daemons ({activeScanningDaemons.length} active)</span>
            <span aria-hidden="true">·</span>
            <span>Brain Coherence {brainState.coherenceScore}%</span>
            <span aria-hidden="true">·</span>
            <span>{fps} fps</span>
            <span aria-hidden="true">·</span>
            <span className="text-cyan-300">
              HDD {formatBytes(storage.browserUsageBytes)} / {formatBytes(storage.quotaBytes)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleAutoSynthSweep()}
            disabled={smartState.busy || brainState.busy}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-100 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Wand2 className={`w-3.5 h-3.5 ${smartState.busy || brainState.busy ? 'animate-spin' : ''}`} />
            <span>{smartState.busy || brainState.busy ? 'Synthesizing...' : 'Run Auto-Synthesis'}</span>
          </button>

          <button
            type="button"
            onClick={() => void storageTelemetryEngine.sampleNow(true)}
            title="Refresh HDD Space Allocation & Updates"
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <button
            type="button"
            onClick={onCleanDesktop}
            title="Show clean desktop wallpaper & pods"
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Minimize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clean Desktop</span>
          </button>
        </div>
      </div>

      {/* Main Responsive Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* LEFT COLUMN (5/12): Prompt Synthesizer & Multi-App Environment Builder */}
        <section className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 bg-[#070d1b] p-4 flex flex-col gap-3.5 overflow-y-auto">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <h2 className="font-display text-sm font-semibold text-slate-100">
                01. Synthesize Prompt & Build Environment
              </h2>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                {selectedApps.length} apps linked
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Describe what you want to build or explore. The Companion expands your prompt, coordinates the selected OS apps, writes VFS modules, and launches a live playable environment.
            </p>
          </div>

          {/* Preset Quick Recipes */}
          <div className="flex flex-wrap gap-1.5">
            {ENVIRONMENT_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setPromptInput(preset.prompt);
                  setSelectedApps(preset.apps);
                }}
                className="px-2.5 py-1 rounded-md bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer whitespace-nowrap"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Seed Prompt Input */}
          <div>
            <label htmlFor="companion-prompt-input" className="block text-[11px] font-medium text-slate-300 mb-1">
              Environment / System Directive
            </label>
            <textarea
              id="companion-prompt-input"
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              rows={3}
              placeholder="Describe the interactive world, simulation, game, or multi-app environment to synthesize..."
              className="w-full rounded-xl bg-[#040812] border border-white/15 px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/60 resize-y leading-relaxed"
            />
          </div>

          {/* Collaborating OS Apps Selector */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-300">
                Participating OS Apps
              </span>
              <button
                type="button"
                onClick={() => setSelectedApps([...COLLABORATOR_APP_IDS])}
                className="text-[11px] text-cyan-300 hover:text-cyan-200 cursor-pointer"
              >
                Select All 12
              </button>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              {COLLABORATOR_APP_IDS.map((appId) => {
                const def = OS_APPS.find((a) => a.id === appId);
                if (!def) return null;
                const active = selectedApps.includes(appId);
                return (
                  <button
                    key={appId}
                    type="button"
                    onClick={() => toggleCollaboratorApp(appId)}
                    className={`px-2 py-1.5 rounded-lg border text-left transition-colors cursor-pointer flex items-center gap-1.5 min-w-0 ${
                      active
                        ? 'bg-cyan-500/18 border-cyan-400/55 text-cyan-100'
                        : 'bg-white/[0.03] border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/[0.06]'
                    }`}
                  >
                    <AppIcon name={def.iconName} className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-medium truncate">{def.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void handleSynthesize('synthesize-prompt')}
              disabled={busyMode !== 'idle' || !promptInput.trim()}
              className="px-3 py-2 rounded-xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
            >
              <Sparkles className={`w-3.5 h-3.5 text-cyan-300 ${busyMode === 'synthesizing' ? 'animate-spin' : ''}`} />
              <span>{busyMode === 'synthesizing' ? 'Synthesizing...' : 'Synthesize Prompt'}</span>
            </button>

            <button
              type="button"
              onClick={() => void handleSynthesize('build-environment')}
              disabled={busyMode !== 'idle' || !promptInput.trim()}
              className="px-3 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50 shadow-sm"
            >
              <Play className={`w-3.5 h-3.5 ${busyMode === 'building' ? 'animate-pulse' : ''}`} />
              <span>{busyMode === 'building' ? 'Building World...' : 'Build Environment'}</span>
            </button>
          </div>

          {buildError && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/35 text-xs text-rose-200">
              {buildError}
            </div>
          )}

          {/* Synthesized Prompt & App Orchestration Result */}
          {latestBuild ? (
            <div className="pt-2 border-t border-white/10 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {latestBuild.environmentName}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {latestBuild.vfsFilesWritten.length} VFS files written · {latestBuild.orchestratedApps.length} apps wired
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleCopyPrompt()}
                    className="px-2 py-1 rounded-md bg-white/[0.06] hover:bg-white/12 border border-white/12 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt ? 'Copied' : 'Copy Prompt'}</span>
                  </button>
                  {latestBuild.orchestratedApps.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        onTileApps([
                          'companion',
                          ...latestBuild.orchestratedApps.map((o) => o.appId).slice(0, 3),
                        ])
                      }
                      className="px-2 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-[11px] text-cyan-100 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Layers className="w-3 h-3" />
                      <span>Launch & Tile Apps</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#040812] border border-white/10 text-[11.5px] text-slate-200 leading-relaxed max-h-28 overflow-y-auto">
                {latestBuild.synthesizedPrompt}
              </div>

              <div className="space-y-1">
                {latestBuild.orchestratedApps.map((oa) => (
                  <div
                    key={oa.appId}
                    className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/8 text-[11px]"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-slate-100">{oa.appName}</span>
                      <span className="text-slate-400"> · {oa.roleInEnvironment}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenApp(oa.appId)}
                      className="px-2 py-0.5 rounded bg-white/[0.07] hover:bg-white/15 text-cyan-300 text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Open</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="pt-2 border-t border-white/10 space-y-2">
              <div className="text-[11px] font-medium text-slate-400">
                Quick-Launch Participating Workspaces
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(['drive', 'smartbrain', 'codeunifier', 'kineticengine', 'voxelengine', 'hyperface'] as AppId[]).map(
                  (id) => {
                    const def = OS_APPS.find((a) => a.id === id);
                    if (!def) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onOpenApp(id)}
                        className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{def.shortName}</span>
                        <ArrowUpRight className="w-3 h-3 text-slate-400" />
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </section>

        {/* RIGHT COLUMN (7/12): Live Telemetry, Volume Growth, HDD Space & Live Environment Stage */}
        <section className="lg:col-span-7 bg-[#060b16] flex flex-col min-h-0 overflow-hidden">
          {/* Sub-Header Switcher */}
          <div className="px-4 py-2 border-b border-white/10 bg-[#080f1e] flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#040812] border border-white/10">
              <button
                type="button"
                onClick={() => setRightView('telemetry')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  rightView === 'telemetry'
                    ? 'bg-white/12 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                HDD Allocation, Volume Growth & Updates
              </button>
              <button
                type="button"
                onClick={() => setRightView('stage')}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  rightView === 'stage'
                    ? 'bg-cyan-500/20 text-cyan-100'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Live Environment Stage {activeStagePrintedApp ? `· ${activeStagePrintedApp.shortName}` : ''}
              </button>
            </div>

            <div className="text-[11px] font-mono-tabular text-slate-400 hidden sm:block">
              Sampled {new Date(storage.lastSampledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
          </div>

          {rightView === 'stage' ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {activeStagePrintedApp ? (
                <PrintedAppRuntime
                  app={activeStagePrintedApp}
                  openAppIds={openAppIds}
                  onOpenApp={onOpenApp}
                  onShowToast={onShowToast}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/12 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div className="max-w-md space-y-1">
                    <h3 className="font-display text-sm font-semibold text-slate-100">
                      No Active Synthesized Environment Yet
                    </h3>
                    <p className="text-xs text-slate-400">
                      Select your participating apps on the left and click Build Environment to generate and launch a full interactive HTML5/3D world right inside this stage.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSynthesize('build-environment')}
                    disabled={busyMode !== 'idle'}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-semibold cursor-pointer"
                  >
                    Build Orbital 3D Arena Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {/* SECTION 1: HDD Space Allocation & Volume Growth */}
              <div className="rounded-xl border border-white/10 bg-[#080f1e] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-cyan-300 shrink-0" />
                    <h2 className="font-display text-sm font-semibold text-slate-100">
                      HDD Space Allocation & Volume Growth
                    </h2>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        void storageTelemetryEngine.captureVolumeCheckpoint();
                        onShowToast('Captured VFS checkpoint snapshot.');
                      }}
                      className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/12 border border-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <FolderSync className="w-3 h-3 text-cyan-300" />
                      <span>Checkpoint</span>
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const pruned = await storageTelemetryEngine.compactStorage(4);
                        onShowToast(
                          pruned > 0
                            ? `Reclaimed space from ${pruned} archived VFS snapshot(s).`
                            : 'VFS snapshots already compact (<= 4 retained).'
                        );
                      }}
                      className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/12 border border-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3 text-amber-300" />
                      <span>Compact</span>
                    </button>
                  </div>
                </div>

                {/* Top 4 Quantitative KPI Figures (tabular-nums) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-white/8">
                  <div>
                    <div className="text-[11px] text-slate-400">Allocated Quota</div>
                    <div className="font-mono-tabular text-sm font-semibold text-slate-100 mt-0.5">
                      {formatBytes(storage.quotaBytes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Total Used</div>
                    <div className="font-mono-tabular text-sm font-semibold text-cyan-300 mt-0.5">
                      {formatBytes(storage.browserUsageBytes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">OS Stores Volume</div>
                    <div className="font-mono-tabular text-sm font-semibold text-emerald-300 mt-0.5">
                      {formatBytes(storage.totalTrackedBytes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Net Volume Growth</div>
                    <div className="font-mono-tabular text-sm font-semibold text-amber-300 mt-0.5">
                      {storage.netGrowthBytes >= 0 ? '+' : ''}
                      {formatBytes(Math.abs(storage.netGrowthBytes))}
                      <span className="text-[10px] text-slate-400 font-normal ml-1">
                        ({storage.growthRateBytesPerMin >= 0 ? '+' : ''}
                        {formatBytes(Math.abs(storage.growthRateBytesPerMin))}/m)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Allocation Bar */}
                <div>
                  <div className="flex items-center justify-between text-[11px] font-mono-tabular text-slate-400 mb-1">
                    <span>
                      Used {storage.percentAllocatedUsed.toFixed(4)}% · Free {formatBytes(storage.freeBytes)}
                    </span>
                    <span>
                      {storage.estimateSupported ? 'Navigator StorageManager API' : 'Local Byte Accounting'}
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-[#040812] border border-white/10 overflow-hidden flex">
                    <div
                      style={{ width: `${quotaUsedBarPct}%` }}
                      className="h-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400 transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Real-Time Volume Growth Sparkline + Subsystem Allocation Table */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                  {/* Volume Growth Graph */}
                  <div className="md:col-span-5 flex flex-col justify-between bg-[#050a14] border border-white/8 rounded-lg p-2.5">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-slate-200">Volume Growth Curve</span>
                      <span className="font-mono-tabular text-slate-400">
                        {storage.growthHistory.length} samples
                      </span>
                    </div>

                    {growthChart ? (
                      <svg
                        viewBox={`0 0 ${growthChart.width} ${growthChart.height}`}
                        className="w-full h-20 overflow-visible"
                        role="img"
                        aria-label="Volume growth history over time"
                      >
                        <defs>
                          <linearGradient id="volGrowthFill" x1="0" x2="0" y1="0" y2="1">
                            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>
                        <path d={growthChart.areaPath} fill="url(#volGrowthFill)" />
                        <path
                          d={growthChart.linePath}
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {growthChart.coords.length > 0 && (
                          <circle
                            cx={growthChart.coords[growthChart.coords.length - 1].x}
                            cy={growthChart.coords[growthChart.coords.length - 1].y}
                            r="3.2"
                            fill="#34d399"
                          />
                        )}
                      </svg>
                    ) : (
                      <div className="h-20 flex items-center justify-center text-[11px] text-slate-500">
                        Sampling initial volume baseline...
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10.5px] font-mono-tabular text-slate-400 pt-1 border-t border-white/8">
                      <span>Base {formatBytes(storage.baselineBytes)}</span>
                      <span>Current {formatBytes(storage.totalTrackedBytes)}</span>
                    </div>
                  </div>

                  {/* Subsystem Breakdown Table */}
                  <div className="md:col-span-7 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-white/10 text-slate-400">
                          <th className="py-1 pr-2 font-medium">Subsystem Store</th>
                          <th className="py-1 px-2 font-medium">Backend</th>
                          <th className="py-1 px-2 font-medium text-right">Items</th>
                          <th className="py-1 pl-2 font-medium text-right">Allocated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/6">
                        {storage.subsystems.map((sub) => {
                          const share =
                            storage.totalTrackedBytes > 0
                              ? Math.round((sub.bytes / storage.totalTrackedBytes) * 100)
                              : 0;
                          return (
                            <tr
                              key={sub.id}
                              onClick={() => onOpenApp(sub.targetAppId)}
                              className="hover:bg-white/[0.04] cursor-pointer transition-colors"
                            >
                              <td className="py-1.5 pr-2 font-medium text-slate-200 truncate max-w-[165px]">
                                {sub.label}
                              </td>
                              <td className="py-1.5 px-2 text-slate-400">{sub.location}</td>
                              <td className="py-1.5 px-2 text-right font-mono-tabular text-slate-300">
                                {sub.itemCount}
                              </td>
                              <td className="py-1.5 pl-2 text-right font-mono-tabular text-cyan-300 whitespace-nowrap">
                                {formatBytes(sub.bytes)}{' '}
                                <span className="text-slate-500">({share}%)</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* SECTION 2: Ongoing Auto-Synthesis & System Updates Feed */}
              <div className="rounded-xl border border-white/10 bg-[#080f1e] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-emerald-400 shrink-0" />
                    <h2 className="font-display text-sm font-semibold text-slate-100">
                      Ongoing Updates & Auto-Synthesis
                    </h2>
                  </div>

                  {/* Interactive Filter Tabs */}
                  <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#040812] border border-white/10">
                    {(
                      [
                        ['all', 'All Updates'],
                        ['synthesis', 'Auto-Synthesis'],
                        ['daemons', `${daemons.length} Daemons`],
                        ['storage', 'VFS & Storage'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setUpdateFilter(key)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer whitespace-nowrap ${
                          updateFilter === key
                            ? 'bg-white/14 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Auto-Synthesis Status Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] pt-1 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => onOpenApp('smartbrain')}
                    className="p-2 rounded-lg bg-[#050a14] hover:bg-white/[0.05] border border-white/8 text-left cursor-pointer transition-colors"
                  >
                    <div className="text-slate-400">Smart Brain Auto-Filler</div>
                    <div className="font-medium text-slate-100 mt-0.5">
                      {smartState.autoFillEnabled ? 'Active' : 'Paused'} · {smartState.items.length} items ·{' '}
                      {smartState.blanks.length} open gaps
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenApp('codeunifier')}
                    className="p-2 rounded-lg bg-[#050a14] hover:bg-white/[0.05] border border-white/8 text-left cursor-pointer transition-colors"
                  >
                    <div className="text-slate-400">Synthetic Unificator</div>
                    <div className="font-medium text-slate-100 mt-0.5">
                      {unifyState.busy ? 'Integrating...' : 'Ready'} · {unifyState.records.length} unified builds
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenApp('htmlprinter')}
                    className="p-2 rounded-lg bg-[#050a14] hover:bg-white/[0.05] border border-white/8 text-left cursor-pointer transition-colors"
                  >
                    <div className="text-slate-400">Printed HTML5 Library</div>
                    <div className="font-medium text-slate-100 mt-0.5">
                      {printedApps.length} live apps synced to bus
                    </div>
                  </button>
                </div>

                {/* Recent Auto-Synthesized Smart Brain Items */}
                {autoSynthItems.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Latest Synthesized Artifacts</span>
                      <button
                        type="button"
                        onClick={() => onOpenApp('smartbrain')}
                        className="text-cyan-300 hover:text-cyan-200 cursor-pointer"
                      >
                        Manage All Items
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {autoSynthItems.map((item) => (
                        <div
                          key={item.id}
                          className="px-2.5 py-1.5 rounded-lg bg-[#050a14] border border-white/8 flex items-center justify-between gap-2 text-[11px]"
                        >
                          <div className="min-w-0">
                            <div className="font-medium text-slate-100 truncate">{item.name}</div>
                            <div className="text-slate-400 truncate">
                              {item.category} · {item.rarity} · {item.targetGame}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => onOpenApp('smartbrain')}
                            className="text-[10.5px] text-cyan-300 hover:text-cyan-200 shrink-0 cursor-pointer"
                          >
                            Inspect
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Real-Time Kernel & Neural Bus Stream */}
                <div className="border-t border-white/8 pt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5 text-cyan-300" />
                      Live Neural Bus & Daemon Telemetry
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenApp('neuralbus')}
                      className="text-cyan-300 hover:text-cyan-200 cursor-pointer"
                    >
                      Open Neural Bus
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto divide-y divide-white/6 border border-white/8 rounded-lg bg-[#050a14]">
                    {filteredUpdates.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No telemetry events match this filter yet.
                      </div>
                    ) : (
                      filteredUpdates.map((ev) => (
                        <div
                          key={ev.id}
                          className="px-2.5 py-1.5 flex items-baseline justify-between gap-3 text-[11px]"
                        >
                          <div className="min-w-0 flex items-baseline gap-2">
                            <span className="font-mono-tabular text-cyan-300/90 shrink-0">
                              {ev.channel}
                            </span>
                            <span className="text-slate-300 truncate">{ev.summary}</span>
                          </div>
                          <span className="font-mono-tabular text-[10px] text-slate-500 shrink-0">
                            {ev.timestamp}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
