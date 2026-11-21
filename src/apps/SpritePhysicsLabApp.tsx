import { useEffect, useRef, useState } from 'react';
import { Check, Gamepad2, ImagePlus, Palette, Play, Plus, RefreshCw, Sliders, Sparkles, Trash2 } from 'lucide-react';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import type { AppId, PhysicsPresetSpec, SpriteAssetSpec } from '../types/os';

interface SpritePhysicsLabAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const PALETTE = ['#22d3ee', '#a855f7', '#10b981', '#f43f5e', '#f59e0b', '#f8fafc', '#3b82f6', '#ec4899'];
const GRID_SIZE = 16;

function createBlankGrid(): string[] {
  const g = Array<string>(GRID_SIZE * GRID_SIZE).fill('');
  // Draw small starter diamond sprite
  for (let y = 4; y <= 11; y++) {
    for (let x = 4; x <= 11; x++) {
      const dist = Math.abs(x - 7.5) + Math.abs(y - 7.5);
      if (dist <= 4) {
        g[y * GRID_SIZE + x] = dist <= 1.8 ? '#f8fafc' : '#22d3ee';
      }
    }
  }
  return g;
}

export function SpritePhysicsLabApp({ onOpenApp, onShowToast }: SpritePhysicsLabAppProps) {
  const [grid, setGrid] = useState<string[]>(() => createBlankGrid());
  const [activeColor, setActiveColor] = useState<string>(PALETTE[0]);
  const [erasing, setErasing] = useState(false);
  const [painting, setPainting] = useState(false);

  const [spriteName, setSpriteName] = useState('Aether Drone');
  const [spriteRole, setSpriteRole] = useState<SpriteAssetSpec['role']>('player');
  const [sprites, setSprites] = useState<SpriteAssetSpec[]>(jsonKnowledgeStore.getSprites());
  const [physics, setPhysics] = useState<PhysicsPresetSpec>(jsonKnowledgeStore.getPhysics());
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const unsub = jsonKnowledgeStore.subscribe((st) => {
      setSprites(st.sprites);
    });
    return unsub;
  }, []);

  // Live 60fps physics bouncing simulation using active sliders
  useEffect(() => {
    const canvas = simCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let x = 80;
    let y = 40;
    let vx = 180;
    let vy = 40;
    let last = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.0167, (now - last) / 1000);
      last = now;
      const w = canvas.width;
      const h = canvas.height;

      vy += physics.gravity * dt;
      vx *= physics.friction;
      vy *= physics.friction;

      const speed = Math.hypot(vx, vy);
      if (speed > physics.maxSpeed) {
        vx = (vx / speed) * physics.maxSpeed;
        vy = (vy / speed) * physics.maxSpeed;
      }

      x += vx * dt;
      y += vy * dt;

      const r = 16;
      if (x < r) {
        x = r;
        vx = Math.abs(vx) * physics.restitution;
      } else if (x > w - r) {
        x = w - r;
        vx = -Math.abs(vx) * physics.restitution;
      }
      if (y < r) {
        y = r;
        vy = Math.abs(vy) * physics.restitution;
      } else if (y > h - r) {
        y = h - r;
        vy = -Math.abs(vy) * physics.restitution;
        if (Math.abs(vy) < 42) vy = -210; // keep energetic preview bounce
      }

      ctx.fillStyle = 'rgba(3, 8, 20, 0.35)';
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < w; gx += 24) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }

      // Draw painted pixel sprite inside simulated physics body
      const pxSize = 2;
      const ox = x - 16;
      const oy = y - 16;
      for (let py = 0; py < GRID_SIZE; py++) {
        for (let px = 0; px < GRID_SIZE; px++) {
          const c = grid[py * GRID_SIZE + px];
          if (!c) continue;
          ctx.fillStyle = c;
          ctx.fillRect(ox + px * pxSize, oy + py * pxSize, pxSize, pxSize);
        }
      }

      if (physics.collisionShape === 'circle') {
        ctx.beginPath();
        ctx.arc(x, y, r + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.55)';
        ctx.stroke();
      } else {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
        ctx.strokeRect(x - r - 2, y - r - 2, (r + 2) * 2, (r + 2) * 2);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [physics, grid]);

  const paintCell = (idx: number) => {
    setGrid((prev) => {
      const next = [...prev];
      next[idx] = erasing ? '' : activeColor;
      return next;
    });
  };

  const renderGridToDataUrl = (): { dataUrl: string; palette: string[] } => {
    const off = document.createElement('canvas');
    off.width = 64;
    off.height = 64;
    const ctx = off.getContext('2d');
    const used = new Set<string>();
    if (ctx) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const c = grid[y * GRID_SIZE + x];
          if (!c) continue;
          used.add(c);
          ctx.fillStyle = c;
          ctx.fillRect(x * 4, y * 4, 4, 4);
        }
      }
    }
    return {
      dataUrl: off.toDataURL('image/png'),
      palette: Array.from(used),
    };
  };

  const handleSaveSprite = () => {
    const { dataUrl, palette } = renderGridToDataUrl();
    const spec: SpriteAssetSpec = {
      id: `sprite-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      name: spriteName.trim() || 'Custom Sprite',
      role: spriteRole,
      width: 64,
      height: 64,
      dataUrl,
      palette: palette.length > 0 ? palette : ['#22d3ee'],
    };
    jsonKnowledgeStore.addSprite(spec);
    setSavedNotice(`Saved "${spec.name}" & synced to Game Forge + JSON Vault!`);
    onShowToast?.(`Sprite "${spec.name}" synced across all apps!`);
  };

  const handleImportImageSprite = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      const spec: SpriteAssetSpec = {
        id: `sprite-img-${Date.now()}`,
        name: file.name.replace(/\.[^.]+$/, '').slice(0, 24),
        role: spriteRole,
        width: 64,
        height: 64,
        dataUrl,
        palette: [activeColor],
      };
      jsonKnowledgeStore.addSprite(spec);
      onShowToast?.(`Imported "${spec.name}" as ${spriteRole} sprite!`);
    };
    reader.readAsDataURL(file);
  };

  const handleSyncPhysicsAndOpenForge = () => {
    jsonKnowledgeStore.updatePhysics(physics);
    jsonKnowledgeStore.saveEntry({
      title: `Physics Rig: ${physics.name}`,
      category: 'physics-rig',
      tags: ['physics', physics.collisionShape, 'live-rig'],
      summary: `g=${physics.gravity}, friction=${physics.friction}, bounce=${physics.restitution}, maxSpeed=${physics.maxSpeed}`,
      sideNotes: ['Auto-synced from Sprite & Physics Lab to 1-Button Game Forge.'],
      linkedAppIds: ['gameforge', 'spritecomposer', 'jsonvault', 'doom3d'],
      data: physics as unknown as Record<string, unknown>,
    });
    setSavedNotice(`Synced Physics Rig "${physics.name}" across all OS apps!`);
    onShowToast?.(`Physics Rig "${physics.name}" synced to Game Forge & Vault.`);
  };

  return (
    <div
      className="h-full flex flex-col gap-2.5 p-3 overflow-hidden text-xs"
      onPointerUp={() => setPainting(false)}
    >
      {/* Header */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow">
            <Palette className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Sprite, Physics &amp; Asset Lab (Helper #1)
            </h2>
            <p className="text-[10px] text-slate-400">
              Auto-connected to 1-Button Game Forge, JSON Vault, Visual Synth &amp; Master Brain
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenApp('gameforge')}
            className="px-2.5 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/45 text-fuchsia-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Gamepad2 className="w-3 h-3" />
            <span>Open Game Forge</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenApp('jsonvault')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-100 text-[10px] font-semibold cursor-pointer"
          >
            JSON Vault
          </button>
        </div>
      </div>

      {savedNotice && (
        <div className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 text-[11px] flex items-center gap-1.5 shrink-0">
          <Check className="w-3.5 h-3.5" />
          <span>{savedNotice}</span>
        </div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: 16x16 Pixel Sprite Painter & Shared Sprites */}
        <div className="lg:col-span-6 aether-panel rounded-xl p-2.5 flex flex-col gap-2 min-h-0 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="text"
              value={spriteName}
              onChange={(e) => setSpriteName(e.target.value)}
              placeholder="Sprite name..."
              className="flex-1 min-w-[110px] bg-slate-950/90 border border-white/15 rounded-lg px-2 py-1 text-xs text-slate-100 outline-none"
            />
            <select
              value={spriteRole}
              onChange={(e) => setSpriteRole(e.target.value as SpriteAssetSpec['role'])}
              className="bg-slate-950/90 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-slate-100 outline-none cursor-pointer"
            >
              <option value="player">Player</option>
              <option value="enemy">Enemy</option>
              <option value="collectible">Collectible</option>
              <option value="tile">Tile</option>
              <option value="fx">Particle FX</option>
            </select>
          </div>

          {/* Palette */}
          <div className="flex flex-wrap items-center gap-1.5">
            {PALETTE.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => {
                  setActiveColor(hex);
                  setErasing(false);
                }}
                style={{ backgroundColor: hex }}
                className={`w-5 h-5 rounded-md border cursor-pointer ${
                  !erasing && activeColor === hex ? 'border-white ring-2 ring-cyan-300' : 'border-white/25'
                }`}
              />
            ))}
            <button
              type="button"
              onClick={() => setErasing((e) => !e)}
              className={`px-2 py-0.5 rounded-md border text-[10px] cursor-pointer ${
                erasing ? 'bg-rose-500/25 border-rose-400 text-rose-100' : 'bg-white/5 border-white/15 text-slate-300'
              }`}
            >
              Eraser
            </button>
            <button
              type="button"
              onClick={() => setGrid(Array<string>(GRID_SIZE * GRID_SIZE).fill(''))}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/15 text-[10px] text-slate-300 cursor-pointer"
            >
              Clear
            </button>
          </div>

          {/* Pixel Canvas Grid */}
          <div className="flex justify-center">
            <div
              className="grid bg-slate-950 p-1 rounded-lg border border-white/15 select-none"
              style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 14px)` }}
            >
              {grid.map((cell, idx) => (
                <div
                  key={idx}
                  onPointerDown={() => {
                    setPainting(true);
                    paintCell(idx);
                  }}
                  onPointerEnter={() => {
                    if (painting) paintCell(idx);
                  }}
                  style={{ backgroundColor: cell || 'rgba(255,255,255,0.03)' }}
                  className="w-[14px] h-[14px] border border-white/[0.04] cursor-crosshair"
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={handleSaveSprite}
              className="flex-1 py-1.5 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/45 text-emerald-100 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Save &amp; Sync Sprite</span>
            </button>

            <input
              ref={uploadInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleImportImageSprite(e.target.files)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
            >
              <ImagePlus className="w-3.5 h-3.5 text-cyan-300" />
              <span>Import Image</span>
            </button>
          </div>

          {/* Synced Sprite Library */}
          <div className="pt-1 border-t border-white/10">
            <div className="text-[10px] text-slate-400 mb-1">Shared Sprites ({sprites.length})</div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {sprites.map((sp) => (
                <div
                  key={sp.id}
                  className="flex items-center gap-1.5 px-1.5 py-1 rounded-lg bg-slate-950/80 border border-white/10"
                >
                  <img src={sp.dataUrl} alt={sp.name} className="w-6 h-6 object-contain rounded" />
                  <div className="leading-tight">
                    <div className="text-[10px] text-slate-100 font-medium">{sp.name}</div>
                    <div className="text-[9px] text-cyan-300">{sp.role}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => jsonKnowledgeStore.removeSprite(sp.id)}
                    className="text-slate-500 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Real-Time 2D Physics Rig & Live Preview Canvas */}
        <div className="lg:col-span-6 aether-panel rounded-xl p-2.5 flex flex-col gap-2 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-300" />
              <span>Live 2D Physics Rig</span>
            </div>
            <select
              value={physics.collisionShape}
              onChange={(e) =>
                setPhysics((p) => ({ ...p, collisionShape: e.target.value as 'circle' | 'aabb' }))
              }
              className="bg-slate-950/90 border border-white/15 rounded-md px-2 py-0.5 text-[11px] text-slate-100 outline-none cursor-pointer"
            >
              <option value="circle">Circle Collider</option>
              <option value="aabb">AABB Box Collider</option>
            </select>
          </div>

          <canvas
            ref={simCanvasRef}
            width={340}
            height={148}
            className="w-full h-[148px] rounded-lg border border-white/12 bg-[#030814]"
          />

          <div className="space-y-1.5">
            <label className="block">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>Gravity</span>
                <span className="font-mono-tabular text-cyan-300">{physics.gravity} px/s²</span>
              </div>
              <input
                type="range"
                min={0}
                max={1200}
                step={20}
                value={physics.gravity}
                onChange={(e) => setPhysics((p) => ({ ...p, gravity: Number(e.target.value) }))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>Restitution (Bounce)</span>
                <span className="font-mono-tabular text-fuchsia-300">{physics.restitution.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={0.98}
                step={0.02}
                value={physics.restitution}
                onChange={(e) => setPhysics((p) => ({ ...p, restitution: Number(e.target.value) }))}
                className="w-full accent-fuchsia-400 cursor-pointer"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>Air Friction</span>
                <span className="font-mono-tabular text-emerald-300">{physics.friction.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0.9}
                max={1}
                step={0.005}
                value={physics.friction}
                onChange={(e) => setPhysics((p) => ({ ...p, friction: Number(e.target.value) }))}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </label>

            <label className="block">
              <div className="flex justify-between text-[10px] text-slate-300">
                <span>Max Velocity</span>
                <span className="font-mono-tabular text-amber-300">{physics.maxSpeed} px/s</span>
              </div>
              <input
                type="range"
                min={140}
                max={1100}
                step={20}
                value={physics.maxSpeed}
                onChange={(e) => setPhysics((p) => ({ ...p, maxSpeed: Number(e.target.value) }))}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </label>
          </div>

          <div className="flex gap-1.5 pt-1 mt-auto">
            <button
              type="button"
              onClick={handleSyncPhysicsAndOpenForge}
              className="flex-1 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Sync Rig to All Apps</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setPhysics({
                  id: 'phys-zero-g',
                  name: 'Zero-G Space Drift',
                  gravity: 0,
                  friction: 0.995,
                  restitution: 0.92,
                  maxSpeed: 640,
                  collisionShape: 'circle',
                });
              }}
              title="Load Zero-G Preset"
              className="px-2 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Zero-G</span>
            </button>
            <button
              type="button"
              onClick={() => {
                handleSyncPhysicsAndOpenForge();
                onOpenApp('gameforge');
              }}
              className="px-2 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 inline-flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>Forge</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
