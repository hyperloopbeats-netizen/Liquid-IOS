import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRightLeft,
  CircleDot,
  Download,
  Droplets,
  Film,
  FlipHorizontal2,
  Layers,
  Pause,
  Play,
  Repeat,
  Scissors,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  Waves,
} from 'lucide-react';
import { liquidAudioEngine } from '../kernel/liquidAudioEngine';
import { mediaBridge } from '../kernel/mediaBridge';
import { neuralBus } from '../kernel/neuralBus';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { AppId } from '../types/os';
import { drawLiquidMeshFrame, type LiquidMeshMode } from '../utils/liquidMeshRenderer';

type BlendOption = 'normal' | 'screen' | 'lighten' | 'hard-light';
type ColorGradePreset = 'neutral' | 'cinema-teal' | 'noir' | 'warm-gold' | 'vivid';

interface VideoQueueItem {
  id: string;
  title: string;
  kind: 'synthetic-channel' | 'mp4-file';
  mode?: LiquidMeshMode;
  objectUrl?: string;
  sizeLabel?: string;
}

const DEFAULT_CHANNELS: VideoQueueItem[] = [
  {
    id: 'syn-caustics',
    title: 'Mesh 01 · Bio-Membrane Caustics',
    kind: 'synthetic-channel',
    mode: 'bio-caustics',
    sizeLabel: '60fps Liquid Mesh Underlay',
  },
  {
    id: 'syn-ferro',
    title: 'Mesh 02 · Ferrofluid Optic Pulse',
    kind: 'synthetic-channel',
    mode: 'ferro-pulse',
    sizeLabel: 'Audio-Reactive Wave Grid',
  },
  {
    id: 'syn-phosphor',
    title: 'Mesh 03 · Organic Phosphor Scope',
    kind: 'synthetic-channel',
    mode: 'neural-phosphor',
    sizeLabel: 'Harmonic Signal Mesh',
  },
  {
    id: 'syn-mycelial',
    title: 'Mesh 04 · Mycelial Lattice Mesh',
    kind: 'synthetic-channel',
    mode: 'mycelial-field',
    sizeLabel: 'Living Vector Mesh',
  },
];

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00.0';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const d = Math.floor((sec % 1) * 10);
  return `${m}:${String(s).padStart(2, '0')}.${d}`;
}

interface OrganicMp4PlayerAppProps {
  onOpenApp?: (id: AppId) => void;
}

export function OrganicMp4PlayerApp({ onOpenApp }: OrganicMp4PlayerAppProps) {
  const meshCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0.5, y: 0.5, active: false });

  // Web Audio nodes for live MP4 sound + FFT pulse + audio capture into exported video
  const videoGainRef = useRef<GainNode | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const localFreqBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioWiredRef = useRef<boolean>(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [queue, setQueue] = useState<VideoQueueItem[]>(DEFAULT_CHANNELS);
  const [activeId, setActiveId] = useState<string>(DEFAULT_CHANNELS[0].id);
  const [liquidMode, setLiquidMode] = useState<LiquidMeshMode>('bio-caustics');
  const [playing, setPlaying] = useState<boolean>(true);
  const [muted, setMuted] = useState<boolean>(false);
  const [loop, setLoop] = useState<boolean>(true);
  const [volume, setVolume] = useState<number>(0.9);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoDims, setVideoDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [measuredFps, setMeasuredFps] = useState<number>(60);
  const [decodedFrames, setDecodedFrames] = useState<number>(0);

  // Liquid Mesh Underlay Controls (strictly beneath video)
  const [meshIntensity, setMeshIntensity] = useState<number>(0.72);
  const [audioReactive, setAudioReactive] = useState<boolean>(true);

  // Direct Video Editing Controls (edits the loaded video itself)
  const [trimIn, setTrimIn] = useState<number>(0);
  const [trimOut, setTrimOut] = useState<number>(0);
  const [videoOpacity, setVideoOpacity] = useState<number>(0.96);
  const [videoBlend, setVideoBlend] = useState<BlendOption>('normal');
  const [colorPreset, setColorPreset] = useState<ColorGradePreset>('neutral');
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [hueRotate, setHueRotate] = useState<number>(0);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [flipX, setFlipX] = useState<boolean>(false);
  const [overlayText, setOverlayText] = useState<string>('');
  const [overlayPos, setOverlayPos] = useState<'top' | 'center' | 'bottom'>('bottom');

  const [rightTab, setRightTab] = useState<'edit' | 'mesh' | 'queue'>('edit');
  const [splitCompare, setSplitCompare] = useState<boolean>(false);
  const [splitPct, setSplitPct] = useState<number>(50);
  const [recording, setRecording] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const activeItem = queue.find((q) => q.id === activeId) ?? queue[0];
  const isVideoFile = activeItem.kind === 'mp4-file' && Boolean(activeItem.objectUrl);

  const stateRef = useRef({
    liquidMode,
    playing,
    meshIntensity,
    audioReactive,
    isVideoFile,
    trimIn,
    trimOut,
    loop,
    videoOpacity,
    videoBlend,
    brightness,
    contrast,
    saturation,
    hueRotate,
    zoomScale,
    flipX,
    overlayText,
    overlayPos,
    recording,
    colorPreset,
  });

  useEffect(() => {
    stateRef.current = {
      liquidMode,
      playing,
      meshIntensity,
      audioReactive,
      isVideoFile,
      trimIn,
      trimOut,
      loop,
      videoOpacity,
      videoBlend,
      brightness,
      contrast,
      saturation,
      hueRotate,
      zoomScale,
      flipX,
      overlayText,
      overlayPos,
      recording,
      colorPreset,
    };
  }, [
    liquidMode,
    playing,
    meshIntensity,
    audioReactive,
    isVideoFile,
    trimIn,
    trimOut,
    loop,
    videoOpacity,
    videoBlend,
    brightness,
    contrast,
    saturation,
    hueRotate,
    zoomScale,
    flipX,
    overlayText,
    overlayPos,
    recording,
    colorPreset,
  ]);

  const computeFilterCss = useCallback((): string => {
    let presetCss = '';
    if (colorPreset === 'noir') presetCss = 'grayscale(100%) ';
    else if (colorPreset === 'warm-gold') presetCss = 'sepia(38%) ';
    else if (colorPreset === 'cinema-teal') presetCss = 'hue-rotate(12deg) saturate(112%) ';
    else if (colorPreset === 'vivid') presetCss = 'contrast(112%) saturate(135%) ';
    return `${presetCss}brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hueRotate}deg)`;
  }, [colorPreset, brightness, contrast, saturation, hueRotate]);

  // Synchronously unlock Web Audio and safely route <video> audio into shared Synesthesia + Gain + Capture graph
  const ensureVideoAudioGraph = useCallback(() => {
    liquidAudioEngine.unlockFromUserGesture();
    const { ctx, analyser: kernelAnalyser } = synesthesiaEngine.getSharedAudioNodes();
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
      try {
        const b = ctx.createBuffer(1, 1, 22050);
        const s = ctx.createBufferSource();
        s.buffer = b;
        s.connect(ctx.destination);
        s.start(0);
      } catch {
        // ignore unlock micro-buffer error
      }
    }

    const vid = videoRef.current;
    if (!vid || audioWiredRef.current) return;

    const src = mediaBridge.getOrCreateMediaSource(ctx, vid);
    if (!src) {
      // Fallback: <video> plays through native browser hardware audio unmuted
      return;
    }

    const gain = ctx.createGain();
    gain.gain.value = muted ? 0 : volume;

    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.78;
    localFreqBufRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));

    const dest = ctx.createMediaStreamDestination();

    src.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);
    gain.connect(kernelAnalyser);
    gain.connect(dest);

    videoGainRef.current = gain;
    localAnalyserRef.current = analyser;
    audioDestRef.current = dest;
    audioWiredRef.current = true;
  }, [muted, volume]);

  // Sync volume/mute/rate on both <video> and Web Audio GainNode
  useEffect(() => {
    const vid = videoRef.current;
    if (vid) {
      vid.volume = volume;
      vid.muted = audioWiredRef.current ? false : muted;
      vid.playbackRate = playbackRate;
    }
    if (videoGainRef.current) {
      const ctx = videoGainRef.current.context;
      videoGainRef.current.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.03);
    }
  }, [volume, muted, playbackRate]);

  // Keep <video> synchronized with selected MP4 source
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;

    if (activeItem.kind === 'mp4-file' && activeItem.objectUrl) {
      if (vid.src !== activeItem.objectUrl) {
        vid.src = activeItem.objectUrl;
        vid.load();
      }
      vid.playbackRate = playbackRate;
      vid.volume = volume;
      vid.muted = audioWiredRef.current ? false : muted;
    } else {
      vid.pause();
      vid.removeAttribute('src');
      vid.load();
      setCurrentTime(0);
      setDuration(0);
      setTrimIn(0);
      setTrimOut(0);
      setVideoDims({ w: 0, h: 0 });
      synesthesiaEngine.setLiquidAudioActive(false);
    }
  }, [activeItem, playbackRate, volume, muted]);

  // Real 60fps Video Frame Counter using requestVideoFrameCallback (zero artificial cap)
  useEffect(() => {
    const vid = videoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: (now: number, meta: { presentedFrames: number; mediaTime: number }) => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    }) | null;
    if (!vid || !isVideoFile) return;

    let cbId = 0;
    let rafId = 0;
    let active = true;
    let frameTimes: number[] = [];

    const onFrame = (now: number, presentedFrames?: number) => {
      if (!active) return;
      frameTimes.push(now);
      frameTimes = frameTimes.filter((t) => now - t <= 1000);
      if (frameTimes.length >= 2) {
        setMeasuredFps(Math.min(120, Math.max(1, frameTimes.length)));
      }
      if (typeof presentedFrames === 'number') {
        setDecodedFrames(presentedFrames);
      } else {
        setDecodedFrames((c) => c + 1);
      }

      // Enforce Trim Out loop/pause accurately at frame cadence
      const { trimIn: tIn, trimOut: tOut, loop: isLoop } = stateRef.current;
      if (tOut > tIn + 0.2 && vid.currentTime >= tOut) {
        if (isLoop) {
          vid.currentTime = tIn;
        } else {
          vid.pause();
          setPlaying(false);
        }
      }
    };

    if (typeof vid.requestVideoFrameCallback === 'function') {
      const pump = (now: number, meta: { presentedFrames: number; mediaTime: number }) => {
        if (!active) return;
        onFrame(now, meta.presentedFrames);
        cbId = vid.requestVideoFrameCallback!(pump);
      };
      cbId = vid.requestVideoFrameCallback(pump);
      return () => {
        active = false;
        if (cbId && vid.cancelVideoFrameCallback) vid.cancelVideoFrameCallback(cbId);
      };
    }

    const fallbackLoop = (now: number) => {
      if (!active) return;
      if (!vid.paused) onFrame(now);
      rafId = requestAnimationFrame(fallbackLoop);
    };
    rafId = requestAnimationFrame(fallbackLoop);
    return () => {
      active = false;
      cancelAnimationFrame(rafId);
    };
  }, [isVideoFile]);

  // 60fps Liquid Mesh Underlay Loop + Optional Offscreen 60fps A/V Export Compositor
  useEffect(() => {
    const canvas = meshCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let lastTs = performance.now();

    const loopTick = (now: number) => {
      rafId = requestAnimationFrame(loopTick);
      const dt = Math.min(0.05, Math.max(0.004, (now - lastTs) / 1000));
      lastTs = now;

      const parent = canvas.parentElement;
      if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
        canvas.width = Math.max(320, parent.clientWidth);
        canvas.height = Math.max(180, parent.clientHeight);
      }

      const st = stateRef.current;
      const syn = synesthesiaEngine.getState();

      // Pull live spectrum from local MP4 audio analyser, fallback to liquidAudioEngine or synesthesia
      let localSpec: Uint8Array | null = null;
      let bass = syn.bass;
      let mid = syn.mid;
      let treble = syn.treble;

      if (localAnalyserRef.current && localFreqBufRef.current && st.playing && st.isVideoFile) {
        localAnalyserRef.current.getByteFrequencyData(localFreqBufRef.current);
        localSpec = localFreqBufRef.current;
        let b = 0;
        let m = 0;
        let t = 0;
        for (let i = 0; i < 12; i++) b += localSpec[i];
        for (let i = 12; i < 42; i++) m += localSpec[i];
        for (let i = 42; i < 76; i++) t += localSpec[i];
        bass = Math.max(bass, b / (12 * 255));
        mid = Math.max(mid, m / (30 * 255));
        treble = Math.max(treble, t / (34 * 255));
      } else {
        localSpec = liquidAudioEngine.getSpectrum();
      }

      if (!st.audioReactive) {
        bass = 0.14;
        mid = 0.12;
        treble = 0.1;
      }

      if (st.playing) {
        phase += dt * (1.45 + mid * 2.4);
      }

      // Draw 60fps Liquid Mesh strictly underneath video
      drawLiquidMeshFrame(ctx, canvas.width, canvas.height, {
        mode: st.liquidMode,
        phase,
        bass,
        mid,
        treble,
        hue: syn.activeHue,
        intensity: st.meshIntensity,
        pointerX: pointerRef.current.x,
        pointerY: pointerRef.current.y,
        pointerActive: pointerRef.current.active,
        spectrum: localSpec,
      });

      // If recording 60fps export, composite Underlay Mesh -> Real Video Frame (filtered/scaled/blended) -> Title Overlay
      if (st.recording && exportCanvasRef.current) {
        const exp = exportCanvasRef.current;
        const ectx = exp.getContext('2d');
        const vid = videoRef.current;
        if (ectx) {
          const ew = exp.width;
          const eh = exp.height;
          ectx.clearRect(0, 0, ew, eh);
          ectx.drawImage(canvas, 0, 0, ew, eh);

          if (st.isVideoFile && vid && vid.readyState >= 2) {
            ectx.save();
            ectx.globalAlpha = st.videoOpacity;
            ectx.globalCompositeOperation =
              st.videoBlend === 'normal' ? 'source-over' : st.videoBlend;
            let pFilt = '';
            if (st.colorPreset === 'noir') pFilt = 'grayscale(100%) ';
            else if (st.colorPreset === 'warm-gold') pFilt = 'sepia(38%) ';
            else if (st.colorPreset === 'cinema-teal') pFilt = 'hue-rotate(12deg) saturate(112%) ';
            else if (st.colorPreset === 'vivid') pFilt = 'contrast(112%) saturate(135%) ';
            ectx.filter = `${pFilt}brightness(${st.brightness}%) contrast(${st.contrast}%) saturate(${st.saturation}%) hue-rotate(${st.hueRotate}deg)`;

            const vw = vid.videoWidth || ew;
            const vh = vid.videoHeight || eh;
            const fit = Math.min(ew / vw, eh / vh) * st.zoomScale;
            const dw = vw * fit;
            const dh = vh * fit;
            ectx.translate(ew * 0.5, eh * 0.5);
            if (st.flipX) ectx.scale(-1, 1);
            ectx.drawImage(vid, -dw * 0.5, -dh * 0.5, dw, dh);
            ectx.restore();
          }

          if (st.overlayText.trim()) {
            ectx.save();
            ectx.font = '600 28px "Outfit", "Plus Jakarta Sans", sans-serif';
            ectx.textAlign = 'center';
            ectx.textBaseline = 'middle';
            const oy =
              st.overlayPos === 'top' ? 54 : st.overlayPos === 'bottom' ? eh - 54 : eh * 0.5;
            const metrics = ectx.measureText(st.overlayText);
            const bw = Math.min(ew - 40, metrics.width + 40);
            ectx.fillStyle = 'rgba(2, 6, 23, 0.72)';
            ectx.fillRect((ew - bw) * 0.5, oy - 24, bw, 48);
            ectx.fillStyle = '#f8fafc';
            ectx.fillText(st.overlayText, ew * 0.5, oy, ew - 64);
            ectx.restore();
          }
        }
      }
    };

    rafId = requestAnimationFrame(loopTick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const handleTogglePlay = async () => {
    ensureVideoAudioGraph();
    const vid = videoRef.current;

    if (isVideoFile && vid) {
      if (vid.paused) {
        try {
          if (trimOut > trimIn && (vid.currentTime < trimIn || vid.currentTime >= trimOut)) {
            vid.currentTime = trimIn;
          }
          vid.muted = audioWiredRef.current ? false : muted;
          vid.volume = volume;
          vid.playbackRate = playbackRate;
          await vid.play();
          setPlaying(true);
          setStatusMessage(null);
          synesthesiaEngine.setLiquidAudioActive(true);
          neuralBus.publish('AUDIO', 'MP4_PLAY', `Playing 60fps MP4 "${activeItem.title}" with audio.`);
        } catch (err) {
          setPlaying(false);
          setStatusMessage(
            err instanceof DOMException && err.name === 'NotAllowedError'
              ? 'Tap Play again to unlock browser video audio.'
              : err instanceof Error
              ? err.message
              : 'Unable to start video playback.'
          );
        }
      } else {
        vid.pause();
        setPlaying(false);
        synesthesiaEngine.setLiquidAudioActive(false);
      }
    } else {
      setPlaying((v) => !v);
    }
  };

  const handleUploadVideos = async (fileList: FileList | File[]) => {
    ensureVideoAudioGraph();
    const files = Array.from(fileList);
    const added: VideoQueueItem[] = [];

    for (const f of files) {
      const isVid =
        f.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv)$/i.test(f.name);
      if (!isVid) {
        setStatusMessage(`Unsupported file "${f.name}". Select .mp4, .webm, or .mov video files.`);
        continue;
      }
      const url = URL.createObjectURL(f);
      added.push({
        id: `mp4-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: f.name.replace(/\.[^/.]+$/, ''),
        kind: 'mp4-file',
        objectUrl: url,
        sizeLabel: `${(f.size / (1024 * 1024)).toFixed(1)} MB Video`,
      });
    }

    if (added.length > 0) {
      setQueue((prev) => [...added, ...prev]);
      setActiveId(added[0].id);
      setDecodedFrames(0);
      setMeasuredFps(60);
      setPlaying(false);
      setRightTab('edit');
      setStatusMessage(`Loaded "${added[0].title}" — tap Play for 60fps playback with sound.`);
      neuralBus.publish('AUDIO', 'MP4_LOADED', `Loaded "${added[0].title}" into 60fps MP4 Player.`);
    }
  };

  const handleToggleExport60fps = () => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }

    if (typeof MediaRecorder === 'undefined') {
      setStatusMessage('Video recording requires a browser with MediaRecorder support.');
      return;
    }

    try {
      ensureVideoAudioGraph();
      const mesh = meshCanvasRef.current;
      const vid = videoRef.current;
      if (!mesh) return;

      const exp = exportCanvasRef.current || document.createElement('canvas');
      exportCanvasRef.current = exp;
      const targetW =
        isVideoFile && vid && vid.videoWidth > 0 ? Math.min(1280, vid.videoWidth) : Math.max(720, mesh.width);
      const targetH =
        isVideoFile && vid && vid.videoHeight > 0
          ? Math.round((targetW * vid.videoHeight) / Math.max(1, vid.videoWidth))
          : Math.max(405, mesh.height);
      exp.width = targetW;
      exp.height = targetH;

      const videoStream = exp.captureStream(60);
      const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];

      // Attach synchronized audio track from Web Audio destination or video captureStream
      if (audioDestRef.current) {
        tracks.push(...audioDestRef.current.stream.getAudioTracks());
      } else if (vid && typeof (vid as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream === 'function') {
        const vs = (vid as HTMLVideoElement & { captureStream: () => MediaStream }).captureStream();
        tracks.push(...vs.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);
      const mimeType = MediaRecorder.isTypeSupported('video/mp4')
        ? 'video/mp4'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
        ? 'video/webm;codecs=vp8,opus'
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
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const item: VideoQueueItem = {
          id: `cap60-${Date.now()}`,
          title: `${activeItem.title} · 60fps Edit`,
          kind: 'mp4-file',
          objectUrl: url,
          sizeLabel: `${(blob.size / (1024 * 1024)).toFixed(2)} MB · 60fps A/V`,
        };
        setQueue((prev) => [item, ...prev]);
        setActiveId(item.id);
        setPlaying(false);
        setStatusMessage('60fps edited video with audio captured — added to queue & ready to download or edit.');

        const a = document.createElement('a');
        a.href = url;
        a.download = `aether-60fps-edit-${Date.now()}.${mimeType.includes('mp4') ? 'mp4' : 'webm'}`;
        a.click();
      };

      recorderRef.current = rec;
      rec.start(100);
      setRecording(true);
      setStatusMessage('Capturing live 60fps composited video + audio...');
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Unable to start 60fps A/V capture.');
    }
  };

  const handleSendToEditor = () => {
    if (!isVideoFile || !activeItem.objectUrl) return;
    mediaBridge.sendVideoToEditor({
      id: activeItem.id,
      title: activeItem.title,
      objectUrl: activeItem.objectUrl,
      duration: Math.max(1, duration || 8),
      trimIn,
      trimOut: trimOut > trimIn ? trimOut : Math.max(1, duration || 8),
      speed: playbackRate,
      brightness,
      contrast,
      saturation,
      opacity: videoOpacity,
      overlayText,
      overlayPos,
      liquidUnderlay: true,
      liquidMode,
    });
    if (onOpenApp) onOpenApp('videoeditor');
  };

  const handleSendToLiquidVideo = () => {
    if (!isVideoFile || !activeItem.objectUrl) return;
    mediaBridge.sendVideoToLiquidVideo({
      id: activeItem.id,
      title: activeItem.title,
      objectUrl: activeItem.objectUrl,
      duration: Math.max(1, duration || 8),
      trimIn,
      trimOut: trimOut > trimIn ? trimOut : Math.max(1, duration || 8),
      speed: playbackRate,
      brightness,
      contrast,
      saturation,
      opacity: videoOpacity,
      overlayText,
      overlayPos,
      liquidUnderlay: true,
      liquidMode,
    });
    if (onOpenApp) onOpenApp('liquidvideo');
  };

  const applyColorPreset = (preset: ColorGradePreset) => {
    setColorPreset(preset);
    if (preset === 'neutral') {
      setBrightness(100);
      setContrast(100);
      setSaturation(100);
      setHueRotate(0);
    } else if (preset === 'vivid') {
      setBrightness(104);
      setContrast(112);
      setSaturation(132);
      setHueRotate(0);
    } else if (preset === 'noir') {
      setBrightness(102);
      setContrast(122);
      setSaturation(0);
      setHueRotate(0);
    }
  };

  return (
    <div
      className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden text-xs"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (e.dataTransfer.files.length > 0) {
          void handleUploadVideos(e.dataTransfer.files);
        }
      }}
    >
      {/* Top Bar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/35 flex items-center justify-center text-emerald-300 shrink-0">
            <Film className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              {activeItem.title}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate font-mono-tabular">
              60fps Video Stage · Liquid Mesh Underlay ·{' '}
              {isVideoFile
                ? `${videoDims.w || '--'}×${videoDims.h || '--'} · ${measuredFps} fps · Frame ${decodedFrames}`
                : 'Procedural Mesh Active'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {isVideoFile && (
            <>
              <button
                type="button"
                onClick={handleSendToLiquidVideo}
                className="px-2.5 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/45 text-fuchsia-100 font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Droplets className="w-3.5 h-3.5" />
                <span>Liquid Video</span>
              </button>
              <button
                type="button"
                onClick={handleSendToEditor}
                className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setSplitCompare((v) => !v)}
                className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                  splitCompare
                    ? 'bg-amber-500/25 border-amber-400/50 text-amber-100'
                    : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-200'
                }`}
              >
                <span>{splitCompare ? 'Split On' : 'Split A/B'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleToggleExport60fps}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              recording
                ? 'bg-rose-500/25 border-rose-400/50 text-rose-100'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-200'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>{recording ? 'Stop Export' : 'Export 60fps A/V'}</span>
          </button>

          <label className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Load MP4</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*,.mp4,.webm,.mov,.m4v"
              multiple
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  void handleUploadVideos(e.target.files);
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {statusMessage && (
        <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2 flex items-center justify-between gap-2 text-cyan-100 shrink-0">
          <span className="truncate">{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Responsive Split */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3">
        {/* Left: Layered Stage (Liquid Mesh z-0 UNDERNEATH Hardware 60fps Video z-10) + Transport */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 lg:min-h-0">
          <div
            className="h-[240px] sm:h-[300px] lg:h-auto lg:flex-1 lg:min-h-[240px] rounded-xl overflow-hidden border border-white/15 bg-[#030712] relative shrink-0 lg:shrink"
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
          >
            {/* LAYER 0 (UNDERNEATH): 60fps Audio-Reactive Liquid Mesh */}
            <canvas ref={meshCanvasRef} className="absolute inset-0 w-full h-full block z-0" />

            {/* LAYER 1 (ON TOP): Full Hardware-Decoded 60fps Video with Live Edits (NEVER display:none) */}
            <video
              ref={videoRef}
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                const d = Number.isFinite(vid.duration) ? vid.duration : 0;
                setDuration(d);
                setTrimIn(0);
                setTrimOut(d);
                setVideoDims({ w: vid.videoWidth, h: vid.videoHeight });
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                setCurrentTime(e.currentTarget.currentTime);
              }}
              onEnded={() => {
                if (loop && videoRef.current) {
                  videoRef.current.currentTime = trimIn;
                  void videoRef.current.play().catch(() => {});
                } else {
                  setPlaying(false);
                }
              }}
              onError={() => {
                setPlaying(false);
                setStatusMessage('Unable to decode this video codec cleanly inside the browser.');
              }}
              style={{
                opacity: isVideoFile ? videoOpacity : 0,
                mixBlendMode: videoBlend,
                filter: computeFilterCss(),
                transform: `scale(${zoomScale}) scaleX(${flipX ? -1 : 1})`,
              }}
              className={`absolute inset-0 w-full h-full object-contain z-10 transition-opacity duration-150 ${
                isVideoFile ? 'pointer-events-auto cursor-pointer' : 'pointer-events-none'
              }`}
              onClick={() => {
                if (isVideoFile) void handleTogglePlay();
              }}
            />

            {/* LAYER 2: Inline Title Overlay */}
            {overlayText.trim() && (
              <div
                className={`absolute inset-x-4 z-20 flex justify-center pointer-events-none ${
                  overlayPos === 'top'
                    ? 'top-8'
                    : overlayPos === 'bottom'
                    ? 'bottom-5'
                    : 'top-1/2 -translate-y-1/2'
                }`}
              >
                <div className="px-4 py-1.5 rounded-lg bg-slate-950/75 border border-white/15 font-display text-sm sm:text-base font-semibold text-white shadow-lg">
                  {overlayText}
                </div>
              </div>
            )}

            {/* Split Before/After Wipe Indicator */}
            {isVideoFile && splitCompare && (
              <>
                <div
                  style={{ left: `${splitPct}%` }}
                  className="absolute inset-y-0 w-0.5 bg-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.9)] z-20 pointer-events-none"
                />
                <div
                  style={{ width: `${splitPct}%` }}
                  className="absolute inset-y-0 left-0 bg-slate-950/15 backdrop-brightness-95 backdrop-contrast-95 backdrop-saturate-50 border-r border-amber-300/60 z-[15] pointer-events-none"
                >
                  <span className="absolute bottom-2.5 left-3 px-2 py-0.5 rounded bg-slate-950/80 border border-white/15 text-[10px] font-mono text-slate-200">
                    Bypass Reference
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={splitPct}
                  onChange={(e) => setSplitPct(Number(e.target.value))}
                  aria-label="Grade comparison wipe"
                  className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-40 z-30 accent-amber-400 cursor-ew-resize"
                />
              </>
            )}

            {/* Corner Layer Telemetry */}
            <div className="absolute top-2.5 left-3 z-20 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-white/10 text-[10px] font-mono-tabular text-slate-200 pointer-events-none">
              {isVideoFile
                ? `60Hz Compositor · Source ${measuredFps}fps · Video ${Math.round(videoOpacity * 100)}% over Mesh`
                : `Liquid Mesh Layer · ${liquidMode}`}
            </div>
          </div>

          {/* Transport Bar */}
          <div className="aether-panel rounded-xl p-3 space-y-2.5 shrink-0">
            {isVideoFile && (
              <div className="flex items-center gap-2.5 font-mono-tabular text-[11px] text-slate-300">
                <span className="w-12">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.5, duration)}
                  step={0.03}
                  value={currentTime}
                  onChange={(e) => {
                    const sec = Number(e.target.value);
                    setCurrentTime(sec);
                    if (videoRef.current) videoRef.current.currentTime = sec;
                  }}
                  className="flex-1 accent-emerald-400 cursor-pointer"
                />
                <span className="w-12 text-right">{formatTime(duration)}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleTogglePlay()}
                  className="px-4 py-2 rounded-lg bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/50 text-emerald-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{playing ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="p-2 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
                  title={muted ? 'Unmute Sound' : 'Mute Sound'}
                >
                  {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-emerald-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLoop((l) => !l)}
                  className={`px-2.5 py-2 rounded-lg border inline-flex items-center gap-1 cursor-pointer ${
                    loop
                      ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                      : 'bg-white/6 border-white/10 text-slate-400'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Loop</span>
                </button>

                {isVideoFile && (
                  <>
                    <button
                      type="button"
                      onClick={() => setTrimIn(Number(Math.min(currentTime, Math.max(0, trimOut - 0.3)).toFixed(2)))}
                      className="px-2 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>In</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTrimOut(Number(Math.max(currentTime, trimIn + 0.3).toFixed(2)))}
                      className="px-2 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/10 text-[11px] text-slate-200 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    >
                      <Scissors className="w-3 h-3" />
                      <span>Out</span>
                    </button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-tabular text-slate-300">
                <label className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400">Speed</span>
                  <select
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(Number(e.target.value))}
                    className="bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 outline-none"
                  >
                    <option value={0.5}>0.5x</option>
                    <option value={0.75}>0.75x</option>
                    <option value={1}>1.0x</option>
                    <option value={1.25}>1.25x</option>
                    <option value={1.5}>1.5x</option>
                    <option value={2}>2.0x</option>
                  </select>
                </label>

                <label className="inline-flex items-center gap-1.5">
                  <span className="text-slate-400">Vol</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.02}
                    value={volume}
                    onChange={(e) => {
                      setVolume(Number(e.target.value));
                      if (muted) setMuted(false);
                    }}
                    className="w-20 accent-emerald-400 cursor-pointer"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Direct Video Editing + Liquid Mesh Underlay Controls + Media Queue */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-3 lg:min-h-0">
          {/* Tab Switcher */}
          <div className="aether-panel rounded-xl p-1.5 grid grid-cols-3 gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setRightTab('edit')}
              className={`px-2 py-1.5 rounded-lg font-medium inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                rightTab === 'edit'
                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-100'
                  : 'text-slate-300 hover:bg-white/6'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Edit Video</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('mesh')}
              className={`px-2 py-1.5 rounded-lg font-medium inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                rightTab === 'mesh'
                  ? 'bg-cyan-500/20 border border-cyan-400/50 text-cyan-100'
                  : 'text-slate-300 hover:bg-white/6'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Liquid Mesh</span>
            </button>
            <button
              type="button"
              onClick={() => setRightTab('queue')}
              className={`px-2 py-1.5 rounded-lg font-medium inline-flex items-center justify-center gap-1 cursor-pointer transition-colors ${
                rightTab === 'queue'
                  ? 'bg-indigo-500/20 border border-indigo-400/50 text-indigo-100'
                  : 'text-slate-300 hover:bg-white/6'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
              <span>Queue ({queue.length})</span>
            </button>
          </div>

          {rightTab === 'edit' && (
            <div className="aether-panel rounded-xl p-3 space-y-3 lg:flex-1 lg:overflow-y-auto">
              {/* Trim Range */}
              <div className="space-y-2 pb-2.5 border-b border-white/10">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-200">
                  <span>Trim Range & Loop Window</span>
                  <span className="font-mono-tabular text-emerald-300">
                    {formatTime(trimIn)} → {formatTime(trimOut || duration)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[11px] font-mono-tabular">
                  <label className="space-y-1">
                    <span className="text-slate-400 block">In ({trimIn.toFixed(1)}s)</span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0.2, (trimOut || duration) - 0.3)}
                      step={0.1}
                      disabled={!isVideoFile}
                      value={trimIn}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        setTrimIn(v);
                        if (videoRef.current) videoRef.current.currentTime = v;
                      }}
                      className="w-full accent-emerald-400 cursor-pointer disabled:opacity-40"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-400 block">Out ({(trimOut || duration).toFixed(1)}s)</span>
                    <input
                      type="range"
                      min={trimIn + 0.3}
                      max={Math.max(0.5, duration)}
                      step={0.1}
                      disabled={!isVideoFile}
                      value={trimOut || duration}
                      onChange={(e) => setTrimOut(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer disabled:opacity-40"
                    />
                  </label>
                </div>
              </div>

              {/* Layer Composite Over Liquid Mesh Underneath */}
              <div className="space-y-2 pb-2.5 border-b border-white/10 text-[11px]">
                <div className="font-semibold text-slate-200">Composite Video Over Liquid Mesh</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1 font-mono-tabular">
                    <span className="text-slate-400 block">
                      Video Opacity ({Math.round(videoOpacity * 100)}%)
                    </span>
                    <input
                      type="range"
                      min={0.15}
                      max={1}
                      step={0.02}
                      value={videoOpacity}
                      onChange={(e) => setVideoOpacity(Number(e.target.value))}
                      className="w-full accent-cyan-400 cursor-pointer"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-slate-400 block">Layer Blend</span>
                    <select
                      value={videoBlend}
                      onChange={(e) => setVideoBlend(e.target.value as BlendOption)}
                      className="w-full bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 outline-none"
                    >
                      <option value="normal">Normal (Solid Video)</option>
                      <option value="screen">Screen Over Mesh</option>
                      <option value="lighten">Lighten Composite</option>
                      <option value="hard-light">Hard Light Mesh</option>
                    </select>
                  </label>
                </div>
              </div>

              {/* Direct Color Grading & Framing */}
              <div className="space-y-2 pb-2.5 border-b border-white/10 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Color Grade & Framing</span>
                  <button
                    type="button"
                    onClick={() => setFlipX((f) => !f)}
                    className={`px-2 py-0.5 rounded border inline-flex items-center gap-1 cursor-pointer ${
                      flipX
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                        : 'bg-white/6 border-white/10 text-slate-300'
                    }`}
                  >
                    <FlipHorizontal2 className="w-3 h-3" />
                    <span>Mirror</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ['neutral', 'Natural'],
                      ['vivid', 'Vivid'],
                      ['cinema-teal', 'Cinema'],
                      ['noir', 'Noir'],
                      ['warm-gold', 'Warm Gold'],
                    ] as const
                  ).map(([preset, label]) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyColorPreset(preset)}
                      className={`px-2 py-1 rounded border text-[10px] font-medium cursor-pointer ${
                        colorPreset === preset
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                          : 'bg-white/[0.04] border-white/10 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono-tabular">
                  <label className="space-y-0.5">
                    <span className="text-slate-400">Bright {brightness}%</span>
                    <input
                      type="range"
                      min={50}
                      max={160}
                      value={brightness}
                      onChange={(e) => setBrightness(Number(e.target.value))}
                      className="w-full accent-amber-400 cursor-pointer"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-400">Contrast {contrast}%</span>
                    <input
                      type="range"
                      min={50}
                      max={170}
                      value={contrast}
                      onChange={(e) => setContrast(Number(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-400">Saturation {saturation}%</span>
                    <input
                      type="range"
                      min={0}
                      max={190}
                      value={saturation}
                      onChange={(e) => setSaturation(Number(e.target.value))}
                      className="w-full accent-emerald-400 cursor-pointer"
                    />
                  </label>
                  <label className="space-y-0.5">
                    <span className="text-slate-400">Zoom {zoomScale.toFixed(2)}x</span>
                    <input
                      type="range"
                      min={0.6}
                      max={1.6}
                      step={0.05}
                      value={zoomScale}
                      onChange={(e) => setZoomScale(Number(e.target.value))}
                      className="w-full accent-indigo-400 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Title Overlay */}
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Video Title Overlay</span>
                  <select
                    value={overlayPos}
                    onChange={(e) => setOverlayPos(e.target.value as 'top' | 'center' | 'bottom')}
                    className="bg-slate-900 border border-white/15 rounded px-1.5 py-0.5 text-slate-200 outline-none"
                  >
                    <option value="top">Top</option>
                    <option value="center">Center</option>
                    <option value="bottom">Bottom</option>
                  </select>
                </div>
                <input
                  type="text"
                  value={overlayText}
                  onChange={(e) => setOverlayText(e.target.value)}
                  placeholder="Optional title burned over video..."
                  className="w-full rounded-lg bg-[#050a14] border border-white/12 px-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400/50"
                />
              </div>
            </div>
          )}

          {rightTab === 'mesh' && (
            <div className="aether-panel rounded-xl p-3 space-y-3 lg:flex-1 lg:overflow-y-auto">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Liquid Mesh Underlay</span>
                </span>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={audioReactive}
                    onChange={(e) => setAudioReactive(e.target.checked)}
                    className="accent-cyan-400"
                  />
                  <Waves className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Audio Sync</span>
                </label>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                This 60fps Liquid Mesh renders strictly underneath the loaded video layer. Lower Video Opacity or switch Layer Blend in Edit Video to composite the video over the mesh.
              </p>

              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    ['bio-caustics', 'Bio Caustics'],
                    ['ferro-pulse', 'Ferro Grid'],
                    ['neural-phosphor', 'Phosphor Wave'],
                    ['mycelial-field', 'Mycelial Mesh'],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setLiquidMode(m)}
                    className={`px-2 py-1.5 rounded-lg border text-[11px] font-medium cursor-pointer transition-colors ${
                      liquidMode === m
                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                        : 'bg-white/[0.03] hover:bg-white/10 border-white/10 text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <label className="block space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300 font-mono-tabular">
                  <span>Mesh Reactivity & Luminance</span>
                  <span>{Math.round(meshIntensity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.1}
                  max={1.4}
                  step={0.05}
                  value={meshIntensity}
                  onChange={(e) => setMeshIntensity(Number(e.target.value))}
                  className="w-full accent-cyan-400 cursor-pointer"
                />
              </label>
            </div>
          )}

          {rightTab === 'queue' && (
            <div className="aether-panel rounded-xl p-3 min-h-[180px] lg:flex-1 lg:min-h-0 flex flex-col">
              <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
                Loaded Videos & Underlay Meshes ({queue.length})
              </div>
              <div className="flex-1 overflow-y-auto pt-2 space-y-1.5">
                {queue.map((item) => {
                  const active = item.id === activeItem.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveId(item.id);
                        setDecodedFrames(0);
                        if (item.mode) {
                          setLiquidMode(item.mode);
                          setPlaying(true);
                        } else {
                          setPlaying(false);
                        }
                        setStatusMessage(null);
                      }}
                      className={`w-full text-left p-2 rounded-lg border transition-colors cursor-pointer ${
                        active
                          ? 'bg-emerald-500/15 border-emerald-400/50 text-slate-100'
                          : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/8 text-slate-300'
                      }`}
                    >
                      <div className="font-medium truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono-tabular mt-0.5">
                        {item.sizeLabel}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
