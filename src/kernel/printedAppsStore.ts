import type { PrintedAppDefinition } from '../types/os';
import { neuralBus } from './neuralBus';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_PrintedApps_v1';

const GRADIENT_PALETTE = [
  'from-cyan-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-fuchsia-500 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-indigo-400 to-violet-600',
];

const STARTER_PRINTED_APPS: PrintedAppDefinition[] = [
  {
    id: 'printed:pulse-reactor',
    slug: 'pulse-reactor',
    name: 'Pulse Reactor Widget',
    shortName: 'Pulse Reactor',
    description: 'Reactive HTML5 audio-spectral widget synced to Neural Bus & Synesthesia.',
    version: 1,
    accentGradient: 'from-cyan-400 to-indigo-600',
    createdAt: Date.now() - 60_000,
    updatedAt: Date.now() - 60_000,
    lastImprovementNote: 'Seeded with live AetherOS FFT + Neural Bus cross-app hooks.',
    busMessagesSent: 0,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Pulse Reactor</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #040814; color: #e2e8f0; font-family: system-ui, sans-serif; height: 100vh; display: flex; flex-direction: column; padding: 12px; gap: 10px; }
  .top { display: flex; justify-content: space-between; align-items: center; }
  h1 { font-size: 14px; color: #67e8f9; letter-spacing: .04em; }
  .btns { display: flex; gap: 6px; }
  button { background: rgba(34,211,238,.18); color: #cffafe; border: 1px solid rgba(34,211,238,.45); padding: 5px 10px; border-radius: 8px; font-size: 11px; cursor: pointer; }
  button:hover { background: rgba(34,211,238,.32); }
  canvas { flex: 1; width: 100%; border-radius: 10px; background: #02050d; border: 1px solid rgba(255,255,255,.08); }
  .log { font-family: ui-monospace, monospace; font-size: 10px; color: #94a3b8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
  <div class="top">
    <h1>Pulse Reactor · Cross-App Node</h1>
    <div class="btns">
      <button onclick="AetherOS.publish('WIDGET_IMPULSE', 'Pulse Reactor broadcast to OS swarm')">Emit Bus Pulse</button>
      <button onclick="AetherOS.openApp('streamhub')">Open Stream</button>
    </div>
  </div>
  <canvas id="c"></canvas>
  <div class="log" id="log">Waiting for AetherOS bus & FFT telemetry...</div>
<script>
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const logEl = document.getElementById('log');
  let phase = 0;
  function fit(){ canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; }
  window.addEventListener('resize', fit); fit();
  window.addEventListener('load', () => {
    if (!window.AetherOS) return;
    AetherOS.subscribe((msg) => {
      if (msg.type === 'BUS_EVENT' && msg.event) {
        logEl.textContent = '[' + msg.event.channel + '] ' + msg.event.summary;
      }
    });
  });
  function draw(){
    const st = window.AetherOS ? AetherOS.getState() : { bass: .2, mid: .2, treble: .2, activeHue: 185, fps: 60 };
    ctx.fillStyle = 'rgba(2, 5, 13, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2, cy = canvas.height / 2;
    for (let i = 0; i < 4; i++) {
      const r = 24 + i * 20 + (st.bass || 0.1) * 55;
      ctx.beginPath();
      ctx.strokeStyle = 'hsla(' + ((st.activeHue || 180) + i * 28) + ', 85%, 62%, 0.72)';
      ctx.lineWidth = 2;
      for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.15) {
        const wob = Math.sin(a * 5 + phase + i) * (4 + (st.treble || 0.1) * 26);
        const x = cx + Math.cos(a) * (r + wob), y = cy + Math.sin(a) * (r + wob);
        a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    phase += 0.05;
    requestAnimationFrame(draw);
  }
  draw();
</script>
</body>
</html>`,
  },
  {
    id: 'printed:mesh-switchboard',
    slug: 'mesh-switchboard',
    name: 'Mesh Switchboard HUD',
    shortName: 'Mesh HUD',
    description: 'Live cross-app launchpad & bus monitor printed as standalone HTML5.',
    version: 1,
    accentGradient: 'from-emerald-400 to-cyan-600',
    createdAt: Date.now() - 30_000,
    updatedAt: Date.now() - 30_000,
    lastImprovementNote: 'Connected to all OS apps via AetherOS.openApp & VFS writer.',
    busMessagesSent: 0,
    html: `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Mesh Switchboard HUD</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #050a14; color: #e2e8f0; font-family: system-ui, sans-serif; padding: 12px; display: flex; flex-direction: column; gap: 10px; height: 100vh; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .card { background: rgba(255,255,255,.04); border: 1px solid rgba(56,189,248,.22); border-radius: 10px; padding: 8px; }
  .label { font-size: 10px; color: #94a3b8; }
  .val { font-size: 16px; font-weight: 700; color: #38bdf8; margin-top: 2px; font-variant-numeric: tabular-nums; }
  .grid { display: flex; flex-wrap: wrap; gap: 6px; }
  button { background: linear-gradient(135deg, rgba(16,185,129,.22), rgba(14,165,233,.22)); color: #f8fafc; border: 1px solid rgba(52,211,153,.4); border-radius: 8px; padding: 6px 10px; font-size: 11px; cursor: pointer; }
  button:hover { border-color: #67e8f9; transform: translateY(-1px); }
  .feed { flex: 1; overflow: auto; background: rgba(0,0,0,.35); border: 1px solid rgba(255,255,255,.08); border-radius: 10px; padding: 8px; font-family: ui-monospace, monospace; font-size: 10px; line-height: 1.5; color: #cbd5e1; }
</style>
</head>
<body>
  <div class="stats">
    <div class="card"><div class="label">Kernel Health</div><div class="val" id="health">--</div></div>
    <div class="card"><div class="label">Fractal Pace</div><div class="val" id="fps">--</div></div>
    <div class="card"><div class="label">Open Apps</div><div class="val" id="apps">--</div></div>
  </div>
  <div class="grid">
    <button onclick="AetherOS.openApp('thinkmatrix')">Think Matrix</button>
    <button onclick="AetherOS.openApp('streamhub')">Universal Stream</button>
    <button onclick="AetherOS.openApp('liquidvideo')">Liquid Video</button>
    <button onclick="AetherOS.openApp('fractalcinema')">FractalOS</button>
    <button onclick="AetherOS.saveVfs('hud-telemetry.json', JSON.stringify(AetherOS.getState(), null, 2))">Snapshot VFS</button>
  </div>
  <div class="feed" id="feed">Listening to live Neural Bus...</div>
<script>
  const feedEl = document.getElementById('feed');
  function refresh() {
    if (!window.AetherOS) return;
    const s = AetherOS.getState();
    document.getElementById('health').textContent = (s.kernelHealth || 100) + '%';
    document.getElementById('fps').textContent = (s.fps || 60) + ' fps';
    document.getElementById('apps').textContent = (s.openApps || []).length;
    if (Array.isArray(s.recentEvents) && s.recentEvents.length) {
      feedEl.innerHTML = s.recentEvents.slice(0, 12).map(e => '<div><b style="color:#38bdf8">[' + e.channel + ']</b> ' + e.summary + '</div>').join('');
    }
  }
  setInterval(refresh, 350);
  refresh();
</script>
</body>
</html>`,
  },
];

type PrintedAppsListener = (apps: PrintedAppDefinition[]) => void;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32) || `app-${Date.now()}`;
}

export function normalizeHtml5Code(rawCode: string, title = 'Printed App'): string {
  const trimmed = rawCode.trim();
  if (/<!doctype\s+html>/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
    return trimmed;
  }
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title.replace(/[<>]/g, '')}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 14px; background: #050a14; color: #e2e8f0; font-family: system-ui, sans-serif; min-height: 100vh; }
  </style>
</head>
<body>
${trimmed}
</body>
</html>`;
}

export function extractTitleFromHtml(html: string): string | null {
  const match = html.match(/<title[^>]*>([^<]{1,48})<\/title>/i);
  if (match && match[1].trim()) return match[1].trim();
  const h1 = html.match(/<h1[^>]*>([^<]{1,48})<\/h1>/i);
  if (h1 && h1[1].trim()) return h1[1].trim();
  return null;
}

class PrintedAppsStore {
  private apps: PrintedAppDefinition[] = [];
  private listeners = new Set<PrintedAppsListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as PrintedAppDefinition[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.apps = parsed;
          return;
        }
      }
    } catch {
      // fall back to starters
    }
    this.apps = STARTER_PRINTED_APPS.map((a) => ({ ...a }));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.apps));
    } catch {
      // storage quota fallback
    }
  }

  private emit(): void {
    this.listeners.forEach((cb) => cb(this.apps));
  }

  subscribe(listener: PrintedAppsListener): () => void {
    this.listeners.add(listener);
    listener(this.apps);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getApps(): PrintedAppDefinition[] {
    return this.apps;
  }

  getById(id: string): PrintedAppDefinition | undefined {
    return this.apps.find((a) => a.id === id);
  }

  async printApp(input: {
    id?: `printed:${string}`;
    name: string;
    description?: string;
    html: string;
    improvementNote?: string;
  }): Promise<PrintedAppDefinition> {
    const cleanName = input.name.trim() || extractTitleFromHtml(input.html) || 'Printed HTML5 App';
    const shortName = cleanName.length > 16 ? `${cleanName.slice(0, 15).trim()}…` : cleanName;
    const html = normalizeHtml5Code(input.html, cleanName);
    const now = Date.now();

    const existing = input.id ? this.getById(input.id) : undefined;
    if (existing) {
      const updated: PrintedAppDefinition = {
        ...existing,
        name: cleanName,
        shortName,
        description: input.description ?? existing.description,
        html,
        version: existing.version + 1,
        updatedAt: now,
        lastImprovementNote: input.improvementNote ?? existing.lastImprovementNote,
      };
      this.apps = this.apps.map((a) => (a.id === existing.id ? updated : a));
      this.persist();
      this.emit();
      void vfs.saveFile({
        name: `${updated.slug}.html`,
        path: `/workspace/printed-apps/${updated.slug}.html`,
        content: html,
        patchedBy: 'HTML5 App Printer',
      });
      neuralBus.publish('SANDBOX', 'PRINTED_APP_UPDATED', `Updated "${updated.name}" to v${updated.version} in Library.`);
      return updated;
    }

    const baseSlug = slugify(cleanName);
    const uniqueSlug = this.apps.some((a) => a.slug === baseSlug)
      ? `${baseSlug}-${Math.random().toString(36).slice(2, 5)}`
      : baseSlug;
    const newApp: PrintedAppDefinition = {
      id: `printed:${uniqueSlug}`,
      slug: uniqueSlug,
      name: cleanName,
      shortName,
      description: input.description || 'User-printed HTML5 app bridged to all Aether OS subsystems.',
      html,
      version: 1,
      accentGradient: GRADIENT_PALETTE[this.apps.length % GRADIENT_PALETTE.length],
      createdAt: now,
      updatedAt: now,
      lastImprovementNote: input.improvementNote || 'Printed with AetherOS cross-app SDK bridge.',
      busMessagesSent: 0,
    };

    this.apps = [newApp, ...this.apps];
    this.persist();
    this.emit();
    void vfs.saveFile({
      name: `${newApp.slug}.html`,
      path: `/workspace/printed-apps/${newApp.slug}.html`,
      content: html,
      patchedBy: 'HTML5 App Printer',
    });
    neuralBus.publish('SANDBOX', 'PRINTED_APP_CREATED', `Printed "${newApp.name}" directly into Library & Desktop.`);
    return newApp;
  }

  recordBusTraffic(id: `printed:${string}`): void {
    const target = this.getById(id);
    if (!target) return;
    this.apps = this.apps.map((a) =>
      a.id === id ? { ...a, busMessagesSent: a.busMessagesSent + 1 } : a
    );
    this.persist();
    this.emit();
  }

  deleteApp(id: `printed:${string}`): void {
    const target = this.getById(id);
    this.apps = this.apps.filter((a) => a.id !== id);
    this.persist();
    this.emit();
    if (target) {
      neuralBus.publish('SANDBOX', 'PRINTED_APP_REMOVED', `Removed printed app "${target.name}" from Library.`);
    }
  }
}

export const printedAppsStore = new PrintedAppsStore();
