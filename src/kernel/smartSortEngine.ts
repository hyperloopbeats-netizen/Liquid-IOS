import type {
  AppId,
  PrintedAppDefinition,
  SmartSortedAppEntry,
  SmartSortGroupKey,
} from '../types/os';
import { OS_APPS } from './appRegistry';
import { desktopFolderEngine } from './desktopFolderEngine';
import { neuralBus } from './neuralBus';

const STORAGE_KEY = 'AetherOS_SmartAppSort_v1';

export const SMART_TAB_GROUPS: Array<{ key: SmartSortGroupKey; label: string }> = [
  { key: 'smart-auto', label: 'Smart Auto' },
  { key: 'game-engines', label: 'Game Engines' },
  { key: 'unificators', label: 'Unificators' },
  { key: 'brain-daemons', label: 'Brain & 103 Daemons' },
  { key: 'media-synth', label: 'Media & Audio' },
  { key: 'workspace', label: 'VFS & Tools' },
];

const BRAIN_PRIORITY_BOOST: Partial<Record<AppId, number>> = {
  sentientai: 34,
  synthhybrid: 32,
  liveplayground: 30,
  companion: 28,
  aimspace: 27,
  aimworkstation: 26,
  aimspacejet: 25,
  heliocell: 24,
  fractalcsp: 23,
  modelforgesuite: 23,
  sovereignfps: 23,
  odonatamesh: 22,
  sentientsun: 22,
  cometicmatrix: 21,
  aimosnexus: 23,
  liquidquantum: 21,
  cometicballistic: 22,
  zerocrossingcad: 21,
  aimosv7: 24,
  codeunifier: 24,
  meshunifier: 23,
  kineticengine: 22,
  voxelengine: 22,
  masterbrain: 21,
  smartbrain: 20,
  hyperface: 18,
  gameforge: 17,
  architect: 16,
  swarm: 15,
};

function classifyAppGroup(id: string, name: string, category: string): SmartSortGroupKey {
  const hay = `${id} ${name} ${category}`.toLowerCase();

  if (
    id === 'synthhybrid' ||
    id === 'liveplayground' ||
    id === 'codeunifier' ||
    id === 'meshunifier' ||
    id === 'architect' ||
    id === 'htmlprinter' ||
    id === 'auditor' ||
    id === 'sandbox' ||
    id === 'zerocrossingcad'
  ) {
    return 'unificators';
  }
  if (
    id === 'aimspace' ||
    id === 'aimspacejet' ||
    id === 'fractalcsp' ||
    id === 'heliocell' ||
    id === 'sovereignfps' ||
    id === 'aimosnexus' ||
    id === 'cometicballistic' ||
    id === 'cometicmatrix' ||
    id === 'modelforgesuite' ||
    id === 'kineticengine' ||
    id === 'voxelengine' ||
    id === 'gameforge' ||
    id === 'doom3d' ||
    id === 'gamedev' ||
    id === 'hyperface' ||
    id === 'spritecomposer' ||
    /game|engine|voxel|kinetic|doom|arcade|unified|aimspace|heliocell|fractal|fps|ballistic/.test(hay)
  ) {
    return 'game-engines';
  }
  if (
    id === 'sentientai' ||
    id === 'aimworkstation' ||
    id === 'aimosv7' ||
    id === 'odonatamesh' ||
    id === 'sentientsun' ||
    id === 'masterbrain' ||
    id === 'smartbrain' ||
    id === 'swarm' ||
    id === 'thinkmatrix' ||
    id === 'jsonvault' ||
    id === 'healer' ||
    id === 'blocks' ||
    id === 'neuralbus'
  ) {
    return 'brain-daemons';
  }
  if (
    id === 'liquidquantum' ||
    id === 'streamhub' ||
    id === 'musicstudio' ||
    id === 'videoeditor' ||
    id === 'organicmp4' ||
    id === 'liquidvideo' ||
    id === 'liquidmp3' ||
    id === 'liquideq' ||
    id === 'visualsynth' ||
    id === 'fractalcinema' ||
    id === 'synesthesia'
  ) {
    return 'media-synth';
  }
  return 'workspace';
}

type SortListener = (state: {
  autoSortEnabled: boolean;
  activeTab: SmartSortGroupKey;
  lastSortedAt: number;
  usageCounts: Record<string, number>;
}) => void;

class SmartSortEngine {
  private autoSortEnabled = true;
  private activeTab: SmartSortGroupKey = 'smart-auto';
  private lastSortedAt = Date.now();
  private usageCounts: Record<string, number> = {};
  private listeners = new Set<SortListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as {
          autoSortEnabled?: boolean;
          activeTab?: SmartSortGroupKey;
          usageCounts?: Record<string, number>;
        };
        if (typeof parsed.autoSortEnabled === 'boolean') {
          this.autoSortEnabled = parsed.autoSortEnabled;
        }
        if (parsed.activeTab) this.activeTab = parsed.activeTab;
        if (parsed.usageCounts) this.usageCounts = parsed.usageCounts;
      }
    } catch {
      // ignore
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          autoSortEnabled: this.autoSortEnabled,
          activeTab: this.activeTab,
          usageCounts: this.usageCounts,
        })
      );
    } catch {
      // ignore
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((cb) => cb(snap));
  }

  getState() {
    return {
      autoSortEnabled: this.autoSortEnabled,
      activeTab: this.activeTab,
      lastSortedAt: this.lastSortedAt,
      usageCounts: this.usageCounts,
    };
  }

  subscribe(listener: SortListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setAutoSortEnabled(enabled: boolean): void {
    this.autoSortEnabled = enabled;
    this.lastSortedAt = Date.now();
    this.persist();
    this.emit();
    neuralBus.publish(
      'SYSTEM',
      'SMART_TAB_MODE',
      `Smart App Sort Tab ${enabled ? 'Auto-Sorting ON' : 'Paused'}.`
    );
  }

  setActiveTab(tab: SmartSortGroupKey): void {
    this.activeTab = tab;
    this.persist();
    this.emit();
  }

  recordAppUse(id: AppId): void {
    this.usageCounts[id] = (this.usageCounts[id] || 0) + 1;
    if (this.autoSortEnabled) {
      this.lastSortedAt = Date.now();
    }
    this.persist();
    this.emit();
  }

  getSortedApps(params: {
    printedApps: PrintedAppDefinition[];
    openAppIds: AppId[];
    activeAppId: AppId | null;
    group?: SmartSortGroupKey;
    searchQuery?: string;
  }): SmartSortedAppEntry[] {
    const openSet = new Set(params.openAppIds);
    const targetGroup = params.group ?? this.activeTab;
    const query = (params.searchQuery ?? '').trim().toLowerCase();

    const entries: SmartSortedAppEntry[] = [
      ...OS_APPS.map((a) => {
        const grp = classifyAppGroup(a.id, a.name, a.category);
        const isOpen = openSet.has(a.id);
        const isFocused = params.activeAppId === a.id && isOpen;
        const usage = this.usageCounts[a.id] || 0;
        const boost = BRAIN_PRIORITY_BOOST[a.id] || 0;
        const score = (isFocused ? 120 : 0) + (isOpen ? 48 : 0) + usage * 8 + boost;
        return {
          id: a.id,
          name: a.name,
          shortName: a.shortName,
          category: a.category,
          axis: a.axis,
          accentGradient: a.accentGradient,
          iconName: a.iconName,
          group: grp,
          score,
          isOpen,
          isFocused,
        };
      }),
      ...params.printedApps.map((p) => {
        const grp = classifyAppGroup(p.id, p.name, p.description);
        const isOpen = openSet.has(p.id);
        const isFocused = params.activeAppId === p.id && isOpen;
        const usage = this.usageCounts[p.id] || 0;
        const score = (isFocused ? 120 : 0) + (isOpen ? 48 : 0) + usage * 8 + 14;
        return {
          id: p.id,
          name: p.name,
          shortName: p.shortName,
          category: `Printed v${p.version}`,
          axis: 'persistence' as const,
          accentGradient: p.accentGradient,
          iconName: 'printer',
          group: grp,
          score,
          isOpen,
          isFocused,
        };
      }),
    ];

    return entries
      .filter((e) => (targetGroup === 'smart-auto' ? true : e.group === targetGroup))
      .filter((e) =>
        query
          ? e.name.toLowerCase().includes(query) ||
            e.shortName.toLowerCase().includes(query) ||
            e.category.toLowerCase().includes(query)
          : true
      )
      .sort((a, b) => {
        if (this.autoSortEnabled) {
          if (b.score !== a.score) return b.score - a.score;
        }
        return a.shortName.localeCompare(b.shortName);
      });
  }

  syncSmartGroupsToDesktopFolders(printedApps: PrintedAppDefinition[]): void {
    const entries = this.getSortedApps({
      printedApps,
      openAppIds: [],
      activeAppId: null,
      group: 'smart-auto',
    });

    const folderBuckets: Array<{ folderName: string; group: SmartSortGroupKey }> = [
      { folderName: 'Game & 3D Engines', group: 'game-engines' },
      { folderName: 'Unificators & Code', group: 'unificators' },
      { folderName: 'Brain & 103 Daemons', group: 'brain-daemons' },
      { folderName: 'Media & Audio Pod', group: 'media-synth' },
    ];

    for (const bucket of folderBuckets) {
      const existing = desktopFolderEngine
        .getFolders()
        .find((f) => f.name.toLowerCase() === bucket.folderName.toLowerCase());
      const folder = existing ?? desktopFolderEngine.createFolder(bucket.folderName);
      const matching = entries.filter((e) => e.group === bucket.group).slice(0, 8);
      matching.forEach((app) => {
        desktopFolderEngine.moveAppIntoFolder(app.id, folder.id);
      });
    }

    this.lastSortedAt = Date.now();
    this.emit();
    neuralBus.publish(
      'SYSTEM',
      'SMART_TAB_FOLDERS_SORTED',
      'Smart App Sort Tab automatically organized OS apps & printed builds into Desktop Pods.'
    );
  }
}

export const smartSortEngine = new SmartSortEngine();
