import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Music2 } from 'lucide-react';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { CircadianMode, SynesthesiaState } from '../types/os';

export function SynesthesiaApp() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [syn, setSyn] = useState<SynesthesiaState>(synesthesiaEngine.getState());
  const [micError, setMicError] = useState('');

  useEffect(() => {
    const unsub = synesthesiaEngine.subscribe(setSyn);
    return unsub;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const draw = () => {
      rafId = requestAnimationFrame(draw);
      const parent = canvas.parentElement;
      if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
        canvas.width = parent.clientWidth;
        canvas.height = Math.max(1, parent.clientHeight);
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = '#040813';
      ctx.fillRect(0, 0, w, h);

      const freq = synesthesiaEngine.getFrequencyData();
      const time = synesthesiaEngine.getTimeDomainData();
      const state = synesthesiaEngine.getState();

      // Subtle frequency grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.lineWidth = 1;
      for (let y = 0; y < h; y += 36) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      if (freq && (state.micActive || state.synthActive || state.liquidAudioActive)) {
        const barCount = Math.min(64, freq.length);
        const barW = w / barCount;
        for (let i = 0; i < barCount; i++) {
          const val = freq[i] / 255;
          const barH = val * (h * 0.72);
          const hue = (state.activeHue + i * 1.8) % 360;
          ctx.fillStyle = `hsla(${hue}, 82%, 58%, 0.85)`;
          ctx.fillRect(i * barW + 1, h - barH, Math.max(2, barW - 3), barH);
        }

        if (time) {
          ctx.strokeStyle = `hsla(${(state.activeHue + 45) % 360}, 90%, 72%, 0.9)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for (let i = 0; i < time.length; i++) {
            const x = (i / (time.length - 1)) * w;
            const v = (time[i] - 128) / 128;
            const y = h * 0.34 + v * (h * 0.22);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = '#64748b';
        ctx.font = '12px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(
          'Audio stream idle. Start Microphone or enable Internal Harmonic Synth.',
          w / 2,
          h / 2
        );
      }
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleToggleMic = async () => {
    setMicError('');
    try {
      await synesthesiaEngine.toggleMicrophone();
    } catch (err) {
      setMicError(err instanceof Error ? err.message : 'Microphone permission denied.');
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-y-auto md:overflow-hidden text-xs">
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Synesthesia Audio-Visual Kernel Engine
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Live FFT audio bands, system load, and circadian clock dynamically morph desktop shaders and glass borders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleToggleMic}
            className={`px-3 py-1.5 rounded-lg border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              syn.micActive
                ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-100'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-100'
            }`}
          >
            {syn.micActive ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
            <span>{syn.micActive ? 'Stop Microphone' : 'Start Microphone'}</span>
          </button>

          <button
            type="button"
            onClick={() => synesthesiaEngine.toggleInternalSynth()}
            className={`px-3 py-1.5 rounded-lg border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              syn.synthActive
                ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-100'
            }`}
          >
            <Music2 className="w-3.5 h-3.5" />
            <span>{syn.synthActive ? 'Stop Harmonic Synth' : 'Test Harmonic Synth'}</span>
          </button>
        </div>
      </div>

      {micError && (
        <div className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-400/40 text-rose-200 text-[11px] shrink-0">
          {micError} (You can use "Test Harmonic Synth" to drive live Web Audio FFT without a physical mic.)
        </div>
      )}

      {/* Telemetry Readouts */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 shrink-0 font-mono-tabular">
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Bass Energy</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">{Math.round(syn.bass * 100)}%</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Mid Harmonic</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">{Math.round(syn.mid * 100)}%</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Peak Frequency</div>
          <div className="text-sm font-semibold text-cyan-300 mt-0.5">{syn.peakHz} Hz</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Active Hue</div>
          <div className="text-sm font-semibold text-slate-100 mt-0.5">{syn.activeHue}° ({syn.resolvedPhase})</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">System Load</div>
          <div className="text-sm font-semibold text-emerald-300 mt-0.5">{Math.round(syn.systemLoad * 100)}%</div>
        </div>
      </div>

      {/* Controls Row */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">Circadian Theme:</span>
          {(['auto', 'dawn', 'noon', 'dusk', 'midnight'] as CircadianMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => synesthesiaEngine.setCircadianMode(mode)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                syn.circadianMode === mode
                  ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2.5 text-[11px] text-slate-300">
          <span>Reactivity ({syn.reactivity.toFixed(1)}x)</span>
          <input
            type="range"
            min="0.3"
            max="2.2"
            step="0.1"
            value={syn.reactivity}
            onChange={(e) => synesthesiaEngine.setReactivity(Number(e.target.value))}
            className="accent-cyan-400 cursor-pointer"
          />
        </label>
      </div>

      {/* FFT Canvas */}
      <div className="h-[220px] md:h-auto md:flex-1 md:min-h-0 rounded-xl overflow-hidden border border-white/10 bg-[#040813] shrink-0 md:shrink">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
}
