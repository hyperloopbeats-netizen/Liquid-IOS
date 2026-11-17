import { useEffect, useRef, useState } from 'react';
import { CircleDot, Download, ImagePlus, Pause, Play, Sparkles, Waves } from 'lucide-react';
import { microFractalKernel } from '../kernel/microFractalKernel';
import { neuralBus } from '../kernel/neuralBus';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import { drawLiquidMeshFrame } from '../utils/liquidMeshRenderer';

interface ImageSlot {
  id: string;
  name: string;
  width: number;
  height: number;
  sourceCanvas: HTMLCanvasElement;
  previewUrl: string;
}

type MorphShaderMode = 'liquid-flow' | 'vortex-kaleidoscope' | 'chromatic-refract' | 'voxel-wave';

const RENDER_W = 640;
const RENDER_H = 420;

function createProceduralPlate(variant: 'obsidian-nebula' | 'solar-prism' | 'bio-lattice'): ImageSlot {
  const off = document.createElement('canvas');
  off.width = RENDER_W;
  off.height = RENDER_H;
  const ctx = off.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, RENDER_W, RENDER_H);
  if (variant === 'obsidian-nebula') {
    grad.addColorStop(0, '#020617');
    grad.addColorStop(0.5, '#0369a1');
    grad.addColorStop(1, '#14b8a6');
  } else if (variant === 'solar-prism') {
    grad.addColorStop(0, '#311042');
    grad.addColorStop(0.5, '#db2777');
    grad.addColorStop(1, '#f59e0b');
  } else {
    grad.addColorStop(0, '#042f2e');
    grad.addColorStop(0.5, '#4f46e5');
    grad.addColorStop(1, '#22d3ee');
  }
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, RENDER_W, RENDER_H);

  for (let i = 0; i < 11; i++) {
    ctx.beginPath();
    const r = 24 + i * 24;
    ctx.arc(RENDER_W * (variant === 'solar-prism' ? 0.62 : 0.42), RENDER_H * 0.5, r, 0, Math.PI * 2);
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(255,255,255,0.45)' : 'rgba(56,189,248,0.52)';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  return {
    id: `plate-${variant}`,
    name: variant.replace('-', ' ').toUpperCase(),
    width: RENDER_W,
    height: RENDER_H,
    sourceCanvas: off,
    previewUrl: off.toDataURL('image/png'),
  };
}

async function decodeImageFile(file: File): Promise<ImageSlot> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`Unable to decode "${file.name}"`));
      el.src = url;
    });

    const off = document.createElement('canvas');
    off.width = RENDER_W;
    off.height = RENDER_H;
    const ctx = off.getContext('2d')!;
    const scale = Math.max(RENDER_W / img.width, RENDER_H / img.height);
    const dw = img.width * scale;
    const dh = img.height * scale;
    ctx.drawImage(img, (RENDER_W - dw) * 0.5, (RENDER_H - dh) * 0.5, dw, dh);

    return {
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      width: RENDER_W,
      height: RENDER_H,
      sourceCanvas: off,
      previewUrl: off.toDataURL('image/png'),
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function VisualSynthApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0.5, y: 0.5, active: false });
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [slots, setSlots] = useState<ImageSlot[]>(() => [
    createProceduralPlate('obsidian-nebula'),
    createProceduralPlate('solar-prism'),
    createProceduralPlate('bio-lattice'),
  ]);
  const [sourceIdx, setSourceIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(1);
  const [morphFactor, setMorphFactor] = useState(0.5);
  const [autoOscillate, setAutoOscillate] = useState(true);
  const [audioReactive, setAudioReactive] = useState(true);
  const [warpIntensity, setWarpIntensity] = useState(0.55);
  const [chromaticSplit, setChromaticSplit] = useState(0.35);
  const [mode, setMode] = useState<MorphShaderMode>('liquid-flow');
  const [recording, setRecording] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const paramsRef = useRef({
    slots,
    sourceIdx,
    targetIdx,
    morphFactor,
    autoOscillate,
    audioReactive,
    warpIntensity,
    chromaticSplit,
    mode,
  });

  useEffect(() => {
    paramsRef.current = {
      slots,
      sourceIdx,
      targetIdx,
      morphFactor,
      autoOscillate,
      audioReactive,
      warpIntensity,
      chromaticSplit,
      mode,
    };
  }, [slots, sourceIdx, targetIdx, morphFactor, autoOscillate, audioReactive, warpIntensity, chromaticSplit, mode]);

  // 60fps Hardware-Composited HD Synthesis Loop (zero CPU pixel loop bottleneck)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = RENDER_W;
    canvas.height = RENDER_H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let t = 0;
    let lastTs = performance.now();

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;

      if (!microFractalKernel.shouldRunSlice(6) && microFractalKernel.getState().stressBurstActive) {
        return;
      }

      const p = paramsRef.current;
      const src = p.slots[p.sourceIdx] ?? p.slots[0];
      const dst = p.slots[p.targetIdx] ?? p.slots[Math.min(1, p.slots.length - 1)];
      if (!src || !dst) return;

      const syn = synesthesiaEngine.getState();
      const bass = p.audioReactive ? syn.bass : 0;
      const mid = p.audioReactive ? syn.mid : 0;
      const treble = p.audioReactive ? syn.treble : 0;

      t += dt * (1.5 + mid * 2.4);
      const effectiveMorph = p.autoOscillate ? Math.sin(t * 0.85) * 0.5 + 0.5 : p.morphFactor;
      const warpPx = (p.warpIntensity + bass * 0.7) * 24;
      const splitPx = (p.chromaticSplit + treble * 0.85) * 14;
      const sinCurve = Math.sin(effectiveMorph * Math.PI);

      // Base Liquid Mesh Underneath
      drawLiquidMeshFrame(ctx, RENDER_W, RENDER_H, {
        mode: 'bio-caustics',
        phase: t,
        bass,
        mid,
        treble,
        hue: syn.activeHue,
        intensity: 0.45,
        pointerX: pointerRef.current.x,
        pointerY: pointerRef.current.y,
        pointerActive: pointerRef.current.active,
      });

      const drawMorphedLayer = (plate: ImageSlot, alpha: number) => {
        if (alpha <= 0.01) return;
        ctx.save();
        ctx.globalAlpha = alpha;

        if (p.mode === 'liquid-flow') {
          const strips = 36;
          const sh = RENDER_H / strips;
          for (let i = 0; i < strips; i++) {
            const dx =
              Math.sin(i * 0.28 + t * 1.9) * warpPx * (0.35 + sinCurve * 0.65) +
              (pointerRef.current.active ? (pointerRef.current.x - 0.5) * 28 : 0);
            ctx.drawImage(plate.sourceCanvas, 0, i * sh, RENDER_W, sh, dx, i * sh, RENDER_W, sh + 1);
          }
        } else if (p.mode === 'vortex-kaleidoscope') {
          const wedges = 6;
          const cx = RENDER_W * 0.5;
          const cy = RENDER_H * 0.5;
          const wedgeAngle = (Math.PI * 2) / wedges;
          for (let w = 0; w < wedges; w++) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(w * wedgeAngle + t * 0.35);
            if (w % 2 === 1) ctx.scale(-1, 1);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, Math.max(RENDER_W, RENDER_H), -wedgeAngle * 0.52, wedgeAngle * 0.52);
            ctx.closePath();
            ctx.clip();
            const pulseZoom = 1 + Math.sin(t * 1.4) * 0.08 * p.warpIntensity;
            ctx.scale(pulseZoom, pulseZoom);
            ctx.drawImage(plate.sourceCanvas, -cx, -cy);
            ctx.restore();
          }
        } else if (p.mode === 'chromatic-refract') {
          const offset = Math.sin(t * 1.8) * splitPx;
          ctx.drawImage(plate.sourceCanvas, 0, 0);
          ctx.globalCompositeOperation = 'screen';
          ctx.globalAlpha = alpha * 0.45;
          ctx.drawImage(plate.sourceCanvas, offset, -offset * 0.35);
          ctx.drawImage(plate.sourceCanvas, -offset, offset * 0.35);
        } else {
          // voxel-wave
          const cols = 16;
          const rows = 10;
          const cw = RENDER_W / cols;
          const ch = RENDER_H / rows;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const jitter = Math.sin(c * 0.5 + r * 0.5 + t * 2.4) * warpPx * 0.55;
              ctx.drawImage(
                plate.sourceCanvas,
                c * cw,
                r * ch,
                cw,
                ch,
                c * cw + jitter,
                r * ch - jitter * 0.4,
                cw + 1,
                ch + 1
              );
            }
          }
        }
        ctx.restore();
      };

      drawMorphedLayer(src, 1 - effectiveMorph * 0.72);
      drawMorphedLayer(dst, effectiveMorph);

      // Interactive pointer radial lens glow
      if (pointerRef.current.active) {
        const px = pointerRef.current.x * RENDER_W;
        const py = pointerRef.current.y * RENDER_H;
        const g = ctx.createRadialGradient(px, py, 6, px, py, 110);
        g.addColorStop(0, `hsla(${syn.activeHue}, 90%, 68%, 0.4)`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, 110, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleUploadImages = async (fileList: FileList | File[]) => {
    setUploadError(null);
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));
    if (files.length === 0) {
      setUploadError('Please upload valid image files (.png, .jpg, .webp).');
      return;
    }

    try {
      const decoded: ImageSlot[] = [];
      for (const f of files) {
        decoded.push(await decodeImageFile(f));
      }
      setSlots((prev) => {
        const next = [...decoded, ...prev];
        setSourceIdx(0);
        setTargetIdx(next.length > 1 ? 1 : 0);
        return next;
      });
      neuralBus.publish('FORGE', 'VISUAL_SYNTH_UPLOAD', `Loaded ${decoded.length} HD plate(s) into Visual Synthesizer.`);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Failed to decode uploaded image.');
    }
  };

  const handleExportFrame = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `aether-visual-morph-${Date.now()}.png`;
    a.click();
    neuralBus.publish('FORGE', 'VISUAL_SYNTH_EXPORT', 'Exported HD morphed frame PNG.');
  };

  const handleToggleCapture60fps = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    if (typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setUploadError('60fps video capture unavailable in this browser.');
      return;
    }
    const stream = canvas.captureStream(60);
    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    recordedChunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 5_000_000 });
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aether-visual-60fps-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    };
    recorderRef.current = rec;
    rec.start(100);
    setRecording(true);
  };

  return (
    <div
      className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden text-xs"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) void handleUploadImages(e.dataTransfer.files);
      }}
    >
      {/* Top Toolbar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/35 flex items-center justify-center text-fuchsia-300">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Visual Morph Synthesizer (60fps HD)
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Hardware-composited 640×420 displacement & audio-reactive plate morphing
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="px-3 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/45 text-fuchsia-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <ImagePlus className="w-3.5 h-3.5" />
            <span>Upload Images</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleUploadImages(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleToggleCapture60fps}
            className={`px-3 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              recording
                ? 'bg-rose-500/25 border-rose-400/50 text-rose-100'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-100'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>{recording ? 'Stop 60fps' : 'Capture 60fps'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportFrame}
            className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export PNG</span>
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-amber-200 shrink-0">
          {uploadError}
        </div>
      )}

      {/* Main Split: Morph Viewport + Controls & Image Slots */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3">
        <div className="lg:col-span-8 flex flex-col gap-3 lg:min-h-0">
          <div className="h-[220px] sm:h-[260px] lg:h-auto lg:flex-1 lg:min-h-[200px] rounded-xl overflow-hidden border border-white/10 bg-black relative shrink-0 lg:shrink">
            <canvas
              ref={canvasRef}
              onPointerDown={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                pointerRef.current = {
                  x: (e.clientX - rect.left) / Math.max(1, rect.width),
                  y: (e.clientY - rect.top) / Math.max(1, rect.height),
                  active: true,
                };
              }}
              onPointerMove={(e) => {
                if (!pointerRef.current.active) return;
                const rect = e.currentTarget.getBoundingClientRect();
                pointerRef.current = {
                  x: (e.clientX - rect.left) / Math.max(1, rect.width),
                  y: (e.clientY - rect.top) / Math.max(1, rect.height),
                  active: true,
                };
              }}
              onPointerUp={() => {
                pointerRef.current.active = false;
              }}
              onPointerLeave={() => {
                pointerRef.current.active = false;
              }}
              className="w-full h-full object-contain block cursor-crosshair"
            />
            <div className="absolute top-2.5 left-3 px-2.5 py-1 rounded-lg bg-slate-950/75 border border-white/10 text-[10px] font-mono text-slate-300 pointer-events-none">
              {slots[sourceIdx]?.name} ↔ {slots[targetIdx]?.name} · {mode} · 60fps
            </div>
          </div>

          <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['liquid-flow', 'Liquid Flow'],
                  ['vortex-kaleidoscope', 'Kaleidoscope'],
                  ['chromatic-refract', 'Prism Split'],
                  ['voxel-wave', 'Voxel Wave'],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-medium cursor-pointer ${
                    mode === key
                      ? 'bg-fuchsia-500/25 border-fuchsia-400/50 text-fuchsia-100'
                      : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-300">
              <button
                type="button"
                onClick={() => setAutoOscillate((v) => !v)}
                className={`px-2.5 py-1 rounded-lg border inline-flex items-center gap-1 cursor-pointer ${
                  autoOscillate
                    ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                    : 'bg-white/6 border-white/12 text-slate-300'
                }`}
              >
                {autoOscillate ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{autoOscillate ? 'Auto-Morph' : 'Manual'}</span>
              </button>

              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioReactive}
                  onChange={(e) => setAudioReactive(e.target.checked)}
                  className="accent-cyan-400"
                />
                <Waves className="w-3.5 h-3.5 text-cyan-300" />
                <span>Audio Link</span>
              </label>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-3 lg:min-h-0">
          <div className="aether-panel rounded-xl p-3 space-y-2.5 shrink-0">
            <div className="font-semibold text-slate-100">Morph & Refraction Parameters</div>

            <label className="block space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Morph Blend (A → B)</span>
                <span>{Math.round(morphFactor * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={morphFactor}
                disabled={autoOscillate}
                onChange={(e) => setMorphFactor(Number(e.target.value))}
                className="w-full accent-fuchsia-400 cursor-pointer disabled:opacity-40"
              />
            </label>

            <label className="block space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Flow Displacement</span>
                <span>{Math.round(warpIntensity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.4}
                step={0.02}
                value={warpIntensity}
                onChange={(e) => setWarpIntensity(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="block space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>RGB Chromatic Refraction</span>
                <span>{Math.round(chromaticSplit * 100)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={1.2}
                step={0.02}
                value={chromaticSplit}
                onChange={(e) => setChromaticSplit(Number(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </label>
          </div>

          <div className="aether-panel rounded-xl p-3 min-h-[150px] lg:flex-1 lg:min-h-0 flex flex-col">
            <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
              Image Morph Plates ({slots.length})
            </div>
            <div className="flex-1 overflow-y-auto pt-2 space-y-2">
              {slots.map((slot, idx) => {
                const isA = idx === sourceIdx;
                const isB = idx === targetIdx;
                return (
                  <div
                    key={slot.id}
                    className="p-2 rounded-lg bg-white/[0.03] border border-white/10 flex items-center gap-2.5"
                  >
                    <img
                      src={slot.previewUrl}
                      alt={slot.name}
                      className="w-12 h-9 rounded object-cover border border-white/15 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-100 truncate">{slot.name}</div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => setSourceIdx(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                            isA
                              ? 'bg-cyan-500/30 border border-cyan-400/60 text-cyan-100'
                              : 'bg-white/8 text-slate-300 hover:bg-white/15'
                          }`}
                        >
                          Set A
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetIdx(idx)}
                          className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer ${
                            isB
                              ? 'bg-fuchsia-500/30 border border-fuchsia-400/60 text-fuchsia-100'
                              : 'bg-white/8 text-slate-300 hover:bg-white/15'
                          }`}
                        >
                          Set B
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
