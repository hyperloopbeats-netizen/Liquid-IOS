import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Plus, RotateCcw } from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import { attachRoomEnvironment, createStudioRenderer, detectSoftwareWebGL, scheduleNextFrame } from '../utils/webgl';

interface PhysicsActor {
  group: THREE.Group;
  vel: THREE.Vector3;
  rotVel: THREE.Vector3;
  radius: number;
}

export function GameSandboxApp() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const spawnFnRef = useRef<(() => void) | null>(null);
  const resetFnRef = useRef<(() => void) | null>(null);
  const gravityRef = useRef(-14);

  const [objectCount, setObjectCount] = useState(4);
  const [impulses, setImpulses] = useState(0);
  const [gravity, setGravity] = useState(-14);

  useEffect(() => {
    gravityRef.current = gravity;
  }, [gravity]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block cursor-crosshair';
    container.appendChild(canvas);

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(canvas, isSoftwareGl, true);
    renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050914, 0.025);
    const envTex = attachRoomEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      150
    );
    camera.position.set(0, 7.5, 16);
    camera.lookAt(0, 1.5, 0);

    // 3-point studio lighting
    scene.add(new THREE.HemisphereLight(0xfef3c7, 0x0f172a, 0.7));
    const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.6);
    keyLight.position.set(9, 14, 10);
    if (!isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.bias = -0.0005;
    }
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xf59e0b, 2.0, 35);
    rimLight.position.set(-8, 4, -8);
    scene.add(rimLight);

    // Grounded Arena Platform
    const floorGeo = new THREE.CylinderGeometry(8.5, 9.0, 0.4, 48);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.65, metalness: 0.35 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.2;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(14, 14, 0x38bdf8, 0x1e293b);
    gridHelper.position.y = 0.02;
    scene.add(gridHelper);

    const hullGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const frameGeo = new THREE.EdgesGeometry(hullGeo);
    const coreGeo = new THREE.OctahedronGeometry(0.35, 0);

    const hullMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.65 });
    const frameMat = new THREE.LineBasicMaterial({ color: 0xfef3c7, transparent: true, opacity: 0.55 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.8,
    });

    const actors: PhysicsActor[] = [];

    const spawnActor = () => {
      const group = new THREE.Group();
      const hull = new THREE.Mesh(hullGeo, hullMat);
      hull.castShadow = true;
      hull.receiveShadow = true;
      const frame = new THREE.LineSegments(frameGeo, frameMat);
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 0.72;
      group.add(hull, frame, core);

      group.position.set((Math.random() - 0.5) * 7, 4 + Math.random() * 4, (Math.random() - 0.5) * 7);
      scene.add(group);

      actors.push({
        group,
        vel: new THREE.Vector3((Math.random() - 0.5) * 4, Math.random() * 2, (Math.random() - 0.5) * 4),
        rotVel: new THREE.Vector3(Math.random() * 1.5, Math.random() * 1.5, Math.random() * 1.5),
        radius: 0.65,
      });
      setObjectCount(actors.length);
    };

    const resetActors = () => {
      while (actors.length > 0) {
        const a = actors.pop();
        if (a) scene.remove(a.group);
      }
      for (let i = 0; i < 4; i++) spawnActor();
      setImpulses(0);
    };

    for (let i = 0; i < 4; i++) spawnActor();
    spawnFnRef.current = spawnActor;
    resetFnRef.current = resetActors;

    if (!isSoftwareGl) renderer.compile(scene, camera);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);

      const meshes = actors.map((a) => a.group);
      const hits = raycaster.intersectObjects(meshes, true);
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        const actor = actors.find((a) => a.group === hitObj || a.group.children.includes(hitObj));
        if (actor) {
          actor.vel.y = 8.5;
          actor.vel.x += (Math.random() - 0.5) * 6;
          actor.vel.z += (Math.random() - 0.5) * 6;
          setImpulses((c) => c + 1);
          neuralBus.publish('SYSTEM', 'PHYSICS_IMPULSE', 'Applied kinetic impulse to 3D Sandbox actor.');
        }
      }
    };
    canvas.addEventListener('pointerdown', onPointerDown);

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
      const g = gravityRef.current;

      for (const a of actors) {
        a.vel.y += g * dt;
        a.group.position.addScaledVector(a.vel, dt);
        a.group.rotation.x += a.rotVel.x * dt;
        a.group.rotation.y += a.rotVel.y * dt;

        // Ground collision
        if (a.group.position.y < a.radius) {
          a.group.position.y = a.radius;
          a.vel.y = Math.abs(a.vel.y) * 0.72;
          a.vel.x *= 0.94;
          a.vel.z *= 0.94;
          a.rotVel.multiplyScalar(0.95);
        }

        // Circular arena wall bounce
        const distSq = a.group.position.x * a.group.position.x + a.group.position.z * a.group.position.z;
        const maxR = 7.4;
        if (distSq > maxR * maxR) {
          const dist = Math.sqrt(distSq);
          const nx = a.group.position.x / dist;
          const nz = a.group.position.z / dist;
          a.group.position.x = nx * maxR;
          a.group.position.z = nz * maxR;
          const dot = a.vel.x * nx + a.vel.z * nz;
          a.vel.x -= 1.8 * dot * nx;
          a.vel.z -= 1.8 * dot * nz;
        }
      }

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
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('pointerdown', onPointerDown);
      hullGeo.dispose();
      frameGeo.dispose();
      coreGeo.dispose();
      hullMat.dispose();
      frameMat.dispose();
      coreMat.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      envTex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto md:overflow-hidden text-xs">
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <span className="font-display font-semibold text-slate-100">Matrix 3D Physics Sandbox</span>
          <span className="ml-2 text-[11px] text-slate-400 font-mono-tabular">
            Actors: {objectCount} · Click Impulses: {impulses}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[11px] text-slate-300 font-mono-tabular">
            <span>Gravity ({gravity} m/s²)</span>
            <input
              type="range"
              min="-28"
              max="-2"
              step="1"
              value={gravity}
              onChange={(e) => setGravity(Number(e.target.value))}
              className="accent-amber-400 cursor-pointer"
            />
          </label>

          <button
            type="button"
            onClick={() => spawnFnRef.current?.()}
            className="px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/50 text-amber-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Spawn Drone</span>
          </button>

          <button
            type="button"
            onClick={() => resetFnRef.current?.()}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      <div
        ref={mountRef}
        className="h-[280px] md:h-auto md:flex-1 md:min-h-0 rounded-xl overflow-hidden border border-white/10 bg-[#050914] shrink-0 md:shrink"
      />
    </div>
  );
}
