import { useEffect, useRef, useState } from 'react';
import {
  Disc3,
  Download,
  Film,
  Music2,
  Pause,
  Play,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { liquidAudioEngine } from '../kernel/liquidAudioEngine';
import { mediaBridge } from '../kernel/mediaBridge';
import { neuralBus } from '../kernel/neuralBus';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { AppId } from '../types/os';

type WaveKind = 'sine' | 'triangle' | 'sawtooth' | 'square';

interface StudioTrackPattern {
  title: string;
  genre: string;
  bpm: number;
  scaleName: string;
  leadWave: WaveKind;
  bassWave: WaveKind;
  filterCutoff: number;
  mixingNote: string;
  kick: number[];
  snare: number[];
  hat: number[];
  clap: number[];
  bassNotes: number[];
  leadNotes: number[];
}

const PRESET_TRACKS: StudioTrackPattern[] = [
  {
    title: 'Neon Horizon Drive',
    genre: 'Cyberpunk Synthwave',
    bpm: 118,
    scaleName: 'A Minor',
    leadWave: 'sawtooth',
    bassWave: 'sawtooth',
    filterCutoff: 2400,
    mixingNote: 'Driving 8th-note analog bass with crisp 80s gated snare.',
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 1, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 1],
    hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    clap: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    bassNotes: [45, 45, 45, 45, 41, 41, 41, 41, 48, 48, 48, 48, 43, 43, 43, 43],
    leadNotes: [69, -1, 72, 76, -1, 74, 72, -1, 69, -1, 76, 79, -1, 76, 74, 72],
  },
  {
    title: 'Subsurface Dub Pulse',
    genre: 'Deep Dub Techno',
    bpm: 124,
    scaleName: 'D Dorian',
    leadWave: 'triangle',
    bassWave: 'sine',
    filterCutoff: 1350,
    mixingNote: 'Warm sub-bass groove layered under hypnotic chord stabs.',
    kick: [2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0, 2, 0, 0, 0],
    snare: [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    hat: [0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1, 0, 1, 2, 1],
    clap: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    bassNotes: [38, -1, 38, -1, -1, 41, -1, 38, 38, -1, 43, -1, 45, -1, 41, -1],
    leadNotes: [62, -1, -1, 69, -1, -1, 65, -1, 62, -1, -1, 72, -1, 69, -1, -1],
  },
  {
    title: 'Midnight Tape Glow',
    genre: 'Lo-Fi Chillhop',
    bpm: 86,
    scaleName: 'F Major 7',
    leadWave: 'sine',
    bassWave: 'triangle',
    filterCutoff: 1850,
    mixingNote: 'Laid-back swung groove with soft sine Rhodes-style arpeggio.',
    kick: [2, 0, 0, 1, 0, 0, 1, 0, 2, 0, 0, 0, 0, 1, 0, 0],
    snare: [0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
    hat: [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0],
    clap: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
    bassNotes: [41, -1, -1, 41, 48, -1, -1, 48, 43, -1, -1, 43, 45, -1, 48, -1],
    leadNotes: [65, 69, 72, 76, -1, 74, 72, -1, 67, 72, 74, -1, 69, 72, 76, -1],
  },
];

const SCALE_NOTES = [
  { label: 'Rest', midi: -1 },
  { label: 'C3', midi: 48 },
  { label: 'D3', midi: 50 },
  { label: 'E3', midi: 52 },
  { label: 'F3', midi: 53 },
  { label: 'G3', midi: 55 },
  { label: 'A3', midi: 57 },
  { label: 'C4', midi: 60 },
  { label: 'D4', midi: 62 },
  { label: 'E4', midi: 64 },
  { label: 'F4', midi: 65 },
  { label: 'G4', midi: 67 },
  { label: 'A4', midi: 69 },
  { label: 'C5', midi: 72 },
  { label: 'D5', midi: 74 },
  { label: 'E5', midi: 76 },
  { label: 'G5', midi: 79 },
];

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function midiLabel(midi: number): string {
  if (midi < 0) return '—';
  const names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${names[midi % 12]}${Math.floor(midi / 12) - 1}`;
}

function encodeWavFromAudioBuffer(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const length = buffer.length * numChannels * 2;
  const arrayBuffer = new ArrayBuffer(44 + length);
  const view = new DataView(arrayBuffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length, true);

  let offset = 44;
  const channels: Float32Array[] = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));
  for (let i = 0; i < buffer.length; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function triggerStepAudio(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noiseBuffer: AudioBuffer,
  pattern: StudioTrackPattern,
  step: number,
  when: number,
  stepDur: number
) {
  const kickHit = pattern.kick[step] ?? 0;
  if (kickHit > 0) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(42, when + 0.14);
    g.gain.setValueAtTime(kickHit > 1 ? 0.65 : 0.45, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + 0.22);
    osc.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + 0.24);
  }

  const snareHit = pattern.snare[step] ?? 0;
  if (snareHit > 0) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(900, when);
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(snareHit > 1 ? 0.34 : 0.22, when);
    ng.gain.exponentialRampToValueAtTime(0.001, when + 0.14);
    noise.connect(filter);
    filter.connect(ng);
    ng.connect(dest);
    noise.start(when);
    noise.stop(when + 0.15);

    const body = ctx.createOscillator();
    const bg = ctx.createGain();
    body.type = 'triangle';
    body.frequency.setValueAtTime(185, when);
    body.frequency.exponentialRampToValueAtTime(95, when + 0.08);
    bg.gain.setValueAtTime(0.24, when);
    bg.gain.exponentialRampToValueAtTime(0.001, when + 0.09);
    body.connect(bg);
    bg.connect(dest);
    body.start(when);
    body.stop(when + 0.1);
  }

  const hatHit = pattern.hat[step] ?? 0;
  if (hatHit > 0) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(6200, when);
    const hg = ctx.createGain();
    hg.gain.setValueAtTime(hatHit > 1 ? 0.18 : 0.1, when);
    hg.gain.exponentialRampToValueAtTime(0.001, when + 0.055);
    noise.connect(hp);
    hp.connect(hg);
    hg.connect(dest);
    noise.start(when);
    noise.stop(when + 0.06);
  }

  const clapHit = pattern.clap[step] ?? 0;
  if (clapHit > 0) {
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1600, when);
    bp.Q.value = 1.4;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.26, when);
    cg.gain.exponentialRampToValueAtTime(0.001, when + 0.16);
    noise.connect(bp);
    bp.connect(cg);
    cg.connect(dest);
    noise.start(when);
    noise.stop(when + 0.17);
  }

  const bassMidi = pattern.bassNotes[step] ?? -1;
  if (bassMidi >= 24) {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = pattern.bassWave;
    osc.frequency.setValueAtTime(midiToFreq(bassMidi), when);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(Math.min(1800, pattern.filterCutoff * 0.7), when);
    g.gain.setValueAtTime(0.24, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 0.92);
    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + stepDur * 0.95);
  }

  const leadMidi = pattern.leadNotes[step] ?? -1;
  if (leadMidi >= 36) {
    const osc = ctx.createOscillator();
    const lp = ctx.createBiquadFilter();
    const g = ctx.createGain();
    osc.type = pattern.leadWave;
    osc.frequency.setValueAtTime(midiToFreq(leadMidi), when);
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(pattern.filterCutoff, when);
    lp.Q.value = 2.2;
    g.gain.setValueAtTime(0.16, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + stepDur * 1.15);
    osc.connect(lp);
    lp.connect(g);
    g.connect(dest);
    osc.start(when);
    osc.stop(when + stepDur * 1.2);
  }
}

export function MusicStudioApp({ onOpenApp }: { onOpenApp?: (id: AppId) => void }) {
  const [pattern, setPattern] = useState<StudioTrackPattern>(PRESET_TRACKS[0]);
  const [prompt, setPrompt] = useState(
    'Atmospheric cyberpunk synthwave at 118 BPM with punchy sub-bass and crisp arpeggio'
  );
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [composing, setComposing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const patternRef = useRef(pattern);
  const playingRef = useRef(playing);
  const synthBusRef = useRef<GainNode | null>(null);
  const noiseBufRef = useRef<AudioBuffer | null>(null);
  const stepIndexRef = useRef(0);
  const nextNoteTimeRef = useRef(0);
  const schedulerIdRef = useRef<number | null>(null);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);

  useEffect(() => {
    return () => {
      if (schedulerIdRef.current !== null) clearInterval(schedulerIdRef.current);
      if (synthBusRef.current) {
        try {
          synthBusRef.current.disconnect();
        } catch {
          // ignore disconnect
        }
        synthBusRef.current = null;
      }
      synesthesiaEngine.setLiquidAudioActive(false);
    };
  }, []);

  const ensureAudio = (): { ctx: AudioContext; bus: GainNode; noise: AudioBuffer } => {
    liquidAudioEngine.unlockFromUserGesture();
    const { ctx, analyser } = synesthesiaEngine.getSharedAudioNodes();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        // ignore unlock micro-buffer
      }
    }
    if (!synthBusRef.current) {
      const bus = ctx.createGain();
      bus.gain.value = 0.88;
      bus.connect(ctx.destination);
      bus.connect(analyser);
      synthBusRef.current = bus;
    }
    if (!noiseBufRef.current) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
      noiseBufRef.current = buf;
    }
    return { ctx, bus: synthBusRef.current, noise: noiseBufRef.current };
  };

  const startPlayback = async () => {
    const { ctx, bus, noise } = ensureAudio();
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (schedulerIdRef.current !== null) clearInterval(schedulerIdRef.current);

    stepIndexRef.current = 0;
    nextNoteTimeRef.current = ctx.currentTime + 0.05;
    setPlaying(true);
    synesthesiaEngine.setLiquidAudioActive(true);
    setStatusMsg(null);

    schedulerIdRef.current = window.setInterval(() => {
      if (!playingRef.current) return;
      const p = patternRef.current;
      const stepDur = 60 / Math.max(60, p.bpm) / 4;

      while (nextNoteTimeRef.current < ctx.currentTime + 0.14) {
        const s = stepIndexRef.current;
        triggerStepAudio(ctx, bus, noise, p, s, nextNoteTimeRef.current, stepDur);
        setCurrentStep(s);
        nextNoteTimeRef.current += stepDur;
        stepIndexRef.current = (s + 1) % 16;
      }
    }, 25);
  };

  const stopPlayback = () => {
    if (schedulerIdRef.current !== null) {
      clearInterval(schedulerIdRef.current);
      schedulerIdRef.current = null;
    }
    setPlaying(false);
    setCurrentStep(0);
    synesthesiaEngine.setLiquidAudioActive(false);
  };

  const handleAiCompose = async () => {
    if (!prompt.trim()) return;
    setComposing(true);
    setErrorMsg(null);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/music/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), bpmHint: pattern.bpm }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      const norm16 = (arr: unknown, fallback: number[]) =>
        Array.isArray(arr) && arr.length >= 16
          ? arr.slice(0, 16).map((n) => Number(n) || 0)
          : fallback;

      const nextTrack: StudioTrackPattern = {
        title: data.title || 'AI Studio Arrangement',
        genre: data.genre || 'Electronic Synth',
        bpm: Math.max(70, Math.min(165, Number(data.bpm) || 120)),
        scaleName: data.scaleName || 'A Minor',
        leadWave: (['sine', 'triangle', 'sawtooth', 'square'].includes(data.leadWave)
          ? data.leadWave
          : 'sawtooth') as WaveKind,
        bassWave: (['sine', 'triangle', 'sawtooth', 'square'].includes(data.bassWave)
          ? data.bassWave
          : 'triangle') as WaveKind,
        filterCutoff: Math.max(400, Math.min(6500, Number(data.filterCutoff) || 2200)),
        mixingNote: data.mixingNote || 'Synthesized multi-track arrangement.',
        kick: norm16(data.kick, pattern.kick),
        snare: norm16(data.snare, pattern.snare),
        hat: norm16(data.hat, pattern.hat),
        clap: norm16(data.clap, pattern.clap),
        bassNotes: norm16(data.bassNotes, pattern.bassNotes),
        leadNotes: norm16(data.leadNotes, pattern.leadNotes),
      };

      setPattern(nextTrack);
      setStatusMsg(`Generated "${nextTrack.title}" (${nextTrack.bpm} BPM · ${nextTrack.scaleName}).`);
      neuralBus.publish('AUDIO', 'MUSIC_GENERATED', `AI Music Studio composed "${nextTrack.title}".`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to compose track.');
    } finally {
      setComposing(false);
    }
  };

  const handleRandomizeGroove = () => {
    const scale = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69, 72];
    setPattern((prev) => ({
      ...prev,
      title: 'Procedural Groove Remix',
      kick: Array.from({ length: 16 }, (_, i) => (i % 4 === 0 ? 2 : Math.random() < 0.18 ? 1 : 0)),
      snare: Array.from({ length: 16 }, (_, i) => (i === 4 || i === 12 ? 2 : Math.random() < 0.15 ? 1 : 0)),
      hat: Array.from({ length: 16 }, (_, i) => (i % 2 === 0 || Math.random() < 0.45 ? 1 : 0)),
      clap: Array.from({ length: 16 }, (_, i) => (i === 4 || i === 12 ? 1 : 0)),
      bassNotes: Array.from({ length: 16 }, () =>
        Math.random() < 0.6 ? scale[Math.floor(Math.random() * 5)] - 12 : -1
      ),
      leadNotes: Array.from({ length: 16 }, () =>
        Math.random() < 0.55 ? scale[Math.floor(Math.random() * scale.length)] + 12 : -1
      ),
    }));
  };

  const renderWavBlob = async (loops = 2): Promise<Blob> => {
    const stepDur = 60 / Math.max(60, pattern.bpm) / 4;
    const totalSec = stepDur * 16 * loops + 0.35;
    const sampleRate = 44100;
    const offCtx = new OfflineAudioContext(2, Math.ceil(totalSec * sampleRate), sampleRate);

    const nLen = Math.floor(sampleRate * 0.5);
    const nBuf = offCtx.createBuffer(1, nLen, sampleRate);
    const ch = nBuf.getChannelData(0);
    for (let i = 0; i < nLen; i++) ch[i] = Math.random() * 2 - 1;

    const master = offCtx.createGain();
    master.gain.value = 0.85;
    master.connect(offCtx.destination);

    for (let l = 0; l < loops; l++) {
      for (let s = 0; s < 16; s++) {
        const when = (l * 16 + s) * stepDur;
        triggerStepAudio(offCtx, master, nBuf, pattern, s, when, stepDur);
      }
    }

    const rendered = await offCtx.startRendering();
    return encodeWavFromAudioBuffer(rendered);
  };

  const handleExportWav = async (destTarget: 'download' | 'liquid' | 'videoeditor' = 'download') => {
    setExporting(true);
    setErrorMsg(null);
    try {
      const loops = 2;
      const wavBlob = await renderWavBlob(loops);
      const safeTitle = pattern.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const totalSec = (60 / Math.max(60, pattern.bpm) / 4) * 16 * loops + 0.35;
      if (destTarget === 'liquid') {
        const file = new File([wavBlob], `${safeTitle}.wav`, { type: 'audio/wav' });
        await liquidAudioEngine.addMp3Files([file]);
        setStatusMsg(`Sent "${pattern.title}.wav" to Liquid MP3 & Free-Flow Player.`);
      } else if (destTarget === 'videoeditor') {
        const objectUrl = URL.createObjectURL(wavBlob);
        mediaBridge.sendAudioToEditor({
          id: `music-${Date.now().toString(36)}`,
          title: `${pattern.title}.wav`,
          objectUrl,
          duration: Number(totalSec.toFixed(2)),
        });
        setStatusMsg(`Sent "${pattern.title}.wav" directly to Video Editor timeline.`);
        onOpenApp?.('videoeditor');
      } else {
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeTitle}.wav`;
        a.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 4000);
        setStatusMsg(`Downloaded 16-bit stereo WAV "${safeTitle}.wav".`);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'WAV export failed.');
    } finally {
      setExporting(false);
    }
  };

  const toggleDrumStep = (lane: 'kick' | 'snare' | 'hat' | 'clap', stepIdx: number) => {
    setPattern((prev) => {
      const nextLane = [...prev[lane]];
      nextLane[stepIdx] = (nextLane[stepIdx] + 1) % 3;
      return { ...prev, [lane]: nextLane };
    });
  };

  const cycleMelodicNote = (lane: 'bassNotes' | 'leadNotes', stepIdx: number) => {
    setPattern((prev) => {
      const nextLane = [...prev[lane]];
      const curr = nextLane[stepIdx];
      if (curr < 0) {
        nextLane[stepIdx] = lane === 'bassNotes' ? 45 : 69;
      } else {
        const idx = SCALE_NOTES.findIndex((s) => s.midi === curr);
        const nextChoice = SCALE_NOTES[(idx + 1) % SCALE_NOTES.length];
        nextLane[stepIdx] = lane === 'bassNotes' && nextChoice.midi > 0 ? nextChoice.midi - 12 : nextChoice.midi;
      }
      return { ...prev, [lane]: nextLane };
    });
  };

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto text-xs">
      {/* Studio Header & Transport */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-300 shrink-0">
            <Music2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              {pattern.title}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {pattern.genre} · {pattern.scaleName} · <span className="font-mono-tabular">{pattern.bpm} BPM</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => (playing ? stopPlayback() : void startPlayback())}
            className="px-4 py-2 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/50 text-amber-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{playing ? 'Stop' : 'Play Pattern'}</span>
          </button>

          <button
            type="button"
            onClick={handleRandomizeGroove}
            className="px-2.5 py-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Remix</span>
          </button>

          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportWav('download')}
            className="px-2.5 py-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export WAV</span>
          </button>

          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportWav('liquid')}
            className="px-2.5 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Disc3 className="w-3.5 h-3.5" />
            <span>To Liquid Player</span>
          </button>

          <button
            type="button"
            disabled={exporting}
            onClick={() => void handleExportWav('videoeditor')}
            className="px-2.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Film className="w-3.5 h-3.5" />
            <span>To Video Editor</span>
          </button>
        </div>
      </div>

      {/* AI Music Prompt Bar & Preset Selector */}
      <div className="aether-panel rounded-xl p-3 space-y-2.5 shrink-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleAiCompose();
            }}
            placeholder="Describe genre, mood, tempo, instruments (e.g., Dark 132 BPM acid techno with rolling bassline)..."
            className="flex-1 rounded-lg bg-[#050a14] border border-white/15 px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400/60"
          />
          <button
            type="button"
            disabled={composing}
            onClick={() => void handleAiCompose()}
            className="px-4 py-2 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/50 text-indigo-100 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>{composing ? 'Composing...' : 'Generate Track'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {PRESET_TRACKS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => setPattern(p)}
                className={`px-2.5 py-1 rounded-md border text-[11px] cursor-pointer ${
                  pattern.title === p.title
                    ? 'bg-amber-500/20 border-amber-400/45 text-amber-100'
                    : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                {p.genre}
              </button>
            ))}
          </div>
          <span className="text-[11px] text-slate-400 truncate max-w-md">{pattern.mixingNote}</span>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-xl border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-rose-100 shrink-0">
          {errorMsg}
        </div>
      )}

      {statusMsg && (
        <div className="rounded-xl border border-emerald-400/35 bg-emerald-500/10 px-3 py-2 text-emerald-100 shrink-0">
          {statusMsg}
        </div>
      )}

      {/* Synth Parameters */}
      <div className="aether-panel rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
        <label className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300 font-mono-tabular">
            <span>Tempo</span>
            <span>{pattern.bpm} BPM</span>
          </div>
          <input
            type="range"
            min={70}
            max={165}
            value={pattern.bpm}
            onChange={(e) => setPattern((p) => ({ ...p, bpm: Number(e.target.value) }))}
            className="w-full accent-amber-400 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <div className="flex justify-between text-[11px] text-slate-300 font-mono-tabular">
            <span>Filter Cutoff</span>
            <span>{pattern.filterCutoff} Hz</span>
          </div>
          <input
            type="range"
            min={400}
            max={6500}
            step={50}
            value={pattern.filterCutoff}
            onChange={(e) => setPattern((p) => ({ ...p, filterCutoff: Number(e.target.value) }))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-300 block">Bass Oscillator</span>
          <select
            value={pattern.bassWave}
            onChange={(e) => setPattern((p) => ({ ...p, bassWave: e.target.value as WaveKind }))}
            className="w-full bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 outline-none"
          >
            <option value="sine">Sine Sub</option>
            <option value="triangle">Triangle Warm</option>
            <option value="sawtooth">Sawtooth Reese</option>
            <option value="square">Square Acid</option>
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[11px] text-slate-300 block">Lead Oscillator</span>
          <select
            value={pattern.leadWave}
            onChange={(e) => setPattern((p) => ({ ...p, leadWave: e.target.value as WaveKind }))}
            className="w-full bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 outline-none"
          >
            <option value="sawtooth">Sawtooth Super</option>
            <option value="triangle">Triangle Bell</option>
            <option value="square">Square Chiptune</option>
            <option value="sine">Sine Pluck</option>
          </select>
        </label>
      </div>

      {/* 16-Step Multi-Track Sequencer Grid */}
      <div className="aether-panel rounded-xl p-3 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="font-semibold inline-flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-300" />
            <span>16-Step Sequencer Grid (Tap steps to toggle velocity / cycle notes)</span>
          </span>
          <button
            type="button"
            onClick={() =>
              setPattern((p) => ({
                ...p,
                kick: Array(16).fill(0),
                snare: Array(16).fill(0),
                hat: Array(16).fill(0),
                clap: Array(16).fill(0),
                bassNotes: Array(16).fill(-1),
                leadNotes: Array(16).fill(-1),
              }))
            }
            className="px-2 py-1 rounded bg-white/6 hover:bg-white/12 text-slate-300 inline-flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
            <span>Clear Grid</span>
          </button>
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="min-w-[680px] space-y-1.5">
            {/* Step Number Playhead Header */}
            <div className="grid grid-cols-[90px_repeat(16,minmax(0,1fr))] gap-1 items-center text-[10px] font-mono-tabular text-slate-400">
              <span>Track</span>
              {Array.from({ length: 16 }, (_, s) => (
                <div
                  key={s}
                  className={`text-center py-0.5 rounded ${
                    playing && currentStep === s
                      ? 'bg-amber-400 text-slate-950 font-bold'
                      : s % 4 === 0
                      ? 'text-slate-200 font-semibold'
                      : ''
                  }`}
                >
                  {s + 1}
                </div>
              ))}
            </div>

            {/* Drum Channels */}
            {(
              [
                ['kick', 'Kick Drum', 'bg-rose-500/75 border-rose-300/60'],
                ['snare', 'Snare', 'bg-amber-500/75 border-amber-300/60'],
                ['hat', 'Hi-Hat', 'bg-cyan-500/75 border-cyan-300/60'],
                ['clap', 'Clap', 'bg-indigo-500/75 border-indigo-300/60'],
              ] as const
            ).map(([lane, label, activeClass]) => (
              <div key={lane} className="grid grid-cols-[90px_repeat(16,minmax(0,1fr))] gap-1 items-center">
                <span className="text-[11px] font-medium text-slate-200 truncate">{label}</span>
                {pattern[lane].map((val, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDrumStep(lane, idx)}
                    className={`h-7 rounded border text-[10px] font-mono-tabular cursor-pointer transition-transform ${
                      val > 0
                        ? `${activeClass} text-white font-semibold`
                        : idx % 4 === 0
                        ? 'bg-white/[0.06] border-white/15 hover:bg-white/12 text-slate-500'
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/10 text-slate-500'
                    } ${playing && currentStep === idx ? 'ring-1 ring-amber-300' : ''}`}
                  >
                    {val === 2 ? 'HI' : val === 1 ? 'ON' : ''}
                  </button>
                ))}
              </div>
            ))}

            {/* Melodic Bass & Lead Lanes */}
            {(
              [
                ['bassNotes', 'Bass Synth', 'bg-emerald-500/45 border-emerald-400/60 text-emerald-100'],
                ['leadNotes', 'Lead Synth', 'bg-fuchsia-500/45 border-fuchsia-400/60 text-fuchsia-100'],
              ] as const
            ).map(([lane, label, activeClass]) => (
              <div key={lane} className="grid grid-cols-[90px_repeat(16,minmax(0,1fr))] gap-1 items-center">
                <span className="text-[11px] font-medium text-slate-200 truncate">{label}</span>
                {pattern[lane].map((midi, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => cycleMelodicNote(lane, idx)}
                    className={`h-8 rounded border text-[10px] font-mono-tabular cursor-pointer ${
                      midi >= 0
                        ? activeClass
                        : 'bg-white/[0.02] border-white/10 hover:bg-white/10 text-slate-500'
                    } ${playing && currentStep === idx ? 'ring-1 ring-amber-300' : ''}`}
                  >
                    {midiLabel(midi)}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
