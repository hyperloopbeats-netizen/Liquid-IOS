import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpRight,
  Camera,
  Check,
  Cpu,
  Gamepad2,
  Layers,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { OS_APPS } from '../kernel/appRegistry';
import {
  aimSpaceStore,
  SYNTHETIC_DESIGNERS,
  type AimSpaceState,
  type SyntheticDesignerId,
} from '../kernel/aimSpaceStore';
import { hyperfaceStudioStore } from '../kernel/hyperfaceStudioStore';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { masterBrainEngine } from '../kernel/masterBrainEngine';
import { neuralBus } from '../kernel/neuralBus';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import { swarmEngine } from '../kernel/swarmEngine';
import { unificatorEngine } from '../kernel/unificatorEngine';
import { vfs } from '../kernel/vfs';
import { AppIcon } from '../components/AppIcon';
import type { AppId, DaemonConfig, VFSFile } from '../types/os';

interface AIMSpaceAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

type AimSpaceTab = 'play' | 'restructure' | 'daemons' | 'links';

const EVERYTHING_LINK_IDS: AppId[] = [
  'aimworkstation',
  'fractalcsp',
  'heliocell',
  'aimspacejet',
  'companion',
  'codeunifier',
  'meshunifier',
  'hyperface',
  'architect',
  'gameforge',
  'kineticengine',
  'voxelengine',
  'smartbrain',
  'masterbrain',
  'swarm',
  'spritecomposer',
  'jsonvault',
  'htmlprinter',
  'drive',
  'musicstudio',
];

const DAEMON_SQUADS = [
  { id: 'all', label: 'All 50', range: [0, 50] as const },
  { id: 'world', label: 'World & Spatial (10)', range: [0, 10] as const },
  { id: 'combat', label: 'Combat & Physics (10)', range: [10, 20] as const },
  { id: 'synth', label: 'Synthetic Designers (10)', range: [20, 30] as const },
  { id: 'audio', label: 'Audio & Items (10)', range: [30, 40] as const },
  { id: 'sync', label: 'VFS & Coherence (10)', range: [40, 50] as const },
];

export function AIMSpaceApp({ onOpenApp, onShowToast }: AIMSpaceAppProps) {
  const [aimState, setAimState] = useState<AimSpaceState>(() => aimSpaceStore.getState());
  const [daemons, setDaemons] = useState<DaemonConfig[]>(() => swarmEngine.getDaemons());
  const [vfsFiles, setVfsFiles] = useState<VFSFile[]>(() => vfs.getFiles());

  const [activeTab, setActiveTab] = useState<AimSpaceTab>('play');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [squadFilter, setSquadFilter] = useState<string>('all');
  const [runningBatch, setRunningBatch] = useState(false);

  // Restructure form state
  const [sourceKind, setSourceKind] = useState<
    'queued' | 'hyperface' | 'current' | 'vfs' | 'custom'
  >('queued');
  const [selectedVfsFileName, setSelectedVfsFileName] = useState('');
  const [customSourceCode, setCustomSourceCode] = useState(
    `// Custom Module to Restructure via Synthetic Designers into AIM Space\nclass OrbitalTurretRing {\n  constructor() { this.angle = 0; this.charge = 100; }\n  update(dt) { this.angle += dt * 1.4; }\n}`
  );
  const [directive, setDirective] = useState(() => aimSpaceStore.getState().queuedDirective);
  const [selectedDesigners, setSelectedDesigners] = useState<SyntheticDesignerId[]>(
    SYNTHETIC_DESIGNERS.map((d) => d.id)
  );
  const [publishToLibrary, setPublishToLibrary] = useState(true);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    void vfs.init();
    void hyperfaceStudioStore.ensureInitialized();
    const unsubAim = aimSpaceStore.subscribe((st) => {
      setAimState(st);
      if (st.queuedSourceCode && st.queuedDirective) {
        setDirective(st.queuedDirective);
      }
    });
    const unsubSwarm = swarmEngine.subscribe((d) => setDaemons(d));
    const unsubVfs = vfs.subscribe((files) => {
      setVfsFiles(files);
      if (files.length > 0 && !selectedVfsFileName) {
        setSelectedVfsFileName(files[0].name);
      }
    });
    return () => {
      unsubAim();
      unsubSwarm();
      unsubVfs();
    };
  }, [selectedVfsFileName]);

  // Listen for live gameplay frame capture + AetherOS bridge calls from the AIM Space iframe
  useEffect(() => {
    const handleMessage = (ev: MessageEvent) => {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin || ev.source !== iframeWin) return;
      const d = ev.data;
      if (!d || typeof d !== 'object') return;

      if (d.type === 'AIMSPACE_FRAME_CAPTURED' && typeof d.dataUrl === 'string') {
        aimSpaceStore.updateGamePicture(d.dataUrl);
        onShowToast?.('Captured live AIM Space game frame to Desktop screen icon.');
      } else if (d.__aetherBridge === true) {
        if (d.action === 'PUBLISH_BUS') {
          neuralBus.publish('SANDBOX', d.type || 'AIMSPACE_EVENT', `[AIM Space] ${d.summary || ''}`);
        } else if (d.action === 'OPEN_APP' && d.targetId) {
          onOpenApp(d.targetId as AppId);
        }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onOpenApp, onShowToast]);

  const aimDaemons = useMemo(
    () => daemons.filter((d) => d.category === 'aimspace-assist'),
    [daemons]
  );

  const visibleDaemons = useMemo(() => {
    const squad = DAEMON_SQUADS.find((s) => s.id === squadFilter) ?? DAEMON_SQUADS[0];
    return aimDaemons.slice(squad.range[0], squad.range[1]);
  }, [aimDaemons, squadFilter]);

  const srcDoc = useMemo(() => {
    const bridgeScript = `<script>
(function(){
  if (!window.AetherOS) {
    window.AetherOS = {
      appId: 'aimspace',
      getState: function(){ return { gameTitle: ${JSON.stringify(aimState.gameTitle)} }; },
      publish: function(type, summary){ window.parent.postMessage({ __aetherBridge: true, action: 'PUBLISH_BUS', type: String(type||'AIMSPACE'), summary: String(summary||'') }, '*'); },
      openApp: function(id){ window.parent.postMessage({ __aetherBridge: true, action: 'OPEN_APP', targetId: String(id||'') }, '*'); }
    };
  }
})();
</script>`;
    if (/<\/body>/i.test(aimState.html)) {
      return aimState.html.replace(/<\/body>/i, `${bridgeScript}\n</body>`);
    }
    return `${aimState.html}\n${bridgeScript}`;
  }, [aimState.html, aimState.gameTitle]);

  const handleCaptureDesktopFrame = () => {
    const win = iframeRef.current?.contentWindow;
    if (!win) {
      onShowToast?.('Switch to Play Game tab first to snapshot a live frame.');
      return;
    }
    win.postMessage({ type: 'CAPTURE_AIMSPACE_FRAME' }, '*');
  };

  const toggleDesigner = (id: SyntheticDesignerId) => {
    setSelectedDesigners((prev) =>
      prev.includes(id)
        ? prev.length > 1
          ? prev.filter((item) => item !== id)
          : prev
        : [...prev, id]
    );
  };

  const resolveInputForRestructure = (): { label: string; code: string } => {
    if (sourceKind === 'queued' && aimState.queuedSourceCode.trim()) {
      return {
        label: aimState.queuedSourceName || 'Queued Designer Output',
        code: aimState.queuedSourceCode,
      };
    }
    if (sourceKind === 'hyperface') {
      const hf = hyperfaceStudioStore.getState();
      return {
        label: `HyperFace Stage: ${hf.stageTitle}`,
        code: hf.html.slice(0, 9000),
      };
    }
    if (sourceKind === 'vfs') {
      const f = vfsFiles.find((file) => file.name === selectedVfsFileName) ?? vfsFiles[0];
      return {
        label: f ? `VFS: ${f.name}` : 'VFS Module',
        code: f?.content || customSourceCode,
      };
    }
    if (sourceKind === 'current') {
      return {
        label: `${aimState.gameTitle} (v${aimState.version})`,
        code: aimState.html.slice(0, 9000),
      };
    }
    return {
      label: aimState.queuedSourceName || 'Custom Synthetic Module',
      code: customSourceCode,
    };
  };

  const handleRestructure = async () => {
    const input = resolveInputForRestructure();
    const rec = await aimSpaceStore.restructureIntoFullGame({
      sourceLabel: input.label,
      sourceCode: input.code,
      directive,
      selectedDesigners,
      publishToLibrary,
    });
    if (rec) {
      setActiveTab('play');
      setReloadNonce((n) => n + 1);
      onShowToast?.(
        `Restructured "${rec.gameTitle}" via Synthetic Designers & ${aimDaemons.length} Assist Daemons.`
      );
    }
  };

  const handleRun50Daemons = async () => {
    if (runningBatch) return;
    setRunningBatch(true);
    await swarmEngine.runAimSpaceAssistDaemons();
    await masterBrainEngine.runMasterSort('Synchronize 50 AIM Space Assist Daemons with OS systems.');
    setRunningBatch(false);
    onShowToast?.(`All ${aimDaemons.length} AIM Space Assist Daemons verified & synced.`);
  };

  const linkedStats = {
    smartItems: smartBrainItemStore.getState().items.length,
    vaultEntries: jsonKnowledgeStore.getEntries().length,
    sprites: jsonKnowledgeStore.getSprites().length,
    printedApps: printedAppsStore.getApps().length,
    unifierRecords: unificatorEngine.getState().records.length,
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-hidden bg-slate-950/60">
      {/* Top Bar */}
      <div className="rounded-xl bg-slate-900/90 border border-white/10 px-3 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={aimState.gamePictureUrl}
            alt={`${aimState.gameTitle} cover`}
            referrerPolicy="no-referrer"
            className="w-10 h-8 rounded-md object-cover border border-amber-400/45 shrink-0"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-100 truncate">
              AIM Space — {aimState.gameTitle}
            </h2>
            <p className="text-[11px] text-slate-400 truncate tabular-nums">
              v{aimState.version} · {aimState.genre} · {aimDaemons.length} Assist Daemons Mounted · Linked to All Apps
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-950/80 border border-white/10">
            {(
              [
                ['play', 'Play Game'],
                ['restructure', 'Synthetic Designers'],
                ['daemons', `50 Daemons (${aimDaemons.length})`],
                ['links', 'Linked Systems'],
              ] as const
            ).map(([tabId, label]) => (
              <button
                key={tabId}
                type="button"
                onClick={() => setActiveTab(tabId)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors ${
                  activeTab === tabId
                    ? 'bg-amber-500/20 text-amber-100 border border-amber-400/45'
                    : 'text-slate-300 hover:text-white border border-transparent'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleCaptureDesktopFrame}
            title="Snapshot current live gameplay frame onto your Desktop Screen Picture"
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/15 text-slate-100 font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Capture Screen Picture</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'play' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
          {/* Playable Game Viewport */}
          <div className="lg:col-span-9 min-h-[300px] flex flex-col rounded-xl overflow-hidden border border-white/12 bg-black">
            <div className="px-3 py-1.5 bg-slate-900/95 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-300 min-w-0 truncate">
                <Gamepad2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="truncate font-medium text-slate-100">{aimState.gameTitle}</span>
                <span className="text-slate-500">·</span>
                <span className="text-slate-400 truncate">WASD / Arrows / Mouse / Space Fire / Shift Boost</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setReloadNonce((n) => n + 1)}
                  className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/12 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Reload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('restructure')}
                  className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-[11px] text-amber-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                >
                  <Wand2 className="w-3 h-3" />
                  <span>Restructure Game</span>
                </button>
              </div>
            </div>
            <iframe
              key={reloadNonce}
              ref={iframeRef}
              title={aimState.gameTitle}
              srcDoc={srcDoc}
              sandbox="allow-scripts allow-forms allow-modals"
              className="flex-1 w-full h-full border-0 bg-[#040814]"
            />
          </div>

          {/* Right Strip: Desktop Screen Picture & Quick Actions */}
          <div className="lg:col-span-3 flex flex-col gap-2.5 overflow-y-auto pr-0.5">
            <div className="rounded-xl bg-slate-900/85 border border-white/10 p-3 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100">Desktop Screen Picture</span>
                <span className="text-[10.5px] text-slate-400">
                  {aimState.isCustomCapturedPicture ? 'Live Capture' : 'Game Art'}
                </span>
              </div>
              <div className="aspect-[4/3] w-full rounded-lg overflow-hidden border border-white/15 bg-slate-950">
                <img
                  src={aimState.gamePictureUrl}
                  alt="AIM Space on Desktop Screen"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCaptureDesktopFrame}
                  className="flex-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Use Live Frame</span>
                </button>
                {aimState.isCustomCapturedPicture && (
                  <button
                    type="button"
                    onClick={() => aimSpaceStore.resetGamePicture()}
                    title="Restore Astra-7 key art picture"
                    className="px-2 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/12 border border-white/10 text-slate-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/85 border border-white/10 p-3 space-y-2 shrink-0">
              <div className="font-semibold text-slate-100">Connected OS Telemetry</div>
              <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                <button
                  type="button"
                  onClick={() => onOpenApp('swarm')}
                  className="rounded-lg bg-slate-950/75 hover:bg-slate-800/80 border border-white/10 p-2 text-left cursor-pointer"
                >
                  <div className="text-slate-400">Assist Daemons</div>
                  <div className="text-sm font-semibold text-amber-300">{aimDaemons.length} Mounted</div>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenApp('smartbrain')}
                  className="rounded-lg bg-slate-950/75 hover:bg-slate-800/80 border border-white/10 p-2 text-left cursor-pointer"
                >
                  <div className="text-slate-400">Smart Items</div>
                  <div className="text-sm font-semibold text-emerald-300">{linkedStats.smartItems}</div>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenApp('jsonvault')}
                  className="rounded-lg bg-slate-950/75 hover:bg-slate-800/80 border border-white/10 p-2 text-left cursor-pointer"
                >
                  <div className="text-slate-400">Vault Specs</div>
                  <div className="text-sm font-semibold text-sky-300">{linkedStats.vaultEntries}</div>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenApp('htmlprinter')}
                  className="rounded-lg bg-slate-950/75 hover:bg-slate-800/80 border border-white/10 p-2 text-left cursor-pointer"
                >
                  <div className="text-slate-400">App Library</div>
                  <div className="text-sm font-semibold text-indigo-300">{linkedStats.printedApps}</div>
                </button>
              </div>
              <button
                type="button"
                disabled={runningBatch}
                onClick={() => void handleRun50Daemons()}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/12 border border-white/15 text-slate-100 font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Cpu className={`w-3.5 h-3.5 text-amber-300 ${runningBatch ? 'animate-spin' : ''}`} />
                <span>{runningBatch ? 'Running 50 Daemons...' : 'Sync 50 Assist Daemons'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'restructure' && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 overflow-y-auto lg:overflow-hidden">
          {/* Left: Source Selection & Synthetic Designers */}
          <div className="lg:col-span-6 flex flex-col gap-2.5 lg:overflow-y-auto pr-0.5">
            <div className="rounded-xl bg-slate-900/85 border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100">
                  1. Select App or Code to Restructure into Full Game
                </span>
                <span className="text-[11px] text-slate-400">Synthetic Pipeline</span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ['queued', 'Queued Designer Input'],
                    ['hyperface', 'HyperFace 3D Stage'],
                    ['current', 'Current AIM Space'],
                    ['vfs', `VFS File (${vfsFiles.length})`],
                    ['custom', 'Custom Code'],
                  ] as const
                ).map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSourceKind(k)}
                    className={`px-2.5 py-1 rounded-md border text-[11px] cursor-pointer ${
                      sourceKind === k
                        ? 'bg-amber-500/20 border-amber-400/45 text-amber-100 font-medium'
                        : 'bg-slate-950/70 hover:bg-white/[0.06] border-white/10 text-slate-300'
                    }`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>

              {sourceKind === 'vfs' && (
                <select
                  value={selectedVfsFileName}
                  onChange={(e) => setSelectedVfsFileName(e.target.value)}
                  className="w-full rounded-lg bg-slate-950 border border-white/15 px-2.5 py-1.5 text-slate-100 outline-none"
                >
                  {vfsFiles.map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name} ({f.kind} · {f.size} B)
                    </option>
                  ))}
                </select>
              )}

              {sourceKind === 'queued' && (
                <div className="rounded-lg bg-slate-950/80 border border-white/10 p-2.5 text-[11px] text-slate-300">
                  Queued Target: <strong className="text-amber-200">{aimState.queuedSourceName}</strong>
                  <span className="text-slate-500"> · </span>
                  <span>
                    {aimState.queuedSourceCode
                      ? `${aimState.queuedSourceCode.length} chars ready`
                      : 'Send code from Code Unifier, HyperFace, or AI Architect, or synthesize from directive below'}
                  </span>
                </div>
              )}

              {sourceKind === 'custom' && (
                <textarea
                  rows={5}
                  value={customSourceCode}
                  onChange={(e) => setCustomSourceCode(e.target.value)}
                  spellCheck={false}
                  className="w-full rounded-lg bg-slate-950 border border-white/15 p-2.5 font-mono text-[11px] text-slate-100 outline-none focus:border-amber-400/50 resize-none"
                />
              )}
            </div>

            <div className="rounded-xl bg-slate-900/85 border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-slate-100">
                  2. Active Synthetic Designers ({selectedDesigners.length}/{SYNTHETIC_DESIGNERS.length})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedDesigners(SYNTHETIC_DESIGNERS.map((d) => d.id))}
                  className="text-[11px] text-amber-300 hover:text-amber-200 cursor-pointer"
                >
                  Select All
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {SYNTHETIC_DESIGNERS.map((des) => {
                  const active = selectedDesigners.includes(des.id);
                  return (
                    <button
                      key={des.id}
                      type="button"
                      onClick={() => toggleDesigner(des.id)}
                      className={`p-2 rounded-lg border text-left cursor-pointer transition-colors ${
                        active
                          ? 'bg-amber-500/15 border-amber-400/45 text-slate-100'
                          : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-medium text-[11px] flex items-center justify-between gap-1">
                        <span className="truncate">{des.name}</span>
                        {active && <Check className="w-3 h-3 text-amber-300 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{des.role}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl bg-slate-900/85 border border-white/10 p-3 space-y-2.5">
              <span className="font-semibold text-slate-100 block">
                3. Restructuring Directive
              </span>
              <textarea
                rows={3}
                value={directive}
                onChange={(e) => setDirective(e.target.value)}
                placeholder="Describe how Synthetic Designers & the 50 daemons should restructure this into a full playable game..."
                className="w-full rounded-lg bg-slate-950 border border-white/15 p-2.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/50 resize-none"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={publishToLibrary}
                    onChange={(e) => setPublishToLibrary(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>Auto-publish to App Library, VFS, Smart Brain &amp; 50 Daemons</span>
                </label>
                <button
                  type="button"
                  disabled={aimState.restructuring}
                  onClick={() => void handleRestructure()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${aimState.restructuring ? 'animate-spin' : ''}`} />
                  <span>
                    {aimState.restructuring
                      ? 'Restructuring Full Game...'
                      : 'Restructure into Full Game'}
                  </span>
                </button>
              </div>
              {aimState.lastError && (
                <div className="rounded-lg bg-rose-500/15 border border-rose-400/40 px-3 py-2 text-rose-100 text-[11px]">
                  {aimState.lastError}
                </div>
              )}
            </div>
          </div>

          {/* Right: Restructuring History & Cross-System Output */}
          <div className="lg:col-span-6 rounded-xl bg-slate-900/85 border border-white/10 p-3 flex flex-col gap-2.5 min-h-[260px] lg:overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-2 shrink-0">
              <span className="font-semibold text-slate-100">
                Restructured Full Game Builds ({aimState.history.length})
              </span>
              <span className="text-[11px] text-slate-400 tabular-nums">
                Active: v{aimState.version}
              </span>
            </div>

            {aimState.history.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400 gap-2">
                <Layers className="w-7 h-7 text-amber-400/70" />
                <div className="font-medium text-slate-200">
                  AIM Space: Astra-7 Orbital is Live &amp; Ready
                </div>
                <p className="text-[11px] max-w-sm leading-relaxed">
                  Select any Synthetic Designer, VFS file, HyperFace 3D object, or custom code on the left to restructure it into a complete full-screen AIM Space game synced across all OS systems.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {aimState.history.map((rec) => (
                  <div
                    key={rec.id}
                    className="rounded-lg bg-slate-950/75 border border-white/10 p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-slate-100">{rec.gameTitle}</div>
                        <div className="text-[11px] text-slate-400">
                          {rec.genre} · From {rec.sourceLabel}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('play');
                          setReloadNonce((n) => n + 1);
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Play className="w-3 h-3" />
                        <span>Play</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {rec.restructuringSummary}
                    </p>
                    <div className="text-[10.5px] text-slate-400">
                      Designers: {rec.syntheticDesignersApplied.join(' · ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'daemons' && (
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          <div className="rounded-xl bg-slate-900/85 border border-white/10 px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex flex-wrap items-center gap-1">
              {DAEMON_SQUADS.map((sq) => (
                <button
                  key={sq.id}
                  type="button"
                  onClick={() => setSquadFilter(sq.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] cursor-pointer ${
                    squadFilter === sq.id
                      ? 'bg-amber-500/20 border border-amber-400/45 text-amber-100 font-medium'
                      : 'bg-slate-950/60 hover:bg-white/[0.06] border border-white/10 text-slate-300'
                  }`}
                >
                  {sq.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={runningBatch}
              onClick={() => void handleRun50Daemons()}
              className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Cpu className={`w-3.5 h-3.5 ${runningBatch ? 'animate-spin' : ''}`} />
              <span>{runningBatch ? 'Scanning...' : `Run All ${aimDaemons.length} Assist Daemons`}</span>
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-0.5">
            {visibleDaemons.map((d) => (
              <div
                key={d.role}
                className="rounded-lg bg-slate-900/85 border border-white/10 p-2.5 flex flex-col justify-between gap-2"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-slate-100 leading-snug">{d.name}</div>
                    <span className="text-[10px] font-mono text-emerald-300 shrink-0 tabular-nums">
                      {d.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1 leading-snug">{d.description}</p>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/10">
                  <span className="text-[10.5px] text-slate-300 truncate">{d.lastSummary}</span>
                  <button
                    type="button"
                    onClick={() => void swarmEngine.runDaemon(d.role)}
                    className="px-2 py-0.5 rounded bg-white/[0.07] hover:bg-white/15 border border-white/15 text-[10.5px] text-slate-100 cursor-pointer shrink-0"
                  >
                    Assist
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'links' && (
        <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pr-0.5">
          {EVERYTHING_LINK_IDS.map((appId) => {
            const def = OS_APPS.find((a) => a.id === appId);
            if (!def) return null;
            return (
              <button
                key={def.id}
                type="button"
                onClick={() => onOpenApp(def.id)}
                className="rounded-xl bg-slate-900/85 hover:bg-slate-800/90 border border-white/10 hover:border-amber-400/40 p-3 text-left flex flex-col justify-between gap-2 cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${def.accentGradient} flex items-center justify-center shrink-0`}
                  >
                    <AppIcon name={def.iconName} className="w-4 h-4 text-white" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 truncate">{def.shortName}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">{def.category}</div>
                </div>
                <div className="text-[10.5px] text-amber-300 flex items-center gap-1">
                  <Network className="w-3 h-3" />
                  <span>Linked via Neural Bus &amp; VFS</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
