import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Circle,
  Download,
  Droplets,
  Globe,
  Monitor,
  Pause,
  Play,
  Plus,
  Radio,
  Trash2,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { AppId, NeuralBusEvent } from '../types/os';

interface StreamBookmark {
  id: string;
  title: string;
  kind: 'synth-av' | 'url' | 'capture';
  url?: string;
  presetKey?: 'orbital' | 'caustic' | 'spectrum' | 'telemetry';
  subtitle: string;
}

const DEFAULT_STREAMS: StreamBookmark[] = [
  {
    id: 'ch-orbital',
    title: 'Orbital Synth AV · 60fps',
    kind: 'synth-av',
    presetKey: 'orbital',
    subtitle: 'Generative WebAudio + 60fps Harmonic Plasma',
  },
  {
    id: 'ch-caustic',
    title: 'Caustic Cyber Radio',
    kind: 'synth-av',
    presetKey: 'caustic',
    subtitle: 'Binaural Sub-Bass + Interference Waves',
  },
  {
    id: 'ch-telemetry',
    title: 'Aether Telemetry Live TV',
    kind: 'synth-av',
    presetKey: 'telemetry',
    subtitle: 'Live OS Neural Bus + FFT Oscilloscope Feed',
  },
  {
    id: 'ch-mdn-flower',
    title: 'Sample MP4 · Flower Stream',
    kind: 'url',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    subtitle: 'CC0 MP4 Network Stream',
  },
];

interface UniversalStreamAppProps {
  onOpenApp?: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function UniversalStreamApp({ onOpenApp, onShowToast }: UniversalStreamAppProps) {
  const [bookmarks, setBookmarks] = useState<StreamBookmark[]>(() => {
    try {
      const saved = localStorage.getItem('AetherOS_StreamBookmarks_v1');
      if (saved) {
        const parsed = JSON.parse(saved) as StreamBookmark[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    return DEFAULT_STREAMS;
  });

  const [activeId, setActiveId] = useState<string>(bookmarks[0]?.id ?? 'ch-orbital');
  const [urlInput, setUrlInput] = useState('');
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [captureActive, setCaptureActive] = useState<'none' | 'screen' | 'camera'>('none');
  const [recordingUrl, setRecordingUrl] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [busEvents, setBusEvents] = useState<NeuralBusEvent[]>(neuralBus.getEvents().slice(0, 5));

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const synthCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const activeStream = bookmarks.find((b) => b.id === activeId) ?? bookmarks[0];

  useEffect(() => {
    try {
      localStorage.setItem('AetherOS_StreamBookmarks_v1', JSON.stringify(bookmarks));
    } catch {
      // ignore
    }
  }, [bookmarks]);

  useEffect(() => {
    return neuralBus.subscribe((events) => {
      setBusEvents(events.slice(0, 5));
    });
  }, []);

  // Cleanup capture/audio on unmount
  useEffect(() => {
    return () => {
      captureStreamRef.current?.getTracks().forEach((t) => t.stop());
      try {
        oscRef.current?.stop();
        void audioCtxRef.current?.close();
      } catch {
        // ignore
      }
    };
  }, []);

  // Generative 60fps Synth AV channel + optional live audio pulse
  useEffect(() => {
    if (activeStream?.kind !== 'synth-av') return;
    const canvas = synthCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let phase = 0;
    const preset = activeStream.presetKey || 'orbital';

    const resize = () => {
      canvas.width = Math.max(320, canvas.clientWidth);
      canvas.height = Math.max(180, canvas.clientHeight);
    };
    resize();

    const draw = () => {
      const syn = synesthesiaEngine.getState();
      const w = canvas.width;
      const h = canvas.height;
      ctx.fillStyle = 'rgba(3, 7, 17, 0.22)';
      ctx.fillRect(0, 0, w, h);

      if (playing) phase += 0.038 * playbackRate;

      const hueBase = preset === 'caustic' ? 290 : preset === 'telemetry' ? 160 : 195;
      const lines = preset === 'caustic' ? 6 : 4;

      for (let i = 0; i < lines; i++) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${(hueBase + i * 30 + syn.bass * 60) % 360}, 88%, 62%, 0.78)`;
        ctx.lineWidth = 1.8;
        for (let x = 0; x <= w; x += 6) {
          const norm = x / w;
          const amp = (22 + syn.rms * 65 + i * 7) * (playing ? 1 : 0.25);
          const y =
            h * 0.5 +
            Math.sin(norm * (6 + i * 2) + phase * (1 + i * 0.2)) *
              amp *
              Math.cos(norm * 3 - phase * 0.5);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Corner broadcast badge
      ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
      ctx.fillRect(10, 10, 210, 24);
      ctx.fillStyle = '#67e8f9';
      ctx.font = '11px ui-monospace, monospace';
      ctx.fillText(`LIVE · ${activeStream.title}`, 18, 26);

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => cancelAnimationFrame(raf);
  }, [activeStream, playing, playbackRate]);

  // Ambient WebAudio Carrier for Synth-AV streams (muted-safe)
  const toggleSynthAudio = async (enable: boolean) => {
    try {
      if (!enable || muted) {
        if (gainRef.current && audioCtxRef.current) {
          gainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.04);
        }
        return;
      }
      if (!audioCtxRef.current) {
        const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const ctx = new Ctx();
        const osc = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = activeStream?.presetKey === 'caustic' ? 110 : 146.83;
        sub.type = 'sine';
        sub.frequency.value = 55;
        filter.type = 'lowpass';
        filter.frequency.value = 420;
        gain.gain.value = volume * 0.06;

        osc.connect(filter);
        sub.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        sub.start();
        audioCtxRef.current = ctx;
        oscRef.current = osc;
        gainRef.current = gain;
      }
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      if (gainRef.current && audioCtxRef.current) {
        gainRef.current.gain.setTargetAtTime(volume * 0.06, audioCtxRef.current.currentTime, 0.05);
      }
    } catch {
      // ignore autoplay blocks cleanly
    }
  };

  useEffect(() => {
    if (activeStream?.kind === 'synth-av') {
      void toggleSynthAudio(playing && !muted);
    } else {
      void toggleSynthAudio(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStream?.id, activeStream?.kind, playing, muted, volume]);

  // Video element volume & rate sync
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    v.volume = volume;
    v.playbackRate = playbackRate;
  }, [muted, volume, playbackRate, activeId]);

  const stopLiveCapture = () => {
    captureStreamRef.current?.getTracks().forEach((t) => t.stop());
    captureStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCaptureActive('none');
  };

  const handleStartCapture = async (mode: 'screen' | 'camera') => {
    setStreamError(null);
    stopLiveCapture();
    try {
      const stream =
        mode === 'screen'
          ? await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
          : await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

      captureStreamRef.current = stream;
      setCaptureActive(mode);
      const captureEntry: StreamBookmark = {
        id: `capture-${mode}`,
        title: mode === 'screen' ? 'Live Screen Stream' : 'Live Camera Feed',
        kind: 'capture',
        subtitle: 'WebRTC MediaStream Live Pass-Through',
      };
      setBookmarks((prev) => [captureEntry, ...prev.filter((b) => b.id !== captureEntry.id)]);
      setActiveId(captureEntry.id);
      setPlaying(true);

      window.setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      }, 60);

      neuralBus.publish('AUDIO', 'STREAM_CAPTURE', `Universal Stream capturing live ${mode} feed.`);
    } catch (err) {
      setStreamError(err instanceof Error ? err.message : `Could not start ${mode} capture.`);
    }
  };

  const handleAddCustomUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = urlInput.trim();
    if (!raw) return;
    setStreamError(null);
    stopLiveCapture();

    const cleanName = raw.split('/').pop()?.split('?')[0] || 'Custom Network Stream';
    const item: StreamBookmark = {
      id: `url-${Date.now()}`,
      title: cleanName.slice(0, 32),
      kind: 'url',
      url: raw,
      subtitle: raw,
    };
    setBookmarks((prev) => [item, ...prev]);
    setActiveId(item.id);
    setUrlInput('');
    setPlaying(true);
    neuralBus.publish('AUDIO', 'STREAM_URL_ADDED', `Universal Stream tuned to "${item.title}".`);
  };

  const handleLocalFileUpload = (fileList: FileList | null) => {
    const file = fileList?.[0];
    if (!file) return;
    stopLiveCapture();
    const url = URL.createObjectURL(file);
    const item: StreamBookmark = {
      id: `local-${Date.now()}`,
      title: file.name,
      kind: 'url',
      url,
      subtitle: `Local Stream · ${(file.size / (1024 * 1024)).toFixed(2)} MB`,
    };
    setBookmarks((prev) => [item, ...prev]);
    setActiveId(item.id);
    setPlaying(true);
  };

  const togglePlay = async () => {
    const next = !playing;
    setPlaying(next);
    if (videoRef.current) {
      try {
        if (next) await videoRef.current.play();
        else videoRef.current.pause();
      } catch (err) {
        setStreamError(err instanceof Error ? err.message : 'Playback blocked — click video to resume.');
      }
    }
  };

  const toggleRecordStream = () => {
    if (isRecording && recorderRef.current) {
      recorderRef.current.stop();
      setIsRecording(false);
      return;
    }

    const canvas = synthCanvasRef.current;
    if (!canvas || activeStream?.kind !== 'synth-av') {
      onShowToast?.('Switch to a Synth AV channel or Screen Capture to record WebM clips.');
      return;
    }
    try {
      const stream = canvas.captureStream(60);
      const rec = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        if (recordingUrl) URL.revokeObjectURL(recordingUrl);
        setRecordingUrl(URL.createObjectURL(blob));
        onShowToast?.('Stream WebM clip captured & ready to download.');
      };
      recorderRef.current = rec;
      rec.start();
      setIsRecording(true);
    } catch {
      onShowToast?.('MediaRecorder WebM capture unavailable in this browser.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/80 text-xs overflow-hidden">
      {/* Universal Stream Input Bar */}
      <div className="p-2 border-b border-white/10 bg-slate-900/75 flex flex-wrap items-center gap-1.5 shrink-0">
        <form onSubmit={handleAddCustomUrl} className="flex items-center gap-1.5 flex-1 min-w-[210px]">
          <Globe className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="Paste MP4, WebM, MP3, Ogg, or stream URL..."
            className="flex-1 bg-slate-950/85 border border-white/15 rounded-md px-2.5 py-1 text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!urlInput.trim()}
            className="px-2 py-1 rounded-md bg-amber-500/25 hover:bg-amber-500/40 border border-amber-400/45 text-amber-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            <span>Tune</span>
          </button>
        </form>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => void handleStartCapture('screen')}
            className={`px-2 py-1 rounded-md border text-[10px] inline-flex items-center gap-1 cursor-pointer ${
              captureActive === 'screen'
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                : 'bg-white/8 hover:bg-white/15 border-white/12 text-slate-200'
            }`}
          >
            <Monitor className="w-3 h-3" />
            <span>Screen</span>
          </button>

          <button
            type="button"
            onClick={() => void handleStartCapture('camera')}
            className={`px-2 py-1 rounded-md border text-[10px] inline-flex items-center gap-1 cursor-pointer ${
              captureActive === 'camera'
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100'
                : 'bg-white/8 hover:bg-white/15 border-white/12 text-slate-200'
            }`}
          >
            <Camera className="w-3 h-3" />
            <span>Cam</span>
          </button>

          <label className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 text-[10px] inline-flex items-center gap-1 cursor-pointer">
            <Upload className="w-3 h-3" />
            <span>File</span>
            <input
              type="file"
              accept="video/*,audio/*"
              className="hidden"
              onChange={(e) => handleLocalFileUpload(e.target.files)}
            />
          </label>
        </div>
      </div>

      {/* Main Split Stage + Channels */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Stage */}
        <div className="md:col-span-8 flex flex-col min-h-0 bg-black relative">
          <div className="flex-1 min-h-0 relative flex items-center justify-center">
            {activeStream?.kind === 'synth-av' ? (
              <canvas ref={synthCanvasRef} className="w-full h-full block" />
            ) : (
              <video
                ref={videoRef}
                key={activeStream?.id}
                src={activeStream?.kind === 'url' ? activeStream.url : undefined}
                autoPlay
                playsInline
                controls={false}
                onError={() =>
                  setStreamError(
                    'Stream blocked by remote CORS or unsupported codec. Try Screen/Cam capture, local MP4/MP3, or Synth AV channels.'
                  )
                }
                className="w-full h-full object-contain bg-black"
              />
            )}

            {streamError && (
              <div className="absolute bottom-2 left-2 right-2 px-3 py-1.5 rounded-lg bg-amber-950/90 border border-amber-400/50 text-amber-100 text-[10.5px]">
                {streamError}
              </div>
            )}
          </div>

          {/* Transport Bar */}
          <div className="px-3 py-2 border-t border-white/10 bg-slate-950/95 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => void togglePlay()}
                className="px-2.5 py-1 rounded-md bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{playing ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                className="p-1.5 rounded-md bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 cursor-pointer"
              >
                {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-300" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setMuted(false);
                  setVolume(Number(e.target.value));
                }}
                className="w-16 accent-cyan-400"
              />

              <select
                value={playbackRate}
                onChange={(e) => setPlaybackRate(Number(e.target.value))}
                className="bg-slate-900 border border-white/12 rounded px-1.5 py-1 text-[10px] text-slate-200"
              >
                <option value={0.5}>0.5x</option>
                <option value={1}>1.0x</option>
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleRecordStream}
                className={`px-2 py-1 rounded-md border text-[10px] inline-flex items-center gap-1 cursor-pointer ${
                  isRecording
                    ? 'bg-rose-500/30 border-rose-400 text-rose-100 animate-pulse'
                    : 'bg-white/8 hover:bg-white/15 border-white/12 text-slate-200'
                }`}
              >
                <Circle className="w-2.5 h-2.5 fill-current" />
                <span>{isRecording ? 'Stop Rec' : 'Record'}</span>
              </button>

              {recordingUrl && (
                <a
                  href={recordingUrl}
                  download="universal-stream-clip.webm"
                  className="px-2 py-1 rounded-md bg-emerald-500/25 border border-emerald-400/45 text-emerald-100 text-[10px] inline-flex items-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>WebM</span>
                </a>
              )}

              {onOpenApp && (
                <button
                  type="button"
                  onClick={() => onOpenApp('liquidvideo')}
                  className="px-2 py-1 rounded-md bg-fuchsia-500/20 hover:bg-fuchsia-500/35 border border-fuchsia-400/40 text-fuchsia-100 text-[10px] inline-flex items-center gap-1 cursor-pointer"
                >
                  <Droplets className="w-3 h-3" />
                  <span>Liquid FX</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Channel Roster & Live Neural Bus Ticker */}
        <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/50 flex flex-col min-h-0">
          <div className="px-2.5 py-2 border-b border-white/10 flex items-center gap-1.5 shrink-0">
            <Radio className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-semibold text-slate-100">Universal Channels</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {bookmarks.map((b) => {
              const active = b.id === activeStream?.id;
              return (
                <div
                  key={b.id}
                  onClick={() => {
                    setStreamError(null);
                    setActiveId(b.id);
                    setPlaying(true);
                  }}
                  className={`p-2 rounded-lg border cursor-pointer transition-all flex items-start justify-between gap-2 ${
                    active
                      ? 'bg-amber-500/15 border-amber-400/50 text-amber-100'
                      : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06] text-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{b.title}</div>
                    <div className="text-[9.5px] text-slate-400 truncate">{b.subtitle}</div>
                  </div>
                  {bookmarks.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setBookmarks((prev) => prev.filter((x) => x.id !== b.id));
                      }}
                      className="p-1 text-slate-500 hover:text-rose-300 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-white/10 bg-slate-950/75 space-y-1 shrink-0">
            <div className="text-[9.5px] font-semibold uppercase tracking-wider text-cyan-300">
              Live Neural Bus Feed
            </div>
            {busEvents.map((ev) => (
              <div key={ev.id} className="text-[9.5px] font-mono-tabular text-slate-400 truncate">
                <span className="text-cyan-300">[{ev.channel}]</span> {ev.summary}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
