import aimSpaceCoverImg from '../assets/images/aim_space_game_cover_1795078439311.jpg';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { masterBrainEngine } from './masterBrainEngine';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { smartBrainItemStore } from './smartBrainItemStore';
import { swarmEngine } from './swarmEngine';
import { unificatorEngine } from './unificatorEngine';
import { vfs } from './vfs';
import type { AppId, PrintedAppDefinition, SmartGameItem } from '../types/os';

const STORAGE_KEY = 'AetherOS_AIMSpace_v1';

export const AIM_SPACE_DEFAULT_PICTURE = aimSpaceCoverImg;

export type SyntheticDesignerId =
  | 'codeunifier'
  | 'meshunifier'
  | 'hyperface'
  | 'architect'
  | 'gameforge'
  | 'smartbrain'
  | 'companion';

export interface SyntheticDesignerOption {
  id: SyntheticDesignerId;
  name: string;
  role: string;
}

export const SYNTHETIC_DESIGNERS: SyntheticDesignerOption[] = [
  { id: 'codeunifier', name: 'Code Unifier', role: 'AST & Loop Injector' },
  { id: 'meshunifier', name: 'Mesh Unifier', role: 'Cross-Engine Fusion' },
  { id: 'hyperface', name: 'HyperFace 3D', role: '3D Artifact & Hull Skins' },
  { id: 'architect', name: 'AI Prompt Editor', role: 'Architecture Restructuring' },
  { id: 'gameforge', name: 'Game Forge', role: 'Sprite & Wave Synthesis' },
  { id: 'smartbrain', name: 'Smart Brain', role: 'Loot & Upgrade Injector' },
  { id: 'companion', name: 'Smart AI Companion', role: 'System & Env Orchestrator' },
];

export interface AimSpaceBuildRecord {
  id: string;
  gameTitle: string;
  genre: string;
  sourceLabel: string;
  directive: string;
  restructuringSummary: string;
  syntheticDesignersApplied: string[];
  architecturePlan: string[];
  bridgeHookCode: string;
  printedAppId?: AppId;
  createdAt: number;
}

export interface AimSpaceState {
  gameTitle: string;
  genre: string;
  gamePictureUrl: string;
  isCustomCapturedPicture: boolean;
  html: string;
  version: number;
  restructuring: boolean;
  lastError: string | null;
  queuedSourceName: string;
  queuedSourceCode: string;
  queuedDirective: string;
  history: AimSpaceBuildRecord[];
}

export const INITIAL_AIM_SPACE_GAME_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<title>AIM Space: Astra-7 Orbital Sector</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;user-select:none}
  html,body{width:100%;height:100%;overflow:hidden;background:#040814;color:#f1f5f9;font-family:system-ui,-apple-system,sans-serif}
  canvas{display:block;width:100%;height:100%;touch-action:none}
  .hud{position:fixed;top:10px;left:12px;right:12px;display:flex;justify-content:space-between;align-items:flex-start;pointer-events:none;font-size:12px;font-variant-numeric:tabular-nums;gap:12px}
  .cluster{background:rgba(6,11,25,0.78);border:1px solid rgba(148,163,184,0.22);border-radius:10px;padding:8px 10px;min-width:155px;backdrop-filter:blur(8px)}
  .row{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:4px;font-size:11px;color:#cbd5e1}
  .row:last-child{margin-bottom:0}
  .bar{height:5px;background:rgba(255,255,255,0.1);border-radius:99px;overflow:hidden;margin-bottom:6px}
  .bar:last-child{margin-bottom:0}
  .fill{height:100%;transition:width .12s ease}
  .controls{position:fixed;bottom:12px;right:12px;display:flex;gap:8px;z-index:20}
  .btn{pointer-events:auto;padding:7px 12px;border-radius:8px;border:1px solid rgba(148,163,184,0.3);background:rgba(15,23,42,0.86);color:#f8fafc;font-size:11px;font-weight:600;cursor:pointer}
  .btn:hover{background:rgba(30,41,59,0.95);border-color:rgba(245,158,11,0.55)}
  .overlay{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(3,7,18,0.72);backdrop-filter:blur(6px);z-index:30;padding:16px}
  .card{max-width:440px;width:100%;background:rgba(9,14,28,0.94);border:1px solid rgba(245,158,11,0.38);border-radius:14px;padding:22px;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,0.65)}
  .title{font-size:24px;font-weight:700;letter-spacing:-0.02em;color:#f8fafc}
  .sub{font-size:12px;color:#94a3b8;margin-top:6px;line-height:1.5}
  .primary{margin-top:16px;padding:10px 20px;border-radius:10px;border:1px solid rgba(245,158,11,0.6);background:#d97706;color:#fff;font-size:13px;font-weight:600;cursor:pointer}
  .primary:hover{background:#b45309}
  .hidden{display:none!important}
</style>
</head>
<body>
  <canvas id="game"></canvas>

  <div class="hud">
    <div class="cluster">
      <div class="row"><span>SHIELD</span><strong id="hud-shield">100%</strong></div>
      <div class="bar"><div id="bar-shield" class="fill" style="width:100%;background:#38bdf8"></div></div>
      <div class="row"><span>HULL</span><strong id="hud-hull">100%</strong></div>
      <div class="bar"><div id="bar-hull" class="fill" style="width:100%;background:#34d399"></div></div>
      <div class="row"><span>ENERGY</span><strong id="hud-energy">100%</strong></div>
      <div class="bar"><div id="bar-energy" class="fill" style="width:100%;background:#f59e0b"></div></div>
    </div>

    <div class="cluster" style="text-align:right">
      <div class="row"><span>SECTOR</span><strong id="hud-wave" style="color:#fbbf24">WAVE 01</strong></div>
      <div class="row"><span>SCORE</span><strong id="hud-score">0</strong></div>
      <div class="row"><span>KILLS</span><strong id="hud-kills">0</strong></div>
    </div>
  </div>

  <div class="controls">
    <button class="btn" id="btn-mute" type="button">SFX On</button>
    <button class="btn" id="btn-pause" type="button">Pause</button>
  </div>

  <div id="menu-overlay" class="overlay">
    <div class="card">
      <div class="title">AIM Space: Astra-7 Orbital</div>
      <p class="sub">
        Pilot your interceptor near the Astra-7 ring station. Defeat Drone-A &amp; Drone-C squadrons, shatter crystalline asteroids, and collect Smart Brain relics.
        <br/><br/>
        <strong>Move:</strong> WASD / Arrows / Drag · <strong>Aim &amp; Fire:</strong> Mouse / Space · <strong>Boost:</strong> Shift
      </p>
      <button id="btn-start" class="primary" type="button">Start Mission</button>
    </div>
  </div>

  <div id="gameover-overlay" class="overlay hidden">
    <div class="card">
      <div class="title" id="end-title">Sector Cleared / Hull Breached</div>
      <p class="sub" id="end-summary">Final Score: 0 · Kills: 0</p>
      <button id="btn-restart" class="primary" type="button">Play Again</button>
    </div>
  </div>

<script>
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  let W = 800, H = 520;
  function resize() {
    W = Math.max(320, window.innerWidth);
    H = Math.max(240, window.innerHeight);
    canvas.width = W;
    canvas.height = H;
  }
  window.addEventListener('resize', resize);
  resize();

  let state = 'TITLE_MENU';
  let muted = false;
  let audioCtx = null;
  function sfx(freq, dur, type, gainVal) {
    if (muted) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = type || 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.45), audioCtx.currentTime + dur);
      g.gain.setValueAtTime(gainVal || 0.08, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(); osc.stop(audioCtx.currentTime + dur);
    } catch {}
  }

  const stars = Array.from({ length: 130 }, () => ({
    x: Math.random(), y: Math.random(), z: 0.3 + Math.random() * 1.2, r: 0.6 + Math.random() * 1.5
  }));

  let player, bolts, drones, asteroids, particles, pickups, keys, pointer, wave, score, kills, fireCd, stationAngle, shake;

  function spawnAsteroid() {
    const edge = Math.floor(Math.random() * 4);
    const x = edge === 0 ? -30 : edge === 1 ? W + 30 : Math.random() * W;
    const y = edge === 2 ? -30 : edge === 3 ? H + 30 : Math.random() * H;
    const ang = Math.atan2(H * 0.5 - y + (Math.random() - 0.5) * 180, W * 0.5 - x + (Math.random() - 0.5) * 180);
    const spd = 38 + Math.random() * 48;
    const r = 14 + Math.random() * 16;
    const pts = Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      const rad = r * (0.72 + Math.random() * 0.42);
      return [Math.cos(a) * rad, Math.sin(a) * rad];
    });
    asteroids.push({ x, y, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd, r, rot: 0, vrot: (Math.random() - 0.5) * 1.4, hp: 2, pts });
  }

  function spawnDroneWave(numWave) {
    const count = 4 + numWave * 2;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const dist = Math.max(W, H) * 0.58;
      const type = i % 3 === 0 ? 'DRONE-C' : 'DRONE-A';
      drones.push({
        x: W * 0.5 + Math.cos(a) * dist,
        y: H * 0.5 + Math.sin(a) * dist,
        vx: 0, vy: 0,
        r: type === 'DRONE-C' ? 16 : 13,
        hp: type === 'DRONE-C' ? 3 + Math.floor(numWave / 2) : 2,
        maxHp: type === 'DRONE-C' ? 3 + Math.floor(numWave / 2) : 2,
        type,
        shootTimer: 1 + Math.random() * 2,
      });
    }
  }

  function resetGame() {
    player = { x: W * 0.36, y: H * 0.62, vx: 0, vy: 0, angle: -0.45, r: 15, shield: 100, hull: 100, energy: 100, invuln: 0 };
    bolts = []; drones = []; asteroids = []; particles = []; pickups = [];
    keys = {};
    pointer = { x: W * 0.68, y: H * 0.38, down: false, active: false };
    wave = 1; score = 0; kills = 0; fireCd = 0; stationAngle = 0; shake = 0;
    for (let i = 0; i < 6; i++) spawnAsteroid();
    spawnDroneWave(1);
    updateHud();
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count && particles.length < 220; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 190;
      particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.35 + Math.random() * 0.35, maxLife: 0.7, color, size: 1.5 + Math.random() * 2.5 });
    }
  }

  function updateHud() {
    const sh = Math.max(0, Math.round(player.shield));
    const hu = Math.max(0, Math.round(player.hull));
    const en = Math.max(0, Math.round(player.energy));
    document.getElementById('hud-shield').textContent = sh + '%';
    document.getElementById('hud-hull').textContent = hu + '%';
    document.getElementById('hud-energy').textContent = en + '%';
    document.getElementById('bar-shield').style.width = sh + '%';
    document.getElementById('bar-hull').style.width = hu + '%';
    document.getElementById('bar-energy').style.width = en + '%';
    document.getElementById('hud-wave').textContent = 'WAVE ' + String(wave).padStart(2, '0');
    document.getElementById('hud-score').textContent = score.toLocaleString();
    document.getElementById('hud-kills').textContent = String(kills);
  }

  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (e.key === 'p' || e.key === 'Escape') togglePause();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  canvas.addEventListener('pointerdown', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.down = true; pointer.active = true; });
  canvas.addEventListener('pointermove', (e) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; });
  window.addEventListener('pointerup', () => { pointer.down = false; });

  function togglePause() {
    if (state === 'PLAYING') {
      state = 'PAUSED';
      document.getElementById('btn-pause').textContent = 'Resume';
    } else if (state === 'PAUSED') {
      state = 'PLAYING';
      document.getElementById('btn-pause').textContent = 'Pause';
    }
  }

  document.getElementById('btn-start').addEventListener('click', () => {
    resetGame();
    state = 'PLAYING';
    document.getElementById('menu-overlay').classList.add('hidden');
    sfx(520, 0.16, 'sine', 0.08);
    if (window.AetherOS) try { window.AetherOS.publish('AIMSPACE_START', 'AIM Space mission started.'); } catch {}
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    resetGame();
    state = 'PLAYING';
    document.getElementById('gameover-overlay').classList.add('hidden');
    sfx(520, 0.16, 'sine', 0.08);
  });

  document.getElementById('btn-pause').addEventListener('click', togglePause);
  document.getElementById('btn-mute').addEventListener('click', () => {
    muted = !muted;
    document.getElementById('btn-mute').textContent = muted ? 'Muted' : 'SFX On';
  });

  window.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'CAPTURE_AIMSPACE_FRAME') {
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
        window.parent.postMessage({ type: 'AIMSPACE_FRAME_CAPTURED', dataUrl }, '*');
      } catch {}
    }
  });

  resetGame();

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.0167, Math.max(0.001, (now - last) / 1000));
    last = now;
    stationAngle += dt * 0.16;

    if (state === 'PLAYING') {
      let ax = 0, ay = 0;
      if (keys.w || keys.arrowup) ay -= 1;
      if (keys.s || keys.arrowdown) ay += 1;
      if (keys.a || keys.arrowleft) ax -= 1;
      if (keys.d || keys.arrowright) ax += 1;
      const boosting = Boolean(keys.shift) && player.energy > 4;
      const accel = boosting ? 920 : 540;
      if (boosting && (ax !== 0 || ay !== 0)) player.energy = Math.max(0, player.energy - 38 * dt);
      else player.energy = Math.min(100, player.energy + 16 * dt);
      player.shield = Math.min(100, player.shield + 2.5 * dt);

      if (pointer.active) {
        player.angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);
      } else if (ax !== 0 || ay !== 0) {
        player.angle = Math.atan2(ay, ax);
      }

      const len = Math.hypot(ax, ay) || 1;
      if (ax !== 0 || ay !== 0) {
        player.vx += (ax / len) * accel * dt;
        player.vy += (ay / len) * accel * dt;
      }
      player.vx *= 0.93;
      player.vy *= 0.93;
      player.x = Math.max(24, Math.min(W - 24, player.x + player.vx * dt));
      player.y = Math.max(24, Math.min(H - 24, player.y + player.vy * dt));
      if (player.invuln > 0) player.invuln -= dt;

      fireCd -= dt;
      if ((keys[' '] || pointer.down) && fireCd <= 0 && player.energy >= 3) {
        fireCd = 0.14;
        player.energy = Math.max(0, player.energy - 2.2);
        const perp = player.angle + Math.PI / 2;
        [-7, 7].forEach((off) => {
          bolts.push({
            x: player.x + Math.cos(player.angle) * 14 + Math.cos(perp) * off,
            y: player.y + Math.sin(player.angle) * 14 + Math.sin(perp) * off,
            vx: Math.cos(player.angle) * 620,
            vy: Math.sin(player.angle) * 620,
            friendly: true,
            life: 1.3,
          });
        });
        sfx(760, 0.08, 'sawtooth', 0.05);
      }

      for (let i = bolts.length - 1; i >= 0; i--) {
        const b = bolts[i];
        b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
        if (b.life <= 0 || b.x < -30 || b.x > W + 30 || b.y < -30 || b.y > H + 30) {
          bolts.splice(i, 1);
          continue;
        }
        if (b.friendly) {
          let hit = false;
          for (let j = drones.length - 1; j >= 0; j--) {
            const d = drones[j];
            if (Math.hypot(b.x - d.x, b.y - d.y) < d.r + 5) {
              d.hp -= 1;
              hit = true;
              burst(b.x, b.y, '#38bdf8', 5);
              if (d.hp <= 0) {
                score += d.type === 'DRONE-C' ? 250 : 125;
                kills += 1;
                shake = Math.min(8, shake + 4);
                burst(d.x, d.y, '#f59e0b', 18);
                sfx(190, 0.2, 'square', 0.08);
                if (Math.random() < 0.32) {
                  pickups.push({ x: d.x, y: d.y, kind: Math.random() < 0.5 ? 'shield' : 'energy', life: 9 });
                }
                drones.splice(j, 1);
              }
              break;
            }
          }
          if (!hit) {
            for (let k = asteroids.length - 1; k >= 0; k--) {
              const a = asteroids[k];
              if (Math.hypot(b.x - a.x, b.y - a.y) < a.r) {
                a.hp -= 1; hit = true;
                burst(b.x, b.y, '#cbd5e1', 5);
                if (a.hp <= 0) {
                  score += 60;
                  burst(a.x, a.y, '#94a3b8', 12);
                  asteroids.splice(k, 1);
                  spawnAsteroid();
                }
                break;
              }
            }
          }
          if (hit) bolts.splice(i, 1);
        } else {
          if (player.invuln <= 0 && Math.hypot(b.x - player.x, b.y - player.y) < player.r + 4) {
            bolts.splice(i, 1);
            if (player.shield > 0) player.shield = Math.max(0, player.shield - 18);
            else player.hull = Math.max(0, player.hull - 20);
            player.invuln = 0.25;
            shake = 6;
            burst(player.x, player.y, '#fb7185', 10);
            sfx(140, 0.15, 'sawtooth', 0.07);
          }
        }
      }

      drones.forEach((d) => {
        const dx = player.x - d.x, dy = player.y - d.y;
        const dist = Math.hypot(dx, dy) || 1;
        const desiredDist = d.type === 'DRONE-C' ? 210 : 145;
        const spd = d.type === 'DRONE-C' ? 115 : 155;
        const dir = dist > desiredDist ? 1 : -0.4;
        d.vx += ((dx / dist) * dir * spd - d.vx) * 2.4 * dt;
        d.vy += ((dy / dist) * dir * spd - d.vy) * 2.4 * dt;
        d.x += d.vx * dt; d.y += d.vy * dt;
        d.shootTimer -= dt;
        if (d.shootTimer <= 0 && dist < 440) {
          d.shootTimer = d.type === 'DRONE-C' ? 1.5 : 2.1;
          const aim = Math.atan2(dy, dx);
          bolts.push({ x: d.x, y: d.y, vx: Math.cos(aim) * 290, vy: Math.sin(aim) * 290, friendly: false, life: 2.2 });
        }
      });

      asteroids.forEach((a) => {
        a.x += a.vx * dt; a.y += a.vy * dt; a.rot += a.vrot * dt;
        if (a.x < -50) a.x = W + 45; if (a.x > W + 50) a.x = -45;
        if (a.y < -50) a.y = H + 45; if (a.y > H + 50) a.y = -45;
        if (player.invuln <= 0 && Math.hypot(a.x - player.x, a.y - player.y) < a.r + player.r - 4) {
          if (player.shield > 0) player.shield = Math.max(0, player.shield - 16);
          else player.hull = Math.max(0, player.hull - 14);
          player.invuln = 0.5;
          shake = 6;
          burst(player.x, player.y, '#f59e0b', 10);
        }
      });

      for (let i = pickups.length - 1; i >= 0; i--) {
        const p = pickups[i];
        p.life -= dt;
        if (p.life <= 0) { pickups.splice(i, 1); continue; }
        if (Math.hypot(p.x - player.x, p.y - player.y) < player.r + 16) {
          if (p.kind === 'shield') player.shield = Math.min(100, player.shield + 30);
          else player.energy = Math.min(100, player.energy + 40);
          score += 50;
          sfx(920, 0.12, 'sine', 0.06);
          pickups.splice(i, 1);
        }
      }

      if (drones.length === 0) {
        wave += 1;
        score += 300;
        spawnDroneWave(wave);
        sfx(680, 0.25, 'triangle', 0.08);
        if (window.AetherOS) try { window.AetherOS.publish('AIMSPACE_WAVE', 'Cleared sector wave -> Wave ' + wave); } catch {}
      }

      if (player.hull <= 0) {
        state = 'GAME_OVER';
        document.getElementById('end-title').textContent = 'Interceptor Disabled';
        document.getElementById('end-summary').textContent = 'Final Score: ' + score.toLocaleString() + ' · Drones Destroyed: ' + kills + ' · Reached Wave ' + wave;
        document.getElementById('gameover-overlay').classList.remove('hidden');
        if (window.AetherOS) try { window.AetherOS.publish('AIMSPACE_GAMEOVER', 'AIM Space run ended at score ' + score); } catch {}
      }

      updateHud();
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    shake = Math.max(0, shake - 18 * dt);

    // Render Scene
    ctx.save();
    if (shake > 0.1) ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    const bg = ctx.createRadialGradient(W * 0.28, H * 0.3, 20, W * 0.5, H * 0.5, Math.max(W, H) * 0.9);
    bg.addColorStop(0, '#0f1f3d');
    bg.addColorStop(0.55, '#070e20');
    bg.addColorStop(1, '#02050d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    stars.forEach((s) => {
      const px = ((s.x * W - (player ? player.x * 0.08 * s.z : 0)) % W + W) % W;
      const py = ((s.y * H - (player ? player.y * 0.08 * s.z : 0)) % H + H) % H;
      ctx.fillStyle = 'rgba(226,232,240,' + (0.35 + s.z * 0.45).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(px, py, s.r, 0, Math.PI * 2); ctx.fill();
    });

    // Astra-7 Orbital Ring Station Landmark
    const sx = W * 0.26, sy = H * 0.34, sr = Math.min(W, H) * 0.21;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(stationAngle);
    ctx.strokeStyle = 'rgba(245,158,11,0.52)';
    ctx.lineWidth = 7;
    ctx.beginPath(); ctx.arc(0, 0, sr, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(251,191,36,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, sr - 6, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * sr, Math.sin(a) * sr); ctx.stroke();
    }
    ctx.fillStyle = '#1e293b'; ctx.strokeStyle = '#fbbf24';
    ctx.fillRect(-14, -14, 28, 28); ctx.strokeRect(-14, -14, 28, 28);
    ctx.restore();

    // Radar Reticle Rings
    ctx.strokeStyle = 'rgba(56,189,248,0.09)';
    ctx.lineWidth = 1;
    [120, 220, 320].forEach((rad) => {
      ctx.beginPath(); ctx.arc(W * 0.56, H * 0.48, rad, 0, Math.PI * 2); ctx.stroke();
    });

    // Asteroids
    asteroids.forEach((a) => {
      ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.rot);
      ctx.fillStyle = '#334155'; ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      a.pts.forEach(([px, py], idx) => (idx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)));
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // Pickups
    pickups.forEach((p) => {
      ctx.fillStyle = p.kind === 'shield' ? '#38bdf8' : '#f59e0b';
      ctx.beginPath(); ctx.arc(p.x, p.y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    });

    // Drones
    drones.forEach((d) => {
      ctx.save(); ctx.translate(d.x, d.y);
      ctx.fillStyle = d.type === 'DRONE-C' ? '#ea580c' : '#dc2626';
      ctx.strokeStyle = '#fdba74'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -d.r); ctx.lineTo(d.r, d.r * 0.7); ctx.lineTo(-d.r, d.r * 0.7); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.restore();
    });

    // Bolts
    bolts.forEach((b) => {
      ctx.strokeStyle = b.friendly ? '#38bdf8' : '#fb7185';
      ctx.lineWidth = b.friendly ? 3 : 2.5;
      ctx.beginPath();
      ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.025, b.y - b.vy * 0.025);
      ctx.stroke();
    });

    // Player Interceptor Starfighter
    if (player) {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.rotate(player.angle);
      // Thruster glow
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath(); ctx.moveTo(-14, -5); ctx.lineTo(-26 - Math.random() * 8, 0); ctx.lineTo(-14, 5); ctx.closePath(); ctx.fill();
      // Fuselage
      ctx.fillStyle = player.invuln > 0 ? '#bae6fd' : '#cbd5e1';
      ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(18, 0); ctx.lineTo(-12, -13); ctx.lineTo(-7, 0); ctx.lineTo(-12, 13); ctx.closePath();
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath(); ctx.arc(3, 0, 4, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }

    // Particles
    particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
</script>
</body>
</html>`;

type AimSpaceListener = (state: AimSpaceState) => void;

class AimSpaceStore {
  private state: AimSpaceState = {
    gameTitle: 'AIM Space: Astra-7 Orbital',
    genre: '3D-Depth Orbital Starfighter Arcade',
    gamePictureUrl: AIM_SPACE_DEFAULT_PICTURE,
    isCustomCapturedPicture: false,
    html: INITIAL_AIM_SPACE_GAME_HTML,
    version: 1,
    restructuring: false,
    lastError: null,
    queuedSourceName: 'HyperFace / Code Unifier Module',
    queuedSourceCode: '',
    queuedDirective:
      'Restructure this system into a complete, full-featured AIM Space playable game with multi-wave combat, upgrades, HUD telemetry, WebAudio SFX, and AetherOS hooks.',
    history: [],
  };

  private listeners = new Set<AimSpaceListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AimSpaceState>;
        this.state = {
          ...this.state,
          gameTitle: parsed.gameTitle || this.state.gameTitle,
          genre: parsed.genre || this.state.genre,
          gamePictureUrl: parsed.isCustomCapturedPicture && parsed.gamePictureUrl ? parsed.gamePictureUrl : AIM_SPACE_DEFAULT_PICTURE,
          isCustomCapturedPicture: Boolean(parsed.isCustomCapturedPicture && parsed.gamePictureUrl),
          html: parsed.html || INITIAL_AIM_SPACE_GAME_HTML,
          version: typeof parsed.version === 'number' ? parsed.version : 1,
          history: Array.isArray(parsed.history) ? parsed.history.slice(0, 12) : [],
          restructuring: false,
          lastError: null,
        };
      }
    } catch {
      // ignore corrupt storage
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          gameTitle: this.state.gameTitle,
          genre: this.state.genre,
          gamePictureUrl: this.state.isCustomCapturedPicture ? this.state.gamePictureUrl : '',
          isCustomCapturedPicture: this.state.isCustomCapturedPicture,
          html: this.state.html.slice(0, 160000),
          version: this.state.version,
          history: this.state.history.slice(0, 12),
        })
      );
    } catch {
      // ignore quota
    }
  }

  private emit(): void {
    const snap = { ...this.state };
    this.listeners.forEach((cb) => cb(snap));
  }

  getState(): AimSpaceState {
    return { ...this.state };
  }

  subscribe(listener: AimSpaceListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  queueRestructureInput(params: { sourceName: string; sourceCode: string; directive?: string }): void {
    this.state = {
      ...this.state,
      queuedSourceName: params.sourceName,
      queuedSourceCode: params.sourceCode,
      queuedDirective: params.directive || this.state.queuedDirective,
    };
    this.emit();
    neuralBus.publish(
      'FORGE',
      'AIMSPACE_INPUT_QUEUED',
      `Queued "${params.sourceName}" into AIM Space Synthetic Designers queue.`
    );
  }

  updateGamePicture(dataUrl: string): void {
    if (!dataUrl || !dataUrl.startsWith('data:image/')) return;
    this.state = {
      ...this.state,
      gamePictureUrl: dataUrl,
      isCustomCapturedPicture: true,
    };
    this.persist();
    this.emit();
    neuralBus.publish(
      'SYSTEM',
      'AIMSPACE_PICTURE_UPDATED',
      'Captured live in-game frame onto AIM Space desktop screen tile.'
    );
  }

  resetGamePicture(): void {
    this.state = {
      ...this.state,
      gamePictureUrl: AIM_SPACE_DEFAULT_PICTURE,
      isCustomCapturedPicture: false,
    };
    this.persist();
    this.emit();
    neuralBus.publish('SYSTEM', 'AIMSPACE_PICTURE_RESET', 'Restored Astra-7 cover frame on AIM Space desktop tile.');
  }

  async restructureIntoFullGame(params: {
    sourceLabel: string;
    sourceCode: string;
    directive: string;
    selectedDesigners: SyntheticDesignerId[];
    publishToLibrary?: boolean;
  }): Promise<AimSpaceBuildRecord | null> {
    if (this.state.restructuring) return null;

    this.state = { ...this.state, restructuring: true, lastError: null };
    this.emit();

    try {
      await vfs.init();
      const sprites = jsonKnowledgeStore.getSprites().slice(0, 6);
      const physics = jsonKnowledgeStore.getPhysics();
      const items = smartBrainItemStore.getState().items.slice(0, 6);
      const aimDaemons = swarmEngine.getDaemons().filter((d) => d.category === 'aimspace-assist');

      const res = await fetch('/api/aimspace/restructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceLabel: params.sourceLabel,
          sourceCode: params.sourceCode,
          directive: params.directive,
          designers: params.selectedDesigners,
          daemonCount: aimDaemons.length,
          context: {
            sprites: sprites.map((s) => ({ name: s.name, role: s.role, palette: s.palette })),
            physics,
            smartItems: items.map((i) => ({ name: i.name, category: i.category, summary: i.summary })),
            printedCount: printedAppsStore.getApps().length,
          },
        }),
      });

      const data = (await res.json()) as {
        gameTitle?: string;
        genre?: string;
        restructuringSummary?: string;
        syntheticDesignersApplied?: string[];
        architecturePlan?: string[];
        bridgeHookCode?: string;
        smartItemDrop?: {
          name: string;
          category: SmartGameItem['category'];
          rarity: SmartGameItem['rarity'];
          summary: string;
          spawnRule: string;
          iconColor: string;
          codeSnippet: string;
        };
        restructuredFullGameHtml?: string;
        error?: string;
      };

      if (!res.ok || !data.restructuredFullGameHtml) {
        throw new Error(data.error || `AIM Space restructuring returned HTTP ${res.status}`);
      }

      const gameTitle = data.gameTitle || 'AIM Space: Restructured Edition';
      const genre = data.genre || 'Synthetic Full Game';
      const html = data.restructuredFullGameHtml;
      const hookCode = data.bridgeHookCode || '// AIM Space runtime bridge active\napi.addScore(5);';

      // Link to everything else across the OS:
      // 1. VFS Save (HTML5 game + JSON manifest)
      await vfs.createSnapshot('Pre-AIM Space Restructure', `Checkpoint before "${gameTitle}"`);
      await vfs.saveFile({
        name: 'aim-space-game.html',
        path: '/workspace/games/aim-space-game.html',
        content: html,
        patchedBy: 'AIM Space + Synthetic Designers',
      });
      await vfs.saveFile({
        name: 'aim-space-manifest.json',
        path: '/workspace/games/aim-space-manifest.json',
        content: JSON.stringify(
          {
            gameTitle,
            genre,
            sourceLabel: params.sourceLabel,
            syntheticDesignersApplied: data.syntheticDesignersApplied || params.selectedDesigners,
            daemonsMounted: aimDaemons.length,
            architecturePlan: data.architecturePlan || [],
            restructuringSummary: data.restructuringSummary || '',
            updatedAt: new Date().toISOString(),
          },
          null,
          2
        ),
        patchedBy: 'AIM Space + 50 Daemons',
      });

      // 2. HTML5 Printed Library
      let printed: PrintedAppDefinition | undefined;
      if (params.publishToLibrary !== false) {
        printed = await printedAppsStore.printApp({
          name: gameTitle,
          description: `${genre} — Restructured via AIM Space & Synthetic Designers`,
          html,
          improvementNote: data.restructuringSummary || 'Restructured by AIM Space + 50 assist daemons.',
        });
      }

      // 3. JSON Research Vault
      jsonKnowledgeStore.saveEntry({
        title: `AIM Space: ${gameTitle}`,
        category: 'game-spec',
        tags: ['aimspace', 'synthetic-designers', 'full-game', genre.toLowerCase().split(/\s+/)[0] || 'arcade'],
        summary: data.restructuringSummary || `Full game restructured from ${params.sourceLabel}`,
        sideNotes: data.architecturePlan || [],
        linkedAppIds: [
          'aimspace',
          'codeunifier',
          'meshunifier',
          'hyperface',
          'kineticengine',
          'voxelengine',
          'smartbrain',
          'masterbrain',
          'companion',
        ],
        data: {
          gameTitle,
          genre,
          sourceLabel: params.sourceLabel,
          syntheticDesignersApplied: data.syntheticDesignersApplied || params.selectedDesigners,
          printedAppId: printed?.id || null,
        },
      });

      // 4. Smart Brain Item Drop
      if (data.smartItemDrop?.name) {
        smartBrainItemStore.importExternalItem({
          name: data.smartItemDrop.name,
          category: data.smartItemDrop.category || 'relic',
          rarity: data.smartItemDrop.rarity || 'sovereign',
          targetGame: gameTitle,
          originMode: 'auto-blank-fill',
          summary: data.smartItemDrop.summary || 'Synthesized during AIM Space game restructuring.',
          upgradeReason: 'Auto-linked by AIM Space & Synthetic Designers.',
          stats: [
            { label: 'Synergy', value: 'AIM Space + 50 Daemons' },
            { label: 'Tier', value: 'Sovereign' },
          ],
          spawnRule: data.smartItemDrop.spawnRule || 'Wave 2+ Orbital Drop',
          iconColor: data.smartItemDrop.iconColor || '#f59e0b',
          codeSnippet: data.smartItemDrop.codeSnippet || hookCode,
        });
      }

      // 5. Kinetic 2D & Voxel 3D Bridge Hook Injection
      unificatorEngine.setKineticHookCode(hookCode);
      unificatorEngine.setVoxelHookCode(hookCode);

      // 6. Run all 50 Mounted AIM Space Assist Daemons + Master Brain telemetry
      await swarmEngine.runAimSpaceAssistDaemons();
      void masterBrainEngine.runMasterSort(
        `Link newly restructured AIM Space game "${gameTitle}" across all OS apps & 50 assist daemons.`
      );

      const record: AimSpaceBuildRecord = {
        id: `aim-${Date.now()}`,
        gameTitle,
        genre,
        sourceLabel: params.sourceLabel,
        directive: params.directive,
        restructuringSummary: data.restructuringSummary || 'Full game restructured.',
        syntheticDesignersApplied: data.syntheticDesignersApplied || params.selectedDesigners,
        architecturePlan: data.architecturePlan || [],
        bridgeHookCode: hookCode,
        printedAppId: printed?.id,
        createdAt: Date.now(),
      };

      this.state = {
        ...this.state,
        gameTitle,
        genre,
        html,
        version: this.state.version + 1,
        restructuring: false,
        lastError: null,
        history: [record, ...this.state.history].slice(0, 12),
      };
      this.persist();
      this.emit();

      neuralBus.publish(
        'FORGE',
        'AIMSPACE_RESTRUCTURED',
        `AIM Space restructured "${params.sourceLabel}" into full game "${gameTitle}" (linked to VFS, Library, JSON Vault, Smart Brain, Engines & 50 Daemons).`
      );
      return record;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AIM Space restructuring failed.';
      this.state = { ...this.state, restructuring: false, lastError: msg };
      this.emit();
      neuralBus.publish('FORGE', 'AIMSPACE_ERROR', msg);
      return null;
    }
  }
}

export const aimSpaceStore = new AimSpaceStore();
