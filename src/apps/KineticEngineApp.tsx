import { useEffect, useRef, useState } from 'react';
import {
  Bot,
  Flame,
  Merge,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { neuralBus } from '../kernel/neuralBus';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import { unificatorEngine } from '../kernel/unificatorEngine';
import type { AppId, PhysicsPresetSpec, SmartGameItem, SpriteAssetSpec } from '../types/os';

interface KineticEngineAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function KineticEngineApp({ onOpenApp, onShowToast }: KineticEngineAppProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [physics, setPhysics] = useState<PhysicsPresetSpec>(jsonKnowledgeStore.getPhysics());
  const [sprites, setSprites] = useState<SpriteAssetSpec[]>(jsonKnowledgeStore.getSprites());
  const [smartItems, setSmartItems] = useState<SmartGameItem[]>(smartBrainItemStore.getState().items);
  const [hookCode, setHookCode] = useState(unificatorEngine.getState().kineticHookCode);
  const [hookError, setHookError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const [timeScale, setTimeScale] = useState(1.0);
  const [showHookPanel, setShowHookPanel] = useState(true);

  const physicsRef = useRef(physics);
  const timeScaleRef = useRef(timeScale);
  const runningRef = useRef(running);
  const hookFnRef = useRef<((state: Record<string, unknown>, dt: number, api: Record<string, unknown>) => void) | null>(null);
  const spriteImgMapRef = useRef<Record<string, HTMLImageElement>>({});

  useEffect(() => {
    physicsRef.current = physics;
  }, [physics]);

  useEffect(() => {
    timeScaleRef.current = timeScale;
  }, [timeScale]);

  useEffect(() => {
    runningRef.current = running;
  }, [running]);

  useEffect(() => {
    const unsubJson = jsonKnowledgeStore.subscribe((snap) => {
      setPhysics(snap.physics);
      setSprites(snap.sprites);
      for (const s of snap.sprites) {
        if (s.dataUrl && !spriteImgMapRef.current[s.id]) {
          const img = new Image();
          img.src = s.dataUrl;
          spriteImgMapRef.current[s.id] = img;
        }
      }
    });
    const unsubBrain = smartBrainItemStore.subscribe((st) => setSmartItems(st.items));
    const unsubUnify = unificatorEngine.subscribe((st) => setHookCode(st.kineticHookCode));
    return () => {
      unsubJson();
      unsubBrain();
      unsubUnify();
    };
  }, []);

  useEffect(() => {
    try {
      const compiled = new Function(
        'state',
        'dt',
        'api',
        hookCode
      ) as (state: Record<string, unknown>, dt: number, api: Record<string, unknown>) => void;
      hookFnRef.current = compiled;
      setHookError(null);
    } catch (err) {
      setHookError(err instanceof Error ? err.message : 'Hook syntax error');
    }
  }, [hookCode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const fit = () => {
      canvas.width = canvas.clientWidth || 520;
      canvas.height = canvas.clientHeight || 300;
    };
    fit();
    window.addEventListener('resize', fit);

    const keys: Record<string, boolean> = {};
    let pointer: { x: number; y: number } | null = null;

    const state = {
      score: 0,
      wave: 1,
      hue: 190,
      player: { x: canvas.width * 0.5, y: canvas.height * 0.5, vx: 0, vy: 0, r: 15, shield: 3 },
      orbs: [] as Array<{ x: number; y: number; vx: number; vy: number; r: number; color: string }>,
      hazards: [] as Array<{ x: number; y: number; vx: number; vy: number; r: number }>,
      particles: [] as Array<{ x: number; y: number; vx: number; vy: number; life: number; color: string }>,
    };

    const spawnOrb = (color = '#10b981') => {
      state.orbs.push({
        x: 28 + Math.random() * Math.max(80, canvas.width - 56),
        y: 28 + Math.random() * Math.max(80, canvas.height - 56),
        vx: (Math.random() - 0.5) * 90,
        vy: (Math.random() - 0.5) * 90,
        r: 9,
        color,
      });
    };

    const spawnHazard = () => {
      const a = Math.random() * Math.PI * 2;
      const spd = 85 + Math.random() * 80;
      state.hazards.push({
        x: Math.random() < 0.5 ? 20 : canvas.width - 20,
        y: 30 + Math.random() * Math.max(60, canvas.height - 60),
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        r: 11,
      });
    };

    const burst = (x: number, y: number, color = '#22d3ee') => {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 50 + Math.random() * 140;
        state.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.45,
          color,
        });
      }
    };

    for (let i = 0; i < 5; i++) spawnOrb();
    for (let i = 0; i < 3; i++) spawnHazard();

    const api = {
      spawnOrb,
      spawnHazard,
      burst,
      addScore: (delta: number) => {
        state.score += delta;
        setScore(state.score);
      },
      pulseColor: (h: number) => {
        state.hue = h;
      },
    };

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pointer) return;
      const rect = canvas.getBoundingClientRect();
      pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onPointerUp = () => {
      pointer = null;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const rawDt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const dt = runningRef.current ? rawDt * timeScaleRef.current : 0;
      const phys = physicsRef.current;

      if (dt > 0) {
        let ax = 0;
        let ay = phys.gravity * 0.25;
        if (keys['arrowleft'] || keys['a']) ax -= 820;
        if (keys['arrowright'] || keys['d']) ax += 820;
        if (keys['arrowup'] || keys['w']) ay -= 820;
        if (keys['arrowdown'] || keys['s']) ay += 680;
        if (pointer) {
          const dx = pointer.x - state.player.x;
          const dy = pointer.y - state.player.y;
          const dist = Math.hypot(dx, dy) || 1;
          ax += (dx / dist) * 900;
          ay += (dy / dist) * 900;
        }

        state.player.vx = (state.player.vx + ax * dt) * phys.friction;
        state.player.vy = (state.player.vy + ay * dt) * phys.friction;
        state.player.x += state.player.vx * dt;
        state.player.y += state.player.vy * dt;

        const r = state.player.r;
        const bounce = phys.restitution;
        if (state.player.x < r) {
          state.player.x = r;
          state.player.vx = Math.abs(state.player.vx) * bounce;
        } else if (state.player.x > canvas.width - r) {
          state.player.x = canvas.width - r;
          state.player.vx = -Math.abs(state.player.vx) * bounce;
        }
        if (state.player.y < r) {
          state.player.y = r;
          state.player.vy = Math.abs(state.player.vy) * bounce;
        } else if (state.player.y > canvas.height - r) {
          state.player.y = canvas.height - r;
          state.player.vy = -Math.abs(state.player.vy) * bounce;
        }

        for (let i = state.orbs.length - 1; i >= 0; i--) {
          const o = state.orbs[i];
          o.x += o.vx * dt;
          o.y += o.vy * dt;
          if (o.x < o.r || o.x > canvas.width - o.r) o.vx *= -1;
          if (o.y < o.r || o.y > canvas.height - o.r) o.vy *= -1;
          if (Math.hypot(state.player.x - o.x, state.player.y - o.y) < r + o.r) {
            state.score += 10;
            setScore(state.score);
            burst(o.x, o.y, o.color);
            state.orbs.splice(i, 1);
            spawnOrb();
          }
        }

        for (const h of state.hazards) {
          h.x += h.vx * dt;
          h.y += h.vy * dt;
          if (h.x < h.r || h.x > canvas.width - h.r) h.vx *= -1;
          if (h.y < h.r || h.y > canvas.height - h.r) h.vy *= -1;
          if (Math.hypot(state.player.x - h.x, state.player.y - h.y) < r + h.r) {
            burst(state.player.x, state.player.y, '#fb7185');
            h.x = state.player.x < canvas.width / 2 ? canvas.width - 24 : 24;
            state.score = Math.max(0, state.score - 5);
            setScore(state.score);
          }
        }

        // Execute live Synthetic Code Hook integrated by Unificator
        if (hookFnRef.current) {
          try {
            hookFnRef.current(state as unknown as Record<string, unknown>, dt, api);
          } catch (err) {
            setHookError(err instanceof Error ? err.message : 'Hook runtime fault');
          }
        }
      }

      // Render 2D Canvas
      ctx.fillStyle = 'rgba(4, 8, 18, 0.28)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Subtle engine grid
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < canvas.width; gx += 40) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, canvas.height);
        ctx.stroke();
      }
      for (let gy = 0; gy < canvas.height; gy += 40) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(canvas.width, gy);
        ctx.stroke();
      }

      for (const o of state.orbs) {
        ctx.beginPath();
        ctx.arc(o.x, o.y, o.r, 0, Math.PI * 2);
        ctx.fillStyle = o.color;
        ctx.fill();
      }

      for (const h of state.hazards) {
        ctx.save();
        ctx.translate(h.x, h.y);
        ctx.rotate(now * 0.005);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(-h.r, -h.r, h.r * 2, h.r * 2);
        ctx.restore();
      }

      state.particles = state.particles.filter((p) => {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= rawDt;
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
        ctx.globalAlpha = 1;
        return p.life > 0;
      });

      const playerSprite = Object.values(spriteImgMapRef.current)[0];
      if (playerSprite && playerSprite.complete && playerSprite.naturalWidth > 0) {
        ctx.drawImage(
          playerSprite,
          state.player.x - 16,
          state.player.y - 16,
          32,
          32
        );
      } else {
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsl(${state.hue}, 88%, 58%)`;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', fit);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, []);

  const injectSmartBrainMod = (item: SmartGameItem) => {
    const snippet = `// Injected Smart Brain Item: ${item.name} (${item.category})\nif (Math.random() < dt * 0.6 && state.orbs.length < 8) {\n  api.spawnOrb('${item.iconColor}');\n}\n${item.codeSnippet}\n`;
    unificatorEngine.setKineticHookCode(snippet);
    onShowToast?.(`Injected Smart Brain item "${item.name}" into Kinetic 2D Engine.`);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-hidden">
      {/* Header */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500/30 to-rose-500/30 border border-orange-400/50 flex items-center justify-center text-orange-200">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100">
                Kinetic 2D Physics &amp; Sprite Engine
              </h2>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 font-mono text-[10px]">
                Score: {score}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Engine #1 · WASD / Pointer thrust · Live Sprite Lab skins · Hot-swappable Unificator hooks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/12 border border-white/15 text-slate-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{running ? 'Pause' : 'Resume'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowHookPanel((s) => !s)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/45 text-indigo-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showHookPanel ? 'Hide Hooks' : 'Show Hooks'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('codeunifier')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Merge className="w-3.5 h-3.5" />
            <span>Unify Code Here</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('voxelengine')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Voxel 3D Engine</span>
          </button>
        </div>
      </div>

      {/* Live Physics Controls */}
      <div className="aether-panel rounded-xl p-2 flex flex-wrap items-center gap-3 shrink-0 text-[11px]">
        <label className="flex items-center gap-1.5 text-slate-300">
          <span>Gravity ({physics.gravity})</span>
          <input
            type="range"
            min={0}
            max={900}
            value={physics.gravity}
            onChange={(e) =>
              jsonKnowledgeStore.updatePhysics({ ...physics, gravity: Number(e.target.value) })
            }
            className="w-24 accent-orange-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-slate-300">
          <span>Bounce ({physics.restitution.toFixed(2)})</span>
          <input
            type="range"
            min={0.2}
            max={1.1}
            step={0.05}
            value={physics.restitution}
            onChange={(e) =>
              jsonKnowledgeStore.updatePhysics({ ...physics, restitution: Number(e.target.value) })
            }
            className="w-20 accent-cyan-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-slate-300">
          <span>Time ({timeScale.toFixed(1)}x)</span>
          <input
            type="range"
            min={0.3}
            max={2.0}
            step={0.1}
            value={timeScale}
            onChange={(e) => setTimeScale(Number(e.target.value))}
            className="w-20 accent-emerald-400"
          />
        </label>

        <span className="ml-auto text-[10.5px] text-slate-400">
          Sprites Loaded: <strong className="text-pink-300">{sprites.length}</strong>
        </span>
      </div>

      {/* Main Split: Canvas Left + Synthetic Code Hook & Smart Brain Injector Right */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        <div
          className={`${
            showHookPanel ? 'lg:col-span-7' : 'lg:col-span-12'
          } rounded-xl overflow-hidden border border-white/12 bg-[#040812] relative min-h-[220px]`}
        >
          <canvas ref={canvasRef} className="w-full h-full block touch-none cursor-crosshair" />
        </div>

        {showHookPanel && (
          <div className="lg:col-span-5 aether-panel rounded-xl p-2.5 flex flex-col gap-2 min-h-[200px] overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="font-semibold text-cyan-200">Live Synthetic Hook Code</span>
              <button
                type="button"
                onClick={() => {
                  unificatorEngine.setKineticHookCode(hookCode);
                  neuralBus.publish('FORGE', 'KINETIC_HOOK_SAVED', 'Applied live Kinetic 2D Engine hook.');
                  onShowToast?.('Kinetic 2D hook applied!');
                }}
                className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 text-[10.5px] font-medium cursor-pointer inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Apply Hook</span>
              </button>
            </div>

            {hookError && (
              <div className="px-2 py-1 rounded bg-rose-500/15 border border-rose-400/40 text-rose-200 text-[10.5px]">
                {hookError}
              </div>
            )}

            <textarea
              value={hookCode}
              onChange={(e) => {
                setHookCode(e.target.value);
                unificatorEngine.setKineticHookCode(e.target.value);
              }}
              spellCheck={false}
              className="flex-1 min-h-[120px] w-full rounded-lg bg-[#040812] border border-white/10 p-2 font-mono text-[10.5px] text-emerald-100 leading-relaxed resize-none outline-none focus:border-cyan-400/50"
            />

            <div className="space-y-1 shrink-0">
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold text-violet-200 inline-flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  <span>Quick-Inject Smart Brain Items</span>
                </span>
                <button
                  type="button"
                  onClick={() => onOpenApp('smartbrain')}
                  className="text-[10px] text-cyan-300 hover:underline cursor-pointer"
                >
                  Open Smart Brain
                </button>
              </div>
              <div className="flex flex-wrap gap-1 max-h-[64px] overflow-y-auto">
                {smartItems.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => injectSmartBrainMod(item)}
                    className="px-2 py-1 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.iconColor }}
                    />
                    <span className="truncate max-w-[120px]">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
