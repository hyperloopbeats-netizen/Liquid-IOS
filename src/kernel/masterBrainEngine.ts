import type { DaemonRole, MasterBrainPlan } from '../types/os';
import { OS_APPS } from './appRegistry';
import { desktopFolderEngine } from './desktopFolderEngine';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { swarmEngine } from './swarmEngine';
import { vfs } from './vfs';

const PLAN_STORAGE_KEY = 'AetherOS_MasterBrainPlans_v1';

type BrainListener = (state: {
  busy: boolean;
  coherenceScore: number;
  plans: MasterBrainPlan[];
  lastError: string | null;
}) => void;

class MasterBrainEngine {
  private busy = false;
  private coherenceScore = 92;
  private plans: MasterBrainPlan[] = [];
  private lastError: string | null = null;
  private listeners = new Set<BrainListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(PLAN_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as MasterBrainPlan[];
        if (Array.isArray(parsed)) this.plans = parsed;
      }
    } catch {
      this.plans = [];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(this.plans.slice(0, 12)));
    } catch {
      // ignore
    }
  }

  private emit(): void {
    const snap = {
      busy: this.busy,
      coherenceScore: this.coherenceScore,
      plans: this.plans,
      lastError: this.lastError,
    };
    this.listeners.forEach((cb) => cb(snap));
  }

  subscribe(listener: BrainListener): () => void {
    this.listeners.add(listener);
    listener({
      busy: this.busy,
      coherenceScore: this.coherenceScore,
      plans: this.plans,
      lastError: this.lastError,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState() {
    return {
      busy: this.busy,
      coherenceScore: this.coherenceScore,
      plans: this.plans,
      lastError: this.lastError,
    };
  }

  async runMasterSort(directive?: string): Promise<MasterBrainPlan | null> {
    if (this.busy) return null;
    this.busy = true;
    this.lastError = null;
    this.emit();

    neuralBus.publish(
      'SYSTEM',
      'MASTER_BRAIN_SORT_START',
      'Master Brain synchronizing 10 Sorting Daemons, JSON Vault, Printed Apps, and Organic Folders...'
    );

    try {
      await vfs.init();
      const vfsFiles = vfs.getFiles();
      const jsonEntries = jsonKnowledgeStore.getEntries();
      const printedApps = printedAppsStore.getApps();
      const folders = desktopFolderEngine.getFolders();
      const sorterDaemons = swarmEngine
        .getDaemons()
        .filter(
          (d) =>
            d.category === 'brain-sorter' ||
            d.category === 'unificator-support' ||
            d.category === 'aimspace-assist'
        )
        .map((d) => ({ role: d.role, name: d.name, category: d.category }));

      const res = await fetch('/api/masterbrain/sort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directive: directive?.trim() || 'Sort and interconnect all games, sprites, JSON library records, and daemons cleanly.',
          snapshot: {
            vfsFiles: vfsFiles.slice(0, 18).map((f) => ({ name: f.name, kind: f.kind, size: f.size })),
            jsonEntries: jsonEntries.slice(0, 18).map((e) => ({ id: e.id, title: e.title, category: e.category, tags: e.tags })),
            printedApps: printedApps.slice(0, 12).map((p) => ({ id: p.id, name: p.name, version: p.version })),
            folders: folders.map((f) => ({ name: f.name, count: f.appIds.length })),
            builtInApps: OS_APPS.map((a) => ({ id: a.id, name: a.shortName, axis: a.axis })),
            sorterDaemons,
          },
        }),
      });

      const data = (await res.json()) as {
        coherenceScore?: number;
        summary?: string;
        dispatchedDaemons?: DaemonRole[];
        folderActions?: Array<{ folderName: string; appIds: string[]; reason: string }>;
        crossAppLinks?: Array<{ sourceApp: string; targetApp: string; payloadSummary: string }>;
        researchRecommendations?: string[];
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Master Brain orchestration failed.');
      }

      // Run all 10 Brain Sorter Daemons + 20 Unificator & Engine Support Daemons (30 Brain-linked daemons)
      await swarmEngine.runBrainSorterDaemons();
      await swarmEngine.runUnificatorSupportDaemons();

      const plan: MasterBrainPlan = {
        id: `brain-plan-${Date.now()}`,
        timestamp: Date.now(),
        coherenceScore: typeof data.coherenceScore === 'number' ? data.coherenceScore : 97,
        summary: data.summary || 'Master Brain aligned all 10 Brain Sorters + 20 Unificator Support Daemons & Smart App Tab.',
        dispatchedDaemons: Array.isArray(data.dispatchedDaemons) ? data.dispatchedDaemons : [],
        folderActions: Array.isArray(data.folderActions) ? data.folderActions : [],
        crossAppLinks: Array.isArray(data.crossAppLinks) ? data.crossAppLinks : [],
        researchRecommendations: Array.isArray(data.researchRecommendations) ? data.researchRecommendations : [],
      };

      this.coherenceScore = plan.coherenceScore;
      this.plans = [plan, ...this.plans].slice(0, 12);
      this.persist();

      // Store Master Brain sort report inside JSON Knowledge Vault automatically
      jsonKnowledgeStore.saveEntry({
        title: `Master Brain Sort Report (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
        category: 'system-sort',
        tags: ['master-brain', 'daemons', 'unificator-support', 'smart-sort'],
        summary: plan.summary,
        sideNotes: plan.researchRecommendations.slice(0, 5),
        linkedAppIds: ['masterbrain', 'aimspace', 'codeunifier', 'meshunifier', 'kineticengine', 'voxelengine', 'swarm'],
        data: plan as unknown as Record<string, unknown>,
      });

      neuralBus.publish(
        'SYSTEM',
        'MASTER_BRAIN_SORT_DONE',
        `Master Brain reached ${plan.coherenceScore}% coherence across 30 Brain-linked daemons & ${plan.crossAppLinks.length} links.`
      );

      return plan;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Master Brain sort error';
      this.lastError = msg;
      neuralBus.publish('SYSTEM', 'MASTER_BRAIN_ERROR', msg);
      return null;
    } finally {
      this.busy = false;
      this.emit();
    }
  }
}

export const masterBrainEngine = new MasterBrainEngine();
