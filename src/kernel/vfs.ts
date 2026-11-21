import type { VFSFile, VFSFileKind, VFSSnapshot } from '../types/os';
import { neuralBus } from './neuralBus';

const DB_NAME = 'AetherVFS_v1';
const DB_VERSION = 1;
const STORE_FILES = 'files';
const STORE_SNAPSHOTS = 'snapshots';

export const SEED_FILES: Array<Omit<VFSFile, 'updatedAt' | 'size'>> = [
  {
    id: 'file-neural-widget',
    name: 'index.html',
    path: '/workspace/demo-app/index.html',
    kind: 'html',
    content: `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>CodeMesh Oscillator Lab</title>
  <link rel="stylesheet" href="./styles.css" />
</head>
<body>
  <div class="shell">
    <div class="header">
      <div>
        <h1>Harmonic Signal Monitor</h1>
        <p class="subtitle">Multi-file HTML + CSS + TS project running in sandboxed iframe</p>
      </div>
      <button id="boostBtn">Inject Impulse</button>
    </div>
    <canvas id="wave"></canvas>
  </div>
  <script src="./app.ts"></script>
</body>
</html>`,
  },
  {
    id: 'file-demo-styles',
    name: 'styles.css',
    path: '/workspace/demo-app/styles.css',
    kind: 'css',
    content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: ui-sans-serif, system-ui, sans-serif;
  background: #060b16;
  color: #e2e8f0;
  height: 100vh;
  padding: 16px;
}
.shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 12px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(56, 189, 248, 0.2);
  padding-bottom: 10px;
}
h1 { font-size: 15px; font-weight: 600; color: #38bdf8; }
.subtitle { font-size: 11px; color: #94a3b8; margin-top: 2px; }
button {
  background: #0ea5e9;
  color: #03111d;
  border: none;
  padding: 7px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
}
button:hover { background: #38bdf8; }
canvas {
  flex: 1;
  width: 100%;
  border-radius: 12px;
  background: #020617;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
`,
  },
  {
    id: 'file-demo-app-ts',
    name: 'app.ts',
    path: '/workspace/demo-app/app.ts',
    kind: 'ts',
    content: `interface WaveConfig {
  amplitude: number;
  frequency: number;
}

const config: WaveConfig = {
  amplitude: 28,
  frequency: 0.025,
};

const canvas = document.getElementById('wave') as HTMLCanvasElement | null;
const ctx = canvas ? canvas.getContext('2d') : null;
let phase = 0;

function resizeCanvas(): void {
  if (!canvas) return;
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

if (canvas && ctx) {
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  document.getElementById('boostBtn')?.addEventListener('click', () => {
    config.amplitude = 76;
    console.log('Impulse injected into TS oscillator. Amplitude:', config.amplitude);
  });

  const renderLoop = (): void => {
    ctx.fillStyle = 'rgba(2, 6, 23, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#14b8a6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const mid = canvas.height / 2;
    for (let x = 0; x < canvas.width; x += 3) {
      const y = mid + Math.sin(x * config.frequency + phase) * config.amplitude * Math.cos(x * 0.008 - phase * 0.5);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    config.amplitude += (28 - config.amplitude) * 0.03;
    phase += 0.07;
    requestAnimationFrame(renderLoop);
  };

  renderLoop();
  console.log('CodeMesh demo-app/app.ts initialized cleanly.');
}
`,
  },
  {
    id: 'file-telemetry-parser',
    name: 'telemetry-parser.ts',
    path: '/workspace/src/telemetry-parser.ts',
    kind: 'ts',
    content: `// Sample TypeScript module (contains audit findings for Code Auditor & AI Companion)
import { formatMetrics } from './missing-formatter';

interface MetricSample {
  cpu: number;
  node: string;
}

export function computeClusterMatrix(nodes: MetricSample[]): number {
  let total = 0;
  // Performance bottleneck: nested O(n^2) loop + DOM query inside loop
  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      const el = document.querySelector('#status');
      if (el) total += nodes[i].cpu * 0.5;
    }
  }
  return total;
}

export function parseTelemetryPacket(rawPacket: string) {
  const packet = JSON.parse(rawPacket);
  const avgLoad = packet.metrics.reduce((acc: number, v: MetricSample) => acc + v.cpu, 0) / packet.metrics.length;
  console.log('Parsed node:', packet.nodeId, 'Avg CPU:', avgLoad.toFixed(2));
  return { nodeId: packet.nodeId, avgLoad, label: typeof formatMetrics === 'function' ? formatMetrics(avgLoad) : avgLoad };
}

const sampleGood = JSON.stringify({ nodeId: 'codemesh-01', metrics: [{ cpu: 0.34, node: 'a' }, { cpu: 0.42, node: 'b' }] });
parseTelemetryPacket(sampleGood);
`,
  },
  {
    id: 'file-sensor-guard',
    name: 'sensor-stream-guard.js',
    path: '/workspace/src/sensor-stream-guard.js',
    kind: 'js',
    content: `// Sensor DOM Bridge (contains unsafe DOM sink for Code Auditor & Security Daemon)
function renderSensorLabel(container, userLabel) {
  // Security risk: direct innerHTML assignment permits XSS injection
  container.innerHTML = '<span>Sensor: ' + userLabel + '</span>';
}

const mockEl = { innerHTML: '', textContent: '' };
renderSensorLabel(mockEl, '<img src=x onerror=alert(1)>');
console.log('Rendered output:', mockEl.innerHTML || mockEl.textContent);
`,
  },
  {
    id: 'file-package-json',
    name: 'package.json',
    path: '/workspace/package.json',
    kind: 'json',
    content: JSON.stringify(
      {
        name: 'codemesh-workspace-demo',
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'vite',
          build: 'vite build',
        },
        dependencies: {
          lucide: '^0.546.0',
        },
      },
      null,
      2
    ),
  },
  {
    id: 'file-architecture-md',
    name: 'README.md',
    path: '/workspace/README.md',
    kind: 'md',
    content: `# CodeMesh IDE Workspace

## Developer Workflow
1. **Workspace File Importer & Split Editor**: Drag and drop entire project folders or individual \`.js\`, \`.ts\`, \`.html\`, \`.css\`, \`.json\`, and \`.md\` files into the file tree. Edit with live syntax highlighting and side-by-side preview.
2. **AI Code Companion**: Ask Cloud Gemini or Local Ollama questions grounded directly in the currently open file — click **Apply to Active File** to insert refactored code.
3. **AST Code Auditor**: Scan workspace JavaScript & TypeScript modules for syntax errors, missing local imports, undeclared package dependencies, security sinks, and loop performance bottlenecks with 1-click fixes.
4. **Instant Sandboxed Preview**: Run any imported HTML/CSS/JS/TS project inside an isolated \`<iframe sandbox="allow-scripts">\` with automatic sibling asset bundling and live console output.
`,
  },
];

type VFSListener = (files: VFSFile[], snapshots: VFSSnapshot[], activeFileId: string | null) => void;

class VirtualFileSystem {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;
  private filesCache: VFSFile[] = [];
  private snapshotsCache: VFSSnapshot[] = [];
  private activeFileId: string | null = null;
  private listeners = new Set<VFSListener>();

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this.openAndSeed();
    return this.initPromise;
  }

  private openAndSeed(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_FILES)) {
          db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
          db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'id' });
        }
      };

      request.onsuccess = async () => {
        this.db = request.result;
        const existingFiles = await this.readAllFromStore<VFSFile>(STORE_FILES);
        if (existingFiles.length === 0) {
          const now = Date.now();
          for (const seed of SEED_FILES) {
            const full: VFSFile = {
              ...seed,
              updatedAt: now,
              size: new Blob([seed.content]).size,
            };
            await this.putInStore(STORE_FILES, full);
          }
          await this.refreshCaches();
          await this.createSnapshot('Initial CodeMesh Workspace', 'CodeMesh IDE starter multi-file project');
        } else {
          await this.refreshCaches();
        }
        if (!this.activeFileId && this.filesCache.length > 0) {
          const preferred =
            this.filesCache.find((f) => f.name === 'telemetry-parser.ts') ||
            this.filesCache.find((f) => f.name === 'index.html') ||
            this.filesCache[0];
          this.activeFileId = preferred.id;
          this.emit();
        }
        neuralBus.publish('VFS', 'VFS_MOUNTED', `IndexedDB workspace mounted (${this.filesCache.length} files).`);
        resolve();
      };

      request.onerror = () => {
        reject(request.error ?? new Error('Failed to open IndexedDB AetherVFS_v1'));
      };
    });
  }

  private readAllFromStore<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as T[]) || []);
      req.onerror = () => reject(req.error);
    });
  }

  private putInStore<T>(storeName: string, value: T): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('VFS database not initialized'));
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private deleteFromStore(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('VFS database not initialized'));
      const tx = this.db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  private async refreshCaches(): Promise<void> {
    const [files, snaps] = await Promise.all([
      this.readAllFromStore<VFSFile>(STORE_FILES),
      this.readAllFromStore<VFSSnapshot>(STORE_SNAPSHOTS),
    ]);
    this.filesCache = files.sort((a, b) => a.path.localeCompare(b.path) || a.name.localeCompare(b.name));
    this.snapshotsCache = snaps.sort((a, b) => b.createdAt - a.createdAt);
    if (this.activeFileId && !this.filesCache.some((f) => f.id === this.activeFileId)) {
      this.activeFileId = this.filesCache[0]?.id ?? null;
    }
    this.emit();
  }

  private emit(): void {
    this.listeners.forEach((cb) => cb(this.filesCache, this.snapshotsCache, this.activeFileId));
  }

  subscribe(listener: VFSListener): () => void {
    this.listeners.add(listener);
    listener(this.filesCache, this.snapshotsCache, this.activeFileId);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getFiles(): VFSFile[] {
    return this.filesCache;
  }

  getSnapshots(): VFSSnapshot[] {
    return this.snapshotsCache;
  }

  getActiveFileId(): string | null {
    return this.activeFileId;
  }

  getActiveFile(): VFSFile | null {
    if (!this.activeFileId) return this.filesCache[0] ?? null;
    return this.filesCache.find((f) => f.id === this.activeFileId) ?? this.filesCache[0] ?? null;
  }

  setActiveFile(idOrName: string | null): void {
    if (!idOrName) {
      this.activeFileId = null;
      this.emit();
      return;
    }
    const found =
      this.filesCache.find((f) => f.id === idOrName) ||
      this.getFileByName(idOrName);
    if (found) {
      this.activeFileId = found.id;
      this.emit();
    }
  }

  getFileByName(nameOrPath: string): VFSFile | undefined {
    const clean = nameOrPath.trim().toLowerCase();
    return (
      this.filesCache.find((f) => f.path.toLowerCase() === clean) ||
      this.filesCache.find((f) => f.name.toLowerCase() === clean) ||
      this.filesCache.find((f) => f.path.toLowerCase().endsWith('/' + clean))
    );
  }

  inferKind(name: string): VFSFileKind {
    const lower = name.toLowerCase();
    if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'ts';
    if (lower.endsWith('.css')) return 'css';
    if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'html';
    if (lower.endsWith('.md') || lower.endsWith('.markdown')) return 'md';
    if (lower.endsWith('.json')) return 'json';
    return 'js';
  }

  isSupportedCodeFile(name: string): boolean {
    return /\.(js|jsx|mjs|ts|tsx|html|htm|css|json|md|txt)$/i.test(name);
  }

  async saveFile(input: { id?: string; name: string; path?: string; content: string; patchedBy?: string }): Promise<VFSFile> {
    await this.init();
    const cleanName = input.name.trim();
    const normalizedPath = input.path
      ? input.path.startsWith('/')
        ? input.path
        : `/${input.path}`
      : undefined;

    const existing = input.id
      ? this.filesCache.find((f) => f.id === input.id)
      : normalizedPath
      ? this.filesCache.find((f) => f.path.toLowerCase() === normalizedPath.toLowerCase())
      : this.getFileByName(cleanName);

    const kind = this.inferKind(cleanName);
    const file: VFSFile = {
      id: existing?.id ?? `file-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      path: normalizedPath ?? existing?.path ?? `/workspace/custom/${cleanName}`,
      kind,
      content: input.content,
      updatedAt: Date.now(),
      size: new Blob([input.content]).size,
      lastPatchedBy: input.patchedBy ?? existing?.lastPatchedBy,
    };
    await this.putInStore(STORE_FILES, file);
    this.activeFileId = file.id;
    await this.refreshCaches();
    neuralBus.publish(
      input.patchedBy ? 'SWARM' : 'VFS',
      input.patchedBy ? 'VFS_PATCHED' : 'VFS_WRITE',
      `${file.path} (${file.size} B) saved${input.patchedBy ? ` by ${input.patchedBy}` : ''}.`,
      { fileId: file.id, fileName: file.name }
    );
    return file;
  }

  async importFilesBatch(
    entries: Array<{ name: string; path: string; content: string }>,
    sourceLabel = 'Workspace Importer'
  ): Promise<VFSFile[]> {
    await this.init();
    const imported: VFSFile[] = [];
    const now = Date.now();

    for (const entry of entries) {
      const cleanName = entry.name.trim();
      if (!cleanName || !this.isSupportedCodeFile(cleanName)) continue;
      const normPath = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
      const existing = this.filesCache.find((f) => f.path.toLowerCase() === normPath.toLowerCase());
      const file: VFSFile = {
        id: existing?.id ?? `file-${now}-${Math.random().toString(36).slice(2, 7)}`,
        name: cleanName,
        path: normPath,
        kind: this.inferKind(cleanName),
        content: entry.content,
        updatedAt: now,
        size: new Blob([entry.content]).size,
        lastPatchedBy: existing?.lastPatchedBy,
      };
      await this.putInStore(STORE_FILES, file);
      imported.push(file);
    }

    if (imported.length > 0) {
      this.activeFileId = imported[0].id;
      await this.refreshCaches();
      await this.createSnapshot(`Import (${imported.length} files)`, `Imported via ${sourceLabel}`);
      neuralBus.publish('VFS', 'VFS_BATCH_IMPORT', `Imported ${imported.length} file(s) via ${sourceLabel}.`);
    }
    return imported;
  }

  async loadStarterProject(): Promise<number> {
    await this.init();
    const now = Date.now();
    let count = 0;
    for (const seed of SEED_FILES) {
      const full: VFSFile = {
        ...seed,
        updatedAt: now,
        size: new Blob([seed.content]).size,
      };
      await this.putInStore(STORE_FILES, full);
      count++;
    }
    await this.refreshCaches();
    this.activeFileId = this.filesCache.find((f) => f.name === 'telemetry-parser.ts')?.id ?? this.filesCache[0]?.id ?? null;
    this.emit();
    neuralBus.publish('VFS', 'STARTER_LOADED', `Loaded ${count} starter project files into workspace.`);
    return count;
  }

  async deleteFile(id: string): Promise<void> {
    await this.init();
    const target = this.filesCache.find((f) => f.id === id);
    await this.deleteFromStore(STORE_FILES, id);
    await this.refreshCaches();
    if (target) {
      neuralBus.publish('VFS', 'VFS_DELETE', `Deleted ${target.path} from workspace.`);
    }
  }

  async createSnapshot(label: string, reason: string): Promise<VFSSnapshot> {
    await this.init();
    const snap: VFSSnapshot = {
      id: `snap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label,
      reason,
      createdAt: Date.now(),
      files: this.filesCache.map((f) => ({ ...f })),
    };
    await this.putInStore(STORE_SNAPSHOTS, snap);
    const allSnaps = (await this.readAllFromStore<VFSSnapshot>(STORE_SNAPSHOTS)).sort(
      (a, b) => b.createdAt - a.createdAt
    );
    for (const old of allSnaps.slice(24)) {
      await this.deleteFromStore(STORE_SNAPSHOTS, old.id);
    }
    await this.refreshCaches();
    neuralBus.publish('VFS', 'SNAPSHOT_CREATED', `Checkpoint "${label}" captured (${snap.files.length} files).`);
    return snap;
  }

  async restoreSnapshot(snapshotId: string): Promise<boolean> {
    await this.init();
    const snap = this.snapshotsCache.find((s) => s.id === snapshotId);
    if (!snap) return false;

    for (const current of this.filesCache) {
      await this.deleteFromStore(STORE_FILES, current.id);
    }
    for (const f of snap.files) {
      await this.putInStore(STORE_FILES, { ...f });
    }
    await this.refreshCaches();
    neuralBus.publish('HEALER', 'SNAPSHOT_RESTORED', `Restored workspace to checkpoint "${snap.label}".`);
    return true;
  }

  async pruneOldSnapshots(keepCount = 4): Promise<number> {
    await this.init();
    const allSnaps = (await this.readAllFromStore<VFSSnapshot>(STORE_SNAPSHOTS)).sort(
      (a, b) => b.createdAt - a.createdAt
    );
    const toRemove = allSnaps.slice(Math.max(1, keepCount));
    for (const old of toRemove) {
      await this.deleteFromStore(STORE_SNAPSHOTS, old.id);
    }
    if (toRemove.length > 0) {
      await this.refreshCaches();
      neuralBus.publish('VFS', 'VFS_COMPACTED', `Compacted ${toRemove.length} archived VFS snapshot(s) to reclaim IndexedDB storage.`);
    }
    return toRemove.length;
  }

  async verifyIntegrity(): Promise<{ ok: boolean; fileCount: number; totalBytes: number; issues: string[] }> {
    await this.init();
    const issues: string[] = [];
    let totalBytes = 0;
    for (const f of this.filesCache) {
      totalBytes += f.size;
      if (!f.name || typeof f.content !== 'string') {
        issues.push(`Corrupt record metadata in ${f.id}`);
      }
      if (f.kind === 'json') {
        try {
          JSON.parse(f.content);
        } catch {
          issues.push(`Invalid JSON syntax in ${f.name}`);
        }
      }
    }
    return {
      ok: issues.length === 0,
      fileCount: this.filesCache.length,
      totalBytes,
      issues,
    };
  }
}

export const vfs = new VirtualFileSystem();

