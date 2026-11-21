import type { SyntheticIntegrationRecord } from '../types/os';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { swarmEngine } from './swarmEngine';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_SyntheticUnificator_v1';
const KINETIC_HOOK_KEY = 'AetherOS_KineticHookCode_v1';
const VOXEL_HOOK_KEY = 'AetherOS_VoxelHookCode_v1';

export const DEFAULT_KINETIC_HOOK = `// Kinetic 2D Synthetic Hook (editable or updated by Code Unificator)
// Receives: state { score, player, orbs, hazards, spawns, wave }, dt, api { spawnOrb, spawnHazard, burst, addScore, pulseColor }
if (state.orbs.length < 5) api.spawnOrb();
if (state.score >= 50 && state.hazards.length < 4 && Math.random() < dt * 0.4) {
  api.spawnHazard();
}
`;

export const DEFAULT_VOXEL_HOOK = `// Voxel 3D Synthetic Hook (updated automatically by Unificator)
// Receives: sceneState { score, time, crystals, drones, playerPos }, dt, api { spawnCrystal, spawnDrone, addScore, setFogHue }
if (sceneState.crystals < 5) api.spawnCrystal();
`;

export interface UnificatorTarget {
  id: string;
  name: string;
  kind: 'kinetic-engine' | 'voxel-engine' | 'printed-game' | 'starter-game';
  sourceHtml: string;
}

const STARTER_ARCADE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Nebula Core Unified Target</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030712;color:#e2e8f0;font-family:system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
  .hud{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(15,23,42,.88);border-bottom:1px solid rgba(56,189,248,.25);font-size:12px;gap:8px}
  .pill{padding:3px 8px;border-radius:8px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.35);color:#67e8f9}
  canvas{flex:1;width:100%;display:block;touch-action:none}
</style>
</head>
<body>
  <div class="hud">
    <div><span class="pill" id="scoreEl">Score: 0</span> <span class="pill" id="hpEl">Shield: 3</span></div>
    <span id="statusEl" style="color:#a5f3fc;font-size:11px">Unified Arena Ready</span>
  </div>
  <canvas id="c"></canvas>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('scoreEl'),hpEl=document.getElementById('hpEl'),statusEl=document.getElementById('statusEl');
function fit(){canvas.width=canvas.clientWidth||480;canvas.height=canvas.clientHeight||320;}
window.addEventListener('resize',fit);fit();
let player={x:canvas.width/2,y:canvas.height/2,vx:0,vy:0,r:13};
let orbs=[],enemies=[],parts=[],keys={},score=0,hp=3,last=performance.now();
for(let i=0;i<5;i++)orbs.push({x:30+Math.random()*(canvas.width-60),y:30+Math.random()*(canvas.height-60),r:8});
for(let i=0;i<3;i++)enemies.push({x:20,y:40+i*80,vx:90,vy:65,r:10});
window.addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);
window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
function loop(now){
  const dt=Math.min(0.0167,(now-last)/1000);last=now;
  let ax=0,ay=0;
  if(keys.a||keys.arrowleft)ax-=700;if(keys.d||keys.arrowright)ax+=700;
  if(keys.w||keys.arrowup)ay-=700;if(keys.s||keys.arrowdown)ay+=700;
  player.vx=(player.vx+ax*dt)*0.96;player.vy=(player.vy+ay*dt)*0.96;
  player.x=Math.max(14,Math.min(canvas.width-14,player.x+player.vx*dt));
  player.y=Math.max(14,Math.min(canvas.height-14,player.y+player.vy*dt));
  orbs.forEach((o,i)=>{if(Math.hypot(player.x-o.x,player.y-o.y)<player.r+o.r){score+=10;scoreEl.textContent='Score: '+score;o.x=30+Math.random()*(canvas.width-60);o.y=30+Math.random()*(canvas.height-60);}});
  enemies.forEach(en=>{en.x+=en.vx*dt;en.y+=en.vy*dt;if(en.x<12||en.x>canvas.width-12)en.vx*=-1;if(en.y<12||en.y>canvas.height-12)en.vy*=-1;});
  ctx.fillStyle='rgba(3,7,18,0.28)';ctx.fillRect(0,0,canvas.width,canvas.height);
  orbs.forEach(o=>{ctx.beginPath();ctx.arc(o.x,o.y,o.r,0,Math.PI*2);ctx.fillStyle='#10b981';ctx.fill();});
  enemies.forEach(en=>{ctx.fillStyle='#f43f5e';ctx.fillRect(en.x-8,en.y-8,16,16);});
  ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fillStyle='#22d3ee';ctx.fill();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
</script>
</body>
</html>`;

type UnificatorListener = (state: {
  records: SyntheticIntegrationRecord[];
  kineticHookCode: string;
  voxelHookCode: string;
  busy: boolean;
  lastError: string | null;
}) => void;

class UnificatorEngine {
  private records: SyntheticIntegrationRecord[] = [];
  private kineticHookCode = DEFAULT_KINETIC_HOOK;
  private voxelHookCode = DEFAULT_VOXEL_HOOK;
  private busy = false;
  private lastError: string | null = null;
  private listeners = new Set<UnificatorListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SyntheticIntegrationRecord[];
        if (Array.isArray(parsed)) this.records = parsed;
      }
      const kHook = localStorage.getItem(KINETIC_HOOK_KEY);
      if (kHook) this.kineticHookCode = kHook;
      const vHook = localStorage.getItem(VOXEL_HOOK_KEY);
      if (vHook) this.voxelHookCode = vHook;
    } catch {
      // ignore
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records.slice(0, 20)));
      localStorage.setItem(KINETIC_HOOK_KEY, this.kineticHookCode);
      localStorage.setItem(VOXEL_HOOK_KEY, this.voxelHookCode);
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
      records: this.records,
      kineticHookCode: this.kineticHookCode,
      voxelHookCode: this.voxelHookCode,
      busy: this.busy,
      lastError: this.lastError,
    };
  }

  subscribe(listener: UnificatorListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getAvailableTargets(): UnificatorTarget[] {
    const targets: UnificatorTarget[] = [
      {
        id: 'kineticengine',
        name: 'Kinetic 2D Physics & Sprite Engine',
        kind: 'kinetic-engine',
        sourceHtml: STARTER_ARCADE_HTML,
      },
      {
        id: 'voxelengine',
        name: 'Voxel & Shader 3D Game Engine',
        kind: 'voxel-engine',
        sourceHtml: STARTER_ARCADE_HTML,
      },
      {
        id: 'starter-arcade',
        name: 'Nebula Core Unified Game',
        kind: 'starter-game',
        sourceHtml: STARTER_ARCADE_HTML,
      },
    ];

    for (const app of printedAppsStore.getApps()) {
      targets.push({
        id: app.id,
        name: `${app.name} (Library v${app.version})`,
        kind: 'printed-game',
        sourceHtml: app.html,
      });
    }
    return targets;
  }

  detectBestTarget(sourceCode: string): UnificatorTarget {
    const lower = sourceCode.toLowerCase();
    const targets = this.getAvailableTargets();
    if (/three\.|webgl|mesh|voxel|shader|camera\.position|boxgeometry|pointlight/.test(lower)) {
      return targets.find((t) => t.id === 'voxelengine') ?? targets[0];
    }
    if (/gravity|restitution|rigid|bounce|sprite|canvas|player|enemy|orb|weapon/.test(lower)) {
      return targets.find((t) => t.id === 'kineticengine') ?? targets[0];
    }
    return targets.find((t) => t.kind === 'printed-game') ?? targets[0];
  }

  setKineticHookCode(code: string): void {
    this.kineticHookCode = code;
    this.persist();
    this.emit();
    neuralBus.publish('FORGE', 'KINETIC_HOOK_UPDATED', 'Synthetically hot-patched Kinetic 2D Game Engine hook.');
  }

  setVoxelHookCode(code: string): void {
    this.voxelHookCode = code;
    this.persist();
    this.emit();
    neuralBus.publish('FORGE', 'VOXEL_HOOK_UPDATED', 'Synthetically hot-patched Voxel 3D Game Engine hook.');
  }

  async integrateCodeIntoGame(params: {
    codeSnippet: string;
    targetId: string | 'auto';
    userDirective?: string;
    publishToLibrary?: boolean;
  }): Promise<SyntheticIntegrationRecord | null> {
    if (!params.codeSnippet.trim() || this.busy) return null;

    this.busy = true;
    this.lastError = null;
    this.emit();

    const targets = this.getAvailableTargets();
    const chosenTarget =
      params.targetId === 'auto'
        ? this.detectBestTarget(params.codeSnippet)
        : targets.find((t) => t.id === params.targetId) ?? targets[0];

    neuralBus.publish(
      'FORGE',
      'SYNTHETIC_UNIFY_START',
      `Unificator + 20 Support Daemons analyzing & integrating code into "${chosenTarget.name}"...`
    );

    try {
      // Pre-synthesis safety checkpoint & AST/Dependency daemons
      await vfs.createSnapshot(
        `Pre-Unify: ${chosenTarget.name}`,
        'Rollback Guardian Daemon checkpoint prior to synthetic game integration'
      );
      await swarmEngine.runDaemon('code-intent-analyzer');
      await swarmEngine.runDaemon('dep-resolver');
      await swarmEngine.runDaemon('game-hook-injector');

      const supportDaemonNames = swarmEngine
        .getDaemons()
        .filter((d) => d.category === 'unificator-support')
        .map((d) => d.role);

      const res = await fetch('/api/unificator/integrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codeSnippet: params.codeSnippet,
          targetName: chosenTarget.name,
          targetKind: chosenTarget.kind,
          targetSource: chosenTarget.sourceHtml,
          userDirective: params.userDirective,
          activeDaemons: supportDaemonNames,
        }),
      });

      const data = (await res.json()) as {
        integrationTitle?: string;
        detectedRequirements?: string[];
        synthesisSummary?: string;
        bridgeCode?: string;
        unifiedHtml5Game?: string;
        supportDaemonsUsed?: string[];
        error?: string;
      };

      if (!res.ok || !data.unifiedHtml5Game) {
        throw new Error(data.error || 'Synthetic integration did not produce a unified game.');
      }

      const record: SyntheticIntegrationRecord = {
        id: `unify-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        title: data.integrationTitle || `Unified Mod → ${chosenTarget.name}`,
        targetId: chosenTarget.id,
        targetName: chosenTarget.name,
        sourceCode: params.codeSnippet,
        detectedRequirements: Array.isArray(data.detectedRequirements) ? data.detectedRequirements : [],
        synthesisSummary: data.synthesisSummary || 'Synthetically integrated code into active game runtime.',
        bridgeCode: data.bridgeCode || '',
        unifiedHtml: data.unifiedHtml5Game,
        supportDaemonsUsed: Array.isArray(data.supportDaemonsUsed)
          ? data.supportDaemonsUsed
          : supportDaemonNames.slice(0, 6),
        createdAt: Date.now(),
      };

      this.records = [record, ...this.records].slice(0, 20);

      // Apply live synthetic bridge hook into engines automatically
      if (chosenTarget.kind === 'kinetic-engine' && record.bridgeCode) {
        this.kineticHookCode = record.bridgeCode;
      } else if (chosenTarget.kind === 'voxel-engine' && record.bridgeCode) {
        this.voxelHookCode = record.bridgeCode;
      } else if (record.bridgeCode) {
        // Make bridge available to Kinetic 2D if compatible
        this.kineticHookCode = record.bridgeCode;
      }

      this.persist();

      // Upgrade or print into OS Library
      if (params.publishToLibrary !== false) {
        await printedAppsStore.printApp({
          id: chosenTarget.kind === 'printed-game' ? (chosenTarget.id as `printed:${string}`) : undefined,
          name: chosenTarget.kind === 'printed-game' ? chosenTarget.name.replace(/\s*\(Library v\d+\)$/, '') : record.title,
          description: record.synthesisSummary,
          html: record.unifiedHtml,
          improvementNote: `Synthetically unified by Code Unifier: ${record.detectedRequirements.slice(0, 3).join('; ')}`,
        });
      }

      // Persist in VFS & JSON Knowledge Vault for Master Brain + Smart Brain
      const slug = record.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'unified-game';
      await vfs.saveFile({
        name: `${slug}.html`,
        path: `/workspace/unified-games/${slug}.html`,
        content: record.unifiedHtml,
        patchedBy: 'Synthetic Code Unificator',
      });

      jsonKnowledgeStore.saveEntry({
        title: `Unified Build: ${record.title}`,
        category: 'game-spec',
        tags: ['synthetic-unification', 'code-unifier', chosenTarget.kind],
        summary: record.synthesisSummary,
        sideNotes: record.detectedRequirements,
        linkedAppIds: ['codeunifier', 'meshunifier', 'kineticengine', 'voxelengine', 'masterbrain'],
        data: {
          targetId: record.targetId,
          targetName: record.targetName,
          supportDaemonsUsed: record.supportDaemonsUsed,
          detectedRequirements: record.detectedRequirements,
        },
      });

      // Run post-synthesis verification & Brain linker daemons
      await swarmEngine.runDaemon('synthetic-patch-verifier');
      await swarmEngine.runDaemon('brain-memory-linker');
      await swarmEngine.runDaemon('coherence-calibrator');

      neuralBus.publish(
        'FORGE',
        'SYNTHETIC_UNIFY_COMPLETE',
        `Integrated "${record.title}" into ${chosenTarget.name} (${record.detectedRequirements.length} auto-inferred requirements).`
      );

      this.busy = false;
      this.emit();
      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synthetic integration failed.';
      this.busy = false;
      this.lastError = msg;
      this.emit();
      neuralBus.publish('FORGE', 'SYNTHETIC_UNIFY_ERROR', msg);
      return null;
    }
  }
}

export const unificatorEngine = new UnificatorEngine();
