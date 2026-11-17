import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { microFractalKernel } from '../kernel/microFractalKernel';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import { attachRoomEnvironment, createStudioRenderer, detectSoftwareWebGL, scheduleNextFrame } from '../utils/webgl';

const _colorA = new THREE.Color();
const _colorB = new THREE.Color();
const _dummy = new THREE.Object3D();

export function SynesthesiaBackdrop() {
  const mountRef = useRef<HTMLDivElement | null>(null);

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
    scene.fog = new THREE.FogExp2(0x04070f, 0.028);
    const envTex = attachRoomEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(46, container.clientWidth / Math.max(1, container.clientHeight), 0.1, 160);
    camera.position.set(0, 1.8, 20);
    camera.lookAt(0, 0, 0);

    // 3-point warm/cool studio lighting
    const hemi = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.75);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1e6, 1.45);
    keyLight.position.set(10, 14, 12);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x14b8a6, 2.2, 48);
    rimLight.position.set(-10, -4, -6);
    scene.add(rimLight);

    // Composite Multi-Part Synesthesia Core Group (6 distinct parts)
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    const innerGeo = new THREE.IcosahedronGeometry(2.3, 1);
    const innerMat = new THREE.MeshPhysicalMaterial({
      color: 0x14b8a6,
      emissive: 0x0f766e,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.75,
      clearcoat: 0.9,
      flatShading: true,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    coreGroup.add(innerCore);

    const latticeGeo = new THREE.IcosahedronGeometry(3.4, 2);
    const latticeEdges = new THREE.EdgesGeometry(latticeGeo);
    const latticeMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
    });
    const latticeWire = new THREE.LineSegments(latticeEdges, latticeMat);
    coreGroup.add(latticeWire);

    const ringGeo1 = new THREE.TorusGeometry(4.6, 0.06, 16, 96);
    const ringMat1 = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI * 0.36;
    coreGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(5.6, 0.045, 16, 112);
    const ringMat2 = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      roughness: 0.32,
      metalness: 0.8,
      emissive: 0x059669,
      emissiveIntensity: 0.28,
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.y = Math.PI * 0.42;
    coreGroup.add(ring2);

    const collarGeo = new THREE.CylinderGeometry(1.1, 1.35, 0.45, 24);
    const collarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.22, metalness: 0.9 });
    const collarTop = new THREE.Mesh(collarGeo, collarMat);
    collarTop.position.y = 2.65;
    coreGroup.add(collarTop);

    const collarBottom = new THREE.Mesh(collarGeo, collarMat);
    collarBottom.rotation.x = Math.PI;
    collarBottom.position.y = -2.65;
    coreGroup.add(collarBottom);

    // Instanced ambient harmonic particles
    const particleCount = 120;
    const pGeo = new THREE.OctahedronGeometry(0.08, 0);
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
      orbitRadii[i] = 6.5 + (i % 9) * 1.15;
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

      const targetScale = 1 + syn.bass * 0.34 + syn.systemLoad * 0.12;
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
      pGeo.dispose();
      pMat.dispose();
      envTex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 opacity-85"
    />
  );
}
