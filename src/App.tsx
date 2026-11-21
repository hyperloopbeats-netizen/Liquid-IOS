import { useCallback, useEffect, useRef, useState } from 'react';
import { Atom, BrainCircuit, FolderPlus, Layers, Zap } from 'lucide-react';
import { OS_APPS } from './kernel/appRegistry';
import { aimSpaceStore } from './kernel/aimSpaceStore';
import { awarenessMatrixEngine } from './kernel/awarenessMatrixEngine';
import { codeClusterStore } from './kernel/codeClusterStore';
import { desktopFolderEngine } from './kernel/desktopFolderEngine';
import { kernelHealer } from './kernel/healerEngine';
import { hybridSynthEngine } from './kernel/hybridSynthEngine';
import { liquidAudioEngine } from './kernel/liquidAudioEngine';
import { microFractalKernel } from './kernel/microFractalKernel';
import { neuralBus } from './kernel/neuralBus';
import { printedAppsStore } from './kernel/printedAppsStore';
import { sentientCoreEngine } from './kernel/sentientCoreEngine';
import { smartSortEngine } from './kernel/smartSortEngine';
import { swarmEngine } from './kernel/swarmEngine';
import { synesthesiaEngine } from './kernel/synesthesiaEngine';
import { trilateralMatrix } from './kernel/trilateralMatrix';
import { vfs } from './kernel/vfs';
import { parseVoiceIntent, voiceNavigator } from './kernel/voiceNavigator';
import { clampWindowRect, getWorkspaceBounds, reclampWindowState } from './kernel/workspaceBounds';
import type {
  AppId,
  CircadianMode,
  OrganicFolder,
  OSAppDefinition,
  PrintedAppDefinition,
  SynesthesiaState,
  VoiceIntentResult,
  WindowState,
} from './types/os';
import { AppIcon } from './components/AppIcon';
import { CommandOverlay } from './components/CommandOverlay';
import { Dock } from './components/Dock';
import {
  OrganicFolderDrawer,
  OrganicFolderTile,
  resolveUnifiedApp,
  type ResolvedAppItem,
} from './components/OrganicFolderPod';
import { PrintedAppRuntime } from './components/PrintedAppRuntime';
import { SmartAppSortTab } from './components/SmartAppSortTab';
import { SynesthesiaBackdrop } from './components/SynesthesiaBackdrop';
import { TopBar } from './components/TopBar';
import { WindowFrame } from './components/WindowFrame';
import { AetherDriveApp } from './apps/AetherDriveApp';
import { AgentSwarmApp } from './apps/AgentSwarmApp';
import { AIMSpaceApp } from './apps/AIMSpaceApp';
import { CodeAuditorApp } from './apps/CodeAuditorApp';
import { CodeUnificatorApp } from './apps/CodeUnificatorApp';
import { Doom3DApp } from './apps/Doom3DApp';
import { EngineBlocksApp } from './apps/EngineBlocksApp';
import { FractalCinemaApp } from './apps/FractalCinemaApp';
import { GameForgeApp } from './apps/GameForgeApp';
import { GameSandboxApp } from './apps/GameSandboxApp';
import { HtmlAppPrinterApp } from './apps/HtmlAppPrinterApp';
import { HyperFaceStudioApp } from './apps/HyperFaceStudioApp';
import { JsonResearchVaultApp } from './apps/JsonResearchVaultApp';
import { KineticEngineApp } from './apps/KineticEngineApp';
import { LiquidEqApp } from './apps/LiquidEqApp';
import { LiquidPlayerApp } from './apps/LiquidPlayerApp';
import { LiquidVideoApp } from './apps/LiquidVideoApp';
import { LivePlaygroundApp } from './apps/LivePlaygroundApp';
import { MasterBrainApp } from './apps/MasterBrainApp';
import { MeshUnificatorApp } from './apps/MeshUnificatorApp';
import { MicroFractalApp } from './apps/MicroFractalApp';
import { ModelForgeApp } from './apps/ModelForgeApp';
import { MusicStudioApp } from './apps/MusicStudioApp';
import { NeuralBusApp } from './apps/NeuralBusApp';
import { OrganicMp4PlayerApp } from './apps/OrganicMp4PlayerApp';
import { PromptArchitectApp } from './apps/PromptArchitectApp';
import { SandboxRunnerApp } from './apps/SandboxRunnerApp';
import { SelfHealerApp } from './apps/SelfHealerApp';
import { SentientNexusApp } from './apps/SentientNexusApp';
import { SmartBrainForgeApp } from './apps/SmartBrainForgeApp';
import { SmartCompanionApp } from './apps/SmartCompanionApp';
import { SnapshotManagerApp } from './apps/SnapshotManagerApp';
import { SpritePhysicsLabApp } from './apps/SpritePhysicsLabApp';
import { SuiteMatrixHostApp } from './apps/SuiteMatrixHostApp';
import { SynesthesiaApp } from './apps/SynesthesiaApp';
import { SyntheticHybridApp } from './apps/SyntheticHybridApp';
import { TerminalApp } from './apps/TerminalApp';
import { ThinkingMatrixApp } from './apps/ThinkingMatrixApp';
import { UniversalStreamApp } from './apps/UniversalStreamApp';
import { VideoEditorApp } from './apps/VideoEditorApp';
import { VisualSynthApp } from './apps/VisualSynthApp';
import { VoxelEngineApp } from './apps/VoxelEngineApp';

function Tiny3DAppTile({
  app,
  isOpen,
  isFocused,
  rms,
  onOpen,
}: {
  app: ResolvedAppItem;
  isOpen: boolean;
  isFocused: boolean;
  rms: number;
  onOpen: (id: AppId) => void;
}) {
  const [tilt, setTilt] = useState<{ rx: number; ry: number; hover: boolean }>({
    rx: 0,
    ry: 0,
    hover: false,
  });

  const handleMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
    const ny = (e.clientY - rect.top) / Math.max(1, rect.height) - 0.5;
    setTilt({ rx: -ny * 22, ry: nx * 22, hover: true });
  };

  const scaleBoost = tilt.hover ? 1.12 : 1 + rms * 0.06;

  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/aether-app', app.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onClick={() => onOpen(app.id)}
      onPointerMove={handleMove}
      onPointerLeave={() => setTilt({ rx: 0, ry: 0, hover: false })}
      title={`${app.name} · ${app.category} (Drag into an Organic Folder)`}
      style={{
        transform: `perspective(380px) rotateX(${tilt.rx.toFixed(1)}deg) rotateY(${tilt.ry.toFixed(1)}deg) scale(${scaleBoost.toFixed(3)})`,
        transformStyle: 'preserve-3d',
      }}
      className="pointer-events-auto w-[58px] p-1 rounded-lg hover:bg-white/[0.08] transition-[transform,background-color] duration-150 ease-out flex flex-col items-center gap-1 text-center cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <div
        style={{ transform: 'translateZ(10px)' }}
        className={`relative w-8 h-8 rounded-lg bg-gradient-to-br ${app.accentGradient} flex items-center justify-center border transition-all shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_7px_14px_-4px_rgba(0,0,0,0.85)] ${
          isFocused
            ? 'border-cyan-200 ring-2 ring-cyan-300/80 shadow-[0_0_18px_rgba(34,211,238,0.75)]'
            : isOpen
            ? 'border-white/55'
            : 'border-white/20'
        }`}
      >
        <AppIcon name={app.iconName} className="w-4 h-4 text-white drop-shadow" />
        {isOpen && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
              isFocused ? 'bg-cyan-300' : 'bg-emerald-400'
            } shadow`}
          />
        )}
      </div>
      <span className="text-[9.5px] font-medium text-slate-200 leading-tight drop-shadow truncate max-w-full">
        {app.shortName}
      </span>
    </button>
  );
}

const CIRCADIAN_ORDER: CircadianMode[] = ['auto', 'dawn', 'noon', 'dusk', 'midnight'];

export default function App() {
  const [windows, setWindows] = useState<Record<string, WindowState>>({});
  const [activeAppId, setActiveAppId] = useState<AppId | null>(null);
  const zCounterRef = useRef(100);

  const [synesthesia, setSynesthesia] = useState<SynesthesiaState>(synesthesiaEngine.getState());
  const [kernelHealth, setKernelHealth] = useState(kernelHealer.getState().health);
  const [fractalFps, setFractalFps] = useState(microFractalKernel.getState().measuredFps);
  const [vfsFileCount, setVfsFileCount] = useState(0);

  const [printedApps, setPrintedApps] = useState<PrintedAppDefinition[]>(printedAppsStore.getApps());
  const [folders, setFolders] = useState<OrganicFolder[]>(desktopFolderEngine.getFolders());
  const [panelAppIds, setPanelAppIds] = useState<AppId[]>(desktopFolderEngine.getPanelAppIds());
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [aimSpaceState, setAimSpaceState] = useState(() => aimSpaceStore.getState());
  const [clusterCount, setClusterCount] = useState(() => codeClusterStore.getState().clusters.length);
  const [hybridBuildCount, setHybridBuildCount] = useState(
    () => hybridSynthEngine.getState().builds.length
  );
  const [sentientMintCount, setSentientMintCount] = useState(
    () => sentientCoreEngine.getState().drafts.filter((d) => Boolean(d.mintedAppId)).length
  );
  const [daemonCount, setDaemonCount] = useState(() => swarmEngine.getDaemons().length);

  const [driveTargetFile, setDriveTargetFile] = useState<string | null>(null);
  const [sandboxTargetFile, setSandboxTargetFile] = useState<string | null>('index.html');

  const [commandOpen, setCommandOpen] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [lastIntent, setLastIntent] = useState<VoiceIntentResult | null>(null);
  const [spokenFeedback, setSpokenFeedback] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    window.setTimeout(() => {
      setToastMsg((curr) => (curr === msg ? null : curr));
    }, 3600);
  }, []);

  useEffect(() => {
    void vfs.init().then(() => awarenessMatrixEngine.syncSuiteAppsToVfs());
    const unsubVfs = vfs.subscribe((files) => setVfsFileCount(files.length));
    const unsubSyn = synesthesiaEngine.subscribe(setSynesthesia);
    const unsubHeal = kernelHealer.subscribe((snap) => setKernelHealth(snap.health));
    const unsubMfk = microFractalKernel.subscribe((mfk) => setFractalFps(mfk.measuredFps));
    const unsubPrinted = printedAppsStore.subscribe(setPrintedApps);
    const unsubAimSpace = aimSpaceStore.subscribe(setAimSpaceState);
    const unsubClusters = codeClusterStore.subscribe((st) => setClusterCount(st.clusters.length));
    const unsubHybrid = hybridSynthEngine.subscribe((st) => setHybridBuildCount(st.builds.length));
    const unsubSentient = sentientCoreEngine.subscribe((st) =>
      setSentientMintCount(st.drafts.filter((d) => Boolean(d.mintedAppId)).length)
    );
    const unsubDaemons = swarmEngine.subscribe((d) => setDaemonCount(d.length));
    const unsubFolders = desktopFolderEngine.subscribe((st) => {
      setFolders(st.folders);
      setPanelAppIds(st.panelAppIds);
    });

    return () => {
      unsubVfs();
      unsubSyn();
      unsubHeal();
      unsubMfk();
      unsubPrinted();
      unsubAimSpace();
      unsubClusters();
      unsubHybrid();
      unsubSentient();
      unsubDaemons();
      unsubFolders();
    };
  }, []);

  useEffect(() => {
    const updateLoad = () => {
      const openCount = Object.values(windows).filter((w) => !w.minimized).length;
      const scanningCount = swarmEngine.getDaemons().filter((d) => d.status === 'scanning').length;
      const load = Math.min(1, 0.12 + openCount * 0.11 + scanningCount * 0.18);
      synesthesiaEngine.setSystemLoad(load);
    };
    updateLoad();
    const unsubSwarm = swarmEngine.subscribe(updateLoad);
    return unsubSwarm;
  }, [windows]);

  const openApp = useCallback((id: AppId) => {
    const builtIn = OS_APPS.find((a) => a.id === id);
    const printed = !builtIn ? printedAppsStore.getById(id) : undefined;
    if (!builtIn && !printed) return;

    const defaultW = builtIn?.defaultWidth ?? 540;
    const defaultH = builtIn?.defaultHeight ?? 400;

    setWindows((prev) => {
      const bounds = getWorkspaceBounds();
      const nextZ = ++zCounterRef.current;
      const existing = prev[id];
      if (existing) {
        return {
          ...prev,
          [id]: {
            ...reclampWindowState(existing, bounds),
            minimized: false,
            zIndex: nextZ,
          },
        };
      }

      const isCompact = bounds.vw < 640;
      const openCount = Object.keys(prev).length;
      const width = Math.min(bounds.usableWidth, defaultW);
      const height = Math.min(bounds.usableHeight, defaultH);
      const offset = isCompact ? 0 : (openCount % 5) * 28;
      const clamped = clampWindowRect(
        {
          x: bounds.left + Math.round((bounds.usableWidth - width) / 2) + offset,
          y: bounds.top + Math.round((bounds.usableHeight - height) / 2) + offset,
          width,
          height,
        },
        bounds
      );

      return {
        ...prev,
        [id]: {
          id,
          ...clamped,
          zIndex: nextZ,
          minimized: false,
          maximized: false,
          snapMode: null,
        },
      };
    });
    setActiveAppId(id);
    smartSortEngine.recordAppUse(id);
  }, []);

  const focusWindow = useCallback((id: AppId) => {
    setWindows((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      return {
        ...prev,
        [id]: { ...existing, zIndex: ++zCounterRef.current },
      };
    });
    setActiveAppId(id);
  }, []);

  const closeWindow = useCallback((id: AppId) => {
    setWindows((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setActiveAppId((curr) => (curr === id ? null : curr));
  }, []);

  const minimizeWindow = useCallback((id: AppId) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      return { ...prev, [id]: { ...w, minimized: true } };
    });
  }, []);

  const toggleMaximize = useCallback((id: AppId) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const bounds = getWorkspaceBounds();
      if (!w.maximized) {
        return {
          ...prev,
          [id]: {
            ...w,
            prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
            x: bounds.left,
            y: bounds.top,
            width: bounds.usableWidth,
            height: bounds.usableHeight,
            maximized: true,
            snapMode: 'full',
          },
        };
      }
      const restore = clampWindowRect(
        w.prevBounds ?? { x: bounds.left + 32, y: bounds.top + 12, width: 640, height: 430 },
        bounds
      );
      return {
        ...prev,
        [id]: {
          ...w,
          ...restore,
          maximized: false,
          miniMode: false,
          snapMode: null,
        },
      };
    });
  }, []);

  const toggleMiniWindow = useCallback((id: AppId) => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const bounds = getWorkspaceBounds();
      if (!w.miniMode) {
        const miniW = bounds.vw < 640 ? Math.min(290, bounds.usableWidth) : Math.min(360, bounds.usableWidth);
        const miniH = Math.min(bounds.vw < 640 ? 220 : 250, bounds.usableHeight);
        const clamped = clampWindowRect({ x: w.x, y: w.y, width: miniW, height: miniH }, bounds);
        return {
          ...prev,
          [id]: {
            ...w,
            preMiniBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
            ...clamped,
            maximized: false,
            miniMode: true,
            snapMode: null,
            zIndex: ++zCounterRef.current,
          },
        };
      }
      const restore = clampWindowRect(
        w.preMiniBounds ?? { x: bounds.left + 40, y: bounds.top + 16, width: 620, height: 420 },
        bounds
      );
      return {
        ...prev,
        [id]: {
          ...w,
          ...restore,
          miniMode: false,
          zIndex: ++zCounterRef.current,
        },
      };
    });
    setActiveAppId(id);
  }, []);

  const snapWindow = useCallback((id: AppId, side: 'left' | 'right') => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const bounds = getWorkspaceBounds();
      const halfW = Math.floor((bounds.usableWidth - 10) / 2);
      return {
        ...prev,
        [id]: {
          ...w,
          x: side === 'left' ? bounds.left : bounds.left + halfW + 10,
          y: bounds.top,
          width: halfW,
          height: bounds.usableHeight,
          maximized: false,
          snapMode: side,
          zIndex: ++zCounterRef.current,
        },
      };
    });
    setActiveAppId(id);
  }, []);

  const tileAllWindows = useCallback(() => {
    setWindows((prev) => {
      const visibleIds = Object.keys(prev).filter((k) => !prev[k].minimized);
      if (visibleIds.length === 0) return prev;
      const bounds = getWorkspaceBounds();
      const cols = visibleIds.length === 1 ? 1 : visibleIds.length <= 4 ? 2 : 3;
      const rows = Math.ceil(visibleIds.length / cols);
      const cellW = Math.floor((bounds.usableWidth - (cols - 1) * 10) / cols);
      const cellH = Math.floor((bounds.usableHeight - (rows - 1) * 10) / rows);

      const next = { ...prev };
      visibleIds.forEach((id, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        next[id] = {
          ...next[id],
          x: bounds.left + col * (cellW + 10),
          y: bounds.top + row * (cellH + 10),
          width: Math.max(240, cellW),
          height: Math.max(180, cellH),
          maximized: false,
          snapMode: null,
        };
      });
      return next;
    });
  }, []);

  const cascadeAllWindows = useCallback(() => {
    setWindows((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      const bounds = getWorkspaceBounds();
      const next = { ...prev };
      ids.forEach((id, idx) => {
        const def = OS_APPS.find((a) => a.id === id);
        const w = Math.min(bounds.usableWidth - 20, def?.defaultWidth ?? 800);
        const h = Math.min(bounds.usableHeight - 20, def?.defaultHeight ?? 540);
        const clamped = clampWindowRect(
          {
            x: bounds.left + 16 + idx * 28,
            y: bounds.top + idx * 24,
            width: w,
            height: h,
          },
          bounds
        );
        next[id] = {
          ...next[id],
          minimized: false,
          maximized: false,
          ...clamped,
          zIndex: ++zCounterRef.current,
        };
      });
      return next;
    });
  }, []);

  const minimizeAllWindows = useCallback(() => {
    setWindows((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        next[k] = { ...next[k], minimized: true };
      }
      return next;
    });
  }, []);

  const activateTriad = useCallback(
    (preset: 'research' | 'flow' | 'resilience') => {
      const { apps, label, circadian } = trilateralMatrix.getPresetApps(preset);
      if (circadian) synesthesiaEngine.setCircadianMode(circadian);

      const bounds = getWorkspaceBounds();
      const leftW = Math.floor(bounds.usableWidth * 0.52);
      const rightW = bounds.usableWidth - leftW - 10;
      const rightH = Math.floor((bounds.usableHeight - 10) / 2);

      setWindows((prev) => {
        const next: Record<string, WindowState> = {};
        for (const k of Object.keys(prev)) {
          next[k] = { ...prev[k], minimized: true };
        }
        apps.forEach((id, idx) => {
          const z = ++zCounterRef.current;
          if (idx === 0) {
            next[id] = {
              id,
              x: bounds.left,
              y: bounds.top,
              width: leftW,
              height: bounds.usableHeight,
              zIndex: z,
              minimized: false,
              maximized: false,
            };
          } else if (idx === 1) {
            next[id] = {
              id,
              x: bounds.left + leftW + 10,
              y: bounds.top,
              width: rightW,
              height: rightH,
              zIndex: z,
              minimized: false,
              maximized: false,
            };
          } else {
            next[id] = {
              id,
              x: bounds.left + leftW + 10,
              y: bounds.top + rightH + 10,
              width: rightW,
              height: rightH,
              zIndex: z,
              minimized: false,
              maximized: false,
            };
          }
        });
        return next;
      });
      setActiveAppId(apps[0]);
      showToast(`Activated ${label} across Cognitive · Spatial · Persistence matrix.`);
    },
    [showToast]
  );

  const handleDockSelect = useCallback(
    (id: AppId) => {
      const win = windows[id];
      if (!win) {
        openApp(id);
      } else if (win.minimized) {
        openApp(id);
      } else if (activeAppId === id) {
        minimizeWindow(id);
      } else {
        focusWindow(id);
      }
    },
    [windows, activeAppId, openApp, minimizeWindow, focusWindow]
  );

  const handleMoveResize = useCallback(
    (id: AppId, rect: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => {
      setWindows((prev) => {
        const w = prev[id];
        if (!w) return prev;
        return { ...prev, [id]: { ...w, ...rect, maximized: false } };
      });
    },
    []
  );

  const handleOpenFileInDrive = useCallback(
    (fileName: string) => {
      setDriveTargetFile(fileName);
      openApp('drive');
    },
    [openApp]
  );

  const handleRunInSandbox = useCallback(
    (fileName: string) => {
      setSandboxTargetFile(fileName);
      openApp('sandbox');
    },
    [openApp]
  );

  const executeNaturalCommand = useCallback(
    async (text: string) => {
      const intent = parseVoiceIntent(text);
      setLastIntent(intent);
      neuralBus.publish('VOICE', `INTENT_${intent.action}`, `"${intent.rawText}" → ${intent.message}`);
      showToast(intent.message);
      voiceNavigator.speak(intent.message);

      switch (intent.action) {
        case 'OPEN_APP':
          if (intent.target) openApp(intent.target as AppId);
          setCommandOpen(false);
          break;
        case 'ACTIVATE_TRIAD':
          if (intent.target === 'research' || intent.target === 'flow' || intent.target === 'resilience') {
            activateTriad(intent.target);
          }
          setCommandOpen(false);
          break;
        case 'RUN_TRILATERAL_PIPELINE':
          openApp('blocks');
          await trilateralMatrix.runTrilateralPipeline();
          setCommandOpen(false);
          break;
        case 'REFRACT_120FPS':
          openApp('microfractal');
          microFractalKernel.rebalance120fps();
          setCommandOpen(false);
          break;
        case 'TOGGLE_LIQUID_PLAY':
          openApp('liquidmp3');
          if (intent.target === 'pause') liquidAudioEngine.pause();
          else void liquidAudioEngine.play();
          setCommandOpen(false);
          break;
        case 'TRIGGER_HEAL':
          openApp('healer');
          await kernelHealer.runHealthCheck(true);
          setCommandOpen(false);
          break;
        case 'SWARM_SCAN':
          openApp('swarm');
          if (intent.target === 'security-guard') {
            await swarmEngine.runDaemon('security-guard');
          } else {
            await swarmEngine.runAllEnabled();
          }
          setCommandOpen(false);
          break;
        case 'TOGGLE_MIC':
          try {
            if (intent.target === 'off') synesthesiaEngine.stopMicrophone();
            else if (!synesthesiaEngine.getState().micActive) await synesthesiaEngine.toggleMicrophone();
          } catch (err) {
            showToast(err instanceof Error ? err.message : 'Microphone access unavailable.');
          }
          setCommandOpen(false);
          break;
        case 'TILE_WINDOWS':
          tileAllWindows();
          setCommandOpen(false);
          break;
        case 'CASCADE_WINDOWS':
          cascadeAllWindows();
          setCommandOpen(false);
          break;
        case 'MINIMIZE_ALL':
          minimizeAllWindows();
          setCommandOpen(false);
          break;
        case 'CREATE_SNAPSHOT':
          await vfs.createSnapshot('Voice Checkpoint', `Created via voice command "${intent.rawText}"`);
          openApp('snapshots');
          setCommandOpen(false);
          break;
        case 'RUN_FILE':
          if (intent.target) {
            handleRunInSandbox(intent.target);
          }
          setCommandOpen(false);
          break;
        case 'SET_THEME':
          if (intent.target) {
            synesthesiaEngine.setCircadianMode(intent.target as CircadianMode);
          }
          setCommandOpen(false);
          break;
        default:
          break;
      }
    },
    [openApp, activateTriad, tileAllWindows, cascadeAllWindows, minimizeAllWindows, handleRunInSandbox, showToast]
  );

  const handleToggleVoice = useCallback(() => {
    if (voiceListening) {
      voiceNavigator.stopListening();
      setVoiceListening(false);
      return;
    }
    setCommandOpen(true);
    voiceNavigator.startListening({
      onTranscript: (text, isFinal) => {
        setVoiceTranscript(text);
        if (isFinal && text) {
          void executeNaturalCommand(text);
        }
      },
      onStateChange: (active) => setVoiceListening(active),
      onError: (msg) => {
        showToast(msg);
      },
    });
  }, [voiceListening, executeNaturalCommand, showToast]);

  // Global keyboard shortcuts (Ctrl/Cmd+K, Alt+1/2/3 for Trilateral Triads)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setCommandOpen((v) => !v);
      } else if (e.altKey && e.key === '1') {
        e.preventDefault();
        activateTriad('research');
      } else if (e.altKey && e.key === '2') {
        e.preventDefault();
        activateTriad('flow');
      } else if (e.altKey && e.key === '3') {
        e.preventDefault();
        activateTriad('resilience');
      } else if (e.key === 'Escape') {
        setCommandOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activateTriad]);

  const tileSpecificApps = useCallback(
    (appIds: AppId[]) => {
      const uniqueIds = Array.from(new Set(appIds)).filter((id) =>
        OS_APPS.some((a) => a.id === id) || Boolean(printedAppsStore.getById(id))
      );
      if (uniqueIds.length === 0) return;

      const bounds = getWorkspaceBounds();
      const cols = uniqueIds.length === 1 ? 1 : 2;
      const rows = Math.ceil(uniqueIds.length / cols);
      const cellW = Math.floor((bounds.usableWidth - (cols - 1) * 10) / cols);
      const cellH = Math.floor((bounds.usableHeight - (rows - 1) * 10) / rows);

      setWindows((prev) => {
        const next: Record<string, WindowState> = {};
        for (const k of Object.keys(prev)) {
          next[k] = { ...prev[k], minimized: true };
        }
        uniqueIds.forEach((id, idx) => {
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          next[id] = {
            id,
            x: bounds.left + col * (cellW + 10),
            y: bounds.top + row * (cellH + 10),
            width: Math.max(260, cellW),
            height: Math.max(180, cellH),
            zIndex: ++zCounterRef.current,
            minimized: false,
            maximized: false,
            snapMode: null,
          };
        });
        return next;
      });
      setActiveAppId(uniqueIds[0]);
      uniqueIds.forEach((id) => smartSortEngine.recordAppUse(id));
      showToast(`Orchestrated ${uniqueIds.length} participating app(s) on workspace.`);
    },
    [showToast]
  );

  // Boot initial workspace: Sentient AI Core Main Prompt & App Minter inside safe workspace bounds
  useEffect(() => {
    const initBootWindow = () => {
      const bounds = getWorkspaceBounds();
      const restoreW = Math.min(960, Math.max(300, bounds.usableWidth - 24));
      const restoreH = Math.min(620, Math.max(240, bounds.usableHeight - 24));

      setWindows({
        sentientai: {
          id: 'sentientai',
          x: bounds.left,
          y: bounds.top,
          width: bounds.usableWidth,
          height: bounds.usableHeight,
          zIndex: ++zCounterRef.current,
          minimized: false,
          maximized: true,
          snapMode: 'full',
          prevBounds: {
            x: bounds.left + Math.round((bounds.usableWidth - restoreW) / 2),
            y: bounds.top + Math.round((bounds.usableHeight - restoreH) / 2),
            width: restoreW,
            height: restoreH,
          },
        },
      });
      setActiveAppId('sentientai');
    };

    const timer = window.setTimeout(initBootWindow, 80);

    const onViewportChange = () => {
      const bounds = getWorkspaceBounds();
      setWindows((prev) => {
        const next: Record<string, WindowState> = {};
        let changed = false;
        for (const key of Object.keys(prev)) {
          const updated = reclampWindowState(prev[key], bounds);
          next[key] = updated;
          if (
            updated.x !== prev[key].x ||
            updated.y !== prev[key].y ||
            updated.width !== prev[key].width ||
            updated.height !== prev[key].height
          ) {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    };

    window.addEventListener('resize', onViewportChange);
    window.addEventListener('orientationchange', onViewportChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', onViewportChange);
      window.removeEventListener('orientationchange', onViewportChange);
    };
  }, []);

  const activeBuiltIn = OS_APPS.find((a) => a.id === activeAppId);
  const activePrinted = !activeBuiltIn ? printedApps.find((p) => p.id === activeAppId) : undefined;
  const activeAppName = activeBuiltIn?.name ?? activePrinted?.name ?? 'Desktop Workspace';

  const openAppIds = Object.values(windows)
    .filter((w) => !w.minimized)
    .map((w) => w.id);

  const renderAppBody = (id: AppId) => {
    if (id.startsWith('printed:')) {
      const printed = printedApps.find((p) => p.id === id);
      if (!printed) return null;
      return (
        <PrintedAppRuntime
          app={printed}
          openAppIds={openAppIds}
          onOpenApp={openApp}
          onShowToast={showToast}
        />
      );
    }

    switch (id) {
      case 'sentientai':
        return <SentientNexusApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'synthhybrid':
        return <SyntheticHybridApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'liveplayground':
        return <LivePlaygroundApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'aimworkstation':
      case 'fractalcsp':
      case 'heliocell':
      case 'aimspacejet':
      case 'modelforgesuite':
      case 'sovereignfps':
      case 'odonatamesh':
      case 'sentientsun':
      case 'cometicmatrix':
      case 'aimosnexus':
      case 'liquidquantum':
      case 'cometicballistic':
      case 'zerocrossingcad':
      case 'aimosv7':
        return (
          <SuiteMatrixHostApp
            suiteId={id}
            onOpenApp={openApp}
            onShowToast={showToast}
          />
        );
      case 'aimspace':
        return <AIMSpaceApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'companion':
        return (
          <SmartCompanionApp
            openAppIds={openAppIds}
            onOpenApp={openApp}
            onTileApps={tileSpecificApps}
            onCleanDesktop={minimizeAllWindows}
            onShowToast={showToast}
          />
        );
      case 'codeunifier':
        return <CodeUnificatorApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'meshunifier':
        return <MeshUnificatorApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'kineticengine':
        return <KineticEngineApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'voxelengine':
        return <VoxelEngineApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'hyperface':
        return <HyperFaceStudioApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'smartbrain':
        return <SmartBrainForgeApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'gameforge':
        return <GameForgeApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'spritecomposer':
        return <SpritePhysicsLabApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'jsonvault':
        return <JsonResearchVaultApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'masterbrain':
        return <MasterBrainApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'thinkmatrix':
        return <ThinkingMatrixApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'streamhub':
        return <UniversalStreamApp onOpenApp={openApp} onShowToast={showToast} />;
      case 'htmlprinter':
        return (
          <HtmlAppPrinterApp
            openAppIds={openAppIds}
            onOpenApp={openApp}
            onShowToast={showToast}
          />
        );
      case 'architect':
        return (
          <PromptArchitectApp
            onOpenFileInDrive={handleOpenFileInDrive}
            onRunInSandbox={handleRunInSandbox}
            onOpenApp={openApp}
          />
        );
      case 'musicstudio':
        return <MusicStudioApp onOpenApp={openApp} />;
      case 'videoeditor':
        return <VideoEditorApp />;
      case 'doom3d':
        return <Doom3DApp />;
      case 'fractalcinema':
        return <FractalCinemaApp />;
      case 'blocks':
        return <EngineBlocksApp onOpenApp={openApp} onActivateTriad={activateTriad} />;
      case 'liquidmp3':
        return <LiquidPlayerApp />;
      case 'organicmp4':
        return <OrganicMp4PlayerApp onOpenApp={openApp} />;
      case 'liquidvideo':
        return <LiquidVideoApp onOpenApp={openApp} />;
      case 'liquideq':
        return <LiquidEqApp />;
      case 'visualsynth':
        return <VisualSynthApp />;
      case 'microfractal':
        return <MicroFractalApp />;
      case 'swarm':
        return (
          <AgentSwarmApp
            onOpenFileInDrive={handleOpenFileInDrive}
            onRunFileInSandbox={handleRunInSandbox}
          />
        );
      case 'auditor':
        return (
          <CodeAuditorApp
            onOpenFileInDrive={handleOpenFileInDrive}
            onRunFileInSandbox={handleRunInSandbox}
          />
        );
      case 'drive':
        return (
          <AetherDriveApp
            initialFileName={driveTargetFile}
            onRunInSandbox={handleRunInSandbox}
            onOpenApp={openApp}
          />
        );
      case 'sandbox':
        return (
          <SandboxRunnerApp
            targetFileName={sandboxTargetFile}
            onSelectFile={setSandboxTargetFile}
          />
        );
      case 'modelforge':
        return <ModelForgeApp />;
      case 'synesthesia':
        return <SynesthesiaApp />;
      case 'healer':
        return <SelfHealerApp />;
      case 'terminal':
        return <TerminalApp onOpenApp={openApp} onRunInSandbox={handleRunInSandbox} />;
      case 'snapshots':
        return <SnapshotManagerApp />;
      case 'gamedev':
        return <GameSandboxApp />;
      case 'neuralbus':
        return <NeuralBusApp />;
      default:
        return null;
    }
  };

  // Build unified desktop items: loose built-in apps + printed HTML5 apps not stored in any organic folder
  const foldedSet = new Set(folders.flatMap((f) => f.appIds));
  const looseDesktopApps = [
    ...OS_APPS.map((a) => resolveUnifiedApp(a.id, OS_APPS, printedApps)),
    ...printedApps.map((p) => resolveUnifiedApp(p.id, OS_APPS, printedApps)),
  ]
    .filter((item): item is ResolvedAppItem => Boolean(item))
    .filter((item) => !foldedSet.has(item.id));

  const openWindowSet = new Set(Object.keys(windows));
  const openFolder = folders.find((f) => f.id === openFolderId) ?? null;

  const allWindowAppDefs: OSAppDefinition[] = [
    ...OS_APPS,
    ...printedApps.map((p) => ({
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      category: `Printed v${p.version}`,
      axis: 'persistence' as const,
      blockId: 'block-sandbox',
      defaultWidth: 540,
      defaultHeight: 400,
      accentGradient: p.accentGradient,
      iconName: 'printer',
    })),
  ];

  const handleDesktopDropExtract = (e: React.DragEvent<HTMLDivElement>) => {
    const appId = e.dataTransfer.getData('text/aether-app') as AppId;
    const fromFolder = e.dataTransfer.getData('text/aether-source-folder');
    if (appId && fromFolder) {
      e.preventDefault();
      desktopFolderEngine.extractAppToDesktop(appId);
      showToast(`Extracted "${appId.replace('printed:', '')}" to main desktop.`);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/aether-source-folder')) {
          e.preventDefault();
        }
      }}
      onDrop={handleDesktopDropExtract}
      className="aether-wallpaper relative w-full h-full overflow-hidden select-none"
    >
      <SynesthesiaBackdrop
        openAppIds={openAppIds}
        activeAppId={activeAppId}
        onSelectApp={openApp}
        interactive3D
      />

      <TopBar
        activeAppName={activeAppName}
        kernelHealth={kernelHealth}
        vfsFileCount={vfsFileCount}
        fractalFps={fractalFps}
        synesthesia={synesthesia}
        voiceListening={voiceListening}
        onOpenApp={openApp}
        onOpenCommandBar={() => setCommandOpen(true)}
        onToggleVoice={handleToggleVoice}
        onTileWindows={tileAllWindows}
        onCascadeWindows={cascadeAllWindows}
        onCycleTheme={() => {
          const idx = CIRCADIAN_ORDER.indexOf(synesthesia.circadianMode);
          const next = CIRCADIAN_ORDER[(idx + 1) % CIRCADIAN_ORDER.length];
          synesthesiaEngine.setCircadianMode(next);
        }}
      />

      <SmartAppSortTab
        printedApps={printedApps}
        openAppIds={openAppIds}
        activeAppId={activeAppId}
        onOpenApp={openApp}
        onShowToast={showToast}
      />

      {toastMsg && (
        <div className="fixed top-[calc(98px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1400] px-4 py-2 rounded-xl aether-glass text-xs font-medium text-slate-100 shadow-xl">
          {toastMsg}
        </div>
      )}

      <main className="relative z-10 w-full h-full pt-[102px] pb-24 px-2.5 overflow-hidden pointer-events-none">
        <div className="grid grid-flow-col grid-rows-6 sm:grid-rows-7 gap-1 w-fit pointer-events-none">
          {/* Organic Desktop Folders */}
          {folders.map((folder) => (
            <OrganicFolderTile
              key={folder.id}
              folder={folder}
              builtInApps={OS_APPS}
              printedApps={printedApps}
              rms={synesthesia.rms}
              isOpen={openFolderId === folder.id}
              onToggleOpen={() =>
                setOpenFolderId((curr) => (curr === folder.id ? null : folder.id))
              }
              onDropApp={(appId, folderId) => {
                desktopFolderEngine.moveAppIntoFolder(appId, folderId);
                showToast(`Moved into "${folder.name}".`);
              }}
            />
          ))}

          {/* Create New Organic Pod button */}
          <button
            type="button"
            onClick={() => {
              const created = desktopFolderEngine.createFolder(`Pod ${folders.length + 1}`);
              setOpenFolderId(created.id);
              showToast(`Created Organic Folder "${created.name}"`);
            }}
            title="Create new Organic Desktop Folder"
            className="pointer-events-auto w-[58px] p-1 rounded-lg hover:bg-white/[0.08] flex flex-col items-center gap-1 text-center cursor-pointer"
          >
            <div
              style={{ borderRadius: '44% 56% 48% 52% / 50% 44% 56% 50%' }}
              className="w-8 h-8 border border-dashed border-cyan-400/50 bg-cyan-500/10 flex items-center justify-center text-cyan-300"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </div>
            <span className="text-[9px] font-medium text-cyan-300 leading-tight">New Pod</span>
          </button>

          {/* Loose Desktop Apps & Printed HTML5 Apps */}
          {looseDesktopApps
            .filter((app) => app.id !== 'aimspace')
            .map((app) => {
              const win = windows[app.id];
              const isOpen = Boolean(win);
              const isFocused = activeAppId === app.id && Boolean(win) && !win.minimized;
              return (
                <Tiny3DAppTile
                  key={app.id}
                  app={app}
                  isOpen={isOpen}
                  isFocused={isFocused}
                  rms={synesthesia.rms}
                  onOpen={openApp}
                />
              );
            })}
        </div>

        {/* Clean Desktop Bottom-Left Launch Cards: AIM Space Live Screen + Sentient & Synthetic Systems Dock */}
        <div className="mt-3 flex flex-wrap items-end gap-3 pointer-events-none">
          {looseDesktopApps.some((app) => app.id === 'aimspace') && (
            <button
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('text/aether-app', 'aimspace');
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => openApp('aimspace')}
              title={`${aimSpaceState.gameTitle} · AIM Space · 50 Mounted Daemons`}
              className={`pointer-events-auto group w-[144px] rounded-xl bg-slate-950/85 hover:bg-slate-900/95 border transition-transform duration-150 hover:scale-[1.03] p-1.5 text-left cursor-pointer shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                activeAppId === 'aimspace' && windows.aimspace && !windows.aimspace.minimized
                  ? 'border-amber-400/75 ring-1 ring-amber-400/45'
                  : 'border-white/15 hover:border-amber-400/50'
              }`}
            >
              <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-slate-900 border border-white/10">
                <img
                  src={aimSpaceState.gamePictureUrl}
                  alt="AIM Space Game Preview"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
              </div>
              <div className="mt-1.5 px-0.5">
                <div className="text-[11px] font-semibold text-slate-100 truncate">AIM Space</div>
                <div className="text-[9.5px] text-slate-400 truncate tabular-nums">
                  {aimSpaceState.genre.split(' ')[0]} · 50 Daemons
                </div>
              </div>
            </button>
          )}

          {/* Sentient Cohesive Systems Hub Card */}
          <div className="hidden md:flex flex-col gap-2 w-[316px] rounded-2xl aether-spotlight-card p-3 pointer-events-auto">
            <div className="flex items-center justify-between gap-2 border-b border-white/[0.08] pb-2">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/90">
                  Unified Cognitive OS
                </div>
                <div className="text-xs font-semibold text-slate-100">
                  Sentient & Synthetic Systems
                </div>
              </div>
              <span className="text-[11px] font-mono tabular-nums text-emerald-300">
                {daemonCount} Daemons
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center py-0.5">
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] py-1.5 px-1">
                <div className="text-sm font-semibold font-mono tabular-nums text-cyan-200">
                  {clusterCount}
                </div>
                <div className="text-[9.5px] text-slate-400">Clusters</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] py-1.5 px-1">
                <div className="text-sm font-semibold font-mono tabular-nums text-emerald-200">
                  {hybridBuildCount}
                </div>
                <div className="text-[9.5px] text-slate-400">Hybrid Apps</div>
              </div>
              <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] py-1.5 px-1">
                <div className="text-sm font-semibold font-mono tabular-nums text-fuchsia-200">
                  {sentientMintCount}
                </div>
                <div className="text-[9.5px] text-slate-400">Minted</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => openApp('sentientai')}
                className="px-2.5 py-1.5 rounded-lg bg-cyan-500/18 hover:bg-cyan-500/28 border border-cyan-400/40 text-cyan-100 text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Atom className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span>Sentient AI</span>
              </button>
              <button
                type="button"
                onClick={() => openApp('synthhybrid')}
                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/18 hover:bg-emerald-500/28 border border-emerald-400/40 text-emerald-100 text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span>Hybrid 10</span>
              </button>
              <button
                type="button"
                onClick={() => openApp('liveplayground')}
                className="px-2.5 py-1.5 rounded-lg bg-violet-500/18 hover:bg-violet-500/28 border border-violet-400/40 text-violet-100 text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                <span>Playground</span>
              </button>
              <button
                type="button"
                onClick={() => openApp('companion')}
                className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-[11px] font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <BrainCircuit className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>Smart AI</span>
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Organic Folder Drawer */}
        {openFolder && (
          <OrganicFolderDrawer
            folder={openFolder}
            builtInApps={OS_APPS}
            printedApps={printedApps}
            openWindowIds={openWindowSet}
            activeAppId={activeAppId}
            onClose={() => setOpenFolderId(null)}
            onOpenApp={(id) => {
              openApp(id);
            }}
            onExtractApp={(id) => {
              desktopFolderEngine.extractAppToDesktop(id);
              showToast(`Extracted to main desktop.`);
            }}
            onDropApp={(appId, folderId) => {
              desktopFolderEngine.moveAppIntoFolder(appId, folderId);
            }}
            onRename={(fid, name) => desktopFolderEngine.renameFolder(fid, name)}
            onCycleHue={(fid) => desktopFolderEngine.cycleFolderHue(fid)}
            onDissolve={(fid) => desktopFolderEngine.dissolveFolder(fid)}
            onCreateNewFolder={() => {
              const created = desktopFolderEngine.createFolder(`Pod ${folders.length + 1}`);
              setOpenFolderId(created.id);
            }}
          />
        )}

        <div
          style={{ perspective: '1300px' }}
          className="absolute inset-0 pointer-events-none"
        >
          {allWindowAppDefs.map((app) => {
            const win = windows[app.id];
            if (!win) return null;
            return (
              <WindowFrame
                key={app.id}
                app={app}
                win={win}
                isActive={activeAppId === app.id}
                onFocus={focusWindow}
                onClose={closeWindow}
                onMinimize={minimizeWindow}
                onToggleMaximize={toggleMaximize}
                onToggleMini={toggleMiniWindow}
                onSnap={snapWindow}
                onMoveResize={handleMoveResize}
              >
                {renderAppBody(app.id)}
              </WindowFrame>
            );
          })}
        </div>
      </main>

      <Dock
        panelAppIds={panelAppIds}
        printedApps={printedApps}
        windows={windows}
        activeAppId={activeAppId}
        onSelectApp={handleDockSelect}
        onSwapSlot={(slotIdx, droppedId) => {
          desktopFolderEngine.setPanelSlot(slotIdx, droppedId);
          showToast(`Pinned to 9-App Glowing Panel slot #${slotIdx + 1}.`);
        }}
      />

      <CommandOverlay
        open={commandOpen}
        listening={voiceListening}
        transcript={voiceTranscript}
        lastResult={lastIntent}
        spokenFeedback={spokenFeedback}
        onToggleSpokenFeedback={() => {
          const next = !spokenFeedback;
          setSpokenFeedback(next);
          voiceNavigator.setSpokenConfirmation(next);
        }}
        onToggleVoice={handleToggleVoice}
        onExecuteCommand={(text) => void executeNaturalCommand(text)}
        onClose={() => setCommandOpen(false)}
      />
    </div>
  );
}
