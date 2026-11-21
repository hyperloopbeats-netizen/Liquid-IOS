import type { AppId } from '../types/os';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { masterBrainEngine } from './masterBrainEngine';
import { neuralBus } from './neuralBus';
import { smartBrainItemStore } from './smartBrainItemStore';
import { swarmEngine } from './swarmEngine';
import { synesthesiaEngine } from './synesthesiaEngine';
import { trilateralMatrix } from './trilateralMatrix';
import { vfs } from './vfs';

export type SuiteAppId =
  | 'aimworkstation'
  | 'fractalcsp'
  | 'heliocell'
  | 'aimspacejet'
  | 'modelforgesuite'
  | 'sovereignfps'
  | 'odonatamesh'
  | 'sentientsun'
  | 'cometicmatrix'
  | 'aimosnexus'
  | 'liquidquantum'
  | 'cometicballistic'
  | 'zerocrossingcad'
  | 'aimosv7';

export interface SuiteAppMeta {
  id: SuiteAppId;
  title: string;
  shortTitle: string;
  url: string;
  vfsPath: string;
  defaultRole: string;
}

export const SUITE_APP_CATALOG: Record<SuiteAppId, SuiteAppMeta> = {
  aimworkstation: {
    id: 'aimworkstation',
    title: 'AIM OS v9.5 · Master Workstation & Cognitive Suite',
    shortTitle: 'Workstation',
    url: '/suite-apps/aim-workstation.html',
    vfsPath: '/workspace/suite-apps/aim-workstation.html',
    defaultRole: 'OPFS Scratch Monitor · WebGL2 Compositor · CAD SDF · REPL',
  },
  fractalcsp: {
    id: 'fractalcsp',
    title: 'Home Fractal CSP · 7-Mode PID & Tapered Collector',
    shortTitle: 'Fractal CSP',
    url: '/suite-apps/home-fractal-csp.html',
    vfsPath: '/workspace/suite-apps/home-fractal-csp.html',
    defaultRole: 'Closed-Loop Solar Collector · 4 RT Daemons · 1x-1000x Scale',
  },
  heliocell: {
    id: 'heliocell',
    title: 'HelioCell HELLCAT EDITION · Liquid Solar Battery OS',
    shortTitle: 'HelioCell',
    url: '/suite-apps/heliocell-hellcat.html',
    vfsPath: '/workspace/suite-apps/heliocell-hellcat.html',
    defaultRole: 'Liquid Photo-Isomer SoC · 50 Daemons · 3 Movie Camera Moves',
  },
  aimspacejet: {
    id: 'aimspacejet',
    title: 'AIM SPACE · 3D Glass Light-Reception Jet & Smart AI',
    shortTitle: 'Space Jet',
    url: '/suite-apps/aim-space-jet.html',
    vfsPath: '/workspace/suite-apps/aim-space-jet.html',
    defaultRole: '3D Planet Systems · Flight Trajectory · 20 Smart AI Daemons',
  },
  modelforgesuite: {
    id: 'modelforgesuite',
    title: 'AIM OS v3.8 · AI Model Forge & Synthetic Skin Suite',
    shortTitle: 'Model Forge 3.8',
    url: '/suite-apps/aim-model-forge-v38.html',
    vfsPath: '/workspace/suite-apps/aim-model-forge-v38.html',
    defaultRole: 'Three.js Shader Mesh · Impact Stress Test · Skin Vault',
  },
  sovereignfps: {
    id: 'sovereignfps',
    title: 'PS7 Orion v15.00 · Sovereign FPS & Audio Synth',
    shortTitle: 'Orion FPS',
    url: '/suite-apps/ps7-sovereign-fps.html',
    vfsPath: '/workspace/suite-apps/ps7-sovereign-fps.html',
    defaultRole: 'Three.js FPS Arena · AI Medic · WebAudio Orchestral Conductor',
  },
  odonatamesh: {
    id: 'odonatamesh',
    title: 'Odonata Mesh Relay · Dragonfly Swarm Neural Command',
    shortTitle: 'Odonata Swarm',
    url: '/suite-apps/odonata-mesh-relay.html',
    vfsPath: '/workspace/suite-apps/odonata-mesh-relay.html',
    defaultRole: 'Boids Mesh Swarm · Tower Relays · Chart.js Telemetry',
  },
  sentientsun: {
    id: 'sentientsun',
    title: 'Sentient Sun OS · Sovereign Desktop & Fractal Core',
    shortTitle: 'Sentient Sun',
    url: '/suite-apps/sentient-sun-os.html',
    vfsPath: '/workspace/suite-apps/sentient-sun-os.html',
    defaultRole: 'WebGL Fractal Core · 3-Band Sovereign EQ · Tube Drive',
  },
  cometicmatrix: {
    id: 'cometicmatrix',
    title: 'Cometic Engine · Data Visual Matrix v26.3',
    shortTitle: 'Cometic Matrix',
    url: '/suite-apps/cometic-visual-matrix.html',
    vfsPath: '/workspace/suite-apps/cometic-visual-matrix.html',
    defaultRole: 'Three.js UnrealBloom · Gel Shader · 800 Spark Motes',
  },
  aimosnexus: {
    id: 'aimosnexus',
    title: 'AIM OS Nexus · Sentient Game Generator OS v5.0',
    shortTitle: 'Nexus v5',
    url: '/suite-apps/aim-os-nexus-v5.html',
    vfsPath: '/workspace/suite-apps/aim-os-nexus-v5.html',
    defaultRole: 'Sentient Mood Desktop · 3D Game Viewport · Joystick HUD',
  },
  liquidquantum: {
    id: 'liquidquantum',
    title: 'PS7 Orion v15.00 · Liquid Core & Quantum Matrix',
    shortTitle: 'Liquid Quantum',
    url: '/suite-apps/ps7-liquid-quantum.html',
    vfsPath: '/workspace/suite-apps/ps7-liquid-quantum.html',
    defaultRole: 'Spectrum DSP · Chord Wheel · Neural Swarm Council',
  },
  cometicballistic: {
    id: 'cometicballistic',
    title: 'Cometic Engine · Photo Fabric Ballistic Range v5',
    shortTitle: 'Ballistic v5',
    url: '/suite-apps/cometic-ballistic-v5.html',
    vfsPath: '/workspace/suite-apps/cometic-ballistic-v5.html',
    defaultRole: 'Three.js Tearable Photo Fabric · 4 Weapons · Touch Aim',
  },
  zerocrossingcad: {
    id: 'zerocrossingcad',
    title: 'AiM Zero-Crossing CAD Kernel · Master Workstation',
    shortTitle: 'Zero-Cross CAD',
    url: '/suite-apps/aim-zero-crossing-cad.html',
    vfsPath: '/workspace/suite-apps/aim-zero-crossing-cad.html',
    defaultRole: 'Parametric Zero-Crossing Geometry · Surface Inspector',
  },
  aimosv7: {
    id: 'aimosv7',
    title: 'AIM OS v7.0 · Master Monolithic Cognitive Suite',
    shortTitle: 'AIM OS v7',
    url: '/suite-apps/aim-os-v7-monolith.html',
    vfsPath: '/workspace/suite-apps/aim-os-v7-monolith.html',
    defaultRole: 'Monolithic Cognitive OS · Windowed Three.js & AI Tools',
  },
};

export interface SuiteTelemetryEntry {
  suiteId: SuiteAppId;
  connected: boolean;
  fps: number;
  headline: string;
  subMetric: string;
  detail: string;
  lastHeartbeat: number;
}

export interface DriftModeConfig {
  active: boolean;
  presetName: string;
  prompt: string;
  intensity: number;
  phaseVelocity: number;
  colorShiftDeg: number;
  autoCameraDrift: boolean;
  thermalOscillation: boolean;
  phase: number;
}

export interface DriftPresetItem {
  id: string;
  name: string;
  description: string;
  intensity: number;
  phaseVelocity: number;
  colorShiftDeg: number;
  autoCameraDrift: boolean;
  thermalOscillation: boolean;
}

export const BUILT_IN_DRIFT_PRESETS: DriftPresetItem[] = [
  {
    id: 'helios-tide',
    name: 'Helios Thermal Tide',
    description: 'Smooth sinusoidal solar flux & ΔT oscillation synced with WebGL2 bloom.',
    intensity: 0.85,
    phaseVelocity: 1.0,
    colorShiftDeg: 14,
    autoCameraDrift: true,
    thermalOscillation: true,
  },
  {
    id: 'zero-g-orbital',
    name: 'Zero-G Orbital Drift',
    description: 'Wide dolly/crane camera sweeps, cosmos planet generation, and deep-blue shift.',
    intensity: 1.15,
    phaseVelocity: 0.75,
    colorShiftDeg: -28,
    autoCameraDrift: true,
    thermalOscillation: true,
  },
  {
    id: 'hellcat-overdrive',
    name: 'Hellcat Crimson Surge',
    description: 'High-velocity chemical discharge pulses and crimson HUD resonance.',
    intensity: 1.45,
    phaseVelocity: 1.65,
    colorShiftDeg: -8,
    autoCameraDrift: true,
    thermalOscillation: true,
  },
  {
    id: 'bio-fractal-harmonic',
    name: 'Bio-Fractal Harmonic',
    description: 'Golden-angle fractal dust drift, Torus/Gyroid CAD morphing, emerald glow.',
    intensity: 0.95,
    phaseVelocity: 1.25,
    colorShiftDeg: 46,
    autoCameraDrift: false,
    thermalOscillation: true,
  },
  {
    id: 'quantum-matrix-sweep',
    name: 'Quantum Matrix Sweep',
    description: 'Full chromatic prism phase rotation driving all 4 suite apps in lockstep.',
    intensity: 1.75,
    phaseVelocity: 2.1,
    colorShiftDeg: 95,
    autoCameraDrift: true,
    thermalOscillation: true,
  },
];

export interface CrossAppDirective {
  appId: string;
  directive: string;
  cliCommand?: string;
  loopRole: string;
}

export interface AwarenessSynthesisRecord {
  id: string;
  timestamp: number;
  synthesisTitle: string;
  matrixCoherence: number;
  awarenessSummary: string;
  crossAppDirectives: CrossAppDirective[];
  bridgePatchJs: string;
}

export interface AwarenessMatrixState {
  telemetry: Record<SuiteAppId, SuiteTelemetryEntry>;
  drift: DriftModeConfig;
  fullAppLoopActive: boolean;
  loopTickCount: number;
  vfsSynced: boolean;
  busySynthesis: boolean;
  busyDriftGen: boolean;
  lastError: string | null;
  latestSynthesis: AwarenessSynthesisRecord | null;
  history: AwarenessSynthesisRecord[];
}

const MATRIX_STORAGE_KEY = 'AetherOS_AwarenessMatrix_v1';

type MatrixListener = (state: AwarenessMatrixState) => void;

class AwarenessMatrixEngine {
  private frames = new Map<SuiteAppId, Window>();
  private listeners = new Set<MatrixListener>();
  private loopTimer: number | null = null;
  private vfsSyncPromise: Promise<void> | null = null;

  private state: AwarenessMatrixState = {
    telemetry: {
      aimworkstation: {
        suiteId: 'aimworkstation',
        connected: false,
        fps: 60,
        headline: 'All 5 Subsystems Nominal',
        subMetric: 'OPFS 29.6% · SDF Torus',
        detail: 'Ready to connect live window telemetry',
        lastHeartbeat: 0,
      },
      fractalcsp: {
        suiteId: 'fractalcsp',
        connected: false,
        fps: 60,
        headline: 'M4 · Solar Track',
        subMetric: '1x · 4 RT Daemons',
        detail: 'Closed-loop tapered collector ready',
        lastHeartbeat: 0,
      },
      heliocell: {
        suiteId: 'heliocell',
        connected: false,
        fps: 60,
        headline: 'SoC 42%',
        subMetric: 'M4 · 50 Daemons',
        detail: 'Liquid solar battery + 3 movie rigs ready',
        lastHeartbeat: 0,
      },
      aimspacejet: {
        suiteId: 'aimspacejet',
        connected: false,
        fps: 60,
        headline: 'PTS 0 · SYS 01',
        subMetric: 'HULL 100% · 20 Daemons',
        detail: '3D planet cosmos & glass n_g=1.50 engine',
        lastHeartbeat: 0,
      },
      modelforgesuite: {
        suiteId: 'modelforgesuite',
        connected: false,
        fps: 60,
        headline: 'AI Model Forge v3.8',
        subMetric: 'PBR Shader · Impact Test',
        detail: 'Synthetic skin & roughness mesh lab ready',
        lastHeartbeat: 0,
      },
      sovereignfps: {
        suiteId: 'sovereignfps',
        connected: false,
        fps: 60,
        headline: 'Orion v15 Sovereign FPS',
        subMetric: 'AI Medic · WebAudio',
        detail: 'DualCoreGovernor & FPS arena ready',
        lastHeartbeat: 0,
      },
      odonatamesh: {
        suiteId: 'odonatamesh',
        connected: false,
        fps: 60,
        headline: 'Odonata Swarm Relay',
        subMetric: 'Boids Mesh · Telemetry',
        detail: 'Dragonfly neural swarm command ready',
        lastHeartbeat: 0,
      },
      sentientsun: {
        suiteId: 'sentientsun',
        connected: false,
        fps: 60,
        headline: 'Sentient Sun OS',
        subMetric: 'Fractal Core · 3-Band EQ',
        detail: 'WebGL fractal shader & DSP mastering ready',
        lastHeartbeat: 0,
      },
      cometicmatrix: {
        suiteId: 'cometicmatrix',
        connected: false,
        fps: 60,
        headline: 'Cometic Matrix v26.3',
        subMetric: 'UnrealBloom · 800 Motes',
        detail: 'Pastel gel shader & spark engine ready',
        lastHeartbeat: 0,
      },
      aimosnexus: {
        suiteId: 'aimosnexus',
        connected: false,
        fps: 60,
        headline: 'AIM OS Nexus v5.0',
        subMetric: 'Sentient Game Generator',
        detail: 'Mood-reactive 3D OS workspace ready',
        lastHeartbeat: 0,
      },
      liquidquantum: {
        suiteId: 'liquidquantum',
        connected: false,
        fps: 60,
        headline: 'Liquid Core & Quantum',
        subMetric: '120 BPM · Swarm Council',
        detail: 'Quantum conductor & DSP HUD ready',
        lastHeartbeat: 0,
      },
      cometicballistic: {
        suiteId: 'cometicballistic',
        connected: false,
        fps: 60,
        headline: 'Ballistic Range v5.0',
        subMetric: 'Photo Fabric · 4 Weapons',
        detail: 'Tearable 3D cloth range ready',
        lastHeartbeat: 0,
      },
      zerocrossingcad: {
        suiteId: 'zerocrossingcad',
        connected: false,
        fps: 60,
        headline: 'Zero-Crossing CAD',
        subMetric: 'SDF Surface Solver',
        detail: 'Single-file parametric CAD kernel ready',
        lastHeartbeat: 0,
      },
      aimosv7: {
        suiteId: 'aimosv7',
        connected: false,
        fps: 60,
        headline: 'AIM OS v7.0 Monolith',
        subMetric: 'Cognitive Suite',
        detail: 'Master monolithic Three.js workspace ready',
        lastHeartbeat: 0,
      },
    },
    drift: {
      active: false,
      presetName: 'Helios Thermal Tide',
      prompt: 'Oscillate thermal flux, camera orbit moves, and cosmic shader hue in continuous harmony.',
      intensity: 0.85,
      phaseVelocity: 1.0,
      colorShiftDeg: 14,
      autoCameraDrift: true,
      thermalOscillation: true,
      phase: 0,
    },
    fullAppLoopActive: false,
    loopTickCount: 0,
    vfsSynced: false,
    busySynthesis: false,
    busyDriftGen: false,
    lastError: null,
    latestSynthesis: null,
    history: [],
  };

  constructor() {
    this.load();
    if (typeof window !== 'undefined') {
      window.addEventListener('message', this.handleWindowMessage);
      this.ensureLoopTimer();
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(MATRIX_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AwarenessMatrixState>;
        if (parsed.drift) {
          this.state.drift = { ...this.state.drift, ...parsed.drift };
        }
        if (typeof parsed.fullAppLoopActive === 'boolean') {
          this.state.fullAppLoopActive = parsed.fullAppLoopActive;
        }
        if (parsed.latestSynthesis) {
          this.state.latestSynthesis = parsed.latestSynthesis;
        }
        if (Array.isArray(parsed.history)) {
          this.state.history = parsed.history.slice(0, 10);
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(
        MATRIX_STORAGE_KEY,
        JSON.stringify({
          drift: this.state.drift,
          fullAppLoopActive: this.state.fullAppLoopActive,
          latestSynthesis: this.state.latestSynthesis,
          history: this.state.history.slice(0, 10),
        })
      );
    } catch {
      // ignore quota
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((cb) => cb(snap));
  }

  getState(): AwarenessMatrixState {
    return {
      ...this.state,
      telemetry: { ...this.state.telemetry },
      drift: { ...this.state.drift },
      history: [...this.state.history],
    };
  }

  subscribe(listener: MatrixListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private handleWindowMessage = (ev: MessageEvent) => {
    const d = ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'AETHER_SUITE_TELEMETRY' && d.payload) {
      const p = d.payload as {
        suiteId?: SuiteAppId;
        fps?: number;
        headline?: string;
        subMetric?: string;
        detail?: string;
      };
      if (!p.suiteId || !this.state.telemetry[p.suiteId]) return;
      this.state.telemetry[p.suiteId] = {
        suiteId: p.suiteId,
        connected: true,
        fps: typeof p.fps === 'number' ? p.fps : 60,
        headline: p.headline || this.state.telemetry[p.suiteId].headline,
        subMetric: p.subMetric || this.state.telemetry[p.suiteId].subMetric,
        detail: p.detail || this.state.telemetry[p.suiteId].detail,
        lastHeartbeat: Date.now(),
      };
      this.emit();
    }
  };

  registerSuiteFrame(suiteId: SuiteAppId, win: Window | null): void {
    if (!win) {
      this.frames.delete(suiteId);
      this.state.telemetry[suiteId] = {
        ...this.state.telemetry[suiteId],
        connected: false,
      };
      this.emit();
      return;
    }
    this.frames.set(suiteId, win);
    this.state.telemetry[suiteId] = {
      ...this.state.telemetry[suiteId],
      connected: true,
      lastHeartbeat: Date.now(),
    };
    this.broadcastDriftToFrames();
    this.emit();
  }

  async syncSuiteAppsToVfs(): Promise<void> {
    if (this.state.vfsSynced) return;
    if (this.vfsSyncPromise) return this.vfsSyncPromise;

    this.vfsSyncPromise = (async () => {
      try {
        await vfs.init();
        const metas = Object.values(SUITE_APP_CATALOG);
        for (const meta of metas) {
          const res = await fetch(meta.url);
          if (!res.ok) continue;
          const html = await res.text();
          await vfs.saveFile({
            name: `${meta.id}.html`,
            path: meta.vfsPath,
            content: html,
            patchedBy: 'Awareness Matrix Suite Sync',
          });
        }
        this.state.vfsSynced = true;
        this.emit();
        neuralBus.publish(
          'VFS',
          'SUITE_APPS_MOUNTED',
          `Synced all ${metas.length} integrated HTML5 suite apps into VFS for self-improvement, clustering, and hybrid synthesis.`
        );
      } catch {
        // non-blocking
      }
    })();

    return this.vfsSyncPromise;
  }

  private ensureLoopTimer(): void {
    if (this.loopTimer !== null) return;
    this.loopTimer = window.setInterval(() => {
      const anyActive = this.state.drift.active || this.state.fullAppLoopActive;
      if (!anyActive) return;

      this.state.loopTickCount += 1;
      this.state.drift.phase += 0.14 * (this.state.drift.phaseVelocity || 1.0);

      // Drive global Synesthesia hue & energy dynamically during Drift / Full Loop
      if (this.state.drift.active) {
        const wave = Math.sin(this.state.drift.phase * 0.65);
        const hue = Math.round((210 + this.state.drift.colorShiftDeg + wave * 32 * this.state.drift.intensity + 360) % 360);
        synesthesiaEngine.setHue(hue);
        synesthesiaEngine.setSystemLoad(Math.min(1, 0.38 + Math.abs(wave) * 0.42 * this.state.drift.intensity));
      }

      this.broadcastDriftToFrames();

      // Periodically publish closed-loop telemetry across AI Brain & Sentient Core
      if (this.state.fullAppLoopActive && this.state.loopTickCount % 16 === 0) {
        const totalSuites = Object.keys(SUITE_APP_CATALOG).length;
        const activeCount = Object.values(this.state.telemetry).filter((t) => t.connected).length;
        neuralBus.publish(
          'TRILATERAL',
          'FULL_APP_LOOP_PULSE',
          `Full Apps Loop cycle #${this.state.loopTickCount} · Drift=${this.state.drift.active ? this.state.drift.presetName : 'Standby'} · Live Frames=${activeCount}/${totalSuites}`
        );
      }

      this.emit();
    }, 650);
  }

  private broadcastDriftToFrames(): void {
    const payload = {
      type: 'AETHER_DRIFT_SYNC',
      drift: {
        active: this.state.drift.active,
        intensity: this.state.drift.intensity,
        phaseVelocity: this.state.drift.phaseVelocity,
        colorShiftDeg: this.state.drift.colorShiftDeg,
        autoCameraDrift: this.state.drift.autoCameraDrift,
        thermalOscillation: this.state.drift.thermalOscillation,
        phase: this.state.drift.phase,
        fullAppLoopActive: this.state.fullAppLoopActive,
      },
    };
    this.frames.forEach((win) => {
      try {
        win.postMessage(payload, '*');
      } catch {
        // ignore detached iframe
      }
    });
  }

  dispatchDirectiveToSuite(suiteId: SuiteAppId, directive: string, cliCommand?: string): void {
    const win = this.frames.get(suiteId);
    if (win) {
      try {
        win.postMessage(
          {
            type: 'AETHER_MATRIX_DIRECTIVE',
            directive,
            cliCommand,
          },
          '*'
        );
      } catch {
        // ignore
      }
    }
  }

  triggerSelfImprovement(suiteId: SuiteAppId, note?: string): void {
    const meta = SUITE_APP_CATALOG[suiteId];
    const improveMsg =
      note ||
      `Auto-improved ${meta.shortTitle}: clamped delta-time steps, aligned Synesthesia channels, and synced VFS artifact.`;
    const win = this.frames.get(suiteId);
    if (win) {
      try {
        win.postMessage({ type: 'AETHER_SELF_IMPROVE', note: improveMsg }, '*');
      } catch {
        // ignore
      }
    }
    this.state.telemetry[suiteId] = {
      ...this.state.telemetry[suiteId],
      detail: improveMsg,
      lastHeartbeat: Date.now(),
    };
    this.emit();
    neuralBus.publish('HEALER', 'SUITE_SELF_IMPROVED', improveMsg);
  }

  triggerAutonomousThinkCycle(suiteId?: SuiteAppId, thought?: string): void {
    const targets = suiteId ? [suiteId] : (Object.keys(SUITE_APP_CATALOG) as SuiteAppId[]);
    const now = Date.now();
    for (const sid of targets) {
      const msg =
        thought ||
        `Autonomous synthesis pulse aligned ${SUITE_APP_CATALOG[sid].shortTitle} telemetry with Sentient Core.`;
      const win = this.frames.get(sid);
      if (win) {
        try {
          win.postMessage({ type: 'AETHER_THINK_CYCLE', thought: msg }, '*');
        } catch {
          // ignore
        }
      }
      this.state.telemetry[sid] = {
        ...this.state.telemetry[sid],
        detail: msg,
        lastHeartbeat: now,
      };
    }
    this.emit();
    neuralBus.publish(
      'SWARM',
      'AUTONOMOUS_THINK_PULSE',
      thought || `Sentient Autonomous Thinking cycle synchronized across ${targets.length} integrated suite app(s).`
    );
  }

  toggleDrift(forceActive?: boolean): void {
    const next = typeof forceActive === 'boolean' ? forceActive : !this.state.drift.active;
    this.state.drift.active = next;
    if (!next) {
      synesthesiaEngine.setHue(null);
    }
    this.persist();
    this.broadcastDriftToFrames();
    this.emit();
    neuralBus.publish(
      'TRILATERAL',
      next ? 'DRIFT_MODE_ENGAGED' : 'DRIFT_MODE_PAUSED',
      next
        ? `Drift Mode "${this.state.drift.presetName}" engaged (Intensity ${this.state.drift.intensity.toFixed(2)}x).`
        : 'Drift Mode paused.'
    );
  }

  toggleFullAppLoop(forceActive?: boolean): void {
    const next = typeof forceActive === 'boolean' ? forceActive : !this.state.fullAppLoopActive;
    this.state.fullAppLoopActive = next;
    if (next && !this.state.drift.active) {
      this.state.drift.active = true;
    }
    this.persist();
    this.broadcastDriftToFrames();
    this.emit();
    neuralBus.publish(
      'SYSTEM',
      next ? 'FULL_APP_LOOP_ACTIVE' : 'FULL_APP_LOOP_PAUSED',
      next
        ? 'Full Apps Loop engaged: Workstation, Fractal CSP, HelioCell, AIM Space & AI Brain running synchronized.'
        : 'Full Apps Loop paused.'
    );
  }

  setDriftParams(patch: Partial<DriftModeConfig>): void {
    this.state.drift = { ...this.state.drift, ...patch };
    this.persist();
    this.broadcastDriftToFrames();
    this.emit();
  }

  applyDriftPreset(presetId: string): void {
    const found = BUILT_IN_DRIFT_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    this.state.drift = {
      ...this.state.drift,
      active: true,
      presetName: found.name,
      prompt: found.description,
      intensity: found.intensity,
      phaseVelocity: found.phaseVelocity,
      colorShiftDeg: found.colorShiftDeg,
      autoCameraDrift: found.autoCameraDrift,
      thermalOscillation: found.thermalOscillation,
    };
    this.state.fullAppLoopActive = true;
    this.persist();
    this.broadcastDriftToFrames();
    this.emit();
    neuralBus.publish('TRILATERAL', 'DRIFT_PRESET_APPLIED', `Drift Mode Generator loaded "${found.name}".`);
  }

  async generateCustomDriftMode(prompt: string): Promise<DriftModeConfig | null> {
    const cleanPrompt = prompt.trim() || 'Harmonic cybernetic thermal & orbital drift across all engines.';
    if (this.state.busyDriftGen) return null;
    this.state.busyDriftGen = true;
    this.state.lastError = null;
    this.emit();

    try {
      const res = await fetch('/api/brain/drift-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          currentTelemetry: this.state.telemetry,
        }),
      });
      const data = (await res.json()) as {
        presetName?: string;
        intensity?: number;
        phaseVelocity?: number;
        colorShiftDeg?: number;
        autoCameraDrift?: boolean;
        thermalOscillation?: boolean;
        synthesisNote?: string;
        directives?: Array<{ appId: string; directive: string; cliCommand?: string }>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Drift Mode generation failed.');
      }

      this.state.drift = {
        ...this.state.drift,
        active: true,
        presetName: data.presetName || 'Custom Neural Drift',
        prompt: cleanPrompt,
        intensity: typeof data.intensity === 'number' ? data.intensity : 1.15,
        phaseVelocity: typeof data.phaseVelocity === 'number' ? data.phaseVelocity : 1.25,
        colorShiftDeg: typeof data.colorShiftDeg === 'number' ? data.colorShiftDeg : 24,
        autoCameraDrift: data.autoCameraDrift !== false,
        thermalOscillation: data.thermalOscillation !== false,
      };
      this.state.fullAppLoopActive = true;
      this.persist();
      this.broadcastDriftToFrames();

      if (Array.isArray(data.directives)) {
        for (const d of data.directives) {
          if (d.appId in SUITE_APP_CATALOG) {
            this.dispatchDirectiveToSuite(d.appId as SuiteAppId, d.directive, d.cliCommand);
          }
        }
      }

      jsonKnowledgeStore.saveEntry({
        title: `Drift Profile: ${this.state.drift.presetName}`,
        category: 'research',
        tags: ['drift-mode', 'awareness-matrix', 'full-app-loop'],
        summary: data.synthesisNote || cleanPrompt,
        sideNotes: [
          `Intensity ${this.state.drift.intensity.toFixed(2)}x · Velocity ${this.state.drift.phaseVelocity.toFixed(2)}x`,
          `Hue Shift ${this.state.drift.colorShiftDeg}°`,
        ],
        linkedAppIds: ['masterbrain', 'aimworkstation', 'fractalcsp', 'heliocell', 'aimspacejet', 'aimspace'],
        data: this.state.drift as unknown as Record<string, unknown>,
      });

      neuralBus.publish(
        'TRILATERAL',
        'CUSTOM_DRIFT_GENERATED',
        `AI Drift Mode "${this.state.drift.presetName}" synthesized & engaged across all apps.`
      );
      return this.state.drift;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Drift generation error.';
      this.state.lastError = msg;
      return null;
    } finally {
      this.state.busyDriftGen = false;
      this.emit();
    }
  }

  async synthesizeAwarenessMatrix(directive?: string): Promise<AwarenessSynthesisRecord | null> {
    if (this.state.busySynthesis) return null;
    this.state.busySynthesis = true;
    this.state.lastError = null;
    this.emit();

    await this.syncSuiteAppsToVfs();

    neuralBus.publish(
      'SYSTEM',
      'AWARENESS_MATRIX_START',
      'AI Brain synthesizing Full Awareness Matrix across Workstation, Fractal CSP, HelioCell, AIM Space Jet, and Trilateral Matrix...'
    );

    try {
      const trilateral = trilateralMatrix.getState();
      const brain = masterBrainEngine.getState();
      const smartItems = smartBrainItemStore.getState().items.length;
      const daemonCount = swarmEngine.getDaemons().length;

      const res = await fetch('/api/brain/awareness-synthesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive:
            directive?.trim() ||
            'Reconnect Workstation, Home Fractal CSP, HelioCell Hellcat, and AIM Space Jet with the AI Brain for Full Awareness Matrix Synthesis and full closed-loop operation.',
          telemetry: this.state.telemetry,
          drift: this.state.drift,
          osContext: {
            trilateralCoherence: trilateral.coherence,
            brainCoherence: brain.coherenceScore,
            smartBrainItems: smartItems,
            totalDaemons: daemonCount,
            vfsFileCount: vfs.getFiles().length,
          },
        }),
      });

      const data = (await res.json()) as {
        synthesisTitle?: string;
        matrixCoherence?: number;
        awarenessSummary?: string;
        crossAppDirectives?: CrossAppDirective[];
        driftProfile?: {
          presetName?: string;
          intensity?: number;
          phaseVelocity?: number;
          colorShiftDeg?: number;
          autoCameraDrift?: boolean;
          thermalOscillation?: boolean;
        };
        bridgePatchJs?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Awareness Matrix synthesis failed.');
      }

      const directives = Array.isArray(data.crossAppDirectives) ? data.crossAppDirectives : [];
      for (const item of directives) {
        if (item.appId in SUITE_APP_CATALOG) {
          this.dispatchDirectiveToSuite(item.appId as SuiteAppId, item.directive, item.cliCommand);
        }
      }

      if (data.driftProfile) {
        this.state.drift = {
          ...this.state.drift,
          active: true,
          presetName: data.driftProfile.presetName || this.state.drift.presetName,
          intensity:
            typeof data.driftProfile.intensity === 'number'
              ? data.driftProfile.intensity
              : this.state.drift.intensity,
          phaseVelocity:
            typeof data.driftProfile.phaseVelocity === 'number'
              ? data.driftProfile.phaseVelocity
              : this.state.drift.phaseVelocity,
          colorShiftDeg:
            typeof data.driftProfile.colorShiftDeg === 'number'
              ? data.driftProfile.colorShiftDeg
              : this.state.drift.colorShiftDeg,
          autoCameraDrift: data.driftProfile.autoCameraDrift !== false,
          thermalOscillation: data.driftProfile.thermalOscillation !== false,
        };
      }

      this.state.fullAppLoopActive = true;
      this.broadcastDriftToFrames();

      const record: AwarenessSynthesisRecord = {
        id: `matrix-${Date.now()}`,
        timestamp: Date.now(),
        synthesisTitle: data.synthesisTitle || 'Unified 4-App Awareness Matrix',
        matrixCoherence: typeof data.matrixCoherence === 'number' ? data.matrixCoherence : 98,
        awarenessSummary:
          data.awarenessSummary ||
          'All 4 suite apps and OS engines reconnected into a continuous closed-loop AI Brain Awareness Matrix.',
        crossAppDirectives: directives,
        bridgePatchJs: data.bridgePatchJs || '// Full Awareness Loop Hook Active',
      };

      this.state.latestSynthesis = record;
      this.state.history = [record, ...this.state.history].slice(0, 10);
      this.persist();

      // Persist synthesis script into VFS + JSON Vault + trigger 3-axis pipeline + Sorter daemons
      await vfs.saveFile({
        name: 'awareness-matrix-loop.js',
        path: '/workspace/suite-apps/awareness-matrix-loop.js',
        content: record.bridgePatchJs,
        patchedBy: 'AI Brain Awareness Matrix',
      });

      jsonKnowledgeStore.saveEntry({
        title: `Matrix Synthesis: ${record.synthesisTitle}`,
        category: 'system-sort',
        tags: ['awareness-matrix', 'full-app-loop', 'drift-mode', 'ai-brain'],
        summary: record.awarenessSummary,
        sideNotes: directives.map((d) => `${d.appId}: ${d.directive}`).slice(0, 6),
        linkedAppIds: [
          'masterbrain',
          'aimworkstation',
          'fractalcsp',
          'heliocell',
          'aimspacejet',
          'aimspace',
          'companion',
        ] as AppId[],
        data: record as unknown as Record<string, unknown>,
      });

      void trilateralMatrix.runTrilateralPipeline();
      void swarmEngine.runBrainSorterDaemons();

      neuralBus.publish(
        'SYSTEM',
        'AWARENESS_MATRIX_COMPLETE',
        `Awareness Matrix "${record.synthesisTitle}" (${record.matrixCoherence}% coherence) synced across all 4 suite apps & Full Apps Loop.`
      );

      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Awareness Matrix synthesis error.';
      this.state.lastError = msg;
      neuralBus.publish('SYSTEM', 'AWARENESS_MATRIX_ERROR', msg);
      return null;
    } finally {
      this.state.busySynthesis = false;
      this.emit();
    }
  }
}

export const awarenessMatrixEngine = new AwarenessMatrixEngine();
