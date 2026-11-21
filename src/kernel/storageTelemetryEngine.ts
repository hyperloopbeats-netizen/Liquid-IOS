import type {
  StorageGrowthPoint,
  StorageSubsystemStat,
  StorageTelemetrySnapshot,
} from '../types/os';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { smartBrainItemStore } from './smartBrainItemStore';
import { unificatorEngine } from './unificatorEngine';
import { vfs } from './vfs';

const GROWTH_HISTORY_KEY = 'AetherOS_StorageGrowthHistory_v1';

const encoder = new TextEncoder();

function measureUtf8Bytes(str: string | null | undefined): number {
  if (!str) return 0;
  return encoder.encode(str).length;
}

function measureLocalStorageKeys(keys: string[]): { bytes: number; count: number } {
  let bytes = 0;
  let count = 0;
  try {
    for (const key of keys) {
      const val = localStorage.getItem(key);
      if (val !== null) {
        bytes += measureUtf8Bytes(key) + measureUtf8Bytes(val);
        count++;
      }
    }
  } catch {
    // ignore storage read error
  }
  return { bytes, count };
}

type StorageListener = (snapshot: StorageTelemetrySnapshot) => void;

class StorageTelemetryEngine {
  private listeners = new Set<StorageListener>();
  private growthHistory: StorageGrowthPoint[] = [];
  private snapshot: StorageTelemetrySnapshot;
  private pollTimer: number | null = null;
  private sampling = false;

  constructor() {
    this.loadHistory();
    this.snapshot = {
      quotaBytes: 512 * 1024 * 1024,
      browserUsageBytes: 0,
      freeBytes: 512 * 1024 * 1024,
      percentAllocatedUsed: 0,
      totalTrackedBytes: 0,
      baselineBytes: 0,
      netGrowthBytes: 0,
      growthRateBytesPerMin: 0,
      subsystems: [],
      growthHistory: this.growthHistory,
      lastSampledAt: Date.now(),
      estimateSupported: typeof navigator !== 'undefined' && Boolean(navigator.storage?.estimate),
    };

    // Subscribe to key OS state mutations so volume growth reflects real writes immediately
    vfs.subscribe(() => {
      void this.sampleNow(true);
    });
    printedAppsStore.subscribe(() => {
      void this.sampleNow(true);
    });
    smartBrainItemStore.subscribe(() => {
      void this.sampleNow(true);
    });
    jsonKnowledgeStore.subscribe(() => {
      void this.sampleNow(false);
    });
    unificatorEngine.subscribe(() => {
      void this.sampleNow(true);
    });

    if (typeof window !== 'undefined') {
      void this.sampleNow(true);
      this.pollTimer = window.setInterval(() => {
        void this.sampleNow(true);
      }, 6000);
    }
  }

  private loadHistory(): void {
    try {
      const raw = localStorage.getItem(GROWTH_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StorageGrowthPoint[];
        if (Array.isArray(parsed)) {
          this.growthHistory = parsed.slice(-36);
        }
      }
    } catch {
      this.growthHistory = [];
    }
  }

  private persistHistory(): void {
    try {
      localStorage.setItem(GROWTH_HISTORY_KEY, JSON.stringify(this.growthHistory.slice(-36)));
    } catch {
      // ignore quota
    }
  }

  private emit(): void {
    this.listeners.forEach((cb) => cb(this.snapshot));
  }

  getState(): StorageTelemetrySnapshot {
    return this.snapshot;
  }

  subscribe(listener: StorageListener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async sampleNow(recordHistoryPoint = true): Promise<StorageTelemetrySnapshot> {
    if (this.sampling) return this.snapshot;
    this.sampling = true;

    try {
      const files = vfs.getFiles();
      const snapshots = vfs.getSnapshots();

      const vfsFilesBytes = files.reduce(
        (sum, f) => sum + Math.max(f.size || 0, measureUtf8Bytes(f.content)) + 96,
        0
      );
      const vfsSnapsBytes = snapshots.reduce(
        (sum, snap) =>
          sum +
          snap.files.reduce((inner, f) => inner + Math.max(f.size || 0, measureUtf8Bytes(f.content)), 0) +
          140,
        0
      );

      const printedBytes = measureLocalStorageKeys(['AetherOS_PrintedApps_v1']);
      const smartBrainBytes = measureLocalStorageKeys(['AetherOS_SmartBrainItems_v1']);
      const jsonVaultBytes = measureLocalStorageKeys(['AetherOS_JsonKnowledgeVault_v1']);
      const unifierBytes = measureLocalStorageKeys([
        'AetherOS_SyntheticUnificator_v1',
        'AetherOS_KineticHookCode_v1',
        'AetherOS_VoxelHookCode_v1',
      ]);
      const brainDesktopBytes = measureLocalStorageKeys([
        'AetherOS_MasterBrainPlans_v1',
        'AetherOS_OrganicFolders_v2',
        'AetherOS_Panel9Apps_v2',
        'AetherOS_SmartAppSort_v1',
        GROWTH_HISTORY_KEY,
      ]);

      const subsystems: StorageSubsystemStat[] = [
        {
          id: 'vfs-files',
          label: 'IndexedDB VFS Source Files',
          location: 'IndexedDB',
          bytes: vfsFilesBytes,
          itemCount: files.length,
          targetAppId: 'drive',
          color: '#22d3ee',
        },
        {
          id: 'vfs-snapshots',
          label: 'Time-Travel VFS Snapshots',
          location: 'IndexedDB',
          bytes: vfsSnapsBytes,
          itemCount: snapshots.length,
          targetAppId: 'snapshots',
          color: '#f59e0b',
        },
        {
          id: 'printed-apps',
          label: 'Printed HTML5 App Library',
          location: 'LocalStorage',
          bytes: printedBytes.bytes,
          itemCount: printedAppsStore.getApps().length,
          targetAppId: 'htmlprinter',
          color: '#10b981',
        },
        {
          id: 'json-vault',
          label: 'JSON Vault · Sprites · Physics',
          location: 'LocalStorage',
          bytes: jsonVaultBytes.bytes,
          itemCount:
            jsonKnowledgeStore.getEntries().length +
            jsonKnowledgeStore.getSprites().length +
            1,
          targetAppId: 'jsonvault',
          color: '#38bdf8',
        },
        {
          id: 'smart-brain',
          label: 'Smart Brain Game Items',
          location: 'LocalStorage',
          bytes: smartBrainBytes.bytes,
          itemCount: smartBrainItemStore.getState().items.length,
          targetAppId: 'smartbrain',
          color: '#a855f7',
        },
        {
          id: 'unificator',
          label: 'Synthetic Unificator & Hooks',
          location: 'LocalStorage',
          bytes: unifierBytes.bytes,
          itemCount: unificatorEngine.getState().records.length + 2,
          targetAppId: 'codeunifier',
          color: '#6366f1',
        },
        {
          id: 'brain-config',
          label: 'Master Brain · Pods · Sort State',
          location: 'LocalStorage',
          bytes: brainDesktopBytes.bytes,
          itemCount: brainDesktopBytes.count,
          targetAppId: 'masterbrain',
          color: '#ec4899',
        },
      ];

      const totalTrackedBytes = subsystems.reduce((sum, s) => sum + s.bytes, 0);
      const vfsTotalBytes = vfsFilesBytes + vfsSnapsBytes;

      let quotaBytes = 512 * 1024 * 1024;
      let browserUsageBytes = totalTrackedBytes;
      let estimateSupported = false;

      if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
        try {
          const est = await navigator.storage.estimate();
          estimateSupported = true;
          if (typeof est.quota === 'number' && est.quota > 0) {
            quotaBytes = est.quota;
          }
          if (typeof est.usage === 'number' && est.usage >= 0) {
            browserUsageBytes = Math.max(est.usage, totalTrackedBytes);
          }
        } catch {
          // fallback to tracked bytes
        }
      }

      const now = Date.now();
      const timeLabel = new Date(now).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      if (recordHistoryPoint) {
        const prevPoint = this.growthHistory[this.growthHistory.length - 1];
        const enoughElapsed = !prevPoint || now - prevPoint.timestamp >= 4000;
        const sizeChanged =
          !prevPoint ||
          Math.abs(prevPoint.trackedBytes - totalTrackedBytes) >= 64 ||
          Math.abs(prevPoint.browserUsageBytes - browserUsageBytes) >= 512;

        if (enoughElapsed || sizeChanged) {
          this.growthHistory = [
            ...this.growthHistory,
            {
              timestamp: now,
              timeLabel,
              trackedBytes: totalTrackedBytes,
              vfsBytes: vfsTotalBytes,
              browserUsageBytes,
            },
          ].slice(-36);
          this.persistHistory();
        }
      }

      const firstPoint = this.growthHistory[0];
      const lastPoint = this.growthHistory[this.growthHistory.length - 1];
      const baselineBytes = firstPoint?.trackedBytes ?? totalTrackedBytes;
      const netGrowthBytes = totalTrackedBytes - baselineBytes;

      let growthRateBytesPerMin = 0;
      if (firstPoint && lastPoint && lastPoint.timestamp > firstPoint.timestamp) {
        const elapsedMinutes = Math.max(0.1, (lastPoint.timestamp - firstPoint.timestamp) / 60000);
        growthRateBytesPerMin = Math.round(netGrowthBytes / elapsedMinutes);
      }

      const freeBytes = Math.max(0, quotaBytes - browserUsageBytes);
      const percentAllocatedUsed = quotaBytes > 0 ? (browserUsageBytes / quotaBytes) * 100 : 0;

      this.snapshot = {
        quotaBytes,
        browserUsageBytes,
        freeBytes,
        percentAllocatedUsed,
        totalTrackedBytes,
        baselineBytes,
        netGrowthBytes,
        growthRateBytesPerMin,
        subsystems,
        growthHistory: this.growthHistory,
        lastSampledAt: now,
        estimateSupported,
      };
      this.emit();
      return this.snapshot;
    } finally {
      this.sampling = false;
    }
  }

  async compactStorage(keepSnapshots = 4): Promise<number> {
    const removed = await vfs.pruneOldSnapshots(keepSnapshots);
    await this.sampleNow(true);
    return removed;
  }

  async captureVolumeCheckpoint(): Promise<void> {
    await vfs.createSnapshot(
      `Companion Checkpoint (${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
      'Manual checkpoint captured from Smart AI Companion Storage Telemetry'
    );
    await this.sampleNow(true);
    neuralBus.publish('VFS', 'COMPANION_CHECKPOINT', 'Captured HDD allocation & VFS state checkpoint.');
  }

  dispose(): void {
    if (this.pollTimer !== null) {
      window.clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}

export const storageTelemetryEngine = new StorageTelemetryEngine();
