import type {
  CodeLibraryCluster,
  CodeLibraryModule,
  LibraryClusterDomain,
} from '../types/os';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_CodeLibraryClusters_v1';

const SEED_CLUSTERS: CodeLibraryCluster[] = [
  {
    id: 'cluster-webgl-shader',
    name: 'WebGL Shader & Bloom Kernel',
    domain: 'webgl-shader',
    summary: 'Procedural fragment shaders, starfield glow, and glass refraction uniforms.',
    colorHex: '#38bdf8',
    dependencies: ['ui-chrome'],
    generation: 1,
    updatedAt: Date.now() - 120_000,
    modules: [
      {
        id: 'mod-glsl-core',
        name: 'auroraFieldShader.js',
        sourceLabel: 'Sentient Sun & Cometic Matrix',
        language: 'js',
        symbols: ['createShaderField', 'stepPhaseUniform'],
        bytes: 612,
        code: `export function stepPhaseUniform(timeSec, hueShift = 0) {
  return {
    uTime: timeSec,
    uHue: (hueShift % 360 + 360) % 360,
    uGlow: 0.65 + 0.35 * Math.sin(timeSec * 1.4),
  };
}`,
      },
    ],
    previewHtml: `<!doctype html><html><body style="margin:0;background:#030712;overflow:hidden"><canvas id="c" style="width:100vw;height:100vh;display:block"></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');function r(){c.width=innerWidth;c.height=innerHeight}r();onresize=r;let t=0;function d(){t+=0.025;x.fillStyle='rgba(3,7,18,0.18)';x.fillRect(0,0,c.width,c.height);for(let i=0;i<6;i++){const rad=45+i*24+Math.sin(t+i)*14;x.beginPath();x.strokeStyle='hsla('+(190+i*18+t*12)+',85%,62%,0.7)';x.lineWidth=2;x.arc(c.width/2+Math.cos(t*0.7+i)*26,c.height/2+Math.sin(t*0.9+i)*18,rad,0,Math.PI*2);x.stroke();}requestAnimationFrame(d);}d();</script></body></html>`,
  },
  {
    id: 'cluster-audio-dsp',
    name: 'Sovereign Audio DSP & EQ',
    domain: 'audio-dsp',
    summary: 'Zero-dependency WebAudio 3-band EQ, harmonic chord synthesis, and FFT meter.',
    colorHex: '#f59e0b',
    dependencies: ['hybrid-runtime'],
    generation: 1,
    updatedAt: Date.now() - 95_000,
    modules: [
      {
        id: 'mod-dsp-eq',
        name: 'sovereignDspBus.js',
        sourceLabel: 'PS7 Liquid Quantum & Sentient Sun',
        language: 'js',
        symbols: ['triggerHarmonicPulse', 'computeSpectrumEnergy'],
        bytes: 540,
        code: `export function triggerHarmonicPulse(ctx, freq = 220, duration = 0.25) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(0.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}`,
      },
    ],
    previewHtml: `<!doctype html><html><body style="margin:0;background:#070b14;color:#fde68a;font-family:monospace;overflow:hidden;display:flex;flex-direction:column"><div style="padding:8px 12px;font-size:11px;display:flex;justify-content:space-between;background:rgba(15,23,42,.8)"><span>Sovereign DSP Analyzer</span><button id="b" style="background:#d97706;color:#fff;border:0;border-radius:6px;padding:3px 10px;cursor:pointer">Pulse Chord</button></div><canvas id="c" style="flex:1;width:100%"></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');function fit(){c.width=c.clientWidth;c.height=c.clientHeight}fit();onresize=fit;let pulse=0.4;document.getElementById('b').onclick=()=>{pulse=1;try{const a=new (AudioContext||webkitAudioContext)();[220,277.18,329.63].forEach((f,idx)=>{const o=a.createOscillator(),g=a.createGain();o.frequency.value=f;g.gain.setValueAtTime(0.05,a.currentTime+idx*0.03);g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+0.5);o.connect(g).connect(a.destination);o.start();o.stop(a.currentTime+0.5);});}catch(e){}};let t=0;function draw(){t+=0.08;pulse=Math.max(0.25,pulse*0.97);x.fillStyle='#070b14';x.fillRect(0,0,c.width,c.height);const bars=36,w=c.width/bars;for(let i=0;i<bars;i++){const h=(0.25+0.65*Math.abs(Math.sin(t+i*0.32)))*pulse*c.height*0.8;x.fillStyle='hsl('+(32+i*2.5)+',90%,58%)';x.fillRect(i*w+2,c.height-h,Math.max(3,w-4),h);}requestAnimationFrame(draw);}draw();</script></body></html>`,
  },
  {
    id: 'cluster-swarm-ai',
    name: 'Odonata Boids & Swarm AI',
    domain: 'swarm-ai',
    summary: 'Flocking spatial vectors, relay links, and autonomous target coordination.',
    colorHex: '#10b981',
    dependencies: ['physics-ballistics'],
    generation: 1,
    updatedAt: Date.now() - 65_000,
    modules: [
      {
        id: 'mod-boids-core',
        name: 'odonataSwarmStep.js',
        sourceLabel: 'Odonata Mesh Relay',
        language: 'js',
        symbols: ['stepBoidsMesh', 'computeRelaySignal'],
        bytes: 498,
        code: `export function stepBoidsMesh(agents, width, height, dt) {
  const safeDt = Math.min(0.0167, Math.max(0.001, dt));
  for (const a of agents) {
    a.x = (a.x + a.vx * safeDt * 60 + width) % width;
    a.y = (a.y + a.vy * safeDt * 60 + height) % height;
  }
}`,
      },
    ],
    previewHtml: `<!doctype html><html><body style="margin:0;background:#02100d;overflow:hidden"><canvas id="c" style="width:100vw;height:100vh;display:block"></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');function fit(){c.width=innerWidth;c.height=innerHeight}fit();onresize=fit;const nodes=Array.from({length:28},()=>({x:Math.random()*c.width,y:Math.random()*c.height,vx:(Math.random()-0.5)*2.2,vy:(Math.random()-0.5)*2.2}));function loop(){x.fillStyle='rgba(2,16,13,0.22)';x.fillRect(0,0,c.width,c.height);for(let i=0;i<nodes.length;i++){const a=nodes[i];a.x=(a.x+a.vx+c.width)%c.width;a.y=(a.y+a.vy+c.height)%c.height;for(let j=i+1;j<nodes.length;j++){const b=nodes[j],d=Math.hypot(a.x-b.x,a.y-b.y);if(d<115){x.strokeStyle='rgba(16,185,129,'+(1-d/115)*0.45+')';x.beginPath();x.moveTo(a.x,a.y);x.lineTo(b.x,b.y);x.stroke();}}x.fillStyle='#34d399';x.beginPath();x.arc(a.x,a.y,3,0,Math.PI*2);x.fill();}requestAnimationFrame(loop);}loop();</script></body></html>`,
  },
  {
    id: 'cluster-physics-ballistics',
    name: 'Cloth & Ballistic Kinematics',
    domain: 'physics-ballistics',
    summary: 'Verlet constraints, projectile trajectories, and clamped delta-time solvers.',
    colorHex: '#f43f5e',
    dependencies: ['webgl-shader'],
    generation: 1,
    updatedAt: Date.now() - 40_000,
    modules: [
      {
        id: 'mod-verlet-step',
        name: 'ballisticVerlet.js',
        sourceLabel: 'Cometic Ballistic Range v5',
        language: 'js',
        symbols: ['solveConstraintLink', 'clampStepDelta'],
        bytes: 410,
        code: `export function clampStepDelta(dtMs) {
  return Math.min(0.01667, Math.max(0.001, dtMs / 1000));
}`,
      },
    ],
    previewHtml: `<!doctype html><html><body style="margin:0;background:#09050e;overflow:hidden"><canvas id="c" style="width:100vw;height:100vh;display:block"></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');function fit(){c.width=innerWidth;c.height=innerHeight}fit();onresize=fit;const pts=[];const cols=12,rows=7;for(let y=0;y<rows;y++)for(let z=0;z<cols;z++)pts.push({x:80+z*34,y:40+y*28,ox:80+z*34,oy:40+y*28,pin:y===0});let t=0;function step(){t+=0.05;x.fillStyle='#09050e';x.fillRect(0,0,c.width,c.height);pts.forEach((p,idx)=>{if(!p.pin){const vx=(p.x-p.ox)*0.985,vy=(p.y-p.oy)*0.985;p.ox=p.x;p.oy=p.y;p.x+=vx+Math.sin(t+idx*0.2)*0.22;p.y+=vy+0.16;}});for(let y=0;y<rows;y++)for(let z=0;z<cols;z++){const p=pts[y*cols+z];x.strokeStyle='rgba(244,63,94,0.55)';if(z<cols-1){const r=pts[y*cols+z+1];x.beginPath();x.moveTo(p.x,p.y);x.lineTo(r.x,r.y);x.stroke();}if(y<rows-1){const b=pts[(y+1)*cols+z];x.beginPath();x.moveTo(p.x,p.y);x.lineTo(b.x,b.y);x.stroke();}}requestAnimationFrame(step);}step();</script></body></html>`,
  },
  {
    id: 'cluster-cad-geometry',
    name: 'Zero-Crossing CAD & SDF Math',
    domain: 'cad-geometry',
    summary: 'Parametric contour extraction, signed distance fields, and surface solvers.',
    colorHex: '#a855f7',
    dependencies: ['webgl-shader'],
    generation: 1,
    updatedAt: Date.now() - 20_000,
    modules: [
      {
        id: 'mod-sdf-cad',
        name: 'zeroCrossingSdf.js',
        sourceLabel: 'AiM Zero-Crossing CAD Kernel',
        language: 'js',
        symbols: ['evalGyroidSdf', 'findZeroCrossing'],
        bytes: 428,
        code: `export function evalGyroidSdf(x, y, z) {
  return Math.sin(x) * Math.cos(y) + Math.sin(y) * Math.cos(z) + Math.sin(z) * Math.cos(x);
}`,
      },
    ],
    previewHtml: `<!doctype html><html><body style="margin:0;background:#06040f;overflow:hidden"><canvas id="c" style="width:100vw;height:100vh;display:block"></canvas><script>const c=document.getElementById('c'),x=c.getContext('2d');function fit(){c.width=innerWidth;c.height=innerHeight}fit();onresize=fit;let t=0;function loop(){t+=0.02;x.fillStyle='#06040f';x.fillRect(0,0,c.width,c.height);const step=14;for(let py=20;py<c.height-20;py+=step){for(let px=20;px<c.width-20;px+=step){const nx=(px/c.width-0.5)*7,ny=(py/c.height-0.5)*5;const v=Math.sin(nx+t)*Math.cos(ny)+Math.sin(ny-t)*Math.cos(t);if(Math.abs(v)<0.18){x.fillStyle='#c084fc';x.fillRect(px,py,3,3);}}}requestAnimationFrame(loop);}loop();</script></body></html>`,
  },
];

export interface CodeClusterStoreState {
  clusters: CodeLibraryCluster[];
  busy: boolean;
  lastSummary: string;
  lastError: string | null;
}

type ClusterListener = (state: CodeClusterStoreState) => void;

class CodeClusterStore {
  private clusters: CodeLibraryCluster[] = [];
  private busy = false;
  private lastSummary = 'Library clusters ready to self-assemble incoming code.';
  private lastError: string | null = null;
  private listeners = new Set<ClusterListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CodeLibraryCluster[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.clusters = parsed;
          return;
        }
      }
    } catch {
      // fallback
    }
    this.clusters = SEED_CLUSTERS.map((c) => ({ ...c, modules: [...c.modules] }));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.clusters));
    } catch {
      // quota
    }
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((cb) => cb(snap));
  }

  getState(): CodeClusterStoreState {
    return {
      clusters: this.clusters,
      busy: this.busy,
      lastSummary: this.lastSummary,
      lastError: this.lastError,
    };
  }

  subscribe(listener: ClusterListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  async clusterIncomingCode(rawCode: string, sourceLabel = 'Live Playground Code'): Promise<CodeLibraryCluster[]> {
    const clean = rawCode.trim();
    if (!clean) {
      this.lastError = 'Paste or generate code before running self-clustering.';
      this.emit();
      return [];
    }
    if (this.busy) return [];
    this.busy = true;
    this.lastError = null;
    this.emit();

    try {
      const res = await fetch('/api/playground/cluster-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawCode: clean,
          sourceLabel,
          existingClusterNames: this.clusters.map((c) => `${c.name} (${c.domain})`),
        }),
      });
      const data = (await res.json()) as {
        assemblySummary?: string;
        clusters?: Array<{
          name: string;
          domain: LibraryClusterDomain;
          summary: string;
          colorHex: string;
          dependencies: string[];
          moduleName: string;
          symbols: string[];
          extractedCode: string;
          previewHtml: string;
        }>;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Library clustering request failed.');
      }

      const added: CodeLibraryCluster[] = [];
      const incoming = Array.isArray(data.clusters) ? data.clusters : [];

      for (const item of incoming) {
        const mod: CodeLibraryModule = {
          id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: item.moduleName || `${item.domain}-module.js`,
          sourceLabel,
          language: 'js',
          symbols: Array.isArray(item.symbols) ? item.symbols : [],
          code: item.extractedCode || clean.slice(0, 1800),
          bytes: (item.extractedCode || clean).length,
        };

        const existingIdx = this.clusters.findIndex(
          (c) => c.domain === item.domain && c.name.toLowerCase() === item.name.toLowerCase()
        );
        if (existingIdx !== -1) {
          const prev = this.clusters[existingIdx];
          const updated: CodeLibraryCluster = {
            ...prev,
            summary: item.summary || prev.summary,
            dependencies: Array.from(new Set([...prev.dependencies, ...(item.dependencies || [])])),
            modules: [mod, ...prev.modules].slice(0, 12),
            previewHtml: item.previewHtml || prev.previewHtml,
            generation: prev.generation + 1,
            updatedAt: Date.now(),
          };
          this.clusters[existingIdx] = updated;
          added.push(updated);
        } else {
          const created: CodeLibraryCluster = {
            id: `cluster-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            name: item.name,
            domain: item.domain || 'hybrid-runtime',
            summary: item.summary,
            colorHex: item.colorHex || '#22d3ee',
            dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
            modules: [mod],
            previewHtml: item.previewHtml || SEED_CLUSTERS[0].previewHtml,
            generation: 1,
            updatedAt: Date.now(),
          };
          this.clusters = [created, ...this.clusters];
          added.push(created);
        }

        await vfs.saveFile({
          name: mod.name,
          path: `/workspace/clusters/${mod.name}`,
          content: mod.code,
          patchedBy: 'Live Playground Clusterer',
        });
      }

      this.lastSummary = data.assemblySummary || `Self-assembled ${added.length} library cluster(s).`;
      this.persist();
      this.emit();

      jsonKnowledgeStore.saveEntry({
        title: `Library Clusters: ${added.map((a) => a.name).join(' + ')}`,
        category: 'system-sort',
        tags: ['live-playground', 'library-clusters', ...added.map((a) => a.domain)],
        summary: this.lastSummary,
        sideNotes: added.map((c) => `${c.name}: ${c.modules.length} module(s), Gen ${c.generation}`),
        linkedAppIds: ['liveplayground', 'synthhybrid', 'sentientai'],
        data: { clusters: added.map((c) => ({ id: c.id, name: c.name, domain: c.domain })) },
      });

      neuralBus.publish('FORGE', 'LIBRARY_CLUSTERS_ASSEMBLED', this.lastSummary);
      return added;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : 'Clustering failed.';
      this.emit();
      return [];
    } finally {
      this.busy = false;
      this.emit();
    }
  }

  async harvestFromVfsModules(): Promise<number> {
    await vfs.init();
    const files = vfs.getFiles();
    let harvestedCount = 0;

    for (const file of files) {
      if (!file.path.startsWith('/workspace/suite-apps/') && file.kind !== 'js') continue;
      const fnMatches = Array.from(file.content.matchAll(/function\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g))
        .map((m) => m[1])
        .slice(0, 6);
      if (fnMatches.length === 0) continue;

      let domain: LibraryClusterDomain = 'hybrid-runtime';
      if (/shader|three|webgl|bloom|fractal/i.test(file.name + file.content.slice(0, 1200))) {
        domain = 'webgl-shader';
      } else if (/audio|eq|synth|quantum/i.test(file.name)) {
        domain = 'audio-dsp';
      } else if (/swarm|odonata|boids|daemon/i.test(file.name)) {
        domain = 'swarm-ai';
      } else if (/ballistic|cloth|fps|jet|heliocell/i.test(file.name)) {
        domain = 'physics-ballistics';
      } else if (/cad|zero-crossing|sdf/i.test(file.name)) {
        domain = 'cad-geometry';
      }

      const targetCluster = this.clusters.find((c) => c.domain === domain);
      if (!targetCluster) continue;
      const modName = `${file.name.replace(/\.[^.]+$/, '')}.cluster.js`;
      if (targetCluster.modules.some((m) => m.name === modName)) continue;

      const snippet = `// Harvested symbols from ${file.name}: ${fnMatches.join(', ')}\nexport const sourceExports = ${JSON.stringify(fnMatches)};\n`;
      targetCluster.modules = [
        {
          id: `mod-vfs-${file.id}`,
          name: modName,
          sourceLabel: file.name,
          language: 'js' as const,
          symbols: fnMatches,
          code: snippet,
          bytes: snippet.length,
        },
        ...targetCluster.modules,
      ].slice(0, 14);
      targetCluster.generation += 1;
      targetCluster.updatedAt = Date.now();
      harvestedCount += 1;
    }

    if (harvestedCount > 0) {
      this.lastSummary = `Harvested ${harvestedCount} suite & VFS code module(s) directly into Library Clusters.`;
      this.persist();
      this.emit();
      neuralBus.publish('VFS', 'CLUSTERS_HARVESTED', this.lastSummary);
    } else {
      this.lastSummary = 'All current suite & VFS symbols are already clustered in Playground.';
      this.emit();
    }
    return harvestedCount;
  }

  mergeClusters(idA: string, idB: string): CodeLibraryCluster | null {
    if (idA === idB) return null;
    const a = this.clusters.find((c) => c.id === idA);
    const b = this.clusters.find((c) => c.id === idB);
    if (!a || !b) return null;

    const merged: CodeLibraryCluster = {
      id: `cluster-merged-${Date.now().toString(36)}`,
      name: `${a.name.split(' ')[0]} × ${b.name.split(' ')[0]} Fusion`,
      domain: 'hybrid-runtime',
      summary: `Unified library cluster fusing ${a.name} and ${b.name}.`,
      colorHex: '#22d3ee',
      dependencies: Array.from(new Set([...a.dependencies, ...b.dependencies, a.domain, b.domain])),
      modules: [...a.modules, ...b.modules].slice(0, 18),
      previewHtml: a.previewHtml,
      generation: a.generation + b.generation,
      updatedAt: Date.now(),
    };

    this.clusters = [merged, ...this.clusters.filter((c) => c.id !== idA && c.id !== idB)];
    this.lastSummary = `Merged "${a.name}" + "${b.name}" into "${merged.name}".`;
    this.persist();
    this.emit();
    neuralBus.publish('FORGE', 'CLUSTERS_MERGED', this.lastSummary);
    return merged;
  }
}

export const codeClusterStore = new CodeClusterStore();
