import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_HyperFaceStage_v1';
const SOURCE_ASSET_URL = '/assets/aistudio/Paste_November_18__2026_-_11_59PM_3fc2f61c';

export const BLANK_PHASE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Cleared Design Phase — Ready for Object Synthesis</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: radial-gradient(circle at 50% 35%, #0a1628, #03060c);
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid rgba(56,189,248,0.22);
      background: rgba(6,11,22,0.85);
      font-size: 12px;
      gap: 8px;
    }
    .badge {
      padding: 3px 8px;
      border-radius: 6px;
      background: rgba(34,211,238,0.16);
      border: 1px solid rgba(34,211,238,0.4);
      color: #67e8f9;
      font-family: ui-monospace, monospace;
      font-size: 11px;
    }
    canvas { flex: 1; width: 100%; display: block; }
  </style>
  <script type="importmap">
    {
      "imports": {
        "three": "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js",
        "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.164.1/examples/jsm/"
      }
    }
  </script>
</head>
<body>
  <div class="bar">
    <span><strong>Phase Cleared</strong> · Empty 3D Design Void</span>
    <span class="badge">Use AI Prompt Editor to Design Any Object</span>
  </div>
  <canvas id="c"></canvas>
  <script type="module">
    import * as THREE from 'three';
    import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
    const canvas = document.getElementById('c');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03060c, 0.08);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 1.4, 4.2);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    const grid = new THREE.GridHelper(12, 24, 0x22d3ee, 0x1e293b);
    scene.add(grid);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.95, 0.015, 16, 64),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.55 })
    );
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
    function fit() {
      const w = canvas.clientWidth || 480, h = canvas.clientHeight || 300;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    window.addEventListener('resize', fit);
    fit();
    let t = 0;
    function loop() {
      requestAnimationFrame(loop);
      t += 0.016;
      ring.rotation.z = t * 0.4;
      controls.update();
      renderer.render(scene, camera);
    }
    loop();
  </script>
</body>
</html>`;

export interface HyperFaceStageState {
  stageTitle: string;
  objectPrompt: string;
  phaseCleared: boolean;
  html: string;
  version: number;
  busy: boolean;
  initialized: boolean;
  lastError: string | null;
}

type HyperFaceListener = (state: HyperFaceStageState) => void;

class HyperFaceStudioStore {
  private state: HyperFaceStageState = {
    stageTitle: 'HyperFace AI Studio v12.0',
    objectPrompt: 'Original HyperFace AI Studio v12.0 & 4x4 Design Matrix',
    phaseCleared: false,
    html: '',
    version: 1,
    busy: false,
    initialized: false,
    lastError: null,
  };

  private originalHtmlCache: string | null = null;
  private listeners = new Set<HyperFaceListener>();

  constructor() {
    this.restorePersisted();
  }

  private restorePersisted(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<HyperFaceStageState>;
        if (parsed.html && typeof parsed.html === 'string') {
          this.state = {
            ...this.state,
            stageTitle: parsed.stageTitle || this.state.stageTitle,
            objectPrompt: parsed.objectPrompt || this.state.objectPrompt,
            phaseCleared: Boolean(parsed.phaseCleared),
            html: parsed.html,
            version: typeof parsed.version === 'number' ? parsed.version : 1,
            initialized: true,
          };
        }
      }
    } catch {
      // ignore invalid storage
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          stageTitle: this.state.stageTitle,
          objectPrompt: this.state.objectPrompt,
          phaseCleared: this.state.phaseCleared,
          html: this.state.html,
          version: this.state.version,
        })
      );
    } catch {
      // ignore storage quota limits for huge html
    }
  }

  private emit(): void {
    const snap = { ...this.state };
    this.listeners.forEach((cb) => cb(snap));
  }

  subscribe(listener: HyperFaceListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.state });
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): HyperFaceStageState {
    return { ...this.state };
  }

  async ensureInitialized(): Promise<void> {
    if (this.state.initialized && this.state.html) return;
    await this.loadOriginalStudio();
  }

  async loadOriginalStudio(): Promise<void> {
    this.state.busy = true;
    this.state.lastError = null;
    this.emit();
    try {
      if (!this.originalHtmlCache) {
        const res = await fetch(SOURCE_ASSET_URL);
        if (!res.ok) throw new Error(`Failed to load HyperFace Studio v12.0 (${res.status})`);
        this.originalHtmlCache = await res.text();
      }
      this.state = {
        ...this.state,
        stageTitle: 'HyperFace AI Studio v12.0',
        objectPrompt: 'Original HyperFace AI Studio v12.0 & 4x4 Design Matrix',
        phaseCleared: false,
        html: this.originalHtmlCache,
        version: this.state.version + 1,
        busy: false,
        initialized: true,
        lastError: null,
      };
      this.persist();
      neuralBus.publish('FORGE', 'HYPERFACE_RESTORED', 'Loaded HyperFace AI Studio v12.0 onto active stage.');
    } catch (err) {
      this.state.busy = false;
      this.state.lastError = err instanceof Error ? err.message : 'Unable to load HyperFace Studio.';
    }
    this.emit();
  }

  clearPhase(): void {
    this.state = {
      ...this.state,
      stageTitle: 'Cleared Phase · Ready for Any Object',
      objectPrompt: '',
      phaseCleared: true,
      html: BLANK_PHASE_HTML,
      version: this.state.version + 1,
      lastError: null,
    };
    this.persist();
    this.emit();
    neuralBus.publish('FORGE', 'HYPERFACE_PHASE_CLEARED', 'Cleared HyperFace phase; stage ready for new custom 3D object design.');
  }

  setStageHtmlFromArchitect(title: string, html: string, prompt: string): void {
    const cleanTitle = title.trim() || 'AI Designed 3D Object';
    this.state = {
      ...this.state,
      stageTitle: cleanTitle,
      objectPrompt: prompt,
      phaseCleared: false,
      html,
      version: this.state.version + 1,
      initialized: true,
      lastError: null,
    };
    this.persist();
    this.emit();

    const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'designed-object';
    void vfs.saveFile({
      name: `${slug}.html`,
      path: `/workspace/designed-objects/${slug}.html`,
      content: html,
      patchedBy: 'HyperFace AI Object Designer',
    });

    neuralBus.publish('FORGE', 'HYPERFACE_OBJECT_UPDATED', `Loaded "${cleanTitle}" onto HyperFace Object Stage.`);
  }

  async designObject(objectPrompt: string): Promise<boolean> {
    const cleanPrompt = objectPrompt.trim();
    if (!cleanPrompt || this.state.busy) return false;

    this.state.busy = true;
    this.state.lastError = null;
    this.emit();
    neuralBus.publish('FORGE', 'HYPERFACE_DESIGN_START', `Clearing phase & designing object: "${cleanPrompt}"`);

    try {
      const res = await fetch('/api/hyperface/design-object', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: cleanPrompt,
          previousTitle: this.state.stageTitle,
        }),
      });
      const data = (await res.json()) as {
        title?: string;
        summary?: string;
        designTags?: string[];
        html?: string;
        error?: string;
      };
      if (!res.ok || !data.html) {
        throw new Error(data.error || 'AI Object Designer did not return playable HTML.');
      }

      const title = data.title || cleanPrompt.slice(0, 32);
      this.setStageHtmlFromArchitect(title, data.html, cleanPrompt);

      jsonKnowledgeStore.saveEntry({
        title: `3D Object: ${title}`,
        category: 'style-theme',
        tags: Array.from(new Set(['hyperface-object', '3d-design', ...(data.designTags ?? [])])),
        summary: data.summary || `Custom AI-designed 3D object from HyperFace Studio: ${cleanPrompt}`,
        sideNotes: [`Prompt: "${cleanPrompt}"`, 'Cleared HyperFace phase and synthesized interactive Three.js object.'],
        linkedAppIds: ['hyperface', 'architect', 'htmlprinter', 'gameforge'],
        data: {
          title,
          prompt: cleanPrompt,
          summary: data.summary,
          tags: data.designTags ?? [],
        },
      });

      this.state.busy = false;
      this.emit();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Object design failed.';
      this.state.busy = false;
      this.state.lastError = msg;
      this.emit();
      neuralBus.publish('FORGE', 'HYPERFACE_DESIGN_ERROR', msg);
      return false;
    }
  }

  async uploadCurrentToLibrary(): Promise<`printed:${string}` | null> {
    if (!this.state.html) return null;
    const printed = await printedAppsStore.printApp({
      name: this.state.stageTitle,
      description:
        this.state.objectPrompt ||
        'Uploaded from HyperFace AI Studio v12.0 & Object Designer · Bridged via AetherOS',
      html: this.state.html,
      improvementNote: 'Uploaded directly from HyperFace AI Object Designer.',
    });

    jsonKnowledgeStore.saveEntry({
      title: `Library Object: ${printed.name}`,
      category: 'style-theme',
      tags: ['library-upload', 'hyperface', '3d-studio'],
      summary: `Uploaded "${printed.name}" to OS Library & Desktop.`,
      sideNotes: [`Prompt: ${this.state.objectPrompt || 'HyperFace v12.0'}`],
      linkedAppIds: ['hyperface', 'architect', 'htmlprinter', 'masterbrain'],
      data: {
        printedAppId: printed.id,
        title: printed.name,
        version: printed.version,
      },
    });

    neuralBus.publish('SANDBOX', 'HYPERFACE_UPLOADED_LIBRARY', `Uploaded "${printed.name}" to OS Library & Desktop.`);
    return printed.id;
  }
}

export const hyperfaceStudioStore = new HyperFaceStudioStore();
