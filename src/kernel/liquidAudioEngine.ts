import type { LiquidAudioState, LiquidTrack } from '../types/os';
import { neuralBus } from './neuralBus';
import { synesthesiaEngine } from './synesthesiaEngine';

const DEFAULT_TRACKS: LiquidTrack[] = [
  {
    id: 'liq-subsurface',
    title: 'Sub-Surface Drift (432 Hz)',
    artist: 'Aether Flow Synth',
    sourceType: 'procedural',
    presetKey: 'subsurface',
    durationSec: 240,
  },
  {
    id: 'liq-theta',
    title: 'Binaural Theta Flow (110/116 Hz)',
    artist: 'Aether Flow Synth',
    sourceType: 'procedural',
    presetKey: 'theta',
    durationSec: 300,
  },
  {
    id: 'liq-solaris',
    title: 'Solaris Harmonic Pulse',
    artist: 'Aether Flow Synth',
    sourceType: 'procedural',
    presetKey: 'solaris',
    durationSec: 210,
  },
];

type LiquidListener = (state: LiquidAudioState) => void;

const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const LIQUID_EQ_PRESETS: Record<string, number[]> = {
  'Flat Reference': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'Sub-Bass Obsidian': [6.5, 5.5, 3.8, 1.5, -0.5, -1.2, 0.5, 2.0, 3.2, 4.0],
  'Vocal Presence': [-2.0, -1.0, 0.5, 1.8, 3.4, 4.5, 4.2, 2.5, 1.0, 0.5],
  'Crystal Air': [-1.5, -0.5, 0, 0.5, 1.0, 1.8, 3.2, 5.2, 6.8, 7.5],
  'Binaural Warmth': [4.2, 3.6, 2.5, 1.8, 0.8, -0.4, -1.2, -1.8, -1.0, 0.5],
  '120Hz Pulse': [5.0, 6.2, 4.4, 1.2, -1.8, 0.8, 2.6, 4.0, 4.8, 3.5],
};

class LiquidAudioEngineService {
  private audioEl: HTMLAudioElement | null = null;
  private mediaSource: MediaElementAudioSourceNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private eqNodes: BiquadFilterNode[] = [];
  private masterGain: GainNode | null = null;
  private localAnalyser: AnalyserNode | null = null;
  private freqBuf: Uint8Array<ArrayBuffer> | null = null;

  // Decoded AudioBuffer playback for bulletproof mobile/iframe WebKit audio + EQ routing
  private decodedBuffers = new Map<string, AudioBuffer>();
  private bufferSource: AudioBufferSourceNode | null = null;
  private bufferOffsetSec = 0;
  private bufferStartCtxTime = 0;
  private manualStopFlag = false;

  private procOscs: OscillatorNode[] = [];
  private procLfo: OscillatorNode | null = null;
  private procGain: GainNode | null = null;
  private tickTimer: number | null = null;
  private audioUnlocked = false;

  private listeners = new Set<LiquidListener>();
  private playRequestId = 0;

  private state: LiquidAudioState = {
    tracks: DEFAULT_TRACKS,
    currentTrackId: DEFAULT_TRACKS[0].id,
    playing: false,
    currentTime: 0,
    duration: DEFAULT_TRACKS[0].durationSec,
    volume: 0.72,
    flowRate: 1.0,
    viscosity: 0.58,
    filterCutoffHz: 3200,
    freeFlowDrift: true,
    kernelLinked: true,
    eq: {
      bands: [...LIQUID_EQ_PRESETS['Flat Reference']],
      frequencies: EQ_FREQUENCIES,
      liquidCoupling: true,
      couplingStrength: 0.58,
      autoDrift: false,
      presetName: 'Flat Reference',
      bypass: false,
      preampDb: 0,
      qFactor: 1.15,
    },
    errorMessage: null,
    statusMessage: null,
  };

  constructor() {
    this.installGlobalGestureUnlocker();

    this.tickTimer = window.setInterval(() => {
      if (!this.state.playing) return;
      const track = this.getCurrentTrack();

      if (track?.sourceType === 'mp3-file' && this.bufferSource) {
        const ctx = this.bufferSource.context;
        const elapsed = Math.max(0, (ctx.currentTime - this.bufferStartCtxTime) * this.state.flowRate);
        this.state.currentTime = Math.min(this.state.duration, this.bufferOffsetSec + elapsed);
      } else if (track?.sourceType === 'mp3-file' && this.audioEl) {
        this.state.currentTime = this.audioEl.currentTime;
        this.state.duration = Number.isFinite(this.audioEl.duration) ? this.audioEl.duration : track.durationSec;
      } else {
        this.state.currentTime =
          (this.state.currentTime + 0.25 * this.state.flowRate) % Math.max(1, this.state.duration);
        if (this.state.freeFlowDrift && this.filterNode && this.procGain) {
          const t = performance.now() * 0.001;
          const sweep =
            900 +
            (Math.sin(t * (0.45 - this.state.viscosity * 0.2)) * 0.5 + 0.5) *
              (this.state.filterCutoffHz - 600);
          this.filterNode.frequency.setTargetAtTime(sweep, this.filterNode.context.currentTime, 0.12);
        }
      }

      if (this.state.eq.autoDrift) {
        const t = performance.now() * 0.0012;
        this.state.eq.bands = this.state.eq.bands.map((_, idx) => {
          const wave = Math.sin(t * 1.15 + idx * 0.65) * 4.5 + Math.cos(t * 0.6 - idx * 0.35) * 2.2;
          return Number(Math.max(-12, Math.min(12, wave)).toFixed(2));
        });
        this.state.eq.presetName = 'Liquid Auto-Drift';
        this.syncEqNodes();
      }

      this.emit();
    }, 250);
  }

  private installGlobalGestureUnlocker(): void {
    if (typeof window === 'undefined') return;
    const onGesture = () => {
      this.unlockFromUserGesture();
    };
    window.addEventListener('pointerdown', onGesture, { passive: true });
    window.addEventListener('touchstart', onGesture, { passive: true });
    window.addEventListener('keydown', onGesture, { passive: true });
  }

  unlockFromUserGesture(): void {
    try {
      const { ctx } = this.ensureGraph();
      if (ctx.state === 'suspended') {
        void ctx.resume().then(() => {
          this.audioUnlocked = true;
        }).catch(() => {});
      } else {
        this.audioUnlocked = true;
      }
      // Play a 1-sample silent buffer once to unlock iOS Safari Web Audio gate
      if (!this.audioUnlocked) {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
        this.audioUnlocked = true;
      }
    } catch {
      // Ignore if AudioContext cannot yet be created
    }
  }

  getState(): LiquidAudioState {
    return this.state;
  }

  getCurrentTrack(): LiquidTrack | undefined {
    return this.state.tracks.find((t) => t.id === this.state.currentTrackId);
  }

  subscribe(listener: LiquidListener): () => void {
    this.listeners.add(listener);
    listener({
      ...this.state,
      tracks: [...this.state.tracks],
      eq: { ...this.state.eq, bands: [...this.state.eq.bands] },
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    const snap: LiquidAudioState = {
      ...this.state,
      tracks: [...this.state.tracks],
      eq: { ...this.state.eq, bands: [...this.state.eq.bands] },
    };
    this.listeners.forEach((cb) => cb(snap));
  }

  clearError(): void {
    if (this.state.errorMessage || this.state.statusMessage) {
      this.state.errorMessage = null;
      this.state.statusMessage = null;
      this.emit();
    }
  }

  private ensureGraph(): {
    ctx: AudioContext;
    filter: BiquadFilterNode;
    gain: GainNode;
    localAnalyser: AnalyserNode;
    kernelAnalyser: AnalyserNode;
  } {
    const { ctx, analyser: kernelAnalyser } = synesthesiaEngine.getSharedAudioNodes();
    if (!this.filterNode || !this.masterGain || !this.localAnalyser) {
      this.filterNode = ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = this.state.filterCutoffHz;
      this.filterNode.Q.value = 1.8;

      this.eqNodes = EQ_FREQUENCIES.map((freq, idx) => {
        const node = ctx.createBiquadFilter();
        node.type = idx === 0 ? 'lowshelf' : idx === EQ_FREQUENCIES.length - 1 ? 'highshelf' : 'peaking';
        node.frequency.value = freq;
        node.Q.value = 1.15;
        node.gain.value = this.state.eq.bands[idx] ?? 0;
        return node;
      });

      this.masterGain = ctx.createGain();
      this.masterGain.gain.value = this.state.volume;

      this.localAnalyser = ctx.createAnalyser();
      this.localAnalyser.fftSize = 256;
      this.localAnalyser.smoothingTimeConstant = 0.82;
      this.freqBuf = new Uint8Array(new ArrayBuffer(this.localAnalyser.frequencyBinCount));

      // Chain: filterNode -> eqNodes[0..9] -> masterGain -> localAnalyser -> destination
      let prev: AudioNode = this.filterNode;
      for (const eqNode of this.eqNodes) {
        prev.connect(eqNode);
        prev = eqNode;
      }
      prev.connect(this.masterGain);
      this.masterGain.connect(this.localAnalyser);
      this.localAnalyser.connect(ctx.destination);
      if (this.state.kernelLinked) {
        this.masterGain.connect(kernelAnalyser);
      }
    }
    return {
      ctx,
      filter: this.filterNode,
      gain: this.masterGain,
      localAnalyser: this.localAnalyser,
      kernelAnalyser,
    };
  }

  getSpectrum(): Uint8Array | null {
    if (!this.localAnalyser || !this.freqBuf) return null;
    this.localAnalyser.getByteFrequencyData(this.freqBuf);
    return this.freqBuf;
  }

  async addMp3Files(fileList: FileList | File[]): Promise<LiquidTrack | null> {
    const files = Array.from(fileList);
    let firstAdded: LiquidTrack | null = null;
    this.state.errorMessage = null;
    this.state.statusMessage = null;

    const { ctx } = this.ensureGraph();

    for (const f of files) {
      const isAudio =
        f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(f.name);
      if (!isAudio) {
        this.state.errorMessage = `Unsupported file "${f.name}". Please select an audio file (.mp3, .wav, .ogg, .m4a).`;
        continue;
      }
      const url = URL.createObjectURL(f);
      const cleanTitle = f.name.replace(/\.[^/.]+$/, '');
      const trackId = `mp3-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      let durationSec = 180;

      // Decode into Web Audio AudioBuffer so playback bypasses iOS HTMLAudioElement iframe blocks
      // and flows directly through the 10-Band EQ & Synesthesia analyzer.
      if (f.size <= 45 * 1024 * 1024) {
        try {
          const arrayBuf = await f.arrayBuffer();
          const audioBuf = await ctx.decodeAudioData(arrayBuf.slice(0));
          this.decodedBuffers.set(trackId, audioBuf);
          if (Number.isFinite(audioBuf.duration) && audioBuf.duration > 0) {
            durationSec = audioBuf.duration;
          }
        } catch {
          // Fallback cleanly to HTMLAudioElement if decodeAudioData fails on codec
        }
      }

      const track: LiquidTrack = {
        id: trackId,
        title: cleanTitle,
        artist: 'Local Audio File',
        sourceType: 'mp3-file',
        objectUrl: url,
        durationSec,
      };
      this.state.tracks = [track, ...this.state.tracks];
      if (!firstAdded) firstAdded = track;
      neuralBus.publish('AUDIO', 'MP3_LOADED', `Loaded local audio "${f.name}" into Liquid MP3 Player.`);
    }

    if (firstAdded) {
      this.stopCurrentAudio(true);
      this.state.currentTrackId = firstAdded.id;
      this.state.currentTime = 0;
      this.state.duration = firstAdded.durationSec;

      if (ctx.state === 'running' || this.audioUnlocked) {
        await this.play(true);
      } else {
        // Avoid triggering NotAllowedError after native file picker closes on iOS Safari
        this.state.playing = false;
        this.state.statusMessage = `Loaded "${firstAdded.title}" — tap Play to start audio.`;
        this.emit();
      }
    } else {
      this.emit();
    }
    return firstAdded;
  }

  selectTrack(trackId: string, autoPlay = true): void {
    const found = this.state.tracks.find((t) => t.id === trackId);
    if (!found) return;
    const wasPlaying = this.state.playing;
    this.stopCurrentAudio(true);
    this.state.currentTrackId = found.id;
    this.state.currentTime = 0;
    this.state.duration = found.durationSec;
    this.state.errorMessage = null;
    this.state.statusMessage = null;
    this.emit();
    if (autoPlay || wasPlaying) {
      void this.play();
    }
  }

  private ensureAudioElement(ctx: AudioContext, filter: BiquadFilterNode): HTMLAudioElement {
    if (!this.audioEl) {
      const el = new Audio();
      el.preload = 'auto';
      // Required for iOS Safari / WebKit inline playback without fullscreen hijack
      el.setAttribute('playsinline', 'true');
      (el as HTMLAudioElement & { playsInline?: boolean }).playsInline = true;

      el.addEventListener('ended', () => {
        this.nextTrack();
      });
      el.addEventListener('loadedmetadata', () => {
        if (this.audioEl && Number.isFinite(this.audioEl.duration)) {
          this.state.duration = this.audioEl.duration;
          this.emit();
        }
      });
      el.addEventListener('error', () => {
        const mediaErr = el.error;
        const detail = mediaErr?.message || `Media decode error (code ${mediaErr?.code ?? 'unknown'})`;
        this.state.playing = false;
        this.state.errorMessage = `Unable to decode audio track: ${detail}`;
        synesthesiaEngine.setLiquidAudioActive(false);
        neuralBus.publish('AUDIO', 'LIQUID_ERROR', this.state.errorMessage);
        this.emit();
      });
      this.audioEl = el;
      try {
        this.mediaSource = ctx.createMediaElementSource(el);
        this.mediaSource.connect(filter);
      } catch {
        // Ignore if WebKit already bound element to a MediaElementAudioSourceNode
      }
    }
    return this.audioEl;
  }

  private startDecodedBuffer(
    ctx: AudioContext,
    filter: BiquadFilterNode,
    buffer: AudioBuffer,
    offsetSec: number
  ): void {
    this.stopBufferSource();
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = this.state.flowRate;
    src.connect(filter);

    const clampedOffset = Math.max(0, Math.min(Math.max(0, buffer.duration - 0.05), offsetSec));
    this.bufferOffsetSec = clampedOffset;
    this.bufferStartCtxTime = ctx.currentTime;
    this.manualStopFlag = false;

    src.onended = () => {
      if (this.manualStopFlag) return;
      if (this.bufferSource === src) {
        this.bufferSource = null;
        this.bufferOffsetSec = 0;
        this.nextTrack();
      }
    };

    src.start(0, clampedOffset);
    this.bufferSource = src;
  }

  async play(silentAutoAttempt = false): Promise<void> {
    const track = this.getCurrentTrack();
    if (!track) return;

    const reqId = ++this.playRequestId;
    this.state.errorMessage = null;
    this.state.statusMessage = null;

    try {
      this.unlockFromUserGesture();
      const { ctx, filter } = this.ensureGraph();

      if (track.sourceType === 'mp3-file') {
        const decoded = this.decodedBuffers.get(track.id);

        if (decoded) {
          this.stopProceduralAudio();
          this.stopHtmlAudio(false);

          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }
          if (reqId !== this.playRequestId) return;

          if (ctx.state !== 'running') {
            this.state.playing = false;
            this.state.statusMessage = `Loaded "${track.title}" — tap Play to start audio.`;
            this.emit();
            return;
          }

          this.startDecodedBuffer(ctx, filter, decoded, this.state.currentTime);
        } else if (track.objectUrl) {
          this.stopProceduralAudio();
          this.stopBufferSource();

          if (ctx.state === 'suspended') {
            void ctx.resume().catch(() => {});
          }

          const el = this.ensureAudioElement(ctx, filter);
          if (el.src !== track.objectUrl) {
            // Never set crossOrigin='anonymous' on blob: URLs (causes WebKit failures)
            if (track.objectUrl.startsWith('http')) {
              el.crossOrigin = 'anonymous';
            } else {
              el.removeAttribute('crossorigin');
            }
            el.src = track.objectUrl;
          }
          el.playbackRate = this.state.flowRate;

          try {
            const playPromise = el.play();
            if (playPromise !== undefined) {
              await playPromise;
            }
          } catch (err) {
            if (reqId !== this.playRequestId) return;
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }
            const isBlocked = err instanceof DOMException && err.name === 'NotAllowedError';
            this.state.playing = false;
            synesthesiaEngine.setLiquidAudioActive(false);

            if (isBlocked && silentAutoAttempt) {
              this.state.statusMessage = `Loaded "${track.title}" — tap Play to start audio.`;
            } else {
              this.state.errorMessage = isBlocked
                ? 'Tap Play below to unlock browser audio for this track.'
                : err instanceof Error
                ? `Audio playback failed: ${err.message}`
                : 'Audio playback failed.';
              neuralBus.publish('AUDIO', 'LIQUID_PLAY_BLOCKED', this.state.errorMessage);
            }
            this.emit();
            return;
          }

          if (reqId !== this.playRequestId) return;
          if (ctx.state === 'suspended') {
            await ctx.resume().catch(() => {});
          }
        }
      } else {
        // Procedural Free-Flow Ambient Engine
        this.stopCurrentAudio(false);
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (reqId !== this.playRequestId) return;

        if (ctx.state !== 'running') {
          this.state.playing = false;
          this.state.statusMessage = 'Tap Play to start audio stream.';
          this.emit();
          return;
        }

        const pGain = ctx.createGain();
        pGain.gain.value = 0.14;
        pGain.connect(filter);

        const baseChord =
          track.presetKey === 'theta'
            ? [110, 116, 165, 220]
            : track.presetKey === 'solaris'
            ? [146.83, 220, 293.66, 440]
            : [108, 162, 216, 324];

        const oscs = baseChord.map((freq, idx) => {
          const osc = ctx.createOscillator();
          osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
          osc.frequency.value = freq * this.state.flowRate;
          osc.connect(pGain);
          osc.start();
          return osc;
        });

        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.value = 0.25 + (1 - this.state.viscosity) * 0.8;
        lfoGain.gain.value = 0.04;
        lfo.connect(lfoGain);
        lfoGain.connect(pGain.gain);
        lfo.start();

        this.procOscs = oscs;
        this.procLfo = lfo;
        this.procGain = pGain;
      }

      if (reqId !== this.playRequestId) return;
      this.state.playing = true;
      this.state.statusMessage = null;
      this.state.errorMessage = null;
      synesthesiaEngine.setLiquidAudioActive(this.state.kernelLinked);
      neuralBus.publish(
        'AUDIO',
        'LIQUID_PLAY',
        `Liquid Player streaming "${track.title}" (Flow ${this.state.flowRate.toFixed(2)}x).`
      );
      this.emit();
    } catch (err) {
      if (reqId !== this.playRequestId) return;
      this.state.playing = false;
      this.state.errorMessage = err instanceof Error ? err.message : 'Unable to initialize audio playback.';
      synesthesiaEngine.setLiquidAudioActive(false);
      neuralBus.publish('AUDIO', 'LIQUID_ERROR', this.state.errorMessage);
      this.emit();
    }
  }

  pause(): void {
    this.playRequestId++;
    if (this.bufferSource) {
      const ctx = this.bufferSource.context;
      const elapsed = Math.max(0, (ctx.currentTime - this.bufferStartCtxTime) * this.state.flowRate);
      this.state.currentTime = Math.min(this.state.duration, this.bufferOffsetSec + elapsed);
      this.bufferOffsetSec = this.state.currentTime;
    }
    this.stopCurrentAudio(false);
    this.state.playing = false;
    synesthesiaEngine.setLiquidAudioActive(false);
    this.emit();
  }

  togglePlay(): void {
    if (this.state.playing) this.pause();
    else void this.play(false);
  }

  nextTrack(): void {
    const idx = this.state.tracks.findIndex((t) => t.id === this.state.currentTrackId);
    const next = this.state.tracks[(idx + 1) % this.state.tracks.length];
    if (next) this.selectTrack(next.id, true);
  }

  prevTrack(): void {
    const idx = this.state.tracks.findIndex((t) => t.id === this.state.currentTrackId);
    const prev = this.state.tracks[(idx - 1 + this.state.tracks.length) % this.state.tracks.length];
    if (prev) this.selectTrack(prev.id, true);
  }

  seek(sec: number): void {
    const clamped = Math.max(0, Math.min(this.state.duration, sec));
    this.state.currentTime = clamped;
    this.bufferOffsetSec = clamped;
    const track = this.getCurrentTrack();

    if (track?.sourceType === 'mp3-file') {
      const decoded = this.decodedBuffers.get(track.id);
      if (decoded && this.state.playing && this.filterNode) {
        this.startDecodedBuffer(this.filterNode.context as AudioContext, this.filterNode, decoded, clamped);
      } else if (this.audioEl && this.audioEl.readyState >= 1) {
        try {
          this.audioEl.currentTime = clamped;
        } catch {
          // Ignore seek errors before media metadata is ready
        }
      }
    }
    this.emit();
  }

  setVolume(val: number): void {
    this.state.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.getEffectiveMasterGain(), this.masterGain.context.currentTime, 0.04);
    }
    this.emit();
  }

  private getEffectiveMasterGain(): number {
    const preampMult = this.state.eq.bypass ? 1 : Math.pow(10, this.state.eq.preampDb / 20);
    return Math.max(0, Math.min(2.0, this.state.volume * preampMult));
  }

  setFlowRate(rate: number): void {
    const nextRate = Math.max(0.65, Math.min(1.45, rate));
    if (this.bufferSource) {
      const ctx = this.bufferSource.context;
      const elapsed = Math.max(0, (ctx.currentTime - this.bufferStartCtxTime) * this.state.flowRate);
      this.bufferOffsetSec = Math.min(this.state.duration, this.bufferOffsetSec + elapsed);
      this.bufferStartCtxTime = ctx.currentTime;
      this.bufferSource.playbackRate.setTargetAtTime(nextRate, ctx.currentTime, 0.04);
    }
    this.state.flowRate = nextRate;
    if (this.audioEl) {
      this.audioEl.playbackRate = nextRate;
    }
    const track = this.getCurrentTrack();
    if (track && this.procOscs.length > 0) {
      const baseChord =
        track.presetKey === 'theta'
          ? [110, 116, 165, 220]
          : track.presetKey === 'solaris'
          ? [146.83, 220, 293.66, 440]
          : [108, 162, 216, 324];
      this.procOscs.forEach((osc, i) => {
        osc.frequency.setTargetAtTime(baseChord[i] * this.state.flowRate, osc.context.currentTime, 0.08);
      });
    }
    this.emit();
  }

  setViscosity(v: number): void {
    this.state.viscosity = Math.max(0.1, Math.min(1, v));
    if (this.procLfo) {
      this.procLfo.frequency.setTargetAtTime(
        0.2 + (1 - this.state.viscosity) * 0.9,
        this.procLfo.context.currentTime,
        0.08
      );
    }
    this.emit();
  }

  setFilterCutoff(hz: number): void {
    this.state.filterCutoffHz = Math.max(300, Math.min(12000, hz));
    if (this.filterNode) {
      this.filterNode.frequency.setTargetAtTime(
        this.state.filterCutoffHz,
        this.filterNode.context.currentTime,
        0.06
      );
    }
    this.emit();
  }

  setFreeFlowDrift(enabled: boolean): void {
    this.state.freeFlowDrift = enabled;
    this.emit();
  }

  setKernelLinked(linked: boolean): void {
    this.state.kernelLinked = linked;
    const { analyser: kernelAnalyser } = synesthesiaEngine.getSharedAudioNodes();
    if (this.masterGain) {
      try {
        if (linked) this.masterGain.connect(kernelAnalyser);
        else this.masterGain.disconnect(kernelAnalyser);
      } catch {
        // ignore if already disconnected
      }
    }
    synesthesiaEngine.setLiquidAudioActive(linked && this.state.playing);
    this.emit();
  }

  private syncEqNodes(): void {
    if (this.eqNodes.length > 0) {
      const now = this.eqNodes[0].context.currentTime;
      this.eqNodes.forEach((node, idx) => {
        const gainVal = this.state.eq.bypass ? 0 : (this.state.eq.bands[idx] ?? 0);
        node.gain.setTargetAtTime(gainVal, now, 0.04);
        if (idx > 0 && idx < this.eqNodes.length - 1) {
          node.Q.setTargetAtTime(this.state.eq.qFactor, now, 0.04);
        }
      });
    }
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        this.getEffectiveMasterGain(),
        this.masterGain.context.currentTime,
        0.04
      );
    }
  }

  setEqBand(index: number, targetDb: number): void {
    if (index < 0 || index >= this.state.eq.bands.length) return;
    const clamped = Math.max(-12, Math.min(12, targetDb));
    const prev = this.state.eq.bands[index];
    const delta = clamped - prev;
    const nextBands = [...this.state.eq.bands];
    nextBands[index] = Number(clamped.toFixed(2));

    if (this.state.eq.liquidCoupling) {
      const strength = this.state.eq.couplingStrength;
      for (let i = 0; i < nextBands.length; i++) {
        if (i === index) continue;
        const dist = Math.abs(i - index);
        if (dist <= 3) {
          const influence = Math.exp(-dist * 0.95) * strength;
          nextBands[i] = Number(Math.max(-12, Math.min(12, nextBands[i] + delta * influence)).toFixed(2));
        }
      }
    }

    this.state.eq.bands = nextBands;
    this.state.eq.presetName = 'Custom Fluid';
    this.syncEqNodes();
    this.emit();
  }

  setEqPreset(presetName: string): void {
    const preset = LIQUID_EQ_PRESETS[presetName];
    if (!preset) return;
    this.state.eq.bands = [...preset];
    this.state.eq.presetName = presetName;
    this.state.eq.autoDrift = false;
    this.state.eq.bypass = false;
    this.syncEqNodes();
    neuralBus.publish('AUDIO', 'EQ_PRESET', `Liquid Graphic EQ loaded preset "${presetName}".`);
    this.emit();
  }

  applyEqCurve(bands: number[], presetName: string, qFactor?: number, preampDb?: number): void {
    this.state.eq.bands = EQ_FREQUENCIES.map((_, idx) =>
      Number(Math.max(-12, Math.min(12, Number(bands[idx] ?? 0))).toFixed(2))
    );
    this.state.eq.presetName = presetName || 'Custom Sculpt';
    this.state.eq.autoDrift = false;
    this.state.eq.bypass = false;
    if (typeof qFactor === 'number' && Number.isFinite(qFactor)) {
      this.state.eq.qFactor = Math.max(0.5, Math.min(4.0, Number(qFactor.toFixed(2))));
    }
    if (typeof preampDb === 'number' && Number.isFinite(preampDb)) {
      this.state.eq.preampDb = Math.max(-6, Math.min(6, Number(preampDb.toFixed(1))));
    }
    this.syncEqNodes();
    neuralBus.publish('AUDIO', 'EQ_SCULPT', `Applied Liquid EQ curve "${this.state.eq.presetName}".`);
    this.emit();
  }

  setEqBypass(bypass: boolean): void {
    this.state.eq.bypass = bypass;
    this.syncEqNodes();
    this.emit();
  }

  setEqPreampDb(db: number): void {
    this.state.eq.preampDb = Math.max(-6, Math.min(6, Number(db.toFixed(1))));
    this.syncEqNodes();
    this.emit();
  }

  setEqQFactor(q: number): void {
    this.state.eq.qFactor = Math.max(0.5, Math.min(4.0, Number(q.toFixed(2))));
    this.syncEqNodes();
    this.emit();
  }

  setEqLiquidCoupling(enabled: boolean): void {
    this.state.eq.liquidCoupling = enabled;
    this.emit();
  }

  setEqCouplingStrength(val: number): void {
    this.state.eq.couplingStrength = Math.max(0.1, Math.min(0.95, val));
    this.emit();
  }

  setEqAutoDrift(enabled: boolean): void {
    this.state.eq.autoDrift = enabled;
    this.emit();
  }

  private stopBufferSource(): void {
    if (this.bufferSource) {
      this.manualStopFlag = true;
      try {
        this.bufferSource.stop();
        this.bufferSource.disconnect();
      } catch {
        // ignore if already stopped
      }
      this.bufferSource = null;
    }
  }

  private stopHtmlAudio(resetTime = true): void {
    if (this.audioEl) {
      if (!this.audioEl.paused) {
        this.audioEl.pause();
      }
      if (resetTime && this.audioEl.readyState >= 1) {
        try {
          this.audioEl.currentTime = 0;
        } catch {
          // ignore
        }
      }
    }
  }

  private stopProceduralAudio(): void {
    this.procOscs.forEach((o) => {
      try {
        o.stop();
        o.disconnect();
      } catch {
        // ignore
      }
    });
    this.procOscs = [];
    if (this.procLfo) {
      try {
        this.procLfo.stop();
        this.procLfo.disconnect();
      } catch {
        // ignore
      }
      this.procLfo = null;
    }
    if (this.procGain) {
      this.procGain.disconnect();
      this.procGain = null;
    }
  }

  private stopCurrentAudio(resetTime = true): void {
    if (resetTime) {
      this.bufferOffsetSec = 0;
    }
    this.stopBufferSource();
    this.stopHtmlAudio(resetTime);
    this.stopProceduralAudio();
  }

  destroy(): void {
    this.playRequestId++;
    if (this.tickTimer !== null) clearInterval(this.tickTimer);
    this.stopCurrentAudio();
    this.decodedBuffers.clear();
  }
}

export const liquidAudioEngine = new LiquidAudioEngineService();
