import { useEffect, useRef, useState } from 'react';
import {
  BookmarkPlus,
  Pause,
  Play,
  Power,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Waves,
} from 'lucide-react';
import { LIQUID_EQ_PRESETS, liquidAudioEngine } from '../kernel/liquidAudioEngine';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { LiquidAudioState } from '../types/os';

const BAND_LABELS = ['32', '64', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
const CUSTOM_PRESETS_KEY = 'aether_custom_eq_curves_v1';

interface SavedEqPreset {
  name: string;
  bands: number[];
  qFactor: number;
  preampDb: number;
}

function loadSavedEqPresets(): SavedEqPreset[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function LiquidEqApp() {
  const [audio, setAudio] = useState<LiquidAudioState>(liquidAudioEngine.getState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const draggingRef = useRef(false);
  const peakHoldRef = useRef<Float32Array>(new Float32Array(48));

  const [prompt, setPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [customPresets, setCustomPresets] = useState<SavedEqPreset[]>(() => loadSavedEqPresets());

  useEffect(() => {
    return liquidAudioEngine.subscribe(setAudio);
  }, []);

  // Ferrofluid Liquid EQ Curve & Peak-Hold FFT Spectrum Renderer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;

    const render = () => {
      rafId = requestAnimationFrame(render);
      const parent = canvas.parentElement;
      if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
        canvas.width = parent.clientWidth;
        canvas.height = Math.max(180, parent.clientHeight);
      }

      const w = canvas.width;
      const h = canvas.height;
      const st = liquidAudioEngine.getState();
      const synState = synesthesiaEngine.getState();
      const spectrum =
        (st.playing ? liquidAudioEngine.getSpectrum() : null) ||
        (synState.micActive || synState.synthActive || synState.liquidAudioActive
          ? synesthesiaEngine.getFrequencyData()
          : null);

      const bands = st.eq.bands;
      phase += 0.032 * st.flowRate;

      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, w, h);

      // Subtle dB reference grid (-12, -6, 0, +6, +12)
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.12)';
      ctx.lineWidth = 1;
      for (const db of [-12, -6, 0, 6, 12]) {
        const y = h * 0.5 - (db / 14) * (h * 0.42);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Live FFT frequency spectrum + decaying peak-hold caps
      const barCount = 48;
      const barW = w / barCount;
      for (let i = 0; i < barCount; i++) {
        const val = spectrum ? spectrum[Math.min(spectrum.length - 1, i)] / 255 : 0;
        if (val > peakHoldRef.current[i]) {
          peakHoldRef.current[i] = val;
        } else {
          peakHoldRef.current[i] *= 0.982;
        }
        const bh = val * h * 0.56;
        const peakY = h - peakHoldRef.current[i] * h * 0.56;
        if (val > 0.01) {
          ctx.fillStyle = st.eq.bypass
            ? `rgba(148, 163, 184, ${0.08 + val * 0.18})`
            : `rgba(56, 189, 248, ${0.12 + val * 0.28})`;
          ctx.fillRect(i * barW + 1, h - bh, Math.max(2, barW - 2), bh);
        }
        if (peakHoldRef.current[i] > 0.02) {
          ctx.fillStyle = st.eq.bypass ? 'rgba(148, 163, 184, 0.45)' : 'rgba(45, 212, 191, 0.72)';
          ctx.fillRect(i * barW + 1, peakY - 1.5, Math.max(2, barW - 2), 1.5);
        }
      }

      // Compute band coordinates
      const padX = 28;
      const spanW = Math.max(10, w - padX * 2);
      const pts = bands.map((db, idx) => {
        const effectiveDb = st.eq.bypass ? 0 : db;
        const x = padX + (idx / (bands.length - 1)) * spanW;
        const ripple = st.playing
          ? Math.sin(phase * 1.4 + idx * 0.7) * 3.2
          : Math.sin(phase * 0.5 + idx * 0.6) * 1.1;
        const y = h * 0.5 - (effectiveDb / 14) * (h * 0.4) + ripple;
        return { x, y, db: effectiveDb, rawDb: db };
      });

      // Liquid membrane fill
      ctx.beginPath();
      ctx.moveTo(0, pts[0].y);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) * 0.5;
        const yc = (pts[i].y + pts[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(w, pts[pts.length - 1].y);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();

      const grad = ctx.createLinearGradient(0, 0, w, h);
      if (st.eq.bypass) {
        grad.addColorStop(0, 'rgba(148, 163, 184, 0.14)');
        grad.addColorStop(1, 'rgba(100, 116, 139, 0.14)');
      } else {
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
        grad.addColorStop(0.5, 'rgba(45, 212, 191, 0.24)');
        grad.addColorStop(1, 'rgba(129, 140, 248, 0.28)');
      }
      ctx.fillStyle = grad;
      ctx.fill();

      // Liquid top spline stroke
      ctx.beginPath();
      ctx.moveTo(0, pts[0].y);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let i = 0; i < pts.length - 1; i++) {
        const xc = (pts[i].x + pts[i + 1].x) * 0.5;
        const yc = (pts[i].y + pts[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, xc, yc);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.lineTo(w, pts[pts.length - 1].y);
      ctx.strokeStyle = st.eq.bypass ? '#94a3b8' : '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Control nodes
      pts.forEach((p, idx) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = st.eq.bypass ? '#64748b' : p.rawDb >= 0 ? '#2dd4bf' : '#818cf8';
        ctx.stroke();

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(BAND_LABELS[idx], p.x, h - 8);
      });
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const sculptFromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const padX = 28;
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left - padX) / Math.max(10, rect.width - padX * 2)));
    const bandIdx = Math.round(relX * (BAND_LABELS.length - 1));
    const normY = (e.clientY - rect.top) / Math.max(1, rect.height);
    const db = ((0.5 - normY) / 0.4) * 14;
    if (audio.eq.bypass) liquidAudioEngine.setEqBypass(false);
    liquidAudioEngine.setEqBand(bandIdx, Math.max(-12, Math.min(12, db)));
  };

  const handleAiSculpt = async () => {
    const clean = prompt.trim();
    if (!clean || aiBusy) return;
    setAiBusy(true);
    setAiNote(null);
    try {
      const res = await fetch('/api/eq/sculpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
      if (Array.isArray(data.bands) && data.bands.length === 10) {
        liquidAudioEngine.applyEqCurve(
          data.bands,
          String(data.curveName || 'AI Sculpted'),
          Number(data.qFactor),
          Number(data.preampDb)
        );
        setAiNote(`${data.curveName}: ${data.acousticNote}`);
      }
    } catch (err) {
      setAiNote(err instanceof Error ? err.message : 'Unable to sculpt EQ curve.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleSaveCustomCurve = () => {
    const name = audio.eq.presetName === 'Flat Reference' ? `Custom ${customPresets.length + 1}` : audio.eq.presetName;
    const entry: SavedEqPreset = {
      name: `${name} ★`,
      bands: [...audio.eq.bands],
      qFactor: audio.eq.qFactor,
      preampDb: audio.eq.preampDb,
    };
    const next = [entry, ...customPresets.filter((p) => p.name !== entry.name)].slice(0, 8);
    setCustomPresets(next);
    try {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage quota errors
    }
    setAiNote(`Saved "${entry.name}" locally.`);
  };

  const handleDeleteCustomCurve = (name: string) => {
    const next = customPresets.filter((p) => p.name !== name);
    setCustomPresets(next);
    try {
      localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto md:overflow-hidden text-xs">
      {/* Top Bar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300 shrink-0">
            <Sliders className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              Liquid 10-Band Graphic EQ
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Active Curve: <strong className={audio.eq.bypass ? 'text-slate-400' : 'text-cyan-300'}>
                {audio.eq.bypass ? 'Bypassed (Flat A/B)' : audio.eq.presetName}
              </strong>{' '}
              · Q {audio.eq.qFactor.toFixed(2)} · Preamp {audio.eq.preampDb > 0 ? `+${audio.eq.preampDb}` : audio.eq.preampDb}dB
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              liquidAudioEngine.unlockFromUserGesture();
              liquidAudioEngine.togglePlay();
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            {audio.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{audio.playing ? 'Pause' : 'Play Deck'}</span>
          </button>

          <button
            type="button"
            onClick={() => liquidAudioEngine.setEqBypass(!audio.eq.bypass)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              audio.eq.bypass
                ? 'bg-amber-500/25 border-amber-400/50 text-amber-100'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-200'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{audio.eq.bypass ? 'Bypassed (A/B)' : 'Bypass'}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveCustomCurve}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <BookmarkPlus className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            type="button"
            onClick={() => {
              liquidAudioEngine.setEqPreset('Flat Reference');
              liquidAudioEngine.setEqPreampDb(0);
              liquidAudioEngine.setEqQFactor(1.15);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* AI Prompt-to-EQ Sculpt + Built-In & Custom Presets */}
      <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAiSculpt();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Sculpt EQ via prompt (e.g. Warm sub-bass with crisp vocal presence and airy top end)..."
            className="flex-1 bg-[#050a14] border border-white/15 rounded-lg px-3 py-1.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/60"
          />
          <button
            type="submit"
            disabled={aiBusy || !prompt.trim()}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/50 text-indigo-100 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiBusy ? 'Sculpting...' : 'Sculpt EQ'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          {Object.keys(LIQUID_EQ_PRESETS).map((name) => {
            const active = audio.eq.presetName === name && !audio.eq.bypass;
            return (
              <button
                key={name}
                type="button"
                onClick={() => liquidAudioEngine.setEqPreset(name)}
                className={`px-2 py-1 rounded-md border text-[11px] font-medium cursor-pointer transition-colors ${
                  active
                    ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                    : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {name}
              </button>
            );
          })}

          {customPresets.map((cp) => (
            <div
              key={cp.name}
              className="inline-flex items-center rounded-md border border-teal-400/35 bg-teal-500/15 text-[11px] text-teal-100 overflow-hidden"
            >
              <button
                type="button"
                onClick={() => liquidAudioEngine.applyEqCurve(cp.bands, cp.name, cp.qFactor, cp.preampDb)}
                className="px-2 py-1 hover:bg-teal-500/20 cursor-pointer"
              >
                {cp.name}
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCustomCurve(cp.name)}
                aria-label={`Delete ${cp.name}`}
                className="px-1.5 py-1 hover:bg-rose-500/30 text-teal-200/80 cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Fine Coupling, Q-Resonance & Preamp Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 border-t border-white/10 text-[11px] text-slate-300 font-mono-tabular">
          <label className="inline-flex items-center gap-1.5 cursor-pointer font-sans">
            <input
              type="checkbox"
              checked={audio.eq.liquidCoupling}
              onChange={(e) => liquidAudioEngine.setEqLiquidCoupling(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>Fluid Coupling</span>
          </label>

          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">Preamp</span>
            <input
              type="range"
              min={-6}
              max={6}
              step={0.5}
              value={audio.eq.preampDb}
              onChange={(e) => liquidAudioEngine.setEqPreampDb(Number(e.target.value))}
              className="w-20 accent-amber-400 cursor-pointer"
            />
            <span>{audio.eq.preampDb > 0 ? `+${audio.eq.preampDb}` : audio.eq.preampDb}dB</span>
          </label>

          <label className="inline-flex items-center gap-1.5">
            <span className="text-slate-400">Q-Resonance</span>
            <input
              type="range"
              min={0.5}
              max={4.0}
              step={0.1}
              value={audio.eq.qFactor}
              onChange={(e) => liquidAudioEngine.setEqQFactor(Number(e.target.value))}
              className="w-20 accent-teal-400 cursor-pointer"
            />
            <span>{audio.eq.qFactor.toFixed(1)}</span>
          </label>

          <label className="inline-flex items-center gap-1.5 cursor-pointer font-sans">
            <input
              type="checkbox"
              checked={audio.eq.autoDrift}
              onChange={(e) => liquidAudioEngine.setEqAutoDrift(e.target.checked)}
              className="accent-indigo-400"
            />
            <Waves className="w-3.5 h-3.5 text-indigo-300" />
            <span>Auto-Drift Wave</span>
          </label>
        </div>

        {aiNote && (
          <div className="text-[11px] text-cyan-200 bg-cyan-500/10 border border-cyan-400/25 rounded-lg px-2.5 py-1.5">
            {aiNote}
          </div>
        )}
      </div>

      {/* Interactive Liquid Spline + Peak-Hold Spectrum Canvas */}
      <div className="h-[200px] md:h-auto md:flex-1 md:min-h-[180px] rounded-xl overflow-hidden border border-white/10 bg-[#040814] relative shrink-0 md:shrink touch-none">
        <canvas
          ref={canvasRef}
          onPointerDown={(e) => {
            draggingRef.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            sculptFromPointer(e);
          }}
          onPointerMove={(e) => {
            if (draggingRef.current) sculptFromPointer(e);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          className="w-full h-full block cursor-crosshair"
        />
        <div className="absolute top-2.5 left-3 text-[10px] font-mono text-slate-400 pointer-events-none">
          Drag curve to sculpt 32Hz–16kHz harmonics · Peak-hold spectrum active
        </div>
      </div>

      {/* 10 Precision Band Sliders */}
      <div className="aether-panel rounded-xl p-3 grid grid-cols-5 sm:grid-cols-10 gap-2.5 shrink-0">
        {audio.eq.bands.map((db, idx) => (
          <div key={BAND_LABELS[idx]} className="flex flex-col items-center gap-1.5">
            <span className={`text-[10px] font-mono-tabular ${audio.eq.bypass ? 'text-slate-500' : 'text-cyan-300'}`}>
              {db > 0 ? `+${db.toFixed(1)}` : db.toFixed(1)}
            </span>
            <input
              type="range"
              min={-12}
              max={12}
              step={0.5}
              value={db}
              onChange={(e) => {
                if (audio.eq.bypass) liquidAudioEngine.setEqBypass(false);
                liquidAudioEngine.setEqBand(idx, Number(e.target.value));
              }}
              aria-label={`${BAND_LABELS[idx]} Hz gain`}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] font-mono text-slate-400">{BAND_LABELS[idx]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
