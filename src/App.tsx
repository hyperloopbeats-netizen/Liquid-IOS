import { useCallback, useEffect, useRef, useState } from 'react';
import { OS_APPS } from './kernel/appRegistry';
import { kernelHealer } from './kernel/healerEngine';
import { liquidAudioEngine } from './kernel/liquidAudioEngine';
import { microFractalKernel } from './kernel/microFractalKernel';
import { neuralBus } from './kernel/neuralBus';
import { swarmEngine } from './kernel/swarmEngine';
import { synesthesiaEngine } from './kernel/synesthesiaEngine';
import { trilateralMatrix } from './kernel/trilateralMatrix';
import { vfs } from './kernel/vfs';
import { parseVoiceIntent, voiceNavigator } from './kernel/voiceNavigator';
import type {
  AppId,
  CircadianMode,
  SynesthesiaState,
  VoiceIntentResult,
  WindowState,
} from './types/os';
import { AppIcon } from './components/AppIcon';
import { CommandOverlay } from './components/CommandOverlay';
import { Dock } from './components/Dock';
import { SynesthesiaBackdrop } from './components/SynesthesiaBackdrop';
import { TopBar } from './components/TopBar';
import { WindowFrame } from './components/WindowFrame';
import { AetherDriveApp } from './apps/AetherDriveApp';
import { AgentSwarmApp } from './apps/AgentSwarmApp';
import { CodeAuditorApp } from './apps/CodeAuditorApp';
import { Doom3DApp } from './apps/Doom3DApp';
import { EngineBlocksApp } from './apps/EngineBlocksApp';
import { GameSandboxApp } from './apps/GameSandboxApp';
import { LiquidEqApp } from './apps/LiquidEqApp';
import { LiquidPlayerApp } from './apps/LiquidPlayerApp';
import { LiquidVideoApp } from './apps/LiquidVideoApp';
import { MicroFractalApp } from './apps/MicroFractalApp';
import { ModelForgeApp } from './apps/ModelForgeApp';
import { MusicStudioApp } from './apps/MusicStudioApp';
import { NeuralBusApp } from './apps/NeuralBusApp';
import { OrganicMp4PlayerApp } from './apps/OrganicMp4PlayerApp';
import { PromptArchitectApp } from './apps/PromptArchitectApp';
import { SandboxRunnerApp } from './apps/SandboxRunnerApp';
import { SelfHealerApp } from './apps/SelfHealerApp';
import { SnapshotManagerApp } from './apps/SnapshotManagerApp';
import { SynesthesiaApp } from './apps/SynesthesiaApp';
import { TerminalApp } from './apps/TerminalApp';
import { VideoEditorApp } from './apps/VideoEditorApp';
import { VisualSynthApp } from './apps/VisualSynthApp';

const CIRCADIAN_ORDER: CircadianMode[] = ['auto', 'dawn', 'noon', 'dusk', 'midnight'];

export default function App() {
  const [windows, setWindows] = useState<Record<string, WindowState>>({});
  const [activeAppId, setActiveAppId] = useState<AppId | null>(null);
  const zCounterRef = useRef(100);

  const [synesthesia, setSynesthesia] = useState<SynesthesiaState>(synesthesiaEngine.getState());
  const [kernelHealth, setKernelHealth] = useState(kernelHealer.getState().health);
  const [fractalFps, setFractalFps] = useState(microFractalKernel.getState().measuredFps);
  const [vfsFileCount, setVfsFileCount] = useState(0);

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
    void vfs.init();
    const unsubVfs = vfs.subscribe((files) => setVfsFileCount(files.length));
    const unsubSyn = synesthesiaEngine.subscribe(setSynesthesia);
    const unsubHeal = kernelHealer.subscribe((snap) => setKernelHealth(snap.health));
    const unsubMfk = microFractalKernel.subscribe((mfk) => setFractalFps(mfk.measuredFps));

    return () => {
      unsubVfs();
      unsubSyn();
      unsubHeal();
      unsubMfk();
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
    const def = OS_APPS.find((a) => a.id === id);
    if (!def) return;

    setWindows((prev) => {
      const nextZ = ++zCounterRef.current;
      const existing = prev[id];
      if (existing) {
        return {
          ...prev,
          [id]: { ...existing, minimized: false, zIndex: nextZ },
        };
      }

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const isCompact = vw < 640;
      const marginX = isCompact ? 8 : 16;
      const openCount = Object.keys(prev).length;
      const width = Math.min(vw - marginX * 2, def.defaultWidth);
      const height = Math.min(vh - (isCompact ? 124 : 130), def.defaultHeight);
      const offset = isCompact ? 0 : (openCount % 5) * 28;
      const x = Math.max(marginX, Math.min(vw - width - marginX, Math.round((vw - width) / 2) + offset));
      const y = Math.max(48, Math.min(vh - height - 74, Math.round((vh - height) / 2) - 10 + offset));

      return {
        ...prev,
        [id]: {
          id,
          x,
          y,
          width,
          height,
          zIndex: nextZ,
          minimized: false,
          maximized: false,
          snapMode: null,
        },
      };
    });
    setActiveAppId(id);
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
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (!w.maximized) {
        const marginX = vw < 640 ? 8 : 12;
        return {
          ...prev,
          [id]: {
            ...w,
            prevBounds: { x: w.x, y: w.y, width: w.width, height: w.height },
            x: marginX,
            y: vw < 640 ? 48 : 52,
            width: Math.max(280, vw - marginX * 2),
            height: Math.max(300, vh - 128),
            maximized: true,
            snapMode: 'full',
          },
        };
      }
      const restore = w.prevBounds ?? { x: 80, y: 64, width: 820, height: 560 };
      return {
        ...prev,
        [id]: {
          ...w,
          ...restore,
          maximized: false,
          snapMode: null,
        },
      };
    });
  }, []);

  const snapWindow = useCallback((id: AppId, side: 'left' | 'right') => {
    setWindows((prev) => {
      const w = prev[id];
      if (!w) return prev;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const halfW = Math.floor((vw - 32) / 2);
      const h = Math.max(320, vh - 132);
      return {
        ...prev,
        [id]: {
          ...w,
          x: side === 'left' ? 12 : halfW + 20,
          y: 52,
          width: halfW,
          height: h,
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
      const vw = window.innerWidth - 24;
      const vh = window.innerHeight - 132;
      const cols = visibleIds.length === 1 ? 1 : visibleIds.length <= 4 ? 2 : 3;
      const rows = Math.ceil(visibleIds.length / cols);
      const cellW = Math.floor((vw - (cols - 1) * 10) / cols);
      const cellH = Math.floor((vh - (rows - 1) * 10) / rows);

      const next = { ...prev };
      visibleIds.forEach((id, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        next[id] = {
          ...next[id],
          x: 12 + col * (cellW + 10),
          y: 52 + row * (cellH + 10),
          width: cellW,
          height: cellH,
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
      const next = { ...prev };
      ids.forEach((id, idx) => {
        const def = OS_APPS.find((a) => a.id === id);
        const w = Math.min(window.innerWidth - 60, def?.defaultWidth ?? 800);
        const h = Math.min(window.innerHeight - 140, def?.defaultHeight ?? 540);
        next[id] = {
          ...next[id],
          minimized: false,
          maximized: false,
          x: 40 + idx * 34,
          y: 56 + idx * 28,
          width: w,
          height: h,
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

      const vw = window.innerWidth - 24;
      const vh = window.innerHeight - 132;
      const leftW = Math.floor(vw * 0.52);
      const rightW = vw - leftW - 10;
      const rightH = Math.floor((vh - 10) / 2);

      setWindows((prev) => {
        const next: Record<string, WindowState> = {};
        for (const k of Object.keys(prev)) {
          next[k] = { ...prev[k], minimized: true };
        }
        apps.forEach((id, idx) => {
          const z = ++zCounterRef.current;
          if (idx === 0) {
            next[id] = { id, x: 12, y: 52, width: leftW, height: vh, zIndex: z, minimized: false, maximized: false };
          } else if (idx === 1) {
            next[id] = { id, x: 12 + leftW + 10, y: 52, width: rightW, height: rightH, zIndex: z, minimized: false, maximized: false };
          } else {
            next[id] = { id, x: 12 + leftW + 10, y: 52 + rightH + 10, width: rightW, height: rightH, zIndex: z, minimized: false, maximized: false };
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

  // Boot initial workspace: CodeMesh IDE layout (Split Editor + AI Companion + AST Code Auditor)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (vw >= 1024) {
        const margin = 12;
        const usableW = vw - margin * 2 - 10;
        const usableH = vh - 132;
        const leftW = Math.floor(usableW * 0.58);
        const rightW = usableW - leftW;
        const rightTopH = Math.floor((usableH - 10) * 0.54);
        const rightBottomH = usableH - rightTopH - 10;
        setWindows({
          drive: {
            id: 'drive',
            x: margin,
            y: 52,
            width: leftW,
            height: usableH,
            zIndex: ++zCounterRef.current,
            minimized: false,
            maximized: false,
          },
          terminal: {
            id: 'terminal',
            x: margin + leftW + 10,
            y: 52,
            width: rightW,
            height: rightTopH,
            zIndex: ++zCounterRef.current,
            minimized: false,
            maximized: false,
          },
          auditor: {
            id: 'auditor',
            x: margin + leftW + 10,
            y: 52 + rightTopH + 10,
            width: rightW,
            height: rightBottomH,
            zIndex: ++zCounterRef.current,
            minimized: false,
            maximized: false,
          },
        });
        setActiveAppId('drive');
      } else {
        openApp('drive');
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [openApp]);

  const activeAppDef = OS_APPS.find((a) => a.id === activeAppId);

  const renderAppBody = (id: AppId) => {
    switch (id) {
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

  return (
    <div className="aether-wallpaper relative w-full h-full overflow-hidden select-none">
      <SynesthesiaBackdrop />

      <TopBar
        activeAppName={activeAppDef?.name ?? 'Desktop Workspace'}
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

      {toastMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[1400] px-4 py-2 rounded-xl aether-glass text-xs font-medium text-slate-100 shadow-xl">
          {toastMsg}
        </div>
      )}

      <main className="relative z-10 w-full h-full pt-14 pb-20 px-4 overflow-hidden">
        <div className="grid grid-flow-col grid-rows-7 gap-1.5 w-fit">
          {OS_APPS.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => openApp(app.id)}
              className="w-24 p-2 rounded-xl hover:bg-white/10 transition-colors flex flex-col items-center gap-1.5 text-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
            >
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${app.accentGradient} flex items-center justify-center shadow-lg border border-white/20`}
              >
                <AppIcon name={app.iconName} className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-medium text-slate-200 leading-tight drop-shadow">
                {app.shortName}
              </span>
            </button>
          ))}
        </div>

        <div className="absolute inset-0 pointer-events-none">
          {OS_APPS.map((app) => {
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
                onSnap={snapWindow}
                onMoveResize={handleMoveResize}
              >
                {renderAppBody(app.id)}
              </WindowFrame>
            );
          })}
        </div>
      </main>

      <Dock windows={windows} activeAppId={activeAppId} onSelectApp={handleDockSelect} />

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
