import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Gamepad2,
  ImagePlus,
  Layers,
  Printer,
  RefreshCw,
  Sliders,
  Sparkles,
  Trash2,
  Volume2,
  VolumeX,
  Wand2,
} from 'lucide-react';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { kernelHealer } from '../kernel/healerEngine';
import { microFractalKernel } from '../kernel/microFractalKernel';
import { neuralBus } from '../kernel/neuralBus';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import { vfs } from '../kernel/vfs';
import type { AppId, JsonLibraryEntry, PhysicsPresetSpec, SpriteAssetSpec } from '../types/os';

interface GameForgeAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

interface UploadedRefImage {
  id: string;
  name: string;
  mimeType: string;
  base64Data: string;
  previewUrl: string;
}

interface GeneratedGamePayload {
  title: string;
  genre: string;
  styleSpec: {
    artStyle: string;
    atmosphere: string;
    palette: string[];
  };
  physicsSpec: {
    gravity: number;
    friction: number;
    restitution: number;
    rulesSummary: string;
  };
  logicSpec: {
    objective: string;
    controls: string;
    winCondition: string;
    loseCondition: string;
  };
  spritesSpec: Array<{
    name: string;
    role: string;
    visualDesign: string;
  }>;
  narration: {
    voiceTone: string;
    prologue: string;
    waveCue: string;
    victoryLine: string;
    defeatLine: string;
  };
  researchTags: string[];
  sideNotes: string[];
  html5Game: string;
}

const STARTER_GAME: GeneratedGamePayload = {
  title: 'Nebula Bounce Core',
  genre: 'Self-Narrated Orbital Arcade',
  styleSpec: {
    artStyle: 'Bioluminescent Cyber-Arcade',
    atmosphere: 'Deep orbital neon chamber with glowing particle trails',
    palette: ['#06b6d4', '#a855f7', '#10b981', '#040814'],
  },
  physicsSpec: {
    gravity: 480,
    friction: 0.985,
    restitution: 0.78,
    rulesSummary: 'Clamped 16.67ms Euler integration with elastic shield bounce and thruster impulse.',
  },
  logicSpec: {
    objective: 'Harvest cyan resonance orbs while deflecting crimson plasma shards.',
    controls: 'WASD / Arrows or Click/Touch anywhere to thrust toward pointer.',
    winCondition: 'Reach 150 resonance score to clear the harmonic wave.',
    loseCondition: 'Lose all 3 hull shields.',
  },
  spritesSpec: [
    { name: 'Orbital Core', role: 'player', visualDesign: 'Cyan diamond hull with plasma thruster ring' },
    { name: 'Resonance Orb', role: 'collectible', visualDesign: 'Spinning emerald octahedron pulse' },
    { name: 'Plasma Shard', role: 'enemy', visualDesign: 'Crimson diamond hunter' },
  ],
  narration: {
    voiceTone: 'Tactical Sci-Fi Announcer',
    prologue: 'Orbital Forge online. Steer with arrows or touch, harvest cyan cores, and evade crimson shards.',
    waveCue: 'Harmonic surge! Velocity escalating across the arena.',
    victoryLine: 'Sector harmonized! Archiving run telemetry to JSON Vault.',
    defeatLine: 'Shield matrix depleted. Re-spooling thruster core.',
  },
  researchTags: ['arcade', 'euler-physics', 'self-narrated', 'canvas'],
  sideNotes: [
    'Starter game auto-syncs live gravity & bounce from Sprite & Physics Lab.',
    'Press 1-Button Generate with a prompt, uploaded images, or leave blank to self-invent.',
  ],
  html5Game: `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Nebula Bounce Core</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#030712;color:#e2e8f0;font-family:system-ui,sans-serif;height:100vh;display:flex;flex-direction:column;overflow:hidden}
  .hud{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:rgba(15,23,42,.85);border-bottom:1px solid rgba(56,189,248,.22);font-size:12px;gap:8px}
  .pill{padding:3px 8px;border-radius:8px;background:rgba(34,211,238,.12);border:1px solid rgba(34,211,238,.35);color:#67e8f9;font-variant-numeric:tabular-nums}
  .narr{padding:5px 12px;background:rgba(88,28,135,.28);border-bottom:1px solid rgba(192,132,252,.22);font-size:11px;color:#e9d5ff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  canvas{flex:1;width:100%;display:block;touch-action:none}
  button{background:rgba(16,185,129,.22);color:#d1fae5;border:1px solid rgba(52,211,153,.45);border-radius:7px;padding:4px 10px;font-size:11px;cursor:pointer}
</style>
</head>
<body>
  <div class="hud">
    <div><span class="pill" id="scoreEl">Score: 0</span> <span class="pill" id="hpEl">Shield: 3</span></div>
    <button id="rstBtn">Restart</button>
  </div>
  <div class="narr" id="narrEl">Announcer: Orbital Forge online. Move with Arrows / WASD or Touch!</div>
  <canvas id="c"></canvas>
<script>
const canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
const scoreEl=document.getElementById('scoreEl'),hpEl=document.getElementById('hpEl'),narrEl=document.getElementById('narrEl');
function fit(){canvas.width=canvas.clientWidth||480;canvas.height=canvas.clientHeight||300;}
window.addEventListener('resize',fit);fit();
let keys={},ptr=null,player,orbs,shards,parts,score,hp,over,last=performance.now();
function narrate(msg){narrEl.textContent='Announcer: '+msg;if(window.AetherOS){window.AetherOS.publish('GAME_NARRATION',msg,{score});}}
function init(){
  player={x:canvas.width/2,y:canvas.height/2,vx:0,vy:0,r:13};
  orbs=[];shards=[];parts=[];score=0;hp=3;over=false;
  for(let i=0;i<5;i++)spawnOrb();
  for(let i=0;i<4;i++)spawnShard();
  scoreEl.textContent='Score: 0';hpEl.textContent='Shield: 3';
  narrate('Harvest cyan cores and dodge plasma shards.');
}
function spawnOrb(){orbs.push({x:24+Math.random()*(canvas.width-48),y:24+Math.random()*(canvas.height-48),r:8,p:Math.random()*6});}
function spawnShard(){
  const a=Math.random()*Math.PI*2,sp=75+Math.random()*85;
  shards.push({x:Math.random()<0.5?16:canvas.width-16,y:24+Math.random()*(canvas.height-48),vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,r:10});
}
window.addEventListener('keydown',e=>keys[e.key.toLowerCase()]=true);
window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
canvas.addEventListener('pointerdown',e=>{const r=canvas.getBoundingClientRect();ptr={x:e.clientX-r.left,y:e.clientY-r.top};});
canvas.addEventListener('pointermove',e=>{if(ptr){const r=canvas.getBoundingClientRect();ptr={x:e.clientX-r.left,y:e.clientY-r.top};}});
window.addEventListener('pointerup',()=>ptr=null);
document.getElementById('rstBtn').onclick=init;
function burst(x,y,col){for(let i=0;i<10;i++){const a=Math.random()*Math.PI*2,s=40+Math.random()*120;parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:0.5,col});}}
function loop(now){
  const dt=Math.min(0.0167,(now-last)/1000);last=now;
  if(!over){
    let ax=0,ay=0;
    if(keys['arrowleft']||keys['a'])ax-=720;if(keys['arrowright']||keys['d'])ax+=720;
    if(keys['arrowup']||keys['w'])ay-=720;if(keys['arrowdown']||keys['s'])ay+=720;
    if(ptr){const dx=ptr.x-player.x,dy=ptr.y-player.y,d=Math.hypot(dx,dy)||1;if(d>6){ax+=(dx/d)*840;ay+=(dy/d)*840;}}
    player.vx=(player.vx+ax*dt)*0.96;player.vy=(player.vy+ay*dt)*0.96;
    player.x+=player.vx*dt;player.y+=player.vy*dt;
    if(player.x<player.r){player.x=player.r;player.vx*=-0.8;}if(player.x>canvas.width-player.r){player.x=canvas.width-player.r;player.vx*=-0.8;}
    if(player.y<player.r){player.y=player.r;player.vy*=-0.8;}if(player.y>canvas.height-player.r){player.y=canvas.height-player.r;player.vy*=-0.8;}
    orbs.forEach((o,i)=>{o.p+=dt*4;if(Math.hypot(player.x-o.x,player.y-o.y)<player.r+o.r){score+=10;scoreEl.textContent='Score: '+score;burst(o.x,o.y,'#34d399');orbs.splice(i,1);spawnOrb();if(score%50===0){spawnShard();narrate('Resonance wave '+score+'! Defense shard incoming.');}}});
    shards.forEach(s=>{
      s.x+=s.vx*dt;s.y+=s.vy*dt;
      if(s.x<s.r||s.x>canvas.width-s.r)s.vx*=-1;
      if(s.y<s.r||s.y>canvas.height-s.r)s.vy*=-1;
      if(Math.hypot(player.x-s.x,player.y-s.y)<player.r+s.r){
        hp--;hpEl.textContent='Shield: '+hp;burst(player.x,player.y,'#fb7185');
        s.x=player.x<canvas.width/2?canvas.width-20:20;
        if(hp<=0){over=true;narrate('Hull shield critical. Press Restart to redeploy.');}
      }
    });
  }
  ctx.fillStyle='rgba(3,7,18,0.28)';ctx.fillRect(0,0,canvas.width,canvas.height);
  orbs.forEach(o=>{ctx.beginPath();ctx.arc(o.x,o.y,o.r+Math.sin(o.p)*1.8,0,Math.PI*2);ctx.fillStyle='#10b981';ctx.fill();});
  shards.forEach(s=>{ctx.save();ctx.translate(s.x,s.y);ctx.rotate(now*0.005);ctx.fillStyle='#f43f5e';ctx.fillRect(-8,-8,16,16);ctx.restore();});
  parts=parts.filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;ctx.globalAlpha=Math.max(0,p.life*2);ctx.fillStyle=p.col;ctx.fillRect(p.x-2,p.y-2,4,4);ctx.globalAlpha=1;return p.life>0;});
  ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fillStyle=over?'#64748b':'#22d3ee';ctx.fill();
  ctx.strokeStyle='#a855f7';ctx.lineWidth=2.5;ctx.stroke();
  requestAnimationFrame(loop);
}
init();requestAnimationFrame(loop);
</script>
</body>
</html>`,
};

function injectGameBridge(rawHtml: string): string {
  const bridge = `<script>
(function(){
  if (window.AetherOS) return;
  const listeners = new Set();
  let state = { bass: 0.12, mid: 0.12, treble: 0.12, rms: 0.12, activeHue: 185, fps: 60, kernelHealth: 100 };
  window.addEventListener('message', function(ev) {
    const d = ev.data;
    if (!d || d.__aetherHost !== true) return;
    if (d.type === 'STATE_TICK') {
      state = d.state || state;
      listeners.forEach(function(fn){ try { fn({ type: 'STATE_TICK', state: state }); } catch(e){} });
    }
  });
  window.AetherOS = {
    appId: 'gameforge',
    getState: function(){ return state; },
    subscribe: function(fn){ listeners.add(fn); return function(){ listeners.delete(fn); }; },
    publish: function(type, summary, payload){
      window.parent.postMessage({ __aetherBridge: true, action: 'PUBLISH_BUS', type: String(type || 'GAME_EVENT'), summary: String(summary || ''), payload: payload || {} }, '*');
    },
    openApp: function(targetId){
      window.parent.postMessage({ __aetherBridge: true, action: 'OPEN_APP', targetId: String(targetId || '') }, '*');
    },
    saveVfs: function(name, content){
      window.parent.postMessage({ __aetherBridge: true, action: 'SAVE_VFS', name: String(name || 'game-data.json'), content: String(content || '') }, '*');
    }
  };
})();
</script>`;
  if (/<\/body>/i.test(rawHtml)) {
    return rawHtml.replace(/<\/body>/i, `${bridge}\n</body>`);
  }
  return `${rawHtml}\n${bridge}`;
}

export function GameForgeApp({ onOpenApp, onShowToast }: GameForgeAppProps) {
  const [prompt, setPrompt] = useState('');
  const [autoNarrate, setAutoNarrate] = useState(true);
  const [images, setImages] = useState<UploadedRefImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [sprites, setSprites] = useState<SpriteAssetSpec[]>(jsonKnowledgeStore.getSprites());
  const [physics, setPhysics] = useState<PhysicsPresetSpec>(jsonKnowledgeStore.getPhysics());
  const [entries, setEntries] = useState<JsonLibraryEntry[]>(jsonKnowledgeStore.getEntries());

  const [game, setGame] = useState<GeneratedGamePayload>(STARTER_GAME);
  const [inspectorTab, setInspectorTab] = useState<'style' | 'logic' | 'physics' | 'sprites' | 'narration' | 'json'>('narration');
  const [reloadNonce, setReloadNonce] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = jsonKnowledgeStore.subscribe((st) => {
      setSprites(st.sprites);
      setPhysics(st.physics);
      setEntries(st.entries);
    });
    return unsub;
  }, []);

  const srcDoc = useMemo(() => injectGameBridge(game.html5Game), [game.html5Game]);

  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin || ev.source !== iframeWin) return;
      const msg = ev.data;
      if (!msg || msg.__aetherBridge !== true) return;
      if (msg.action === 'PUBLISH_BUS') {
        neuralBus.publish('FORGE', msg.type || 'GAME_EVENT', `[${game.title}] ${msg.summary || 'Telemetry'}`, msg.payload);
      } else if (msg.action === 'OPEN_APP' && msg.targetId) {
        onOpenApp(msg.targetId as AppId);
      } else if (msg.action === 'SAVE_VFS' && msg.name) {
        void vfs.saveFile({
          name: msg.name,
          path: `/workspace/games/${msg.name}`,
          content: String(msg.content ?? ''),
          patchedBy: '1-Button Game Forge',
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [game.title, onOpenApp]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const syn = synesthesiaEngine.getState();
      const mfk = microFractalKernel.getState();
      const heal = kernelHealer.getState();
      win.postMessage(
        {
          __aetherHost: true,
          type: 'STATE_TICK',
          state: {
            bass: Number(syn.bass.toFixed(3)),
            mid: Number(syn.mid.toFixed(3)),
            treble: Number(syn.treble.toFixed(3)),
            rms: Number(syn.rms.toFixed(3)),
            activeHue: syn.activeHue,
            fps: mfk.measuredFps,
            kernelHealth: heal.health,
          },
        },
        '*'
      );
    }, 160);
    return () => window.clearInterval(timer);
  }, [reloadNonce]);

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.04;
      utter.pitch = 0.96;
      utter.onstart = () => setSpeaking(true);
      utter.onend = () => setSpeaking(false);
      utter.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(utter);
    } catch {
      setSpeaking(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  };

  const handleImageUpload = (fileList: FileList | null) => {
    if (!fileList) return;
    Array.from(fileList)
      .slice(0, 3)
      .forEach((file) => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = typeof reader.result === 'string' ? reader.result : '';
          if (!dataUrl) return;
          setImages((prev) => [
            ...prev.slice(0, 2),
            {
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: file.name,
              mimeType: file.type,
              base64Data: dataUrl,
              previewUrl: dataUrl,
            },
          ]);
        };
        reader.readAsDataURL(file);
      });
  };

  const handleOneButtonGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    setErrorMsg(null);
    neuralBus.publish(
      'FORGE',
      'GAME_FORGE_START',
      prompt.trim()
        ? `1-Button Game Forge building from prompt + ${images.length} image(s)...`
        : `1-Button Game Forge self-inventing & auto-narrating game from ${images.length} image(s) + JSON Vault...`
    );

    try {
      const libraryHints = entries
        .slice(0, 6)
        .map((e) => `${e.title}: ${e.summary}${e.sideNotes[0] ? ` (${e.sideNotes[0]})` : ''}`);

      const res = await fetch('/api/gameforge/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          autoNarrate,
          images: images.map((im) => ({
            name: im.name,
            mimeType: im.mimeType,
            base64Data: im.base64Data,
          })),
          sprites: sprites.slice(0, 8).map((s) => ({
            name: s.name,
            role: s.role,
            palette: s.palette,
          })),
          physics,
          libraryHints,
        }),
      });

      const data = (await res.json()) as Partial<GeneratedGamePayload> & { error?: string };
      if (!res.ok || !data.html5Game) {
        throw new Error(data.error || 'Gemini Game Forge did not return playable HTML5 output.');
      }

      const nextGame: GeneratedGamePayload = {
        title: data.title || 'Gemini Auto-Game',
        genre: data.genre || 'Arcade',
        styleSpec: data.styleSpec || STARTER_GAME.styleSpec,
        physicsSpec: data.physicsSpec || STARTER_GAME.physicsSpec,
        logicSpec: data.logicSpec || STARTER_GAME.logicSpec,
        spritesSpec: Array.isArray(data.spritesSpec) ? data.spritesSpec : [],
        narration: data.narration || STARTER_GAME.narration,
        researchTags: Array.isArray(data.researchTags) ? data.researchTags : ['gemini-game'],
        sideNotes: Array.isArray(data.sideNotes) ? data.sideNotes : [],
        html5Game: data.html5Game,
      };

      setGame(nextGame);
      setReloadNonce((n) => n + 1);

      // Save game specification, physics, sprites, narration & side-notes into JSON Library Vault
      jsonKnowledgeStore.saveEntry({
        title: nextGame.title,
        category: 'game-spec',
        tags: Array.from(new Set(['generated-game', nextGame.genre.toLowerCase(), ...nextGame.researchTags])),
        summary: `${nextGame.genre} · ${nextGame.logicSpec.objective}`,
        sideNotes: [
          ...nextGame.sideNotes,
          `Narration Prologue: "${nextGame.narration.prologue}"`,
          `Physics: g=${nextGame.physicsSpec.gravity}, restitution=${nextGame.physicsSpec.restitution}`,
        ],
        linkedAppIds: ['gameforge', 'spritecomposer', 'jsonvault', 'htmlprinter', 'masterbrain'],
        data: {
          title: nextGame.title,
          genre: nextGame.genre,
          styleSpec: nextGame.styleSpec,
          physicsSpec: nextGame.physicsSpec,
          logicSpec: nextGame.logicSpec,
          spritesSpec: nextGame.spritesSpec,
          narration: nextGame.narration,
          usedCustomImages: images.map((i) => i.name),
        },
      });

      await vfs.saveFile({
        name: `${nextGame.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'generated-game'}.html`,
        path: `/workspace/games/${nextGame.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'generated-game'}.html`,
        content: nextGame.html5Game,
        patchedBy: '1-Button Game Forge',
      });

      neuralBus.publish(
        'FORGE',
        'GAME_FORGE_COMPLETE',
        `Generated "${nextGame.title}" (${nextGame.genre}) and archived specs into JSON Research Vault.`
      );
      onShowToast?.(`Generated "${nextGame.title}" & saved to JSON Vault!`);

      if (autoNarrate && nextGame.narration?.prologue) {
        speakText(`${nextGame.title}. ${nextGame.narration.prologue}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Game generation failed.';
      setErrorMsg(msg);
      neuralBus.publish('FORGE', 'GAME_FORGE_ERROR', msg);
    } finally {
      setGenerating(false);
    }
  };

  const handlePrintToLibrary = async () => {
    const printed = await printedAppsStore.printApp({
      name: game.title,
      description: `${game.genre} generated via 1-Button Game Forge · Auto-connected to AetherOS`,
      html: game.html5Game,
      improvementNote: `Printed from 1-Button Game Forge (${game.styleSpec.artStyle}).`,
    });
    onShowToast?.(`Printed "${printed.name}" to OS Library & Desktop!`);
    onOpenApp(printed.id);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-3 overflow-hidden text-xs">
      {/* Top 1-Button Control Bar */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-fuchsia-500 to-cyan-500 flex items-center justify-center shadow">
              <Gamepad2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                1-Button Game Forge (Gemini Self-Narrated)
              </h2>
              <p className="text-[10px] text-slate-400">
                Prompt &amp; Images optional · Leave blank to auto-invent style, logic, physics, sprites &amp; narration
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenApp('spritecomposer')}
              className="px-2 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Sliders className="w-3 h-3" />
              <span>Sprites ({sprites.length}) &amp; Physics</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenApp('jsonvault')}
              className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3 h-3" />
              <span>JSON Vault ({entries.length})</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenApp('masterbrain')}
              className="px-2 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 text-indigo-200 text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <Layers className="w-3 h-3" />
              <span>Master Brain</span>
            </button>
          </div>
        </div>

        {/* Single Prompt + Image Upload + 1-Button Action */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Optional game idea (or leave blank to self-invent & auto-narrate)..."
            className="flex-1 min-w-[200px] bg-slate-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-cyan-400/60"
          />

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleImageUpload(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5 text-cyan-300" />
            <span>Images ({images.length}/3)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const next = !autoNarrate;
              setAutoNarrate(next);
              if (!next) stopSpeech();
            }}
            className={`px-2.5 py-1.5 rounded-lg border inline-flex items-center gap-1 cursor-pointer ${
              autoNarrate
                ? 'bg-fuchsia-500/20 border-fuchsia-400/45 text-fuchsia-100'
                : 'bg-white/5 border-white/15 text-slate-400'
            }`}
          >
            {autoNarrate ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{autoNarrate ? 'Auto-Narrate' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleOneButtonGenerate()}
            disabled={generating}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-cyan-500 to-emerald-500 hover:brightness-110 text-white font-bold shadow-[0_0_20px_rgba(34,211,238,0.45)] inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60 whitespace-nowrap"
          >
            <Sparkles className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Synthesizing Game...' : 'Generate Game (1-Click)'}</span>
          </button>
        </div>

        {images.length > 0 && (
          <div className="flex items-center gap-2 pt-0.5">
            {images.map((im) => (
              <div
                key={im.id}
                className="relative group flex items-center gap-1.5 bg-slate-950/80 border border-white/15 rounded-lg px-1.5 py-1"
              >
                <img src={im.previewUrl} alt={im.name} className="w-6 h-6 rounded object-cover" />
                <span className="text-[10px] text-slate-300 max-w-[90px] truncate">{im.name}</span>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((x) => x.id !== im.id))}
                  className="text-slate-400 hover:text-rose-300 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {errorMsg && (
          <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-400/40 text-rose-200 text-[11px]">
            {errorMsg}
          </div>
        )}
      </div>

      {/* Main Split Stage: Live Playable Game Canvas + Spec & Narration Inspector */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Live Playable Game Viewport */}
        <div className="lg:col-span-7 flex flex-col min-h-0 rounded-xl border border-white/12 bg-slate-950/90 overflow-hidden">
          <div className="px-3 py-1.5 border-b border-white/10 bg-slate-900/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="min-w-0">
              <span className="font-semibold text-slate-100 truncate">{game.title}</span>
              <span className="ml-2 text-[10px] text-cyan-300 font-mono-tabular">{game.genre}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => speakText(game.narration.prologue)}
                className="px-2 py-1 rounded-md bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 text-[10px] inline-flex items-center gap-1 cursor-pointer"
              >
                <Volume2 className={`w-3 h-3 ${speaking ? 'animate-pulse' : ''}`} />
                <span>Speak Intro</span>
              </button>
              <button
                type="button"
                onClick={() => void handlePrintToLibrary()}
                className="px-2 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3 h-3" />
                <span>Print to Library</span>
              </button>
              <button
                type="button"
                onClick={() => setReloadNonce((n) => n + 1)}
                title="Reload Game Stage"
                className="p-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[220px]">
            <iframe
              key={reloadNonce}
              ref={iframeRef}
              srcDoc={srcDoc}
              title={game.title}
              sandbox="allow-scripts allow-forms allow-modals"
              className="w-full h-full border-0 block bg-[#030712]"
            />
          </div>
        </div>

        {/* Right: Style / Logic / Physics / Sprites / Narration / JSON Inspector */}
        <div className="lg:col-span-5 flex flex-col min-h-0 aether-panel rounded-xl p-2.5">
          <div className="flex flex-wrap gap-1 pb-2 border-b border-white/10 shrink-0">
            {(
              [
                ['narration', 'Narration'],
                ['style', 'Style'],
                ['logic', 'Logic'],
                ['physics', 'Physics'],
                ['sprites', 'Sprites'],
                ['json', 'JSON Vault'],
              ] as const
            ).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setInspectorTab(tab)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium border cursor-pointer ${
                  inspectorTab === tab
                    ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                    : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pt-2.5 space-y-2.5 pr-1">
            {inspectorTab === 'narration' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-fuchsia-950/35 border border-fuchsia-400/25">
                  <div className="text-[10px] uppercase tracking-wider text-fuchsia-300 font-semibold">
                    Auto-Narration Tone: {game.narration.voiceTone}
                  </div>
                  <p className="text-slate-100 mt-1 leading-relaxed">{game.narration.prologue}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10 space-y-1">
                  <div className="text-[10px] text-cyan-300 font-semibold">Wave Escalation Cue</div>
                  <div className="text-slate-300">{game.narration.waveCue}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 rounded-lg bg-emerald-950/30 border border-emerald-400/20">
                    <div className="text-[10px] text-emerald-300 font-semibold">Victory Line</div>
                    <div className="text-slate-300 mt-0.5">{game.narration.victoryLine}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-950/30 border border-rose-400/20">
                    <div className="text-[10px] text-rose-300 font-semibold">Defeat Line</div>
                    <div className="text-slate-300 mt-0.5">{game.narration.defeatLine}</div>
                  </div>
                </div>
              </div>
            )}

            {inspectorTab === 'style' && (
              <div className="space-y-2">
                <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10">
                  <div className="text-[10px] text-cyan-300 font-semibold">Art Direction</div>
                  <div className="text-slate-100 font-medium mt-0.5">{game.styleSpec.artStyle}</div>
                  <div className="text-slate-400 mt-1">{game.styleSpec.atmosphere}</div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {game.styleSpec.palette.map((hex, i) => (
                    <span
                      key={`${hex}-${i}`}
                      className="px-2 py-1 rounded-md bg-slate-950/80 border border-white/15 font-mono text-[10px] text-slate-200 inline-flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-sm border border-white/30"
                        style={{ backgroundColor: hex }}
                      />
                      {hex}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {inspectorTab === 'logic' && (
              <div className="space-y-2">
                <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10">
                  <div className="text-[10px] text-cyan-300 font-semibold">Objective</div>
                  <div className="text-slate-200 mt-0.5">{game.logicSpec.objective}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10">
                  <div className="text-[10px] text-cyan-300 font-semibold">Controls</div>
                  <div className="text-slate-200 mt-0.5">{game.logicSpec.controls}</div>
                </div>
                <div className="p-2 rounded-lg bg-emerald-950/25 border border-emerald-400/20">
                  <div className="text-[10px] text-emerald-300 font-semibold">Win Condition</div>
                  <div className="text-slate-200 mt-0.5">{game.logicSpec.winCondition}</div>
                </div>
                <div className="p-2 rounded-lg bg-rose-950/25 border border-rose-400/20">
                  <div className="text-[10px] text-rose-300 font-semibold">Lose Condition</div>
                  <div className="text-slate-200 mt-0.5">{game.logicSpec.loseCondition}</div>
                </div>
              </div>
            )}

            {inspectorTab === 'physics' && (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-center">
                    <div className="text-[10px] text-slate-400">Gravity</div>
                    <div className="font-mono-tabular font-semibold text-cyan-300">{game.physicsSpec.gravity}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-center">
                    <div className="text-[10px] text-slate-400">Friction</div>
                    <div className="font-mono-tabular font-semibold text-emerald-300">{game.physicsSpec.friction}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-slate-950/80 border border-white/10 text-center">
                    <div className="text-[10px] text-slate-400">Bounce</div>
                    <div className="font-mono-tabular font-semibold text-fuchsia-300">{game.physicsSpec.restitution}</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300">
                  {game.physicsSpec.rulesSummary}
                </div>
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-emerald-200">Active Rig: {physics.name}</span>
                  <button
                    type="button"
                    onClick={() => onOpenApp('spritecomposer')}
                    className="px-2 py-1 rounded bg-emerald-500/25 text-emerald-100 text-[10px] cursor-pointer"
                  >
                    Tune Rig
                  </button>
                </div>
              </div>
            )}

            {inspectorTab === 'sprites' && (
              <div className="space-y-2">
                {game.spritesSpec.map((sp, i) => (
                  <div key={`${sp.name}-${i}`} className="p-2 rounded-lg bg-white/[0.04] border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-100">{sp.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-200">{sp.role}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">{sp.visualDesign}</div>
                  </div>
                ))}
                {sprites.length > 0 && (
                  <div className="pt-1 border-t border-white/10">
                    <div className="text-[10px] text-emerald-300 font-semibold mb-1">
                      Synced Custom Sprites from Lab ({sprites.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sprites.map((s) => (
                        <div key={s.id} className="p-1 rounded bg-slate-950/90 border border-white/10 flex items-center gap-1.5">
                          <img src={s.dataUrl} alt={s.name} className="w-6 h-6 object-contain" />
                          <span className="text-[10px] text-slate-200">{s.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inspectorTab === 'json' && (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {game.researchTags.map((t) => (
                    <span key={t} className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/30 text-[10px] text-amber-200">
                      #{t}
                    </span>
                  ))}
                </div>
                {game.sideNotes.map((note, idx) => (
                  <div key={idx} className="p-2 rounded-lg bg-amber-950/25 border border-amber-400/20 text-amber-100 text-[11px]">
                    • {note}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => onOpenApp('jsonvault')}
                  className="w-full py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Inspect &amp; Research in JSON Vault</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
