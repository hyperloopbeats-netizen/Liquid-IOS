import type { AppId, TrilateralRule, TrilateralState } from '../types/os';
import { engineBlocks } from './engineBlocks';
import { kernelHealer } from './healerEngine';
import { liquidAudioEngine } from './liquidAudioEngine';
import { neuralBus } from './neuralBus';
import { swarmEngine } from './swarmEngine';
import { synesthesiaEngine } from './synesthesiaEngine';
import { vfs } from './vfs';

const INITIAL_RULES: TrilateralRule[] = [
  {
    id: 'rule-anomaly-snap',
    name: 'Cognitive Anomaly → Persistence Checkpoint',
    description: 'Automatically captures a Time-Travel Snapshot whenever the Self-Healer detects an anomaly.',
    sourceAxis: 'cognitive',
    targetAxis: 'persistence',
    enabled: true,
    triggersCount: 0,
  },
  {
    id: 'rule-vfs-spatial',
    name: 'Persistence Write → Spatial Harmonic Pulse',
    description: 'Boosts Synesthesia reactivity briefly when a file is written or patched in Aether Drive.',
    sourceAxis: 'persistence',
    targetAxis: 'spatial',
    enabled: true,
    triggersCount: 0,
  },
  {
    id: 'rule-audio-cognition',
    name: 'Spatial Flow State → Cognitive Vigilance',
    description: 'Tracks Liquid Audio & FFT flow energy to balance Cognitive node coherence telemetry.',
    sourceAxis: 'spatial',
    targetAxis: 'cognitive',
    enabled: true,
    triggersCount: 0,
  },
];

type TrilateralListener = (state: TrilateralState) => void;

class TrilateralExpansionMatrix {
  private state: TrilateralState = {
    cognitiveEnergy: 0.42,
    spatialEnergy: 0.36,
    persistenceEnergy: 0.48,
    coherence: 0.96,
    activePreset: 'custom',
    rules: INITIAL_RULES,
    lastPipelineLog: ['Trilateral Expansion Matrix online. Ready for cross-axis chaining.'],
  };

  private listeners = new Set<TrilateralListener>();

  constructor() {
    neuralBus.subscribe((_all, latest) => {
      if (!latest) return;
      this.handleBusSignal(latest.channel, latest.type);
    });

    synesthesiaEngine.subscribe((syn) => {
      const targetSpatial = Math.min(1, 0.25 + syn.rms * 0.65 + syn.systemLoad * 0.25);
      if (Math.abs(targetSpatial - this.state.spatialEnergy) > 0.04) {
        this.state.spatialEnergy = Number(targetSpatial.toFixed(2));
        this.recalculateCoherence();
        this.emit();
      }
    });
  }

  getState(): TrilateralState {
    return this.state;
  }

  subscribe(listener: TrilateralListener): () => void {
    this.listeners.add(listener);
    listener(this.cloneState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private cloneState(): TrilateralState {
    return {
      ...this.state,
      rules: this.state.rules.map((r) => ({ ...r })),
      lastPipelineLog: [...this.state.lastPipelineLog],
    };
  }

  private emit(): void {
    const snap = this.cloneState();
    this.listeners.forEach((cb) => cb(snap));
  }

  private recalculateCoherence(): void {
    const { cognitiveEnergy, spatialEnergy, persistenceEnergy } = this.state;
    const mean = (cognitiveEnergy + spatialEnergy + persistenceEnergy) / 3;
    const variance =
      (Math.abs(cognitiveEnergy - mean) +
        Math.abs(spatialEnergy - mean) +
        Math.abs(persistenceEnergy - mean)) /
      3;
    this.state.coherence = Number(Math.max(0.7, Math.min(0.999, 1 - variance * 0.45)).toFixed(3));
  }

  private bumpRule(ruleId: string): void {
    this.state.rules = this.state.rules.map((r) =>
      r.id === ruleId ? { ...r, triggersCount: r.triggersCount + 1 } : r
    );
  }

  private handleBusSignal(channel: string, type: string): void {
    if (channel === 'HEALER' && type === 'ANOMALY_DETECTED') {
      const rule = this.state.rules.find((r) => r.id === 'rule-anomaly-snap');
      if (rule?.enabled) {
        this.bumpRule(rule.id);
        void vfs.createSnapshot('Trilateral Guard Auto-Checkpoint', 'Triggered by Cognitive Anomaly signal');
      }
      this.state.cognitiveEnergy = Math.min(1, Number((this.state.cognitiveEnergy + 0.14).toFixed(2)));
    } else if (channel === 'VFS' && (type === 'VFS_WRITE' || type === 'VFS_PATCHED')) {
      const rule = this.state.rules.find((r) => r.id === 'rule-vfs-spatial');
      if (rule?.enabled) {
        this.bumpRule(rule.id);
        const current = synesthesiaEngine.getState().reactivity;
        synesthesiaEngine.setReactivity(Math.min(2.2, Number((current + 0.1).toFixed(1))));
      }
      this.state.persistenceEnergy = Math.min(1, Number((this.state.persistenceEnergy + 0.12).toFixed(2)));
    } else if (channel === 'SWARM') {
      this.state.cognitiveEnergy = Math.min(1, Number((this.state.cognitiveEnergy + 0.1).toFixed(2)));
    } else if (channel === 'AUDIO' && type === 'LIQUID_PLAY') {
      const rule = this.state.rules.find((r) => r.id === 'rule-audio-cognition');
      if (rule?.enabled) {
        this.bumpRule(rule.id);
      }
    }
    this.recalculateCoherence();
    this.emit();
  }

  toggleRule(ruleId: string): void {
    this.state.rules = this.state.rules.map((r) =>
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    );
    this.emit();
  }

  getPresetApps(preset: 'research' | 'flow' | 'resilience'): {
    apps: AppId[];
    label: string;
    circadian?: 'dawn' | 'noon' | 'dusk' | 'midnight';
  } {
    this.state.activePreset = preset;
    this.emit();
    if (preset === 'research') {
      neuralBus.publish('TRILATERAL', 'TRIAD_RESEARCH', 'Activated Research Triad (Swarm + Aether Drive + Terminal).');
      return { apps: ['swarm', 'drive', 'terminal'], label: 'Research Triad', circadian: 'noon' };
    }
    if (preset === 'flow') {
      neuralBus.publish('TRILATERAL', 'TRIAD_FLOW', 'Activated Audio-Visual Flow Triad (Liquid MP3 + Synesthesia + Model Forge).');
      return { apps: ['liquidmp3', 'synesthesia', 'modelforge'], label: 'Flow Triad', circadian: 'dusk' };
    }
    neuralBus.publish('TRILATERAL', 'TRIAD_RESILIENCE', 'Activated Resilience Triad (Self-Healer + Snapshots + Neural Bus).');
    return { apps: ['healer', 'snapshots', 'neuralbus'], label: 'Resilience Triad', circadian: 'midnight' };
  }

  async runTrilateralPipeline(): Promise<string[]> {
    const logs: string[] = [];
    const push = (msg: string) => {
      const ts = new Date().toTimeString().split(' ')[0];
      logs.push(`[${ts}] ${msg}`);
    };

    push('Stage 1 [Persistence Axis]: Verifying IndexedDB Aether Drive & capturing pre-pipeline checkpoint...');
    const integrity = await vfs.verifyIntegrity();
    const snap = await vfs.createSnapshot('Trilateral Pipeline Guard', '3-Axis Cross-Block Pipeline execution');
    await engineBlocks.invokeBlock('block-vfs');
    push(`Stage 1 OK: ${integrity.fileCount} files verified (${integrity.totalBytes} B), snapshot "${snap.label}" stored.`);

    push('Stage 2 [Cognitive Axis]: Dispatching Swarm Daemons & Kernel Self-Healer...');
    const findings = await swarmEngine.runAllEnabled();
    await kernelHealer.runHealthCheck(false);
    await engineBlocks.invokeBlock('block-swarm');
    push(`Stage 2 OK: Swarm produced ${findings.length} finding(s); Kernel Health ${kernelHealer.getState().health}%.`);

    push('Stage 3 [Spatial Axis]: Synchronizing Synesthesia Kernel & Liquid Audio spectrum...');
    const liq = liquidAudioEngine.getState();
    synesthesiaEngine.setSystemLoad(Math.min(1, 0.45 + findings.length * 0.05));
    push(`Stage 3 OK: Spatial Hue ${synesthesiaEngine.getState().activeHue}°, Liquid Flow ${liq.flowRate.toFixed(2)}x.`);

    this.state.cognitiveEnergy = 0.86;
    this.state.persistenceEnergy = 0.84;
    this.state.spatialEnergy = Math.max(this.state.spatialEnergy, 0.72);
    this.recalculateCoherence();
    this.state.lastPipelineLog = logs;
    this.emit();

    neuralBus.publish('TRILATERAL', 'PIPELINE_COMPLETE', `3-Axis Trilateral Pipeline completed (${findings.length} findings, ${integrity.fileCount} files).`);
    return logs;
  }
}

export const trilateralMatrix = new TrilateralExpansionMatrix();
