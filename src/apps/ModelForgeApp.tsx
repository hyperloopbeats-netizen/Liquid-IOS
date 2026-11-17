import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Box, Download, Save, Sparkles, Trash2 } from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import type { ForgeSpecimenSpec } from '../types/os';
import { attachRoomEnvironment, createStudioRenderer, detectSoftwareWebGL, scheduleNextFrame } from '../utils/webgl';

const DEFAULT_SPEC: ForgeSpecimenSpec = {
  id: 'm-01',
  prompt: 'Auxetic metamaterial exoskeleton with autonomic healing microcapsules',
  skinType: 'hydrogel',
  colorHex: '#38bdf8',
  emissiveHex: '#0284c7',
  roughness: 0.14,
  metalness: 0.35,
  transmission: 0.82,
  morphAmplitude: 0.18,
  harmonicFreq: 2.6,
  shellCount: 6,
  tags: ['auxetic', 'hydrogel', 'exoskeleton'],
  architecturalNote: 'Multi-shell composite specimen with calibrated PBR transmission and orbital sensor collar.',
  timestamp: '18:02',
};

const SKIN_PRESETS: Record<ForgeSpecimenSpec['skinType'], Partial<ForgeSpecimenSpec>> = {
  hydrogel: { colorHex: '#38bdf8', emissiveHex: '#0284c7', roughness: 0.12, metalness: 0.2, transmission: 0.85 },
  vascular: { colorHex: '#34d399', emissiveHex: '#059669', roughness: 0.22, metalness: 0.3, transmission: 0.55 },
  thermo: { colorHex: '#fb7185', emissiveHex: '#e11d48', roughness: 0.28, metalness: 0.65, transmission: 0.25 },
  biolum: { colorHex: '#a78bfa', emissiveHex: '#7c3aed', roughness: 0.16, metalness: 0.4, transmission: 0.72 },
};

export function ModelForgeApp() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const specRef = useRef<ForgeSpecimenSpec>(DEFAULT_SPEC);
  const stressPulseRef = useRef(0);
  const sceneRef = useRef<THREE.Scene | null>(null);

  const [prompt, setPrompt] = useState(DEFAULT_SPEC.prompt);
  const [skinType, setSkinType] = useState<ForgeSpecimenSpec['skinType']>('hydrogel');
  const [activeSpec, setActiveSpec] = useState<ForgeSpecimenSpec>(DEFAULT_SPEC);
  const [synthesizing, setSynthesizing] = useState(false);
  const [forgeStatus, setForgeStatus] = useState('Ready · PBR Specimen Mounted');
  const [vault, setVault] = useState<ForgeSpecimenSpec[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('aether_model_vault') || 'null');
      return Array.isArray(saved) && saved.length > 0 ? saved : [DEFAULT_SPEC];
    } catch {
      return [DEFAULT_SPEC];
    }
  });

  useEffect(() => {
    specRef.current = activeSpec;
  }, [activeSpec]);

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'w-full h-full block cursor-grab active:cursor-grabbing';
    container.appendChild(canvas);

    const isSoftwareGl = detectSoftwareWebGL();
    const renderer = createStudioRenderer(canvas, isSoftwareGl, true);
    renderer.setSize(container.clientWidth, Math.max(1, container.clientHeight));

    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const envTex = attachRoomEnvironment(renderer, scene);

    const camera = new THREE.PerspectiveCamera(
      44,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      200
    );
    camera.position.set(0, 3.2, 11.5);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.minDistance = 5;
    controls.maxDistance = 22;

    // 3-point studio lighting
    const hemi = new THREE.HemisphereLight(0xbae6fd, 0x0f172a, 0.75);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff4e6, 1.5);
    key.position.set(8, 10, 9);
    scene.add(key);
    const rim = new THREE.PointLight(0x38bdf8, 2.2, 40);
    rim.position.set(-7, -3, -6);
    scene.add(rim);

    // Composite 7-part specimen group
    const specimenGroup = new THREE.Group();
    scene.add(specimenGroup);

    const outerGeo = new THREE.IcosahedronGeometry(2.4, 3);
    const basePositions = new Float32Array(outerGeo.attributes.position.array);
    const outerMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(DEFAULT_SPEC.colorHex),
      emissive: new THREE.Color(DEFAULT_SPEC.emissiveHex),
      emissiveIntensity: 0.28,
      roughness: DEFAULT_SPEC.roughness,
      metalness: DEFAULT_SPEC.metalness,
      transmission: isSoftwareGl ? 0 : DEFAULT_SPEC.transmission,
      transparent: true,
      opacity: isSoftwareGl ? 0.68 : 0.94,
      clearcoat: 1.0,
      ior: 1.48,
      thickness: 1.2,
    });
    const outerShell = new THREE.Mesh(outerGeo, outerMat);
    specimenGroup.add(outerShell);

    const innerGeo = new THREE.OctahedronGeometry(1.35, 1);
    const innerMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.25,
      metalness: 0.88,
    });
    const innerCore = new THREE.Mesh(innerGeo, innerMat);
    specimenGroup.add(innerCore);

    const collarGeo = new THREE.TorusGeometry(2.95, 0.09, 16, 72);
    const collarMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      roughness: 0.2,
      metalness: 0.92,
    });
    const sensorCollar = new THREE.Mesh(collarGeo, collarMat);
    sensorCollar.rotation.x = Math.PI * 0.42;
    specimenGroup.add(sensorCollar);

    const ribGeo = new THREE.TorusGeometry(2.7, 0.05, 12, 64);
    const ribMesh = new THREE.Mesh(ribGeo, collarMat);
    ribMesh.rotation.y = Math.PI * 0.35;
    specimenGroup.add(ribMesh);

    // 3 articulated micro-sensor pylons
    const pylonGeo = new THREE.CylinderGeometry(0.12, 0.18, 0.9, 16);
    const pylonMeshes: THREE.Mesh[] = [];
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(pylonGeo, collarMat);
      const angle = (i / 3) * Math.PI * 2;
      m.position.set(Math.cos(angle) * 2.95, 0, Math.sin(angle) * 2.95);
      m.rotation.z = Math.PI / 2;
      m.rotation.y = -angle;
      specimenGroup.add(m);
      pylonMeshes.push(m);
    }

    // Ground contact disc
    const baseDiscGeo = new THREE.CylinderGeometry(3.2, 3.4, 0.14, 48);
    const baseDiscMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.55,
      metalness: 0.4,
    });
    const baseDisc = new THREE.Mesh(baseDiscGeo, baseDiscMat);
    baseDisc.position.y = -3.15;
    scene.add(baseDisc);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onPointerDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(outerShell, false);
      if (hits.length > 0) {
        stressPulseRef.current = 1.0;
        neuralBus.publish('FORGE', 'STRESS_TEST', `Mechanical stress impulse applied to ${specRef.current.skinType} skin.`);
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
      const delta = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();
      const spec = specRef.current;

      outerMat.color.lerp(new THREE.Color(spec.colorHex), 0.12);
      outerMat.emissive.lerp(new THREE.Color(spec.emissiveHex), 0.12);
      outerMat.roughness = THREE.MathUtils.damp(outerMat.roughness, spec.roughness, 6, delta);
      outerMat.metalness = THREE.MathUtils.damp(outerMat.metalness, spec.metalness, 6, delta);
      if (!isSoftwareGl) {
        outerMat.transmission = THREE.MathUtils.damp(outerMat.transmission, spec.transmission, 6, delta);
      }

      stressPulseRef.current = THREE.MathUtils.damp(stressPulseRef.current, 0, 4, delta);

      const posAttr = outerGeo.attributes.position;
      const amp = spec.morphAmplitude * 0.25 + stressPulseRef.current * 0.42;
      const freq = spec.harmonicFreq;
      for (let i = 0; i < posAttr.count; i++) {
        const bx = basePositions[i * 3];
        const by = basePositions[i * 3 + 1];
        const bz = basePositions[i * 3 + 2];
        const wave = Math.sin(bx * freq + elapsed * 2.2) * Math.cos(by * freq - elapsed * 1.8) * amp;
        const scale = 1 + wave;
        posAttr.setXYZ(i, bx * scale, by * scale, bz * scale);
      }
      posAttr.needsUpdate = true;
      outerGeo.computeVertexNormals();

      specimenGroup.rotation.y += delta * 0.32;
      innerCore.rotation.x -= delta * 0.55;
      sensorCollar.rotation.z += delta * 0.42;
      ribMesh.rotation.x -= delta * 0.28;

      controls.update();
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
      controls.dispose();
      outerGeo.dispose();
      outerMat.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      collarGeo.dispose();
      collarMat.dispose();
      ribGeo.dispose();
      pylonGeo.dispose();
      baseDiscGeo.dispose();
      baseDiscMat.dispose();
      envTex.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  const handleSkinPresetChange = (nextSkin: ForgeSpecimenSpec['skinType']) => {
    setSkinType(nextSkin);
    const preset = SKIN_PRESETS[nextSkin];
    setActiveSpec((prev) => ({
      ...prev,
      skinType: nextSkin,
      ...preset,
    }));
  };

  const handleSynthesize = async () => {
    if (!prompt.trim() || synthesizing) return;
    setSynthesizing(true);
    setForgeStatus('Synthesizing PBR shader & harmonic topology via Gemini...');
    try {
      const res = await fetch('/api/forge/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), skinType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Synthesis failed');

      const nextSpec: ForgeSpecimenSpec = {
        id: `m-${Date.now().toString(36)}`,
        prompt: prompt.trim(),
        skinType,
        colorHex: data.colorHex || '#38bdf8',
        emissiveHex: data.emissiveHex || '#0284c7',
        roughness: Number(data.roughness ?? 0.16),
        metalness: Number(data.metalness ?? 0.35),
        transmission: Number(data.transmission ?? 0.78),
        morphAmplitude: Number(data.morphAmplitude ?? 0.2),
        harmonicFreq: Number(data.harmonicFreq ?? 2.8),
        shellCount: Number(data.shellCount ?? 6),
        tags: Array.isArray(data.tags) ? data.tags : [skinType],
        architecturalNote: String(data.architecturalNote || 'Gemini-synthesized PBR specimen.'),
        timestamp: new Date().toTimeString().slice(0, 5),
      };
      setActiveSpec(nextSpec);
      setForgeStatus(`Synthesized via ${data.model || 'gemini-4-hydrogen'}`);
      neuralBus.publish('FORGE', 'SPECIMEN_SYNTHESIZED', `Synthesized "${nextSpec.prompt}" (${nextSpec.skinType}).`);
    } catch (err) {
      // Fall back gracefully to deterministic preset synthesis while reporting status clearly
      const fallback = SKIN_PRESETS[skinType];
      setActiveSpec((prev) => ({
        ...prev,
        id: `m-${Date.now().toString(36)}`,
        prompt: prompt.trim(),
        skinType,
        ...fallback,
        timestamp: new Date().toTimeString().slice(0, 5),
      }));
      setForgeStatus(err instanceof Error ? `Preset applied (${err.message})` : 'Local preset applied');
    } finally {
      setSynthesizing(false);
    }
  };

  const handleSaveToVault = () => {
    const entry: ForgeSpecimenSpec = {
      ...activeSpec,
      id: `m-${Date.now().toString(36)}`,
      prompt: prompt.trim() || activeSpec.prompt,
      timestamp: new Date().toTimeString().slice(0, 5),
    };
    const next = [entry, ...vault].slice(0, 20);
    setVault(next);
    localStorage.setItem('aether_model_vault', JSON.stringify(next));
    setForgeStatus(`Saved "${entry.prompt.slice(0, 28)}..." to Vault.`);
    neuralBus.publish('FORGE', 'VAULT_SAVED', `Specimen saved to localStorage vault (${next.length} total).`);
  };

  const handleDeleteVaultItem = (id: string) => {
    const next = vault.filter((v) => v.id !== id);
    setVault(next);
    localStorage.setItem('aether_model_vault', JSON.stringify(next));
  };

  const handleExportGltf = () => {
    if (!sceneRef.current) return;
    const exporter = new GLTFExporter();
    exporter.parse(
      sceneRef.current,
      (gltf) => {
        const blob =
          gltf instanceof ArrayBuffer
            ? new Blob([gltf], { type: 'model/gltf-binary' })
            : new Blob([JSON.stringify(gltf)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aether_specimen_${activeSpec.skinType}.glb`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        neuralBus.publish('FORGE', 'GLB_EXPORTED', `Exported ${a.download}`);
      },
      (err) => {
        setForgeStatus(`Export error: ${String(err)}`);
      },
      { binary: true }
    );
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto md:overflow-hidden text-xs">
      {/* Controls Toolbar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center gap-2 shrink-0">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe material or geometry specimen..."
          className="flex-1 min-w-[220px] bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
        />

        <select
          value={skinType}
          onChange={(e) => handleSkinPresetChange(e.target.value as ForgeSpecimenSpec['skinType'])}
          className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none cursor-pointer"
        >
          <option value="hydrogel">Hydrogel Matrix</option>
          <option value="vascular">Vascular Flow</option>
          <option value="thermo">Thermochromic Alloy</option>
          <option value="biolum">Bioluminescent Polymer</option>
        </select>

        <button
          type="button"
          onClick={handleSynthesize}
          disabled={synthesizing}
          className="px-3 py-1.5 rounded-lg bg-violet-500/25 hover:bg-violet-500/35 border border-violet-400/50 text-violet-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{synthesizing ? 'Synthesizing...' : 'Synthesize'}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveToVault}
          className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save</span>
        </button>

        <button
          type="button"
          onClick={handleExportGltf}
          className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export .GLB</span>
        </button>
      </div>

      {/* Main Split */}
      <div className="flex-none md:flex-1 md:min-h-0 flex flex-col md:grid md:grid-cols-12 gap-3">
        {/* 3D Viewport */}
        <div className="md:col-span-8 aether-panel rounded-xl p-3 flex flex-col h-[270px] md:h-auto md:min-h-0 shrink-0 md:shrink">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 shrink-0 gap-2">
            <span className="truncate">Composite PBR Specimen Viewport (Drag to orbit · Click to pulse)</span>
            <span className="font-mono-tabular text-slate-300 shrink-0">{forgeStatus}</span>
          </div>
          <div ref={viewportRef} className="flex-1 min-h-0 rounded-xl bg-slate-950/90 border border-white/10 overflow-hidden" />
        </div>

        {/* Right: Parameters & Vault */}
        <div className="md:col-span-4 flex flex-col gap-3 md:min-h-0">
          <div className="aether-panel rounded-xl p-3 space-y-2 shrink-0">
            <div className="font-semibold text-slate-100 flex items-center gap-2">
              <Box className="w-3.5 h-3.5 text-violet-300" />
              <span>Calibrated PBR Telemetry</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-tabular">
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/8">
                <div className="text-slate-400">Roughness</div>
                <div className="text-slate-100 font-semibold mt-0.5">{activeSpec.roughness.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/8">
                <div className="text-slate-400">Transmission</div>
                <div className="text-slate-100 font-semibold mt-0.5">{activeSpec.transmission.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/8">
                <div className="text-slate-400">Metalness</div>
                <div className="text-slate-100 font-semibold mt-0.5">{activeSpec.metalness.toFixed(2)}</div>
              </div>
              <div className="p-2 rounded-lg bg-white/[0.03] border border-white/8">
                <div className="text-slate-400">Harmonic Freq</div>
                <div className="text-slate-100 font-semibold mt-0.5">{activeSpec.harmonicFreq.toFixed(1)} Hz</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{activeSpec.architecturalNote}</p>
          </div>

          <div className="aether-panel rounded-xl p-3 flex-1 min-h-0 flex flex-col">
            <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
              Specimen Vault ({vault.length})
            </div>
            <div className="flex-1 overflow-y-auto pt-2 space-y-1.5">
              {vault.map((item) => (
                <div
                  key={item.id}
                  className="p-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setPrompt(item.prompt);
                      setSkinType(item.skinType);
                      setActiveSpec(item);
                    }}
                    className="flex-1 text-left min-w-0 cursor-pointer"
                  >
                    <div className="text-slate-100 font-medium truncate">{item.prompt}</div>
                    <div className="text-[10px] text-slate-400 font-mono-tabular">
                      {item.timestamp} · {item.skinType}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteVaultItem(item.id)}
                    title="Delete specimen"
                    className="p-1 rounded text-slate-500 hover:text-rose-300 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
