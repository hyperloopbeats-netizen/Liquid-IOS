import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CircleDot,
  CopyPlus,
  Film,
  Layers,
  Music2,
  Pause,
  Play,
  Scissors,
  Sparkles,
  Trash2,
  Type as TypeIcon,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { liquidAudioEngine } from '../kernel/liquidAudioEngine';
import { mediaBridge, type AudioTrackHandoff, type VideoHandoffPayload } from '../kernel/mediaBridge';
import { neuralBus } from '../kernel/neuralBus';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import { drawLiquidMeshFrame, type LiquidMeshMode } from '../utils/liquidMeshRenderer';

type ClipKind = 'video' | 'image' | 'title';
type TransitionKind = 'cut' | 'crossfade' | 'fade-black';
type ColorPreset = 'neutral' | 'cinema-teal' | 'noir' | 'warm-gold' | 'thermal';

interface TimelineClip {
  id: string;
  title: string;
  kind: ClipKind;
  objectUrl?: string;
  imageEl?: HTMLImageElement;
  sourceDuration: number;
  trimIn: number;
  trimOut: number;
  speed: number;
  volume: number;
  opacity: number;
  zoom: number;
  transition: TransitionKind;
  colorPreset: ColorPreset;
  brightness: number;
  contrast: number;
  saturation: number;
  overlayText: string;
  overlayPos: 'top' | 'center' | 'bottom';
  matteGradient: [string, string];
}

function formatTimecode(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '00:00.0';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const tenths = Math.floor((sec % 1) * 10);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${tenths}`;
}

function createTitleClip(title: string, overlayText: string, grad: [string, string]): TimelineClip {
  return {
    id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    kind: 'title',
    sourceDuration: 4,
    trimIn: 0,
    trimOut: 4,
    speed: 1,
    volume: 1,
    opacity: 0.72,
    zoom: 1,
    transition: 'crossfade',
    colorPreset: 'neutral',
    brightness: 100,
    contrast: 105,
    saturation: 105,
    overlayText,
    overlayPos: 'center',
    matteGradient: grad,
  };
}

function clipLength(clip: TimelineClip): number {
  return Math.max(0.4, (clip.trimOut - clip.trimIn) / Math.max(0.25, clip.speed));
}

export function VideoEditorApp() {
  const monitorRef = useRef<HTMLCanvasElement | null>(null);
  const videoElsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const clipGainsRef = useRef<Map<string, GainNode>>(new Map());
  const audioTrackGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [clips, setClips] = useState<TimelineClip[]>(() => [
    createTitleClip('Intro Card · Sequence 01', 'AETHER STUDIO // 60FPS CUT', ['#0f172a', '#0369a1']),
  ]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [playhead, setPlayhead] = useState<number>(0);
  const [playing, setPlaying] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [liquidUnderlay, setLiquidUnderlay] = useState<boolean>(true);
  const [liquidMode, setLiquidMode] = useState<LiquidMeshMode>('bio-caustics');
  const [bgAudio, setBgAudio] = useState<AudioTrackHandoff | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const playheadRef = useRef<number>(0);
  const playingRef = useRef<boolean>(false);
  const exportingRef = useRef<boolean>(false);
  const mutedRef = useRef<boolean>(false);
  const liquidUnderlayRef = useRef<boolean>(true);
  const liquidModeRef = useRef<LiquidMeshMode>('bio-caustics');

  useEffect(() => {
    playingRef.current = playing;
  }, [playing]);
  useEffect(() => {
    exportingRef.current = exporting;
  }, [exporting]);
  useEffect(() => {
    mutedRef.current = muted;
    if (masterGainRef.current) {
      const ctx = masterGainRef.current.context;
      masterGainRef.current.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.03);
    }
  }, [muted]);
  useEffect(() => {
    liquidUnderlayRef.current = liquidUnderlay;
  }, [liquidUnderlay]);
  useEffect(() => {
    liquidModeRef.current = liquidMode;
  }, [liquidMode]);

  useEffect(() => {
    if (clips.length > 0 && !clips.some((c) => c.id === selectedId)) {
      setSelectedId(clips[0].id);
    }
  }, [clips, selectedId]);

  const timelineLayout = useMemo(() => {
    let cursor = 0;
    return clips.map((clip) => {
      const len = clipLength(clip);
      const item = { clip, start: cursor, end: cursor + len, duration: len };
      cursor += len;
      return item;
    });
  }, [clips]);

  const totalDuration = useMemo(
    () => timelineLayout.reduce((acc, item) => Math.max(acc, item.end), 0),
    [timelineLayout]
  );

  const layoutRef = useRef(timelineLayout);
  const totalDurRef = useRef(totalDuration);
  useEffect(() => {
    layoutRef.current = timelineLayout;
    totalDurRef.current = totalDuration;
  }, [timelineLayout, totalDuration]);

  const selectedClip = clips.find((c) => c.id === selectedId) ?? clips[0] ?? null;

  // Initialize shared Web Audio bus (masterGain -> analyser -> ctx.destination + MediaStreamAudioDestination + Synesthesia)
  const ensureAudioBus = useCallback(() => {
    liquidAudioEngine.unlockFromUserGesture();
    const { ctx, analyser: kernelAnalyser } = synesthesiaEngine.getSharedAudioNodes();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
    if (!masterGainRef.current) {
      const master = ctx.createGain();
      master.gain.value = mutedRef.current ? 0 : 1;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      freqBufRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

      const dest = ctx.createMediaStreamDestination();
      master.connect(analyser);
      analyser.connect(ctx.destination);
      master.connect(kernelAnalyser);
      master.connect(dest);

      masterGainRef.current = master;
      analyserRef.current = analyser;
      audioDestRef.current = dest;
    }
    return { ctx, master: masterGainRef.current! };
  }, []);

  const wireVideoElementAudio = useCallback(
    (clipId: string, vid: HTMLVideoElement) => {
      const { ctx, master } = ensureAudioBus();
      if (clipGainsRef.current.has(clipId)) return;
      const src = mediaBridge.getOrCreateMediaSource(ctx, vid);
      if (!src) return;
      const g = ctx.createGain();
      g.gain.value = 1;
      src.connect(g);
      g.connect(master);
      clipGainsRef.current.set(clipId, g);
    },
    [ensureAudioBus]
  );

  // Accept incoming video or audio handoffs from Organic MP4 Player / Music Studio
  const ingestVideoHandoff = useCallback((p: VideoHandoffPayload) => {
    const newClip: TimelineClip = {
      id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: p.title,
      kind: 'video',
      objectUrl: p.objectUrl,
      sourceDuration: Math.max(1, p.duration),
      trimIn: p.trimIn,
      trimOut: Math.max(p.trimIn + 0.4, p.trimOut),
      speed: p.speed,
      volume: 1,
      opacity: p.opacity,
      zoom: 1,
      transition: 'crossfade',
      colorPreset: 'neutral',
      brightness: p.brightness,
      contrast: p.contrast,
      saturation: p.saturation,
      overlayText: p.overlayText,
      overlayPos: p.overlayPos,
      matteGradient: ['#020617', '#0f172a'],
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedId(newClip.id);
    setLiquidUnderlay(p.liquidUnderlay);
    setLiquidMode(p.liquidMode);
    setStatusMsg(`Imported "${p.title}" from Organic MP4 Player with trims & color grades.`);
  }, []);

  useEffect(() => {
    const pendingVid = mediaBridge.consumePendingVideo();
    if (pendingVid) ingestVideoHandoff(pendingVid);

    const pendingAud = mediaBridge.consumePendingAudio();
    if (pendingAud) {
      setBgAudio(pendingAud);
      setStatusMsg(`Loaded soundtrack "${pendingAud.title}" on Audio Track.`);
    }

    const unsubVid = mediaBridge.subscribeVideoHandoffs(ingestVideoHandoff);
    const unsubAud = mediaBridge.subscribeAudioHandoffs((aud) => {
      setBgAudio(aud);
      setStatusMsg(`Loaded soundtrack "${aud.title}" on Audio Track.`);
    });
    return () => {
      unsubVid();
      unsubAud();
    };
  }, [ingestVideoHandoff]);

  // Persistent 60fps Master Composite Render & Playhead Clock Loop
  useEffect(() => {
    const canvas = monitorRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = (canvas.width = 720);
    const h = (canvas.height = 405);

    let rafId = 0;
    let lastTs = performance.now();
    let lastUiSyncTs = 0;
    let meshPhase = 0;
    let prevClipId = '';

    const renderTick = (now: number) => {
      rafId = requestAnimationFrame(renderTick);
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;

      const isPlaying = playingRef.current;
      const layout = layoutRef.current;
      const total = Math.max(0.5, totalDurRef.current);

      if (isPlaying) {
        meshPhase += dt * 1.5;
        let next = playheadRef.current + dt;
        if (next >= total) {
          if (exportingRef.current && recorderRef.current && recorderRef.current.state === 'recording') {
            recorderRef.current.stop();
          }
          next = 0;
          playingRef.current = false;
          setPlaying(false);
          synesthesiaEngine.setLiquidAudioActive(false);
          if (audioElRef.current && !audioElRef.current.paused) {
            audioElRef.current.pause();
          }
        }
        playheadRef.current = next;
        if (now - lastUiSyncTs > 32) {
          lastUiSyncTs = now;
          setPlayhead(next);
        }
      }

      const curPlayhead = playheadRef.current;
      const activeSlot =
        layout.find((item) => curPlayhead >= item.start && curPlayhead <= item.end) ?? layout[0];

      // 1. Draw Liquid Mesh Underlay (or obsidian black) underneath clip layer
      if (liquidUnderlayRef.current) {
        let bass = 0.16;
        let mid = 0.14;
        let treble = 0.12;
        let spec: Uint8Array | null = null;
        if (analyserRef.current && freqBufRef.current && isPlaying) {
          analyserRef.current.getByteFrequencyData(freqBufRef.current);
          spec = freqBufRef.current;
          let b = 0;
          let m = 0;
          let t = 0;
          for (let i = 0; i < 12; i++) b += spec[i];
          for (let i = 12; i < 42; i++) m += spec[i];
          for (let i = 42; i < 76; i++) t += spec[i];
          bass = b / (12 * 255);
          mid = m / (30 * 255);
          treble = t / (34 * 255);
        }
        const syn = synesthesiaEngine.getState();
        drawLiquidMeshFrame(ctx, w, h, {
          mode: liquidModeRef.current,
          phase: meshPhase,
          bass,
          mid,
          treble,
          hue: syn.activeHue,
          intensity: 0.72,
          pointerX: 0.5,
          pointerY: 0.5,
          pointerActive: false,
          spectrum: spec,
        });
      } else {
        ctx.fillStyle = '#04070f';
        ctx.fillRect(0, 0, w, h);
      }

      if (!activeSlot) return;

      const { clip, start, duration } = activeSlot;
      const localTime = Math.max(0, curPlayhead - start);
      const mediaTime = Math.min(clip.trimOut, clip.trimIn + localTime * clip.speed);

      // Pause all other video elements so audio never bleeds from inactive clips
      videoElsRef.current.forEach((vid, id) => {
        if (id !== clip.id && !vid.paused) {
          vid.pause();
        }
      });

      // Keep companion audio track synchronized
      const aud = audioElRef.current;
      if (aud && aud.src) {
        if (isPlaying) {
          if (Math.abs(aud.currentTime - (curPlayhead % Math.max(1, aud.duration || 30))) > 0.4) {
            try {
              aud.currentTime = curPlayhead % Math.max(1, aud.duration || 30);
            } catch {
              // ignore seek errors
            }
          }
          if (aud.paused) void aud.play().catch(() => {});
        } else if (!aud.paused) {
          aud.pause();
        }
      }

      // Compute transition envelope + per-clip opacity
      let alpha = clip.opacity;
      if (clip.transition === 'crossfade' && localTime < 0.45) {
        alpha *= Math.max(0.08, localTime / 0.45);
      } else if (clip.transition === 'fade-black') {
        if (localTime < 0.4) alpha *= localTime / 0.4;
        else if (duration - localTime < 0.4) alpha *= Math.max(0, (duration - localTime) / 0.4);
      }

      let presetFilter = '';
      if (clip.colorPreset === 'noir') presetFilter = 'grayscale(100%) ';
      else if (clip.colorPreset === 'warm-gold') presetFilter = 'sepia(45%) ';
      else if (clip.colorPreset === 'cinema-teal') presetFilter = 'hue-rotate(15deg) ';
      else if (clip.colorPreset === 'thermal') presetFilter = 'hue-rotate(175deg) contrast(135%) ';

      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.filter = `${presetFilter}brightness(${clip.brightness}%) contrast(${clip.contrast}%) saturate(${clip.saturation}%)`;

      if (clip.kind === 'video' && clip.objectUrl) {
        const vid = videoElsRef.current.get(clip.id);
        if (vid) {
          // Only hard-seek on scrub/clip entry or large drift (>0.38s) so 60fps decode flows cleanly
          const drift = Math.abs(vid.currentTime - mediaTime);
          if (prevClipId !== clip.id || (!isPlaying && drift > 0.05) || (isPlaying && drift > 0.38)) {
            try {
              vid.currentTime = mediaTime;
            } catch {
              // ignore seek before metadata
            }
          }
          vid.playbackRate = clip.speed;
          const gainNode = clipGainsRef.current.get(clip.id);
          if (gainNode) {
            gainNode.gain.setTargetAtTime(clip.volume, gainNode.context.currentTime, 0.02);
          } else {
            vid.muted = mutedRef.current;
            vid.volume = clip.volume;
          }

          if (isPlaying && vid.paused) {
            void vid.play().catch(() => {});
          } else if (!isPlaying && !vid.paused) {
            vid.pause();
          }

          if (vid.readyState >= 2 && vid.videoWidth > 0) {
            const scale = Math.min(w / vid.videoWidth, h / vid.videoHeight) * clip.zoom;
            const dw = vid.videoWidth * scale;
            const dh = vid.videoHeight * scale;
            ctx.drawImage(vid, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
          }
        }
      } else if (clip.kind === 'image' && clip.imageEl) {
        const img = clip.imageEl;
        const kenBurns = (1 + (localTime / Math.max(1, duration)) * 0.06) * clip.zoom;
        const scale = Math.min(w / img.width, h / img.height) * kenBurns;
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) * 0.5, (h - dh) * 0.5, dw, dh);
      } else {
        const grad = ctx.createLinearGradient(0, 0, w, h);
        grad.addColorStop(0, clip.matteGradient[0]);
        grad.addColorStop(1, clip.matteGradient[1]);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
      }
      ctx.restore();
      prevClipId = clip.id;

      // Title Text Overlay
      if (clip.overlayText.trim()) {
        ctx.save();
        ctx.font = '600 26px "Outfit", "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const y =
          clip.overlayPos === 'top' ? 54 : clip.overlayPos === 'bottom' ? h - 54 : h * 0.5;
        const metrics = ctx.measureText(clip.overlayText);
        const boxW = Math.min(w - 40, metrics.width + 38);
        ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.fillRect((w - boxW) * 0.5, y - 24, boxW, 48);
        ctx.fillStyle = '#f8fafc';
        ctx.fillText(clip.overlayText, w * 0.5, y, w - 64);
        ctx.restore();
      }
    };

    rafId = requestAnimationFrame(renderTick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleTogglePlay = () => {
    ensureAudioBus();
    const next = !playing;
    if (next) {
      const slot =
        timelineLayout.find((i) => playheadRef.current >= i.start && playheadRef.current <= i.end) ??
        timelineLayout[0];
      if (slot && slot.clip.kind === 'video') {
        const vid = videoElsRef.current.get(slot.clip.id);
        if (vid) {
          wireVideoElementAudio(slot.clip.id, vid);
          vid.muted = clipGainsRef.current.has(slot.clip.id) ? false : muted;
          void vid.play().catch(() => {});
        }
      }
      if (audioElRef.current && audioElRef.current.src) {
        void audioElRef.current.play().catch(() => {});
      }
      synesthesiaEngine.setLiquidAudioActive(true);
    } else {
      videoElsRef.current.forEach((v) => v.pause());
      if (audioElRef.current) audioElRef.current.pause();
      synesthesiaEngine.setLiquidAudioActive(false);
    }
    playingRef.current = next;
    setPlaying(next);
  };

  const handleImportMedia = async (fileList: FileList | File[]) => {
    ensureAudioBus();
    const files = Array.from(fileList);
    const added: TimelineClip[] = [];

    for (const f of files) {
      const url = URL.createObjectURL(f);
      if (f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v)$/i.test(f.name)) {
        const meta = document.createElement('video');
        meta.src = url;
        meta.preload = 'metadata';
        const dur = await new Promise<number>((resolve) => {
          meta.onloadedmetadata = () => resolve(Number.isFinite(meta.duration) ? meta.duration : 8);
          meta.onerror = () => resolve(8);
        });
        added.push({
          id: `vid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: f.name.replace(/\.[^/.]+$/, ''),
          kind: 'video',
          objectUrl: url,
          sourceDuration: Math.max(1, dur),
          trimIn: 0,
          trimOut: Math.max(1, dur),
          speed: 1,
          volume: 1,
          opacity: 0.96,
          zoom: 1,
          transition: 'crossfade',
          colorPreset: 'neutral',
          brightness: 100,
          contrast: 100,
          saturation: 100,
          overlayText: '',
          overlayPos: 'bottom',
          matteGradient: ['#020617', '#0f172a'],
        });
      } else if (f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(f.name)) {
        setBgAudio({
          id: `aud-${Date.now()}`,
          title: f.name.replace(/\.[^/.]+$/, ''),
          objectUrl: url,
          duration: 60,
        });
        setStatusMsg(`Loaded soundtrack "${f.name}" on Audio Track.`);
      } else if (f.type.startsWith('image/') || /\.(png|jpg|jpeg|webp)$/i.test(f.name)) {
        const img = await new Promise<HTMLImageElement | undefined>((resolve) => {
          const el = new Image();
          el.onload = () => resolve(el);
          el.onerror = () => resolve(undefined);
          el.src = url;
        });
        if (img) {
          added.push({
            id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title: f.name.replace(/\.[^/.]+$/, ''),
            kind: 'image',
            objectUrl: url,
            imageEl: img,
            sourceDuration: 5,
            trimIn: 0,
            trimOut: 5,
            speed: 1,
            volume: 1,
            opacity: 0.96,
            zoom: 1,
            transition: 'crossfade',
            colorPreset: 'neutral',
            brightness: 100,
            contrast: 100,
            saturation: 100,
            overlayText: '',
            overlayPos: 'bottom',
            matteGradient: ['#020617', '#0f172a'],
          });
        }
      }
    }

    if (added.length > 0) {
      setClips((prev) => [...prev, ...added]);
      setSelectedId(added[0].id);
      setStatusMsg(`Added ${added.length} 60fps clip(s) with audio to timeline.`);
      neuralBus.publish('FORGE', 'VIDEO_EDITOR_IMPORT', `Imported ${added.length} clip(s) into Video Editor.`);
    }
  };

  const updateSelectedClip = (patch: Partial<TimelineClip>) => {
    if (!selectedClip) return;
    setClips((prev) => prev.map((c) => (c.id === selectedClip.id ? { ...c, ...patch } : c)));
  };

  const handleSplitAtPlayhead = () => {
    const cur = playheadRef.current;
    const slot = timelineLayout.find((item) => cur > item.start + 0.3 && cur < item.end - 0.3);
    if (!slot) {
      setStatusMsg('Move the playhead inside the middle of a clip to split it.');
      return;
    }
    const splitMediaTime = slot.clip.trimIn + (cur - slot.start) * slot.clip.speed;
    const leftClip: TimelineClip = { ...slot.clip, trimOut: Number(splitMediaTime.toFixed(2)) };
    const rightClip: TimelineClip = {
      ...slot.clip,
      id: `${slot.clip.id}-b-${Date.now().toString().slice(-4)}`,
      title: `${slot.clip.title} (Part 2)`,
      trimIn: Number(splitMediaTime.toFixed(2)),
    };
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === slot.clip.id);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1, leftClip, rightClip);
      return next;
    });
    setSelectedId(rightClip.id);
    setStatusMsg(`Split "${slot.clip.title}" at ${formatTimecode(cur)}.`);
  };

  const moveClip = (dir: -1 | 1) => {
    if (!selectedClip) return;
    setClips((prev) => {
      const idx = prev.findIndex((c) => c.id === selectedClip.id);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleExportSequence = () => {
    const canvas = monitorRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || !canvas.captureStream) {
      setStatusMsg('Real-time 60fps video export requires a browser supporting canvas.captureStream().');
      return;
    }

    if (exporting && recorderRef.current) {
      recorderRef.current.stop();
      setExporting(false);
      playingRef.current = false;
      setPlaying(false);
      return;
    }

    ensureAudioBus();
    clips.forEach((c) => {
      if (c.kind === 'video') {
        const v = videoElsRef.current.get(c.id);
        if (v) wireVideoElementAudio(c.id, v);
      }
    });

    const videoStream = canvas.captureStream(60);
    const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
    if (audioDestRef.current) {
      tracks.push(...audioDestRef.current.stream.getAudioTracks());
    }
    const combinedStream = new MediaStream(tracks);

    const mimeType = MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    recordedChunksRef.current = [];
    const rec = new MediaRecorder(combinedStream, {
      mimeType,
      videoBitsPerSecond: 6_000_000,
    });
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      setExporting(false);
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aether-edit-60fps-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      setStatusMsg('Rendered 60fps timeline sequence with audio exported.');
    };

    recorderRef.current = rec;
    playheadRef.current = 0;
    setPlayhead(0);
    setExporting(true);
    playingRef.current = true;
    setPlaying(true);
    rec.start(100);
    setStatusMsg('Rendering 60fps sequence with synchronized audio...');
  };

  return (
    <div
      className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto text-xs"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) void handleImportMedia(e.dataTransfer.files);
      }}
    >
      {/* DOM-Mounted Live Video Decoder Bay (tiny non-hidden geometry prevents browser 17fps throttling) */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 right-0 w-2 h-2 overflow-hidden opacity-[0.002] pointer-events-none"
      >
        {clips
          .filter((c) => c.kind === 'video' && c.objectUrl)
          .map((clip) => (
            <video
              key={clip.id}
              ref={(el) => {
                if (el) {
                  videoElsRef.current.set(clip.id, el);
                  wireVideoElementAudio(clip.id, el);
                } else {
                  videoElsRef.current.delete(clip.id);
                }
              }}
              src={clip.objectUrl}
              playsInline
              preload="auto"
              className="w-2 h-2 block"
            />
          ))}

        {bgAudio && (
          <audio
            ref={(el) => {
              audioElRef.current = el;
              if (el) {
                const { ctx, master } = ensureAudioBus();
                if (!audioTrackGainRef.current) {
                  const src = mediaBridge.getOrCreateMediaSource(ctx, el);
                  if (src) {
                    const g = ctx.createGain();
                    g.gain.value = 0.65;
                    src.connect(g);
                    g.connect(master);
                    audioTrackGainRef.current = g;
                  }
                }
              }
            }}
            src={bgAudio.objectUrl}
            loop
            preload="auto"
          />
        )}
      </div>

      {/* Top Toolbar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-300 shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              Non-Linear 60fps Video Editor
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {clips.length} Clips · {formatTimecode(totalDuration)} · 60fps Audio/Video + Liquid Mesh Underlay
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLiquidUnderlay((v) => !v)}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              liquidUnderlay
                ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                : 'bg-white/6 border-white/12 text-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{liquidUnderlay ? 'Liquid Mesh On' : 'Solid Matte'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const c = createTitleClip('Title Overlay Card', 'SCENE TITLE', ['#1e1b4b', '#0f766e']);
              setClips((prev) => [...prev, c]);
              setSelectedId(c.id);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <TypeIcon className="w-3.5 h-3.5" />
            <span>Title Card</span>
          </button>

          <label className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Import Media</span>
            <input
              type="file"
              accept="video/*,audio/*,image/*,.mp4,.webm,.mov,.mp3,.wav,.png,.jpg,.jpeg,.webp"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleImportMedia(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportSequence}
            className={`px-3 py-1.5 rounded-lg border font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
              exporting
                ? 'bg-rose-500/25 border-rose-400/50 text-rose-100'
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-400/45 text-emerald-100'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>{exporting ? 'Stop Render' : 'Export 60fps A/V'}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 flex items-center justify-between gap-2 text-cyan-100 shrink-0">
          <span className="truncate">{statusMsg}</span>
          <button
            type="button"
            onClick={() => setStatusMsg(null)}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Program Monitor + Clip Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0">
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="aspect-video w-full rounded-xl overflow-hidden border border-white/15 bg-black relative">
            <canvas ref={monitorRef} className="w-full h-full object-contain block" />
            <div className="absolute top-2.5 left-3 px-2 py-0.5 rounded bg-slate-950/80 border border-white/10 font-mono-tabular text-[11px] text-slate-200">
              {formatTimecode(playhead)} / {formatTimecode(totalDuration)} · 60fps
            </div>
          </div>

          <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleTogglePlay}
              className="px-3.5 py-1.5 rounded-lg bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/50 text-sky-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{playing ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
            </button>

            <input
              type="range"
              min={0}
              max={Math.max(0.5, totalDuration)}
              step={0.04}
              value={playhead}
              onChange={(e) => {
                const v = Number(e.target.value);
                playingRef.current = false;
                setPlaying(false);
                playheadRef.current = v;
                setPlayhead(v);
              }}
              className="flex-1 min-w-[120px] accent-sky-400 cursor-pointer"
            />

            <button
              type="button"
              onClick={handleSplitAtPlayhead}
              className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Split</span>
            </button>
          </div>
        </div>

        {/* Clip Inspector */}
        <div className="lg:col-span-5 aether-panel rounded-xl p-3 space-y-2.5">
          {selectedClip ? (
            <>
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
                <div className="font-semibold text-slate-100 truncate">
                  Inspector · {selectedClip.title}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveClip(-1)}
                    title="Move earlier"
                    className="p-1.5 rounded bg-white/6 hover:bg-white/12 text-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveClip(1)}
                    title="Move later"
                    className="p-1.5 rounded bg-white/6 hover:bg-white/12 text-slate-200 cursor-pointer"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const dup: TimelineClip = {
                        ...selectedClip,
                        id: `${selectedClip.id}-dup-${Date.now().toString().slice(-4)}`,
                        title: `${selectedClip.title} Copy`,
                      };
                      setClips((p) => [...p, dup]);
                      setSelectedId(dup.id);
                    }}
                    title="Duplicate clip"
                    className="p-1.5 rounded bg-white/6 hover:bg-white/12 text-slate-200 cursor-pointer"
                  >
                    <CopyPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={clips.length <= 1}
                    onClick={() => {
                      setClips((prev) => prev.filter((c) => c.id !== selectedClip.id));
                    }}
                    title="Delete clip"
                    className="p-1.5 rounded bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 disabled:opacity-40 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-[11px]">
                <label className="space-y-1">
                  <div className="flex justify-between font-mono-tabular text-slate-300">
                    <span>Trim In</span>
                    <span>{selectedClip.trimIn.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.2, selectedClip.trimOut - 0.5)}
                    step={0.1}
                    value={selectedClip.trimIn}
                    onChange={(e) => updateSelectedClip({ trimIn: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between font-mono-tabular text-slate-300">
                    <span>Trim Out</span>
                    <span>{selectedClip.trimOut.toFixed(1)}s</span>
                  </div>
                  <input
                    type="range"
                    min={selectedClip.trimIn + 0.5}
                    max={Math.max(1, selectedClip.sourceDuration)}
                    step={0.1}
                    value={selectedClip.trimOut}
                    onChange={(e) => updateSelectedClip({ trimOut: Number(e.target.value) })}
                    className="w-full accent-sky-400 cursor-pointer"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between font-mono-tabular text-slate-300">
                    <span>Opacity Over Mesh</span>
                    <span>{Math.round(selectedClip.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.02}
                    value={selectedClip.opacity}
                    onChange={(e) => updateSelectedClip({ opacity: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </label>

                <label className="space-y-1">
                  <div className="flex justify-between font-mono-tabular text-slate-300">
                    <span>Clip Volume</span>
                    <span>{Math.round(selectedClip.volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={selectedClip.volume}
                    onChange={(e) => updateSelectedClip({ volume: Number(e.target.value) })}
                    className="w-full accent-emerald-400 cursor-pointer"
                  />
                </label>

                <label className="space-y-1">
                  <span className="text-slate-300 block">Color Grade</span>
                  <select
                    value={selectedClip.colorPreset}
                    onChange={(e) => updateSelectedClip({ colorPreset: e.target.value as ColorPreset })}
                    className="w-full bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 outline-none"
                  >
                    <option value="neutral">Neutral</option>
                    <option value="cinema-teal">Cinema Teal</option>
                    <option value="noir">High-Contrast Noir</option>
                    <option value="warm-gold">Warm Gold Film</option>
                    <option value="thermal">Thermal Invert</option>
                  </select>
                </label>

                <label className="space-y-1">
                  <span className="text-slate-300 block">Transition & Speed</span>
                  <div className="flex gap-1.5">
                    <select
                      value={selectedClip.transition}
                      onChange={(e) =>
                        updateSelectedClip({ transition: e.target.value as TransitionKind })
                      }
                      className="flex-1 bg-slate-900 border border-white/15 rounded-md px-1.5 py-1 text-slate-100 outline-none"
                    >
                      <option value="cut">Hard Cut</option>
                      <option value="crossfade">Fade In</option>
                      <option value="fade-black">Dip Black</option>
                    </select>
                    <select
                      value={selectedClip.speed}
                      onChange={(e) => updateSelectedClip({ speed: Number(e.target.value) })}
                      className="w-16 bg-slate-900 border border-white/15 rounded-md px-1 py-1 text-slate-100 outline-none font-mono-tabular"
                    >
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-tabular">
                <label className="space-y-1">
                  <span className="text-slate-300 block">Bright {selectedClip.brightness}%</span>
                  <input
                    type="range"
                    min={50}
                    max={150}
                    value={selectedClip.brightness}
                    onChange={(e) => updateSelectedClip({ brightness: Number(e.target.value) })}
                    className="w-full accent-amber-400 cursor-pointer"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300 block">Contrast {selectedClip.contrast}%</span>
                  <input
                    type="range"
                    min={60}
                    max={160}
                    value={selectedClip.contrast}
                    onChange={(e) => updateSelectedClip({ contrast: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-300 block">Zoom {selectedClip.zoom.toFixed(2)}x</span>
                  <input
                    type="range"
                    min={0.6}
                    max={1.6}
                    step={0.05}
                    value={selectedClip.zoom}
                    onChange={(e) => updateSelectedClip({ zoom: Number(e.target.value) })}
                    className="w-full accent-indigo-400 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-[11px] text-slate-300">
                  <span className="inline-flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-sky-300" />
                    Title Overlay Text
                  </span>
                  <select
                    value={selectedClip.overlayPos}
                    onChange={(e) =>
                      updateSelectedClip({
                        overlayPos: e.target.value as 'top' | 'center' | 'bottom',
                      })
                    }
                    className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-[11px] text-slate-200 outline-none"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={selectedClip.overlayText}
                  onChange={(e) => updateSelectedClip({ overlayText: e.target.value })}
                  placeholder="Optional title overlay for this clip..."
                  className="w-full rounded-lg bg-[#050a14] border border-white/12 px-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-sky-400/50"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>

      {/* Multi-Clip Timeline Track + Underlay Liquid Mesh & Audio Track */}
      <div className="aether-panel rounded-xl p-3 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
          <span className="font-semibold">Timeline Sequence & Underlay Mesh</span>
          <div className="flex flex-wrap items-center gap-3">
            {liquidUnderlay && (
              <label className="inline-flex items-center gap-1.5">
                <span className="text-slate-400">Underlay Mesh</span>
                <select
                  value={liquidMode}
                  onChange={(e) => setLiquidMode(e.target.value as LiquidMeshMode)}
                  className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-cyan-200 outline-none"
                >
                  <option value="bio-caustics">Bio Caustics</option>
                  <option value="ferro-pulse">Ferro Grid</option>
                  <option value="neural-phosphor">Phosphor Wave</option>
                  <option value="mycelial-field">Mycelial Mesh</option>
                </select>
              </label>
            )}
            <span className="font-mono-tabular">Playhead {formatTimecode(playhead)}</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {timelineLayout.map((item) => {
            const isSel = item.clip.id === selectedClip?.id;
            const isPlayingHere = playhead >= item.start && playhead <= item.end;
            return (
              <button
                key={item.clip.id}
                type="button"
                onClick={() => {
                  setSelectedId(item.clip.id);
                  playheadRef.current = item.start;
                  setPlayhead(item.start);
                }}
                style={{ minWidth: `${Math.max(120, Math.round(item.duration * 36))}px` }}
                className={`p-2 rounded-lg border text-left transition-colors cursor-pointer shrink-0 ${
                  isSel
                    ? 'bg-sky-500/20 border-sky-400/60 text-slate-100'
                    : isPlayingHere
                    ? 'bg-white/10 border-white/30 text-slate-100'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10 text-slate-300'
                }`}
              >
                <div className="font-medium truncate text-[11px]">{item.clip.title}</div>
                <div className="text-[10px] font-mono-tabular text-slate-400 mt-1">
                  {item.clip.kind.toUpperCase()} · {item.duration.toFixed(1)}s · Vol {Math.round(item.clip.volume * 100)}%
                </div>
              </button>
            );
          })}
        </div>

        {bgAudio && (
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 px-2.5 py-1.5 flex items-center justify-between gap-2 text-[11px] text-emerald-100">
            <span className="inline-flex items-center gap-1.5 truncate">
              <Music2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span className="truncate">Audio Track: {bgAudio.title}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                if (audioElRef.current) audioElRef.current.pause();
                setBgAudio(null);
              }}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] cursor-pointer"
            >
              Remove Track
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
