import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OS_APPS } from '../kernel/appRegistry';
import { microFractalKernel } from '../kernel/microFractalKernel';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { AppId } from '../types/os';
import { attachRoomEnvironment, createStudioRenderer, detectSoftwareWebGL, scheduleNextFrame } from '../utils/webgl';

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _dummy = new THREE.Object3D();
const _raycaster = new THREE.Raycaster();
const _ptrNdc = new THREE.Vector2();

const AXIS_COLOR_HEX: Record<string, number> = {
  cognitive: 0x38bdf8,
  spatial: 0xe879f9,
  persistence: 0x34d399,
};

interface SynesthesiaBackdropProps {
  openAppIds?: string[];
  activeAppId?: AppId | null;
  onSelectApp?: (id: AppId) => void;
  interactive3D?: boolean;
}

export function SynesthesiaBackdrop({
  openAppIds = [],
  activeAppId = null,
  onSelectApp,
  interactive3D = true,
}: SynesthesiaBackdropProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const openIdsRef = useRef<Set<string>>(new Set(openAppIds));
  const activeIdRef = useRef<AppId | null>(activeAppId);
  const onSelectAppRef = useRef(onSelectApp);

  const [hoveredApp, setHoveredApp] = useState<{
    id: AppId;
    shortName: string;
    category: string;
    x: number;
    y: number;
  } | null>(null);

  useEffect(() => {
    openIdsRef.current = new Set(openAppIds);
  }, [openAppIds]);

  useEffect(() => {
    activeIdRef.current = activeAppId;
  }, [activeAppId]);

  useEffect(() => {
    onSelectAppRef.current = onSelectApp;
  }, [onSelectApp]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block';
    container.appendChild(canvas);

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(canvas, isSoftwareGl, true);
    renderer.setSize(container.clientWidth, container.clientHeight);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x04070f, 0.024);
    const envTex = attachRoomEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(46, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 160);
    camera.position.set(0, 2.2, 21.5);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.8);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.5);
    keyLight.position.set(10, 14, 12);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x14b8a6, 2.2, 48);
    rimLight.position.set(-10, -4, -6);
    scene.add(rimLight);

    // Composite Multi-Part Synesthesia Core Group
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const innerGeo = new THREE.IcosahedronGeometry(2.1, 1);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.78,
      clearcoat: 0.9,
      flatShading: true,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerCore);

    const latticeGeo = new THREE.IcosahedronGeometry(3.1, 2);
    const latticeEdges = new THREE.EdgesGeometry(latticeGeo);
    const latticeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.34,
    });
    const latticeWire = new THREE.LineSegments(latticeEdges, latticeMat);
    coreGroup.add(latticeWire);

    const ringGeo1 = new THREE.TorusGeometry(4.3, 0.055, 16, 96);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.24,
      metalness: 0.85,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI * 0.36;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(5.3, 0.04, 16, 112);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.3,
      metalness: 0.82,
      emissive: 0x059669,
      emissiveIntensity: 0.28,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI * 0.42;
    coreGroup.add(ring2);

    const collarGeo = new THREE.CylinderGeometry(1.0, 1.25, 0.42, 24);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.22, metalness: 0.9 });
    const collarTop = new THREE.Mesh(collarGeo, collarMat);
    collarTop.position.y = 2.45;
    coreGroup.add(collarTop);

    const collarBottom = new THREE.Mesh(collarGeo, collarMat);
    collarBottom.rotation.x = Math.PI;
    collarBottom.position.y = -2.45;
    coreGroup.add(collarBottom);

    // Tiny Dynamic 3D Orbiting App Constellation Nodes (one composite 3D prism per OS App)
    const appGroup = new THREE.Group();
    scene.add(appGroup);

    const sharedNodeGeo = new THREE.OctahedronGeometry(0.46, 0);
    const sharedFrameGeo = new THREE.TorusGeometry(0.62, 0.04, 8, 24);
    const appHitMeshes: THREE.Mesh[] = [];
    const appNodeEntries: Array<{
      id: AppId;
      shortName: string;
      category: string;
      pivot: THREE.Group;
      prismMat: THREE.MeshPhysicalMaterial;
      frameMat: THREE.MeshStandardMaterial;
      baseColor: THREE.Color;
      orbitR: number;
      baseAngle: number;
      tiltX: number;
      tiltZ: number;
      speed: number;
      phase: number;
      scale: number;
    }> = [];

    OS_APPS.forEach((app, idx) => {
      const ringLayer = idx % 2;
      const orbitR = ringLayer === 0 ? 7.4 : 9.4;
      const baseAngle = (idx / OS_APPS.length) * Math.PI * 2;
      const baseColor = new THREE.Color(AXIS_COLOR_HEX[app.axis] ?? 0x38bdf8);

      const pivot = new THREE.Group();
      const prismMat = new THREE.MeshPhysicalMaterial({
        color: baseColor,
        emissive: baseColor,
        emissiveIntensity: 0.35,
        roughness: 0.16,
        metalness: 0.72,
        clearcoat: 0.85,
        flatShading: true,
      });
      const prism = new THREE.Mesh(sharedNodeGeo, prismMat);
      prism.userData = { appId: app.id, shortName: app.shortName, category: app.category };
      pivot.add(prism);
      appHitMeshes.push(prism);

      const frameMat = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.25,
        metalness: 0.9,
        emissive: baseColor,
        emissiveIntensity: 0.2,
      });
      const frame = new THREE.Mesh(sharedFrameGeo, frameMat);
      frame.rotation.x = Math.PI * 0.38;
      pivot.add(frame);

      appGroup.add(pivot);
      appNodeEntries.push({
        id: app.id,
        shortName: app.shortName,
        category: app.category,
        pivot,
        prismMat,
        frameMat,
        baseColor,
        orbitR,
        baseAngle,
        tiltX: ringLayer === 0 ? 0.22 : -0.28,
        tiltZ: ((idx % 5) - 2) * 0.08,
        speed: ringLayer === 0 ? 0.14 : -0.1,
        phase: idx * 0.55,
        scale: 1,
      });
    });

    // Instanced ambient harmonic particles
    const particleCount = 110;
    const pGeo = new THREE.OctahedronGeometry(0.075, 0);
    const pMat = new THREE.MeshStandardMaterial({
      color: 0x7dd3fc,
      roughness: 0.2,
      metalness: 0.6,
      emissive: 0x0ea5e9,
      emissiveIntensity: 0.4,
    });
    const particles = new THREE.InstancedMesh(pGeo, pMat, particleCount);
    const orbitRadii = new Float32Array(particleCount);
    const orbitAngles = new Float32Array(particleCount);
    const orbitHeights = new Float32Array(particleCount);
    const orbitSpeeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      orbitRadii[i] = 6.2 + (i % 9) * 1.15;
      orbitAngles[i] = (i / particleCount) * Math.PI * 2;
      orbitHeights[i] = ((i % 11) - 5) * 0.85;
      orbitSpeeds[i] = 0.08 + (i % 5) * 0.03;
      _dummy.position.set(
        Math.cos(orbitAngles[i]) * orbitRadii[i],
        orbitHeights[i],
        Math.sin(orbitAngles[i]) * orbitRadii[i]
      );
      _dummy.updateMatrix();
      particles.setMatrixAt(i, _dummy.matrix);
    }
    particles.instanceMatrix.needsUpdate = true;
    particles.frustumCulled = false;
    scene.add(particles);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const clock = new THREE.Clock();
    let timerId = 0;
    let isTimeout = false;
    let disposed = false;
    let smoothScale = 1;
    let camYaw = 0;
    let camPitch = 0.12;
    let targetYaw = 0;
    let targetPitch = 0.12;
    let hoveredId: AppId | null = null;
    let draggingOrbit = false;
    let ptrDownPos = { x: 0, y: 0 };

    const raycastAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      _ptrNdc.x = ((clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      _ptrNdc.y = -((clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
      _raycaster.setFromCamera(_ptrNdc, camera);
      const hits = _raycaster.intersectObjects(appHitMeshes, false);
      if (hits.length > 0) {
        const data = hits[0].object.userData as { appId?: AppId; shortName?: string; category?: string };
        if (data.appId) {
          hoveredId = data.appId;
          setHoveredApp({
            id: data.appId,
            shortName: data.shortName || data.appId,
            category: data.category || '',
            x: clientX,
            y: clientY,
          });
          canvas.style.cursor = 'pointer';
          return data.appId;
        }
      }
      hoveredId = null;
      setHoveredApp(null);
      canvas.style.cursor = draggingOrbit ? 'grabbing' : 'grab';
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.target !== canvas) return;
      draggingOrbit = true;
      ptrDownPos = { x: e.clientX, y: e.clientY };
      raycastAt(e.clientX, e.clientY);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (draggingOrbit) {
        targetYaw += e.movementX * 0.0055;
        targetPitch = Math.max(-0.5, Math.min(0.65, targetPitch + e.movementY * 0.0045));
      } else if (e.target !== canvas) {
        if (hoveredId !== null) {
          hoveredId = null;
          setHoveredApp(null);
        }
        return;
      }
      raycastAt(e.clientX, e.clientY);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!draggingOrbit) return;
      draggingOrbit = false;
      const dist = Math.hypot(e.clientX - ptrDownPos.x, e.clientY - ptrDownPos.y);
      if (dist < 6) {
        const hitId = raycastAt(e.clientX, e.clientY);
        if (hitId && onSelectAppRef.current) {
          onSelectAppRef.current(hitId);
        }
      }
    };

    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const onResize = () => {
      if (!container || disposed) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const syn = synesthesiaEngine.getState();

      camYaw = THREE.MathUtils.damp(camYaw, targetYaw, 6, delta);
      camPitch = THREE.MathUtils.damp(camPitch, targetPitch, 6, delta);
      const camR = 21.5;
      camera.position.set(
        Math.sin(camYaw) * Math.cos(camPitch) * camR,
        Math.sin(camPitch) * camR + 1.5,
        Math.cos(camYaw) * Math.cos(camPitch) * camR
      );
      camera.lookAt(0, 0, 0);

      const targetScale = 1 + syn.bass * 0.32 + syn.systemLoad * 0.12;
      smoothScale = THREE.MathUtils.damp(smoothScale, targetScale, 7, delta);

      coreGroup.scale.setScalar(smoothScale);
      coreGroup.rotation.y += delta * (0.14 + syn.mid * 0.85 + syn.systemLoad * 0.25);
      coreGroup.rotation.x = Math.sin(elapsed * 0.35) * 0.14;

      ring1.rotation.z += delta * (0.3 + syn.treble * 1.4);
      ring2.rotation.x -= delta * (0.24 + syn.bass * 1.1);
      latticeWire.rotation.y -= delta * 0.12;

      const hueNorm = syn.activeHue / 360;
      _colorA.setHSL(hueNorm, 0.78, 0.52);
      _colorB.setHSL((hueNorm + 0.12) % 1, 0.82, 0.58);
      innerMat.color.lerp(_colorA, 0.12);
      innerMat.emissive.lerp(_colorA, 0.12);
      innerMat.emissiveIntensity = 0.35 + syn.rms * 0.9;
      ringMat1.color.lerp(_colorB, 0.12);
      latticeMat.color.lerp(_colorB, 0.12);
      latticeMat.opacity = 0.22 + syn.rms * 0.45;
      rimLight.color.lerp(_colorA, 0.12);
      rimLight.intensity = 1.8 + syn.bass * 3.0;

      // Update tiny dynamic 3D App Constellation nodes
      const openSet = openIdsRef.current;
      const focusedId = activeIdRef.current;
      for (let i = 0; i < appNodeEntries.length; i++) {
        const node = appNodeEntries[i];
        const isOpen = openSet.has(node.id);
        const isFocused = focusedId === node.id;
        const isHover = hoveredId === node.id;

        const speedMult = isHover ? 0.18 : 1 + syn.mid * 0.75;
        const ang = node.baseAngle + elapsed * node.speed * speedMult;
        const radialMod = node.orbitR + (isOpen ? -0.9 : 0) + Math.sin(elapsed * 1.4 + node.phase) * (0.18 + syn.bass * 0.45);
        const yFloat = Math.sin(ang * 2 + node.phase) * 1.85 + Math.cos(elapsed * 1.2 + i) * 0.32;

        node.pivot.position.set(
          Math.cos(ang) * radialMod,
          yFloat,
          Math.sin(ang) * radialMod
        );
        node.pivot.rotation.y += delta * (isFocused ? 2.2 : 0.9 + syn.treble * 0.8);
        node.pivot.rotation.x = Math.sin(elapsed + node.phase) * 0.35;

        const targetNodeScale = isHover ? 1.55 : isFocused ? 1.28 : isOpen ? 1.12 : 0.88 + syn.rms * 0.22;
        node.scale = THREE.MathUtils.damp(node.scale, targetNodeScale, 10, delta);
        node.pivot.scale.setScalar(node.scale);

        node.prismMat.emissiveIntensity = isHover ? 1.15 : isFocused ? 0.95 : isOpen ? 0.68 : 0.3 + syn.bass * 0.35;
        node.frameMat.emissiveIntensity = isFocused || isHover ? 0.85 : 0.2;
      }

      for (let i = 0; i < particleCount; i++) {
        orbitAngles[i] += delta * orbitSpeeds[i] * (1 + syn.mid * 2.2);
        const r = orbitRadii[i] + Math.sin(elapsed * 1.5 + i) * (0.2 + syn.treble * 0.9);
        const y = orbitHeights[i] + Math.cos(elapsed * 0.9 + i) * 0.35;
        _dummy.position.set(Math.cos(orbitAngles[i]) * r, y, Math.sin(orbitAngles[i]) * r);
        _dummy.rotation.y = orbitAngles[i];
        _dummy.scale.setScalar(0.85 + syn.treble * 1.2);
        _dummy.updateMatrix();
        particles.setMatrixAt(i, _dummy.matrix);
      }
      particles.instanceMatrix.needsUpdate = true;

      if (microFractalKernel.shouldRunSlice(1)) {
        const cap = microFractalKernel.getRenderPixelRatioCap();
        if (Math.abs(renderer.getPixelRatio() - cap) > 0.15) {
          renderer.setPixelRatio(cap);
        }
        renderer.render(scene, camera);
      }

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
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('resize', onResize);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      innerGeo.dispose();
      innerMat.dispose();
      latticeGeo.dispose();
      latticeEdges.dispose();
      latticeMat.dispose();
      ringGeo1.dispose();
      ringMat1.dispose();
      ringGeo2.dispose();
      ringMat2.dispose();
      collarGeo.dispose();
      collarMat.dispose();
      sharedNodeGeo.dispose();
      sharedFrameGeo.dispose();
      appNodeEntries.forEach((n) => {
        n.prismMat.dispose();
        n.frameMat.dispose();
      });
      pGeo.dispose();
      pMat.dispose();
      envTex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <>
      <div
        ref={mountRef}
        aria-hidden="true"
        className={`fixed inset-0 z-0 opacity-90 ${interactive3D ? 'pointer-events-auto' : 'pointer-events-none'}`}
      />
      {hoveredApp && (
        <div
          style={{ left: `${Math.min(window.innerWidth - 180, hoveredApp.x + 14)}px`, top: `${Math.max(52, hoveredApp.y - 26)}px` }}
          className="fixed z-[1150] pointer-events-none px-2.5 py-1 rounded-lg bg-slate-950/90 border border-cyan-400/45 shadow-xl text-[11px]"
        >
          <div className="font-semibold text-cyan-200">{hoveredApp.shortName}</div>
          <div className="text-[10px] text-slate-400">{hoveredApp.category}</div>
        </div>
      )}
    </>
  );
}
