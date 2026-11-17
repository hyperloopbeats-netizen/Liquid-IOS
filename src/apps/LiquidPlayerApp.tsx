import { useEffect, useRef, useState } from 'react';
import { Link2, Pause, Play, SkipBack, SkipForward, Upload, Volume2 } from 'lucide-react';
import { liquidAudioEngine } from '../kernel/liquidAudioEngine';
import type { LiquidAudioState } from '../types/os';

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function LiquidPlayerApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rippleRef = useRef<{ x: number; y: number; amp: number }>({ x: 0.5, y: 0.5, amp: 0 });
  const [audioState, setAudioState] = useState<LiquidAudioState>(liquidAudioEngine.getState());

  useEffect(() => {
    return liquidAudioEngine.subscribe(setAudioState);
  }, []);

  // Ferrofluid / Liquid Free-Flow Canvas Renderer
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
        canvas.width = Math.max(1, parent.clientWidth);
        canvas.height = Math.max(1, parent.clientHeight);
      }

      const w = canvas.width;
      const h = canvas.height;
      const st = liquidAudioEngine.getState();
      const spectrum = liquidAudioEngine.getSpectrum();

      let bassEnergy = 0;
      let midEnergy = 0;
      let trebleEnergy = 0;
      if (spectrum && st.playing) {
        for (let i = 0; i < 12; i++) bassEnergy += spectrum[i];
        for (let i = 12; i < 42; i++) midEnergy += spectrum[i];
        for (let i = 42; i < Math.min(80, spectrum.length); i++) trebleEnergy += spectrum[i];
        bassEnergy /= 12 * 255;
        midEnergy /= 30 * 255;
        trebleEnergy /= 38 * 255;
      }

      rippleRef.current.amp *= 0.94;
      phase += 0.028 * st.flowRate * (1.2 - st.viscosity * 0.5);

      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, w, h);

      const layers = [
        { offset: 0.56, amp: 24 + bassEnergy * 54, freq: 0.011, speed: 1.0, fill: 'rgba(14, 165, 233, 0.22)', stroke: '#38bdf8' },
        { offset: 0.62, amp: 18 + midEnergy * 42, freq: 0.016, speed: -1.35, fill: 'rgba(20, 184, 166, 0.24)', stroke: '#2dd4bf' },
        { offset: 0.68, amp: 14 + trebleEnergy * 36, freq: 0.023, speed: 1.8, fill: 'rgba(99, 102, 241, 0.22)', stroke: '#818cf8' },
      ];

      layers.forEach((layer, lIdx) => {
        ctx.beginPath();
        const baseY = h * layer.offset;
        const points = 90;
        for (let i = 0; i <= points; i++) {
          const t = i / points;
          const x = t * w;
          const binVal =
            spectrum && st.playing
              ? spectrum[Math.min(spectrum.length - 1, Math.floor(t * 48))] / 255
              : 0;
          const distToRipple = Math.abs(t - rippleRef.current.x);
          const ripple =
            Math.exp(-distToRipple * 10) *
            Math.sin(distToRipple * 36 - phase * 4) *
            rippleRef.current.amp *
            36;
          const viscositySmooth = 1 - st.viscosity * 0.45;
          const wave =
            Math.sin(x * layer.freq + phase * layer.speed + lIdx) * layer.amp * viscositySmooth +
            Math.cos(x * layer.freq * 2.1 - phase * 1.4) * (layer.amp * 0.38) +
            binVal * 32 +
            ripple;
          const y = baseY + wave;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        ctx.fillStyle = layer.fill;
        ctx.fill();

        ctx.strokeStyle = layer.stroke;
        ctx.lineWidth = 1.75;
        ctx.stroke();
      });

      const dropletCount = 7;
      for (let i = 0; i < dropletCount; i++) {
        const ang = phase * (0.45 + i * 0.08) + i * ((Math.PI * 2) / dropletCount);
        const rx = w * 0.5 + Math.cos(ang) * (w * 0.24 + bassEnergy * 45);
        const ry = h * 0.34 + Math.sin(ang * 1.3) * (h * 0.14 + midEnergy * 28);
        const r = 4 + (i % 3) * 2.5 + trebleEnergy * 10;
        ctx.beginPath();
        ctx.arc(rx, ry, r, 0, Math.PI * 2);
        ctx.fillStyle = i % 2 === 0 ? 'rgba(56, 189, 248, 0.38)' : 'rgba(45, 212, 191, 0.38)';
        ctx.fill();
      }
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const currentTrack =
    audioState.tracks.find((t) => t.id === audioState.currentTrackId) ?? audioState.tracks[0];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      liquidAudioEngine.unlockFromUserGesture();
      void liquidAudioEngine.addMp3Files(e.target.files);
      e.target.value = '';
    }
  };

  const handleCanvasPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    liquidAudioEngine.unlockFromUserGesture();
    const rect = e.currentTarget.getBoundingClientRect();
    rippleRef.current = {
      x: (e.clientX - rect.left) / Math.max(1, rect.width),
      y: (e.clientY - rect.top) / Math.max(1, rect.height),
      amp: 1.2,
    };
  };

  return (
    <div
      className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto md:overflow-hidden text-xs"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
          liquidAudioEngine.unlockFromUserGesture();
          void liquidAudioEngine.addMp3Files(e.dataTransfer.files);
        }
      }}
    >
      {/* Top Track & Upload Bar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="min-w-0">
          <div className="font-display text-sm font-semibold text-slate-100 truncate">
            {currentTrack?.title ?? 'Liquid Free-Flow Deck'}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {currentTrack?.artist} ·{' '}
            {currentTrack?.sourceType === 'mp3-file' ? 'Local Audio Buffer' : 'Procedural Flow Synth'} · Drag & drop audio anywhere
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              liquidAudioEngine.unlockFromUserGesture();
              liquidAudioEngine.setKernelLinked(!audioState.kernelLinked);
            }}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              audioState.kernelLinked
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                : 'bg-white/6 border-white/12 text-slate-300'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>{audioState.kernelLinked ? 'Synesthesia Linked' : 'Link to Kernel'}</span>
          </button>

          <label className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Load Audio</span>
            <input
              type="file"
              accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac"
              multiple
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Friendly Tap-to-Start / Error Banner */}
      {(audioState.statusMessage || audioState.errorMessage) && (
        <div
          className={`rounded-xl border px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0 ${
            audioState.errorMessage
              ? 'border-amber-400/35 bg-amber-500/12 text-amber-100'
              : 'border-cyan-400/35 bg-cyan-500/12 text-cyan-100'
          }`}
        >
          <span className="truncate flex-1 min-w-[160px]">
            {audioState.errorMessage || audioState.statusMessage}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                liquidAudioEngine.unlockFromUserGesture();
                void liquidAudioEngine.play(false);
              }}
              className="px-2.5 py-1 rounded-md bg-cyan-500/30 hover:bg-cyan-500/45 border border-cyan-300/40 text-white font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Play className="w-3 h-3" />
              <span>Play Now</span>
            </button>
            <button
              type="button"
              onClick={() => liquidAudioEngine.clearError()}
              className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[11px] font-medium cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Main Responsive Split: Ferrofluid Canvas + Transport vs Flow Mechanics & Playlist */}
      <div className="flex-none md:flex-1 md:min-h-0 flex flex-col md:grid md:grid-cols-12 gap-3">
        <div className="md:col-span-8 flex flex-col gap-3 md:min-h-0">
          {/* Ferrofluid Visualizer */}
          <div className="h-[200px] sm:h-[230px] md:h-auto md:flex-1 md:min-h-[180px] rounded-xl overflow-hidden border border-white/10 bg-[#040814] relative shrink-0 md:shrink">
            <canvas
              ref={canvasRef}
              onPointerDown={handleCanvasPointer}
              onPointerMove={(e) => {
                if (e.buttons === 1) handleCanvasPointer(e);
              }}
              className="w-full h-full block cursor-crosshair"
            />
            <div className="absolute top-2.5 left-3 text-[10px] font-mono text-slate-400 pointer-events-none">
              Click or drag surface to inject fluid ripples
            </div>
          </div>

          {/* Transport & Seek Bar */}
          <div className="aether-panel rounded-xl p-3 space-y-2.5 shrink-0">
            <div className="flex items-center gap-3 font-mono-tabular text-[11px] text-slate-300">
              <span className="w-10">{formatTime(audioState.currentTime)}</span>
              <input
                type="range"
                min={0}
                max={Math.max(1, audioState.duration)}
                step={0.5}
                value={audioState.currentTime}
                onChange={(e) => liquidAudioEngine.seek(Number(e.target.value))}
                className="flex-1 accent-cyan-400 cursor-pointer"
              />
              <span className="w-10 text-right">{formatTime(audioState.duration)}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    liquidAudioEngine.unlockFromUserGesture();
                    liquidAudioEngine.prevTrack();
                  }}
                  aria-label="Previous track"
                  className="p-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
                >
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    liquidAudioEngine.unlockFromUserGesture();
                    liquidAudioEngine.togglePlay();
                  }}
                  className="px-4 py-2 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-100 font-semibold inline-flex items-center gap-2 cursor-pointer"
                >
                  {audioState.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{audioState.playing ? 'Pause' : 'Play'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    liquidAudioEngine.unlockFromUserGesture();
                    liquidAudioEngine.nextTrack();
                  }}
                  aria-label="Next track"
                  className="p-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              <label className="flex items-center gap-2 text-[11px] text-slate-300 font-mono-tabular">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={audioState.volume}
                  onChange={(e) => liquidAudioEngine.setVolume(Number(e.target.value))}
                  className="w-24 accent-cyan-400 cursor-pointer"
                />
                <span>{Math.round(audioState.volume * 100)}%</span>
              </label>
            </div>
          </div>
        </div>

        {/* Right: Free-Flow Mechanics & Playlist */}
        <div className="md:col-span-4 flex flex-col gap-3 md:min-h-0">
          <div className="aether-panel rounded-xl p-3 space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100">Free-Flow State Mechanics</span>
              <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={audioState.freeFlowDrift}
                  onChange={(e) => liquidAudioEngine.setFreeFlowDrift(e.target.checked)}
                  className="accent-cyan-400"
                />
                Auto-Drift
              </label>
            </div>

            <label className="block space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Elastic Flow Rate</span>
                <span>{audioState.flowRate.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.65}
                max={1.45}
                step={0.02}
                value={audioState.flowRate}
                onChange={(e) => liquidAudioEngine.setFlowRate(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="block space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Fluid Viscosity</span>
                <span>{Math.round(audioState.viscosity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1.0}
                step={0.02}
                value={audioState.viscosity}
                onChange={(e) => liquidAudioEngine.setViscosity(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </label>

            <label className="block space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Resonant Low-Pass</span>
                <span>{Math.round(audioState.filterCutoffHz)} Hz</span>
              </div>
              <input
                type="range"
                min={300}
                max={12000}
                step={100}
                value={audioState.filterCutoffHz}
                onChange={(e) => liquidAudioEngine.setFilterCutoff(Number(e.target.value))}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </label>
          </div>

          <div className="aether-panel rounded-xl p-3 min-h-[160px] md:flex-1 md:min-h-0 flex flex-col">
            <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
              Flow Queue ({audioState.tracks.length})
            </div>
            <div className="flex-1 overflow-y-auto pt-2 space-y-1.5">
              {audioState.tracks.map((track) => {
                const active = track.id === audioState.currentTrackId;
                return (
                  <button
                    key={track.id}
                    type="button"
                    onClick={() => {
                      liquidAudioEngine.unlockFromUserGesture();
                      liquidAudioEngine.selectTrack(track.id, true);
                    }}
                    className={`w-full text-left p-2 rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-cyan-500/15 border-cyan-400/50 text-slate-100'
                        : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/8 text-slate-300'
                    }`}
                  >
                    <div className="font-medium truncate">{track.title}</div>
                    <div className="text-[10px] text-slate-400 font-mono-tabular mt-0.5">
                      {track.sourceType === 'mp3-file' ? 'Audio File' : 'Synth'} ·{' '}
                      {formatTime(track.durationSec)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
