import type { AppId, SentientContentDraft } from '../types/os';
import { awarenessMatrixEngine, SUITE_APP_CATALOG, type SuiteAppId } from './awarenessMatrixEngine';
import { codeClusterStore } from './codeClusterStore';
import { hybridSynthEngine } from './hybridSynthEngine';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { masterBrainEngine } from './masterBrainEngine';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { smartBrainItemStore } from './smartBrainItemStore';
import { swarmEngine } from './swarmEngine';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_SentientCoreDrafts_v1';

export interface SentientCoreState {
  drafts: SentientContentDraft[];
  activeDraftId: string | null;
  autonomousThinking: boolean;
  selfImproveCycles: number;
  busyGenerating: boolean;
  busyMinting: boolean;
  lastThought: string;
  lastError: string | null;
}

type SentientListener = (state: SentientCoreState) => void;

class SentientCoreEngine {
  private drafts: SentientContentDraft[] = [];
  private activeDraftId: string | null = null;
  private autonomousThinking = true;
  private selfImproveCycles = 0;
  private busyGenerating = false;
  private busyMinting = false;
  private lastThought =
    'All 14 Integrated Apps, 103 Daemons, Playground Clusters, and 10-Daemon Hybrid Synthesizer are unified.';
  private lastError: string | null = null;
  private listeners = new Set<SentientListener>();
  private thinkTimer: number | null = null;

  constructor() {
    this.load();
    this.startAutonomousThinkingLoop();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SentientContentDraft[];
        if (Array.isArray(parsed)) {
          this.drafts = parsed;
          this.activeDraftId = parsed[0]?.id ?? null;
        }
      }
    } catch {
      // ignore
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.drafts.slice(0, 12)));
    } catch {
      // ignore
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((cb) => cb(snap));
  }

  getState(): SentientCoreState {
    return {
      drafts: this.drafts,
      activeDraftId: this.activeDraftId,
      autonomousThinking: this.autonomousThinking,
      selfImproveCycles: this.selfImproveCycles,
      busyGenerating: this.busyGenerating,
      busyMinting: this.busyMinting,
      lastThought: this.lastThought,
      lastError: this.lastError,
    };
  }

  subscribe(listener: SentientListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  selectDraft(id: string): void {
    this.activeDraftId = id;
    this.emit();
  }

  private startAutonomousThinkingLoop(): void {
    if (typeof window === 'undefined' || this.thinkTimer !== null) return;
    this.thinkTimer = window.setInterval(() => {
      if (!this.autonomousThinking) return;
      const suiteIds = Object.keys(SUITE_APP_CATALOG) as SuiteAppId[];
      const pick = suiteIds[this.selfImproveCycles % suiteIds.length];
      awarenessMatrixEngine.triggerAutonomousThinkCycle(
        pick,
        `Sentient Core linked ${SUITE_APP_CATALOG[pick].shortTitle} telemetry with Playground Clusters & Hybrid Daemons.`
      );
      this.lastThought = `Autonomous pulse synced ${SUITE_APP_CATALOG[pick].shortTitle} -> Cluster Graph -> Sentient Prompt Core.`;
      this.emit();
    }, 18_000);
  }

  toggleAutonomousThinking(force?: boolean): void {
    this.autonomousThinking = typeof force === 'boolean' ? force : !this.autonomousThinking;
    this.emit();
    neuralBus.publish(
      'SWARM',
      'SENTIENT_AUTONOMY',
      `Sentient Autonomous Thinking ${this.autonomousThinking ? 'ENGAGED' : 'PAUSED'}.`
    );
  }

  async runCohesiveSelfImprovementCycle(): Promise<string> {
    this.selfImproveCycles += 1;
    await vfs.init();
    const harvested = await codeClusterStore.harvestFromVfsModules();
    await swarmEngine.runHybridSynthDaemons(`Cohesive Sentient Cycle #${this.selfImproveCycles}`);
    await swarmEngine.runBrainSorterDaemons();
    awarenessMatrixEngine.triggerAutonomousThinkCycle(
      undefined,
      `Cohesive Sentient Cycle #${this.selfImproveCycles}: unified 14 integrated apps, 103 daemons, and ${codeClusterStore.getState().clusters.length} library clusters.`
    );
    const matrix = awarenessMatrixEngine.getState();
    Object.keys(SUITE_APP_CATALOG).forEach((sid) => {
      if (matrix.telemetry[sid as SuiteAppId]?.connected) {
        awarenessMatrixEngine.triggerSelfImprovement(sid as SuiteAppId);
      }
    });
    this.lastThought = `Self-Improvement Cycle #${this.selfImproveCycles} complete: harvested ${harvested} new module(s) & synchronized 103 daemons.`;
    this.emit();
    neuralBus.publish('SYSTEM', 'SENTIENT_SELF_IMPROVE_CYCLE', this.lastThought);
    return this.lastThought;
  }

  async generateFromMainPrompt(params: {
    prompt: string;
    kind: SentientContentDraft['kind'];
    selectedClusterIds?: string[];
    refineExistingId?: string;
  }): Promise<SentientContentDraft | null> {
    const cleanPrompt = params.prompt.trim();
    if (!cleanPrompt || this.busyGenerating) return null;

    this.busyGenerating = true;
    this.lastError = null;
    this.emit();

    try {
      const clusters = codeClusterStore.getState().clusters;
      const pickedClusters =
        params.selectedClusterIds && params.selectedClusterIds.length > 0
          ? clusters.filter((c) => params.selectedClusterIds!.includes(c.id))
          : clusters.slice(0, 4);

      const previousDraft = params.refineExistingId
        ? this.drafts.find((d) => d.id === params.refineExistingId)
        : undefined;

      const systemTelemetry = {
        integratedAppsCount: Object.keys(SUITE_APP_CATALOG).length,
        totalDaemons: swarmEngine.getDaemons().length,
        hybridBuildsCount: hybridSynthEngine.getState().builds.length,
        smartBrainItemsCount: smartBrainItemStore.getState().items.length,
        masterBrainCoherence: masterBrainEngine.getState().coherenceScore,
        vfsFileCount: vfs.getFiles().length,
      };

      const res = await fetch('/api/sentient/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          kind: params.kind,
          clusterContext: pickedClusters.map((c) => `${c.name} [${c.domain}]: ${c.summary}`),
          systemTelemetry,
          previousHtml: previousDraft?.html5Code,
        }),
      });

      const data = (await res.json()) as {
        title?: string;
        kind?: SentientContentDraft['kind'];
        synthesizedNarrative?: string;
        architectureNotes?: string;
        smartItemName?: string;
        smartItemSummary?: string;
        smartItemSnippet?: string;
        html5Code?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Sentient AI content generation failed.');
      }

      const now = Date.now();
      const draft: SentientContentDraft = {
        id: previousDraft ? previousDraft.id : `sentient-${now}`,
        title: data.title || 'Sentient Creation',
        kind: data.kind || params.kind,
        userPrompt: cleanPrompt,
        synthesizedNarrative: data.synthesizedNarrative || 'Synthesized by Cohesive Sentient Core.',
        architectureNotes: data.architectureNotes || 'Powered by Library Clusters & 10 Hybrid Daemons.',
        systemsUsed: [
          'Sentient AI Core',
          'Live Playground Clusters',
          '10-Daemon Hybrid Synthesizer',
          'Master Brain & Awareness Matrix',
          'Smart Brain Item Forge',
        ],
        clustersBound: pickedClusters.map((c) => c.name),
        daemonsEngaged: swarmEngine.getDaemons().length,
        smartItemName: data.smartItemName,
        smartItemSummary: data.smartItemSummary,
        smartItemSnippet: data.smartItemSnippet,
        html5Code: data.html5Code || '<!doctype html><html><body><h1>Sentient Draft</h1></body></html>',
        revision: previousDraft ? previousDraft.revision + 1 : 1,
        mintedAppId: previousDraft?.mintedAppId,
        createdAt: previousDraft ? previousDraft.createdAt : now,
        updatedAt: now,
      };

      if (previousDraft) {
        this.drafts = this.drafts.map((d) => (d.id === draft.id ? draft : d));
      } else {
        this.drafts = [draft, ...this.drafts].slice(0, 12);
      }
      this.activeDraftId = draft.id;
      this.lastThought = `Generated "${draft.title}" (rev ${draft.revision}) using ${draft.clustersBound.length} cluster(s) & ${draft.daemonsEngaged} daemons.`;
      this.persist();

      // Auto-register Smart Brain item & JSON Vault knowledge entry
      if (draft.smartItemName && draft.smartItemSnippet) {
        jsonKnowledgeStore.saveEntry({
          title: `Sentient Content: ${draft.title}`,
          category: 'research',
          tags: ['sentient-ai', draft.kind, ...draft.clustersBound],
          summary: draft.synthesizedNarrative,
          sideNotes: [draft.architectureNotes, `Smart Module: ${draft.smartItemName}`],
          linkedAppIds: ['sentientai', 'synthhybrid', 'liveplayground', 'smartbrain'],
          data: { smartItemName: draft.smartItemName, snippet: draft.smartItemSnippet },
        });
      }

      await vfs.saveFile({
        name: `${draft.id}.html`,
        path: `/workspace/sentient-drafts/${draft.id}.html`,
        content: draft.html5Code,
        patchedBy: 'Sentient AI Core',
      });

      neuralBus.publish('SYSTEM', 'SENTIENT_CONTENT_GENERATED', this.lastThought);
      return draft;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Sentient generation error.';
      return null;
    } finally {
      this.busyGenerating = false;
      this.emit();
    }
  }

  async mintDraftAsApp(draftId: string): Promise<AppId | null> {
    const draft = this.drafts.find((d) => d.id === draftId);
    if (!draft || this.busyMinting) return null;

    this.busyMinting = true;
    this.lastError = null;
    this.emit();

    try {
      // Coordinate all systems before minting into a full standalone OS app
      await swarmEngine.runHybridSynthDaemons(`Minting App: ${draft.title}`);
      await swarmEngine.runBrainSorterDaemons();
      awarenessMatrixEngine.triggerAutonomousThinkCycle(
        undefined,
        `Minted "${draft.title}" as live OS App from unified Sentient systems.`
      );

      const printed = await printedAppsStore.printApp({
        id: draft.mintedAppId as `printed:${string}` | undefined,
        name: draft.title,
        description: `${draft.synthesizedNarrative} (${draft.clustersBound.join(' + ')})`,
        html: draft.html5Code,
        improvementNote: `Minted from Sentient Main Prompt Window (rev ${draft.revision}) using all combined OS systems.`,
      });

      const updated: SentientContentDraft = {
        ...draft,
        mintedAppId: printed.id,
        updatedAt: Date.now(),
      };
      this.drafts = this.drafts.map((d) => (d.id === draft.id ? updated : d));
      this.lastThought = `Minted "${draft.title}" as permanent OS App (${printed.id}) across Library, Smart Tab, & VFS.`;
      this.persist();

      neuralBus.publish('SANDBOX', 'SENTIENT_APP_MINTED', this.lastThought);
      return printed.id;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Minting failed.';
      return null;
    } finally {
      this.busyMinting = false;
      this.emit();
    }
  }
}

export const sentientCoreEngine = new SentientCoreEngine();
