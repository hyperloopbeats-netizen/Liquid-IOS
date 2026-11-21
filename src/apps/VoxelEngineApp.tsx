import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  Boxes,
  Flame,
  Merge,
  RotateCcw,
  Sliders,
} from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import { unificatorEngine } from '../kernel/unificatorEngine';
import type { AppId } from '../types/os';
import {
  attachRoomEnvironment,
  createStudioRenderer,
  detectSoftwareWebGL,
  scheduleNextFrame,
} from '../utils/webgl';

interface VoxelEngineAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function VoxelEngineApp({ onOpenApp, onShowToast }: VoxelEngineAppProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [hookCode, setHookCode] = useState(unificatorEngine.getState().voxelHookCode);
  const [hookError, setHookError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [crystalCount, setCrystalCount] = useState(0);
  const [showInspector, setShowInspector] = useState(true);
  const [fogHue, setFogHue] = useState(205);
  const [playerSpeed, setPlayerSpeed] = useState(9);

  const fogHueRef = useRef(fogHue);
  const playerSpeedRef = useRef(playerSpeed);
  const hookFnRef = useRef<((sceneState: Record<string, unknown>, dt: number, api: Record<string, unknown>) => void) | null>(null);
  const resetRef = useRef<(() => void) | null>(null);
  const mobileInputRef = useRef({ x: 0, z: 0 });

  useEffect(() => {
    fogHueRef.current = fogHue;
  }, [fogHue]);

  useEffect(() => {
    playerSpeedRef.current = playerSpeed;
  }, [playerSpeed]);

  useEffect(() => {
    return unificatorEngine.subscribe((st) => setHookCode(st.voxelHookCode));
  }, []);

  useEffect(() => {
    try {
      const fn = new Function(
        'sceneState',
        'dt',
        'api',
        hookCode
      ) as (sceneState: Record<string, unknown>, dt: number, api: Record<string, unknown>) => void;
      hookFnRef.current = fn;
      setHookError(null);
    } catch (err) {
      setHookError(err instanceof Error ? err.message : 'Voxel 3D Hook syntax error');
    }
  }, [hookCode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block';
    container.appendChild(canvas);

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(canvas, isSoftwareGl, true);
    renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x040b18, 0.036);
    const envTex = attachRoomEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      54,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      140
    );

    scene.add(new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 18, 12);
    if (!isSoftwareGl) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
    }
    scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(36, 36);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x091324,
      roughness: 0.72,
      metalness: 0.28,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(32, 32, 0x38bdf8, 0x1e293b);
    grid.position.y = 0.02;
    scene.add(grid);

    // Voxel Pillars
    const pillarGeo = new THREE.BoxGeometry(1.4, 2.8, 1.4);
    const pillarMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.35,
      metalness: 0.65,
    });
    const pillarPositions = [
      [-6, 1.4, -6],
      [6, 1.4, -6],
      [-6, 1.4, 6],
      [6, 1.4, 6],
      [0, 1.4, -9],
    ];
    for (const [px, py, pz] of pillarPositions) {
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, py, pz);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      scene.add(pillar);
    }

    // Player Voxel Rover
    const playerGroup = new THREE.Group();
    const roverBody = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.7, 1.2),
      new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.7,
      })
    );
    roverBody.position.y = 0.55;
    roverBody.castShadow = true;
    const beacon = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.85,
      })
    );
    beacon.position.y = 1.2;
    playerGroup.add(roverBody, beacon);
    scene.add(playerGroup);

    const crystalGeo = new THREE.OctahedronGeometry(0.45, 0);
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.75,
      roughness: 0.2,
    });
    const crystals: THREE.Mesh[] = [];

    const droneGeo = new THREE.BoxGeometry(0.85, 0.85, 0.85);
    const droneMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0xe11d48,
      emissiveIntensity: 0.6,
    });
    const drones: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3 }> = [];

    const sceneState = {
      score: 0,
      time: 0,
      crystals: 0,
      drones: 0,
      playerPos: playerGroup.position,
    };

    const spawnCrystal = () => {
      const m = new THREE.Mesh(crystalGeo, crystalMat);
      m.position.set((Math.random() - 0.5) * 22, 0.85, (Math.random() - 0.5) * 22);
      m.castShadow = true;
      scene.add(m);
      crystals.push(m);
      sceneState.crystals = crystals.length;
      setCrystalCount(crystals.length);
    };

    const spawnDrone = () => {
      const m = new THREE.Mesh(droneGeo, droneMat);
      m.position.set((Math.random() - 0.5) * 20, 0.7, (Math.random() - 0.5) * 20);
      scene.add(m);
      drones.push({
        mesh: m,
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6),
      });
      sceneState.drones = drones.length;
    };

    const resetWorld = () => {
      while (crystals.length) {
        const c = crystals.pop();
        if (c) scene.remove(c);
      }
      while (drones.length) {
        const d = drones.pop();
        if (d) scene.remove(d.mesh);
      }
      playerGroup.position.set(0, 0, 0);
      sceneState.score = 0;
      setScore(0);
      for (let i = 0; i < 6; i++) spawnCrystal();
      for (let i = 0; i < 3; i++) spawnDrone();
    };

    resetRef.current = resetWorld;
    resetWorld();

    const api = {
      spawnCrystal,
      spawnDrone,
      addScore: (delta: number) => {
        sceneState.score += delta;
        setScore(sceneState.score);
      },
      setFogHue: (h: number) => setFogHue(h),
    };

    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const clock = new THREE.Clock();
    let timerId = 0;
    let isTimeout = false;
    let disposed = false;

    const tick = () => {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      sceneState.time += dt;

      const fogCol = new THREE.Color().setHSL((fogHueRef.current % 360) / 360, 0.55, 0.06);
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(fogCol);
      }
      scene.background = fogCol;

      let dx = mobileInputRef.current.x;
      let dz = mobileInputRef.current.z;
      if (keys['w'] || keys['arrowup']) dz -= 1;
      if (keys['s'] || keys['arrowdown']) dz += 1;
      if (keys['a'] || keys['arrowleft']) dx -= 1;
      if (keys['d'] || keys['arrowright']) dx += 1;

      const len = Math.hypot(dx, dz);
      if (len > 0.01) {
        const spd = playerSpeedRef.current;
        playerGroup.position.x = THREE.MathUtils.clamp(
          playerGroup.position.x + (dx / len) * spd * dt,
          -14,
          14
        );
        playerGroup.position.z = THREE.MathUtils.clamp(
          playerGroup.position.z + (dz / len) * spd * dt,
          -14,
          14
        );
        playerGroup.rotation.y = Math.atan2(dx, dz);
      }

      beacon.rotation.y += dt * 3;
      beacon.position.y = 1.2 + Math.sin(sceneState.time * 4) * 0.12;

      for (let i = crystals.length - 1; i >= 0; i--) {
        const c = crystals[i];
        c.rotation.y += dt * 2.5;
        c.position.y = 0.85 + Math.sin(sceneState.time * 3 + i) * 0.18;
        if (c.position.distanceTo(playerGroup.position) < 1.35) {
          scene.remove(c);
          crystals.splice(i, 1);
          sceneState.score += 15;
          setScore(sceneState.score);
          spawnCrystal();
        }
      }

      for (const d of drones) {
        d.mesh.position.addScaledVector(d.vel, dt);
        d.mesh.rotation.y += dt * 1.8;
        if (Math.abs(d.mesh.position.x) > 13) d.vel.x *= -1;
        if (Math.abs(d.mesh.position.z) > 13) d.vel.z *= -1;
      }

      if (hookFnRef.current) {
        try {
          hookFnRef.current(sceneState as unknown as Record<string, unknown>, dt, api);
        } catch (err) {
          setHookError(err instanceof Error ? err.message : 'Voxel hook fault');
        }
      }

      camera.position.lerp(
        new THREE.Vector3(playerGroup.position.x, playerGroup.position.y + 8.5, playerGroup.position.z + 11.5),
        0.1
      );
      camera.lookAt(playerGroup.position.x, 0.8, playerGroup.position.z);

      renderer.render(scene, camera);
      scheduleNextFrame(renderer, isSoftwareGl, tick, (id, timeout) => {
        timerId = id;
        isTimeout = timeout;
      });
    };

    tick();

    return () => {
      disposed = true;
      if (isTimeout) clearTimeout(timerId);
      else cancelAnimationFrame(timerId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', onResize);
      floorGeo.dispose();
      floorMat.dispose();
      pillarGeo.dispose();
      pillarMat.dispose();
      crystalGeo.dispose();
      crystalMat.dispose();
      droneGeo.dispose();
      droneMat.dispose();
      envTex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-hidden">
      {/* Header */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-400/30 to-emerald-500/30 border border-sky-400/50 flex items-center justify-center text-sky-200">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100">
                Voxel &amp; Shader 3D Game Engine
              </h2>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 font-mono text-[10px]">
                Score: {score} · Crystals: {crystalCount}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400">
              Engine #2 · Three.js 3D Arena (WASD / Arrows / Touch Pad) · Live Synthetic 3D Hook Injection
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => resetRef.current?.()}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/12 border border-white/15 text-slate-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Arena</span>
          </button>

          <button
            type="button"
            onClick={() => setShowInspector((s) => !s)}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/45 text-indigo-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showInspector ? 'Hide 3D Hooks' : 'Show 3D Hooks'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('codeunifier')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Merge className="w-3.5 h-3.5" />
            <span>Unify Code</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('kineticengine')}
            className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/45 text-orange-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Kinetic 2D</span>
          </button>
        </div>
      </div>

      {/* Controls Strip */}
      <div className="aether-panel rounded-xl p-2 flex flex-wrap items-center gap-3 shrink-0 text-[11px]">
        <label className="flex items-center gap-1.5 text-slate-300">
          <span>Shader Fog Hue ({fogHue}°)</span>
          <input
            type="range"
            min={0}
            max={360}
            value={fogHue}
            onChange={(e) => setFogHue(Number(e.target.value))}
            className="w-24 accent-sky-400"
          />
        </label>
        <label className="flex items-center gap-1.5 text-slate-300">
          <span>Rover Speed ({playerSpeed})</span>
          <input
            type="range"
            min={4}
            max={20}
            value={playerSpeed}
            onChange={(e) => setPlayerSpeed(Number(e.target.value))}
            className="w-24 accent-emerald-400"
          />
        </label>

        {/* Compact touch controls */}
        <div className="ml-auto flex items-center gap-1">
          {[
            ['←', -1, 0],
            ['↑', 0, -1],
            ['↓', 0, 1],
            ['→', 1, 0],
          ].map(([label, vx, vz]) => (
            <button
              key={String(label)}
              type="button"
              onPointerDown={() => {
                mobileInputRef.current = { x: Number(vx), z: Number(vz) };
              }}
              onPointerUp={() => {
                mobileInputRef.current = { x: 0, z: 0 };
              }}
              onPointerLeave={() => {
                mobileInputRef.current = { x: 0, z: 0 };
              }}
              className="w-7 h-6 rounded bg-white/[0.06] hover:bg-white/15 border border-white/15 text-slate-100 font-bold cursor-pointer select-none"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Viewport + Live Synthetic 3D Hook */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        <div
          ref={mountRef}
          className={`${
            showInspector ? 'lg:col-span-7' : 'lg:col-span-12'
          } rounded-xl overflow-hidden border border-white/12 bg-[#040914] min-h-[220px]`}
        />

        {showInspector && (
          <div className="lg:col-span-5 aether-panel rounded-xl p-2.5 flex flex-col gap-2 min-h-[190px] overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="font-semibold text-sky-200">Voxel 3D Synthetic Hook</span>
              <button
                type="button"
                onClick={() => {
                  unificatorEngine.setVoxelHookCode(hookCode);
                  neuralBus.publish('FORGE', 'VOXEL_HOOK_SAVED', 'Applied live Voxel 3D Engine hook.');
                  onShowToast?.('Voxel 3D hook applied cleanly!');
                }}
                className="px-2 py-1 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 text-[10.5px] font-medium cursor-pointer"
              >
                Apply 3D Hook
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
                unificatorEngine.setVoxelHookCode(e.target.value);
              }}
              spellCheck={false}
              className="flex-1 min-h-[140px] w-full rounded-lg bg-[#040812] border border-white/10 p-2 font-mono text-[10.5px] text-emerald-100 leading-relaxed resize-none outline-none focus:border-sky-400/50"
            />
          </div>
        )}
      </div>
    </div>
  );
}
