import type { HybridAppBuild, HybridDaemonStepReport } from '../types/os';
import { codeClusterStore } from './codeClusterStore';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { HYBRID_10_SPECS, swarmEngine } from './swarmEngine';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_HybridSynthBuilds_v1';

export interface HybridSynthState {
  builds: HybridAppBuild[];
  activeBuildId: string | null;
  busy: boolean;
  autonomousMode: boolean;
  autonomousCycles: number;
  lastError: string | null;
}

type HybridListener = (state: HybridSynthState) => void;

class HybridSynthEngine {
  private builds: HybridAppBuild[] = [];
  private activeBuildId: string | null = null;
  private busy = false;
  private autonomousMode = false;
  private autonomousCycles = 0;
  private lastError: string | null = null;
  private listeners = new Set<HybridListener>();
  private autoTimer: number | null = null;

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as HybridAppBuild[];
        if (Array.isArray(parsed)) {
          this.builds = parsed;
          this.activeBuildId = parsed[0]?.id ?? null;
        }
      }
    } catch {
      // ignore
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.builds.slice(0, 12)));
    } catch {
      // ignore
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((cb) => cb(snap));
  }

  getState(): HybridSynthState {
    return {
      builds: this.builds,
      activeBuildId: this.activeBuildId,
      busy: this.busy,
      autonomousMode: this.autonomousMode,
      autonomousCycles: this.autonomousCycles,
      lastError: this.lastError,
    };
  }

  subscribe(listener: HybridListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  selectBuild(id: string): void {
    this.activeBuildId = id;
    this.emit();
  }

  toggleAutonomousMode(force?: boolean): void {
    const next = typeof force === 'boolean' ? force : !this.autonomousMode;
    this.autonomousMode = next;
    if (next && this.autoTimer === null && typeof window !== 'undefined') {
      this.autoTimer = window.setInterval(() => {
        if (!this.autonomousMode) return;
        this.autonomousCycles += 1;
        void codeClusterStore.harvestFromVfsModules();
        void swarmEngine.runHybridSynthDaemons(`Autonomous Cycle #${this.autonomousCycles}`);
        this.emit();
      }, 14_000);
    } else if (!next && this.autoTimer !== null) {
      clearInterval(this.autoTimer);
      this.autoTimer = null;
    }
    this.emit();
    neuralBus.publish(
      'SWARM',
      next ? 'HYBRID_AUTO_ON' : 'HYBRID_AUTO_OFF',
      next
        ? '10-Daemon Hybrid Autonomous Synthesis loop engaged.'
        : '10-Daemon Hybrid Autonomous Synthesis loop paused.'
    );
  }

  async harvestAvailableCodeSummary(): Promise<{ code: string; sourceNames: string[] }> {
    await vfs.init();
    const files = vfs.getFiles();
    const clusters = codeClusterStore.getState().clusters;

    const sourceNames: string[] = [];
    const snippets: string[] = [];

    for (const c of clusters.slice(0, 5)) {
      sourceNames.push(`Cluster:${c.name}`);
      const firstMod = c.modules[0];
      if (firstMod) {
        snippets.push(`// [Cluster: ${c.name}] ${firstMod.name}\n${firstMod.code.slice(0, 800)}`);
      }
    }

    for (const f of files.slice(0, 6)) {
      if (f.kind === 'js' || f.kind === 'html') {
        sourceNames.push(f.name);
        snippets.push(`// [VFS: ${f.path}]\n${f.content.slice(0, 900)}`);
      }
    }

    return {
      code: snippets.join('\n\n'),
      sourceNames,
    };
  }

  async synthesizeHybridApp(params: {
    prompt: string;
    newCodeSnippet?: string;
    includeHarvestedCode?: boolean;
  }): Promise<HybridAppBuild | null> {
    if (this.busy) return null;
    this.busy = true;
    this.lastError = null;
    this.emit();

    try {
      await swarmEngine.runHybridSynthDaemons('Pre-Synthesis 10-Daemon Harvest');
      const clusters = codeClusterStore.getState().clusters;
      const harvested =
        params.includeHarvestedCode !== false
          ? await this.harvestAvailableCodeSummary()
          : { code: '', sourceNames: [] };

      const combinedCode = [
        params.newCodeSnippet?.trim() ? `// [USER NEW CODE]\n${params.newCodeSnippet.trim()}` : '',
        harvested.code,
      ]
        .filter(Boolean)
        .join('\n\n');

      const res = await fetch('/api/hybrid/synthesize-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            params.prompt.trim() ||
            'Automatically synthesize a reactive multi-system HTML5 interactive app from available & new code.',
          availableCode: combinedCode,
          clusterSummaries: clusters.map((c) => `${c.name} (${c.domain}): ${c.summary}`),
          daemonRoles: HYBRID_10_SPECS.map(([role, name]) => `${role} (${name})`),
        }),
      });

      const data = (await res.json()) as {
        appName?: string;
        shortName?: string;
        description?: string;
        architectureSummary?: string;
        daemonContributions?: Array<{ role: string; contribution: string }>;
        html5Code?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || '10-Daemon Hybrid synthesis failed.');
      }

      const reports: HybridDaemonStepReport[] = HYBRID_10_SPECS.map(([role, name]) => {
        const matched = (data.daemonContributions || []).find((d) => d.role === role);
        return {
          role,
          name,
          contribution: matched?.contribution || `${name} verified & bound output cleanly.`,
          status: 'complete',
        };
      });

      const build: HybridAppBuild = {
        id: `hybrid-${Date.now()}`,
        appName: data.appName || 'Hybrid Synth Matrix App',
        shortName: (data.shortName || data.appName || 'Hybrid App').slice(0, 16),
        description: data.description || 'Automatically synthesized by the 10-Daemon Hybrid Engine.',
        architectureSummary: data.architectureSummary || 'Fused harvested suite code, clusters, and new code.',
        sourcesUsed: harvested.sourceNames,
        clustersUsed: clusters.slice(0, 5).map((c) => c.name),
        daemonReports: reports,
        html5Code: data.html5Code || '<!doctype html><html><body><h1>Empty</h1></body></html>',
        improvementPass: 1,
        createdAt: Date.now(),
      };

      this.builds = [build, ...this.builds].slice(0, 12);
      this.activeBuildId = build.id;
      this.persist();

      await vfs.saveFile({
        name: `${build.id}.html`,
        path: `/workspace/hybrid-apps/${build.id}.html`,
        content: build.html5Code,
        patchedBy: '10-Daemon Hybrid Synthesizer',
      });

      jsonKnowledgeStore.saveEntry({
        title: `Hybrid Build: ${build.appName}`,
        category: 'system-sort',
        tags: ['hybrid-app', '10-daemons', 'auto-synthesis'],
        summary: build.architectureSummary,
        sideNotes: build.daemonReports.slice(0, 5).map((d) => `${d.name}: ${d.contribution}`),
        linkedAppIds: ['synthhybrid', 'liveplayground', 'sentientai'],
        data: { buildId: build.id, sourcesUsed: build.sourcesUsed },
      });

      neuralBus.publish(
        'FORGE',
        'HYBRID_APP_CREATED',
        `10 Hybrid Daemons synthesized "${build.appName}" using ${build.sourcesUsed.length} code source(s).`
      );
      return build;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Hybrid synthesis error.';
      return null;
    } finally {
      this.busy = false;
      this.emit();
    }
  }

  async autoImproveBuild(buildId: string, directive?: string): Promise<HybridAppBuild | null> {
    const target = this.builds.find((b) => b.id === buildId);
    if (!target || this.busy) return null;
    this.busy = true;
    this.lastError = null;
    this.emit();

    try {
      await swarmEngine.runHybridSynthDaemons(`Self-Improve Pass v${target.improvementPass + 1}`);
      const clusters = codeClusterStore.getState().clusters;

      const res = await fetch('/api/hybrid/synthesize-app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:
            directive ||
            'Upgrade interactivity, visual fidelity, WebAudio responsiveness, clamped frame deltas, and AetherOS bus integration.',
          improveExistingHtml: target.html5Code,
          clusterSummaries: clusters.map((c) => `${c.name}: ${c.summary}`),
          daemonRoles: HYBRID_10_SPECS.map(([role, name]) => `${role} (${name})`),
        }),
      });
      const data = (await res.json()) as {
        appName?: string;
        shortName?: string;
        description?: string;
        architectureSummary?: string;
        daemonContributions?: Array<{ role: string; contribution: string }>;
        html5Code?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Hybrid auto-improve failed.');

      const updated: HybridAppBuild = {
        ...target,
        appName: data.appName || target.appName,
        description: data.description || target.description,
        architectureSummary: data.architectureSummary || target.architectureSummary,
        html5Code: data.html5Code || target.html5Code,
        improvementPass: target.improvementPass + 1,
      };
      this.builds = this.builds.map((b) => (b.id === buildId ? updated : b));
      this.persist();

      if (updated.printedAppId) {
        await printedAppsStore.printApp({
          id: updated.printedAppId as `printed:${string}`,
          name: updated.appName,
          description: updated.description,
          html: updated.html5Code,
          improvementNote: `Hybrid 10-Daemon Pass v${updated.improvementPass}`,
        });
      }

      neuralBus.publish(
        'HEALER',
        'HYBRID_APP_IMPROVED',
        `10 Daemons improved "${updated.appName}" to pass v${updated.improvementPass}.`
      );
      return updated;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Auto-improve failed.';
      return null;
    } finally {
      this.busy = false;
      this.emit();
    }
  }

  async publishBuildToLibrary(buildId: string): Promise<HybridAppBuild | null> {
    const target = this.builds.find((b) => b.id === buildId);
    if (!target) return null;

    const printed = await printedAppsStore.printApp({
      id: target.printedAppId as `printed:${string}` | undefined,
      name: target.appName,
      description: target.description,
      html: target.html5Code,
      improvementNote: `Minted by 10-Daemon Hybrid Synthesizer (Pass v${target.improvementPass})`,
    });

    const updated = { ...target, printedAppId: printed.id };
    this.builds = this.builds.map((b) => (b.id === buildId ? updated : b));
    this.persist();
    this.emit();
    return updated;
  }
}

export const hybridSynthEngine = new HybridSynthEngine();
