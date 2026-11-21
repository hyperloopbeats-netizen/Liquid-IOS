import type { AppId, OrganicFolder } from '../types/os';
import { DEFAULT_PANEL_APP_IDS } from './appRegistry';
import { neuralBus } from './neuralBus';

const FOLDERS_STORAGE_KEY = 'AetherOS_OrganicFolders_v3';
const PANEL_STORAGE_KEY = 'AetherOS_Panel9Apps_v3';

const DEFAULT_FOLDERS: OrganicFolder[] = [
  {
    id: 'folder-integrated-suite',
    name: 'Integrated Suite',
    hue: 'cyan',
    appIds: [
      'aimworkstation',
      'fractalcsp',
      'heliocell',
      'aimspacejet',
      'modelforgesuite',
      'sovereignfps',
      'odonatamesh',
      'sentientsun',
      'cometicmatrix',
      'aimosnexus',
      'liquidquantum',
      'cometicballistic',
      'zerocrossingcad',
      'aimosv7',
    ],
  },
  {
    id: 'folder-engines-3d',
    name: 'Engines & 3D',
    hue: 'fuchsia',
    appIds: ['kineticengine', 'voxelengine', 'hyperface', 'gameforge', 'doom3d', 'gamedev', 'spritecomposer', 'modelforge'],
  },
  {
    id: 'folder-unify-code',
    name: 'Unify & Code',
    hue: 'cyan',
    appIds: ['codeunifier', 'meshunifier', 'architect', 'htmlprinter', 'drive', 'auditor', 'sandbox'],
  },
  {
    id: 'folder-brain-daemons',
    name: 'Brain & Daemons',
    hue: 'emerald',
    appIds: ['masterbrain', 'smartbrain', 'swarm', 'thinkmatrix', 'jsonvault', 'healer', 'blocks', 'terminal'],
  },
  {
    id: 'folder-media-audio',
    name: 'Media & Audio',
    hue: 'amber',
    appIds: ['streamhub', 'musicstudio', 'videoeditor', 'liquidvideo', 'organicmp4', 'liquidmp3', 'liquideq', 'visualsynth', 'fractalcinema', 'synesthesia'],
  },
  {
    id: 'folder-system-vfs',
    name: 'System & Pace',
    hue: 'indigo',
    appIds: ['snapshots', 'microfractal', 'neuralbus'],
  },
];

const HUES: OrganicFolder['hue'][] = ['cyan', 'emerald', 'fuchsia', 'amber', 'indigo'];

interface DesktopLayoutState {
  folders: OrganicFolder[];
  panelAppIds: AppId[];
}

type FolderListener = (state: DesktopLayoutState) => void;

class DesktopFolderEngine {
  private folders: OrganicFolder[] = [];
  private panelAppIds: AppId[] = [...DEFAULT_PANEL_APP_IDS];
  private listeners = new Set<FolderListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const rawFolders = localStorage.getItem(FOLDERS_STORAGE_KEY);
      if (rawFolders) {
        const parsed = JSON.parse(rawFolders) as OrganicFolder[];
        if (Array.isArray(parsed)) {
          this.folders = parsed;
        }
      } else {
        this.folders = DEFAULT_FOLDERS.map((f) => ({ ...f, appIds: [...f.appIds] }));
      }

      const rawPanel = localStorage.getItem(PANEL_STORAGE_KEY);
      if (rawPanel) {
        const parsedPanel = JSON.parse(rawPanel) as AppId[];
        if (Array.isArray(parsedPanel) && parsedPanel.length === 9) {
          this.panelAppIds = parsedPanel;
        }
      }
    } catch {
      this.folders = DEFAULT_FOLDERS.map((f) => ({ ...f, appIds: [...f.appIds] }));
      this.panelAppIds = [...DEFAULT_PANEL_APP_IDS];
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(this.folders));
      localStorage.setItem(PANEL_STORAGE_KEY, JSON.stringify(this.panelAppIds));
    } catch {
      // ignore quota
    }
  }

  private emit(): void {
    const snap: DesktopLayoutState = {
      folders: this.folders,
      panelAppIds: this.panelAppIds,
    };
    this.listeners.forEach((cb) => cb(snap));
  }

  subscribe(listener: FolderListener): () => void {
    this.listeners.add(listener);
    listener({ folders: this.folders, panelAppIds: this.panelAppIds });
    return () => {
      this.listeners.delete(listener);
    };
  }

  getFolders(): OrganicFolder[] {
    return this.folders;
  }

  getPanelAppIds(): AppId[] {
    return this.panelAppIds.slice(0, 9);
  }

  isAppInAnyFolder(appId: AppId): string | null {
    for (const f of this.folders) {
      if (f.appIds.includes(appId)) return f.id;
    }
    return null;
  }

  moveAppIntoFolder(appId: AppId, folderId: string): void {
    const targetFolder = this.folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    this.folders = this.folders.map((folder) => {
      const cleaned = folder.appIds.filter((id) => id !== appId);
      if (folder.id === folderId) {
        return { ...folder, appIds: [...cleaned, appId] };
      }
      return { ...folder, appIds: cleaned };
    });
    this.persist();
    this.emit();
    neuralBus.publish('SYSTEM', 'FOLDER_ABSORB', `Moved "${appId}" into organic folder "${targetFolder.name}".`);
  }

  extractAppToDesktop(appId: AppId): void {
    let extractedFrom: string | null = null;
    this.folders = this.folders.map((folder) => {
      if (folder.appIds.includes(appId)) {
        extractedFrom = folder.name;
        return { ...folder, appIds: folder.appIds.filter((id) => id !== appId) };
      }
      return folder;
    });
    if (extractedFrom) {
      this.persist();
      this.emit();
      neuralBus.publish('SYSTEM', 'FOLDER_EXTRACT', `Extracted "${appId}" from "${extractedFrom}" to main desktop.`);
    }
  }

  createFolder(name: string, initialAppIds: AppId[] = []): OrganicFolder {
    const clean = name.trim() || `Organic Pod ${this.folders.length + 1}`;
    const hue = HUES[this.folders.length % HUES.length];
    const folder: OrganicFolder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: clean,
      hue,
      appIds: [],
    };
    this.folders = [...this.folders, folder];
    for (const appId of initialAppIds) {
      this.moveAppIntoFolder(appId, folder.id);
    }
    this.persist();
    this.emit();
    neuralBus.publish('SYSTEM', 'FOLDER_CREATED', `Created organic desktop folder "${clean}".`);
    return folder;
  }

  renameFolder(folderId: string, name: string): void {
    const clean = name.trim();
    if (!clean) return;
    this.folders = this.folders.map((f) => (f.id === folderId ? { ...f, name: clean } : f));
    this.persist();
    this.emit();
  }

  cycleFolderHue(folderId: string): void {
    this.folders = this.folders.map((f) => {
      if (f.id !== folderId) return f;
      const idx = HUES.indexOf(f.hue);
      return { ...f, hue: HUES[(idx + 1) % HUES.length] };
    });
    this.persist();
    this.emit();
  }

  dissolveFolder(folderId: string): void {
    const target = this.folders.find((f) => f.id === folderId);
    if (!target) return;
    this.folders = this.folders.filter((f) => f.id !== folderId);
    this.persist();
    this.emit();
    neuralBus.publish('SYSTEM', 'FOLDER_DISSOLVED', `Dissolved "${target.name}" — returned ${target.appIds.length} apps to desktop.`);
  }

  setPanelSlot(slotIndex: number, appId: AppId): void {
    if (slotIndex < 0 || slotIndex >= 9) return;
    const next = [...this.panelAppIds];
    const existingIdx = next.indexOf(appId);
    if (existingIdx !== -1) {
      const displaced = next[slotIndex];
      next[slotIndex] = appId;
      next[existingIdx] = displaced;
    } else {
      next[slotIndex] = appId;
    }
    this.panelAppIds = next.slice(0, 9);
    this.persist();
    this.emit();
    neuralBus.publish('SYSTEM', 'PANEL_SLOT_UPDATED', `Updated 9-app Glowing Panel slot #${slotIndex + 1} → ${appId}.`);
  }

  purgeDeletedApp(appId: AppId): void {
    let changed = false;
    this.folders = this.folders.map((f) => {
      if (!f.appIds.includes(appId)) return f;
      changed = true;
      return { ...f, appIds: f.appIds.filter((id) => id !== appId) };
    });
    const idx = this.panelAppIds.indexOf(appId);
    if (idx !== -1) {
      this.panelAppIds[idx] = DEFAULT_PANEL_APP_IDS[idx];
      changed = true;
    }
    if (changed) {
      this.persist();
      this.emit();
    }
  }
}

export const desktopFolderEngine = new DesktopFolderEngine();
