import type { AppId, EngineBlockDefinition } from '../types/os';
import { kernelHealer } from './healerEngine';
import { liquidAudioEngine } from './liquidAudioEngine';
import { neuralBus } from './neuralBus';
import { swarmEngine } from './swarmEngine';
import { synesthesiaEngine } from './synesthesiaEngine';
import { vfs } from './vfs';

const INITIAL_BLOCKS: EngineBlockDefinition[] = [
  {
    id: 'block-swarm',
    appId: 'swarm',
    name: 'Swarm Cognition Engine',
    axis: 'cognitive',
    role: 'Multi-model daemon orchestration, AST/LLM auditing, and real-time patching.',
    capabilities: ['scan_workspace', 'patch_vfs', 'query_mesh'],
    version: '2.1.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-healer',
    appId: 'healer',
    name: 'Autonomous Self-Healer',
    axis: 'cognitive',
    role: 'Continuous invariant verification across VFS, daemons, and WebGL contexts.',
    capabilities: ['verify_invariants', 'recover_daemons', 'audit_health'],
    version: '2.0.4',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-terminal',
    appId: 'terminal',
    name: 'Cognitive REPL Shell',
    axis: 'cognitive',
    role: 'Interactive kernel command interpreter wired to VFS, Swarm, and Snapshots.',
    capabilities: ['exec_command', 'vfs_cli', 'daemon_dispatch'],
    version: '1.4.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-vfs',
    appId: 'drive',
    name: 'Aether Drive IndexedDB VFS',
    axis: 'persistence',
    role: 'Client-side transactional filesystem for .js, .html, .md, and .json artifacts.',
    capabilities: ['read_file', 'write_file', 'integrity_check'],
    version: '3.0.1',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-sandbox',
    appId: 'sandbox',
    name: 'Isolated Sandbox Runtime',
    axis: 'persistence',
    role: 'Strict allow-scripts iframe execution engine with postMessage console bridge.',
    capabilities: ['exec_isolated', 'capture_console', 'hot_reload'],
    version: '1.9.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-snapshots',
    appId: 'snapshots',
    name: 'Time-Travel Snapshot Engine',
    axis: 'persistence',
    role: 'Atomic IndexedDB checkpoints, line-by-line diffs, and rollback recovery.',
    capabilities: ['capture_checkpoint', 'compute_diff', 'atomic_restore'],
    version: '1.6.2',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-synesthesia',
    appId: 'synesthesia',
    name: 'Synesthesia Audio-Visual Kernel',
    axis: 'spatial',
    role: 'FFT spectral analyzer + circadian phase + load-driven 3D shader theming.',
    capabilities: ['fft_analyze', 'morph_css_vars', 'circadian_shift'],
    version: '2.3.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-liquid-audio',
    appId: 'liquidmp3',
    name: 'Liquid MP3 Free-Flow Engine',
    axis: 'spatial',
    role: 'MP3/WebAudio decoder, elastic flow-rate synth, and ferrofluid wave dynamics.',
    capabilities: ['play_mp3', 'flow_drift', 'route_to_kernel'],
    version: '1.0.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-forge',
    appId: 'modelforge',
    name: 'PBR 3D Model Forge',
    axis: 'spatial',
    role: 'Gemini PBR synthesis, procedural multi-part 3D geometry, and GLB binary export.',
    capabilities: ['synthesize_pbr', 'stress_test', 'export_glb'],
    version: '2.5.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'active',
  },
  {
    id: 'block-physics',
    appId: 'gamedev',
    name: '3D Rigid-Body Matrix Engine',
    axis: 'spatial',
    role: 'Real-time Three.js gravity arena with composite actors and kinetic raycasting.',
    capabilities: ['step_physics', 'spawn_actor', 'apply_impulse'],
    version: '1.8.0',
    invocations: 0,
    lastLatencyMs: 0,
    status: 'standby',
  },
];

type BlockListener = (blocks: EngineBlockDefinition[]) => void;

class EngineBlockRegistry {
  private blocks: EngineBlockDefinition[] = INITIAL_BLOCKS;
  private listeners = new Set<BlockListener>();

  getBlocks(): EngineBlockDefinition[] {
    return this.blocks;
  }

  subscribe(listener: BlockListener): () => void {
    this.listeners.add(listener);
    listener([...this.blocks]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private recordMetric(blockId: string, latencyMs: number): void {
    this.blocks = this.blocks.map((b) =>
      b.id === blockId
        ? { ...b, invocations: b.invocations + 1, lastLatencyMs: Math.max(1, Math.round(latencyMs)), status: 'active' }
        : b
    );
    this.listeners.forEach((cb) => cb([...this.blocks]));
  }

  async invokeBlock(
    blockId: string,
    openAppFn?: (id: AppId) => void
  ): Promise<{ ok: boolean; output: string; latencyMs: number }> {
    const start = performance.now();
    let output = '';

    switch (blockId) {
      case 'block-swarm': {
        const findings = await swarmEngine.runAllEnabled();
        output = `Swarm block scanned workspace: ${findings.length} finding(s) produced.`;
        break;
      }
      case 'block-healer': {
        await kernelHealer.runHealthCheck(true);
        output = `Healer block verified invariants. Health: ${kernelHealer.getState().health}%.`;
        break;
      }
      case 'block-vfs': {
        const integrity = await vfs.verifyIntegrity();
        output = `VFS block verified ${integrity.fileCount} files (${integrity.totalBytes} B).`;
        break;
      }
      case 'block-snapshots': {
        const snap = await vfs.createSnapshot('Engine Block Checkpoint', 'Invoked from Smart Engine Block Library');
        output = `Snapshot block captured "${snap.label}" (${snap.files.length} files).`;
        break;
      }
      case 'block-liquid-audio': {
        liquidAudioEngine.togglePlay();
        const st = liquidAudioEngine.getState();
        output = `Liquid Audio block ${st.playing ? 'started' : 'paused'} stream (${st.flowRate.toFixed(2)}x flow).`;
        break;
      }
      case 'block-synesthesia': {
        const nextPhase = synesthesiaEngine.getState().resolvedPhase === 'midnight' ? 'dusk' : 'midnight';
        synesthesiaEngine.setCircadianMode(nextPhase);
        output = `Synesthesia block shifted harmonic phase to ${nextPhase}.`;
        break;
      }
      default: {
        const def = this.blocks.find((b) => b.id === blockId);
        if (def && openAppFn) {
          openAppFn(def.appId);
          output = `Activated ${def.name} workspace surface.`;
        } else {
          output = `Executed ${blockId} readiness probe.`;
        }
      }
    }

    const latencyMs = Math.max(1, Math.round(performance.now() - start));
    this.recordMetric(blockId, latencyMs);
    neuralBus.publish('TRILATERAL', 'BLOCK_INVOKED', `${blockId}: ${output} (${latencyMs}ms)`);
    return { ok: true, output, latencyMs };
  }
}

export const engineBlocks = new EngineBlockRegistry();
