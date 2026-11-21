import type { CircadianMode, SynesthesiaState } from '../types/os';
import { neuralBus } from './neuralBus';

type SynesthesiaListener = (state: SynesthesiaState) => void;

interface PhasePalette {
  baseHue: number;
  secondaryHue: number;
  bgA: [number, number, number];
  bgB: [number, number, number];
  bgC: [number, number, number];
}

const PHASE_PALETTES: Record<'dawn' | 'noon' | 'dusk' | 'midnight', PhasePalette> = {
  dawn: {
    baseHue: 28,
    secondaryHue: 192,
    bgA: [245, 158, 11],
    bgB: [56, 189, 248],
    bgC: [244, 114, 182],
  },
  noon: {
    baseHue: 186,
    secondaryHue: 160,
    bgA: [14, 165, 233],
    bgB: [16, 185, 129],
    bgC: [59, 130, 246],
  },
  dusk: {
    baseHue: 268,
    secondaryHue: 330,
    bgA: [139, 92, 246],
    bgB: [236, 72, 153],
    bgC: [14, 165, 233],
  },
  midnight: {
    baseHue: 168,
    secondaryHue: 210,
    bgA: [20, 184, 166],
    bgB: [56, 189, 248],
    bgC: [99, 102, 241],
  },
};

function resolveClockPhase(mode: CircadianMode): 'dawn' | 'noon' | 'dusk' | 'midnight' {
  if (mode !== 'auto') return mode;
  const h = new Date().getHours();
  if (h >= 5 && h < 10) return 'dawn';
  if (h >= 10 && h < 17) return 'noon';
  if (h >= 17 && h < 21) return 'dusk';
  return 'midnight';
}

class SynesthesiaKernelEngine {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private synthOscillators: OscillatorNode[] = [];
  private synthGain: GainNode | null = null;
  private freqBuffer: Uint8Array<ArrayBuffer> | null = null;
  private timeBuffer: Uint8Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private lastUiNotify = 0;
  private driftHueOverride: number | null = null;
  private listeners = new Set<SynesthesiaListener>();

  private state: SynesthesiaState = {
    micActive: false,
    synthActive: false,
    liquidAudioActive: false,
    bass: 0,
    mid: 0,
    treble: 0,
    rms: 0,
    peakHz: 0,
    systemLoad: 0.18,
    circadianMode: 'auto',
    resolvedPhase: resolveClockPhase('auto'),
    reactivity: 1.0,
    activeHue: 168,
  };

  constructor() {
    this.applyCssTheme();
    this.startLoop();
  }

  getState(): SynesthesiaState {
    return this.state;
  }

  getSharedAudioNodes(): { ctx: AudioContext; analyser: AnalyserNode } {
    return this.ensureAudioContext();
  }

  setLiquidAudioActive(active: boolean): void {
    this.state.liquidAudioActive = active;
    this.notify(true);
  }

  getFrequencyData(): Uint8Array | null {
    if (!this.analyser || !this.freqBuffer) return null;
    this.analyser.getByteFrequencyData(this.freqBuffer);
    return this.freqBuffer;
  }

  getTimeDomainData(): Uint8Array | null {
    if (!this.analyser || !this.timeBuffer) return null;
    this.analyser.getByteTimeDomainData(this.timeBuffer);
    return this.timeBuffer;
  }

  subscribe(listener: SynesthesiaListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  setSystemLoad(loadRatio: number): void {
    this.state.systemLoad = Math.max(0.05, Math.min(1, loadRatio));
  }

  setCircadianMode(mode: CircadianMode): void {
    this.state.circadianMode = mode;
    this.state.resolvedPhase = resolveClockPhase(mode);
    this.applyCssTheme();
    this.notify(true);
    neuralBus.publish('AUDIO', 'THEME_PHASE', `Synesthesia circadian mode set to ${mode} (${this.state.resolvedPhase}).`);
  }

  setReactivity(val: number): void {
    this.state.reactivity = Math.max(0.1, Math.min(2.5, val));
    this.notify(true);
  }

  setHue(hue: number | null): void {
    this.driftHueOverride = hue === null ? null : ((Math.round(hue) % 360) + 360) % 360;
    this.applyCssTheme();
  }

  private ensureAudioContext(): { ctx: AudioContext; analyser: AnalyserNode } {
    if (!this.audioCtx) {
      const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtor();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {
        // Defer resume until a user gesture occurs
      });
    }
    if (!this.analyser) {
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.78;
      this.freqBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
      this.timeBuffer = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }
    return { ctx: this.audioCtx, analyser: this.analyser };
  }

  async toggleMicrophone(): Promise<boolean> {
    if (this.state.micActive) {
      this.stopMicrophone();
      return false;
    }

    try {
      const { ctx, analyser } = this.ensureAudioContext();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);
      this.micStream = stream;
      this.state.micActive = true;
      neuralBus.publish('AUDIO', 'MIC_ONLINE', 'Live Microphone FFT Analyzer linked to Synesthesia Kernel.');
      this.notify(true);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Microphone permission denied.';
      neuralBus.publish('AUDIO', 'MIC_DENIED', `Microphone unavailable: ${msg}`);
      throw new Error(msg);
    }
  }

  stopMicrophone(): void {
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
    this.state.micActive = false;
    neuralBus.publish('AUDIO', 'MIC_OFFLINE', 'Microphone FFT stream stopped.');
    this.notify(true);
  }

  toggleInternalSynth(): boolean {
    if (this.state.synthActive) {
      this.stopInternalSynth();
      return false;
    }
    const { ctx, analyser } = this.ensureAudioContext();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = buf;
        s.connect(ctx.destination);
        s.start(0);
      } catch {
        // ignore
      }
    }
    const gain = ctx.createGain();
    gain.gain.value = 0.04;

    const freqs = [110, 164.81, 220, 329.63];
    const oscs = freqs.map((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      osc.connect(gain);
      osc.start();
      return osc;
    });

    gain.connect(analyser);
    gain.connect(ctx.destination);
    this.synthOscillators = oscs;
    this.synthGain = gain;
    this.state.synthActive = true;
    neuralBus.publish('AUDIO', 'SYNTH_ONLINE', 'Internal Harmonic Drone routed into Synesthesia FFT Engine.');
    this.notify(true);
    return true;
  }

  stopInternalSynth(): void {
    this.synthOscillators.forEach((o) => {
      try {
        o.stop();
        o.disconnect();
      } catch {
        // ignore
      }
    });
    this.synthOscillators = [];
    if (this.synthGain) {
      this.synthGain.disconnect();
      this.synthGain = null;
    }
    this.state.synthActive = false;
    neuralBus.publish('AUDIO', 'SYNTH_OFFLINE', 'Internal Harmonic Drone stopped.');
    this.notify(true);
  }

  private startLoop(): void {
    const tick = () => {
      this.rafId = requestAnimationFrame(tick);
      this.state.resolvedPhase = resolveClockPhase(this.state.circadianMode);

      const audioSourceRunning = this.state.micActive || this.state.synthActive || this.state.liquidAudioActive;

      if (audioSourceRunning && this.analyser && this.freqBuffer) {
        this.analyser.getByteFrequencyData(this.freqBuffer);
        const len = this.freqBuffer.length;
        let bassSum = 0;
        let midSum = 0;
        let trebleSum = 0;
        let maxVal = 0;
        let maxIdx = 0;

        for (let i = 0; i < len; i++) {
          const val = this.freqBuffer[i];
          if (val > maxVal) {
            maxVal = val;
            maxIdx = i;
          }
          if (i < 12) bassSum += val;
          else if (i < 48) midSum += val;
          else trebleSum += val;
        }

        const scale = this.state.reactivity / 255;
        const targetBass = Math.min(1, (bassSum / 12) * scale);
        const targetMid = Math.min(1, (midSum / 36) * scale);
        const targetTreble = Math.min(1, (trebleSum / Math.max(1, len - 48)) * scale);

        this.state.bass += (targetBass - this.state.bass) * 0.25;
        this.state.mid += (targetMid - this.state.mid) * 0.25;
        this.state.treble += (targetTreble - this.state.treble) * 0.25;
        this.state.rms = Math.min(1, this.state.bass * 0.45 + this.state.mid * 0.35 + this.state.treble * 0.2);

        const nyquist = (this.audioCtx?.sampleRate ?? 48000) / 2;
        this.state.peakHz = Math.round((maxIdx / len) * nyquist);

        if (this.state.synthActive && this.synthOscillators.length > 0 && this.audioCtx) {
          const t = this.audioCtx.currentTime;
          this.synthOscillators.forEach((osc, i) => {
            const base = [110, 164.81, 220, 329.63][i];
            osc.frequency.setTargetAtTime(base + Math.sin(t * (0.4 + i * 0.15)) * (6 + this.state.systemLoad * 18), t, 0.08);
          });
        }
      } else {
        this.state.bass *= 0.9;
        this.state.mid *= 0.9;
        this.state.treble *= 0.9;
        this.state.rms *= 0.9;
        this.state.peakHz = 0;
      }

      this.applyCssTheme();
      this.notify(false);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  private applyCssTheme(): void {
    const palette = PHASE_PALETTES[this.state.resolvedPhase];
    const energy = this.state.rms;
    const load = this.state.systemLoad;
    const hueShift =
      this.driftHueOverride !== null
        ? this.driftHueOverride
        : Math.round(palette.baseHue + energy * 48 + load * 26) % 360;
    this.state.activeHue = hueShift;

    const borderAlpha = (0.20 + energy * 0.32 + load * 0.12).toFixed(3);
    const glowAlpha = (0.12 + energy * 0.35).toFixed(3);
    const bgBoost = 1 + energy * 1.15 + load * 0.3;

    const root = document.documentElement;
    root.style.setProperty('--syn-hue', String(hueShift));
    root.style.setProperty('--syn-accent', `hsl(${hueShift}, 82%, 56%)`);
    root.style.setProperty('--syn-secondary', `hsl(${(hueShift + 42) % 360}, 85%, 62%)`);
    root.style.setProperty('--syn-border', `hsla(${hueShift}, 80%, 60%, ${borderAlpha})`);
    root.style.setProperty('--syn-border-strong', `hsla(${hueShift}, 85%, 64%, 0.65)`);
    root.style.setProperty('--syn-glow', `hsla(${hueShift}, 85%, 55%, ${glowAlpha})`);
    root.style.setProperty('--syn-intensity', (energy + load * 0.3).toFixed(3));
    root.style.setProperty(
      '--syn-bg-a',
      `rgba(${palette.bgA[0]}, ${palette.bgA[1]}, ${palette.bgA[2]}, ${Math.min(0.32, 0.12 * bgBoost).toFixed(3)})`
    );
    root.style.setProperty(
      '--syn-bg-b',
      `rgba(${palette.bgB[0]}, ${palette.bgB[1]}, ${palette.bgB[2]}, ${Math.min(0.28, 0.10 * bgBoost).toFixed(3)})`
    );
    root.style.setProperty(
      '--syn-bg-c',
      `rgba(${palette.bgC[0]}, ${palette.bgC[1]}, ${palette.bgC[2]}, ${Math.min(0.26, 0.10 * bgBoost).toFixed(3)})`
    );
  }

  private notify(force: boolean): void {
    const now = performance.now();
    if (!force && now - this.lastUiNotify < 65) return;
    this.lastUiNotify = now;
    const snap = { ...this.state };
    this.listeners.forEach((cb) => cb(snap));
  }

  destroy(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.stopMicrophone();
    this.stopInternalSynth();
    if (this.audioCtx) {
      void this.audioCtx.close();
      this.audioCtx = null;
    }
  }
}

export const synesthesiaEngine = new SynesthesiaKernelEngine();
