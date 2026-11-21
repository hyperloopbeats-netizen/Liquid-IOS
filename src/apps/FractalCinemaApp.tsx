import { useEffect, useRef, useState } from 'react';
import { Aperture, Box, Film, RotateCw, Sparkles } from 'lucide-react';

interface FractalBrainWindow extends Window {
  FractalBrain?: {
    version: string;
    getSnapshot: () => {
      viewMode?: string;
      streamMode?: string;
      upscaleLevel?: string;
      theatreView?: boolean;
      realFpsMode?: boolean;
      fps?: number;
      daemons?: { activeCount?: number };
    };
    setViewMode?: (mode: 'movie' | '3d') => void;
    setLiquid64k?: (enabled: boolean) => void;
    setTheatreView?: (enabled: boolean) => void;
    setRealFpsMode?: (enabled: boolean) => void;
  };
}

export function FractalCinemaApp() {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [brainStats, setBrainStats] = useState<{
    viewMode: string;
    upscaleLevel: string;
    fps: number;
    daemons: number;
  }>({
    viewMode: 'movie',
    upscaleLevel: '8k',
    fps: 60,
    daemons: 10,
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        const win = iframeRef.current?.contentWindow as FractalBrainWindow | null;
        const snap = win?.FractalBrain?.getSnapshot?.();
        if (snap) {
          setBrainStats({
            viewMode: snap.viewMode || 'movie',
            upscaleLevel: snap.upscaleLevel || '8k',
            fps: Math.round(snap.fps ?? 60),
            daemons: snap.daemons?.activeCount ?? 10,
          });
        }
      } catch {
        // ignore while iframe boots
      }
    }, 500);
    return () => clearInterval(id);
  }, [reloadKey]);

  const callBrain = (fn: (brain: NonNullable<FractalBrainWindow['FractalBrain']>) => void) => {
    try {
      const win = iframeRef.current?.contentWindow as FractalBrainWindow | null;
      if (win?.FractalBrain) {
        fn(win.FractalBrain);
        iframeRef.current?.focus();
      }
    } catch {
      // ignore cross-frame error during boot
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#040711] text-xs overflow-hidden">
      {/* Slim OS Bridge Bar */}
      <div className="px-2.5 py-1.5 border-b border-white/10 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Aperture className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span className="font-mono-tabular text-[11px] text-slate-200 truncate">
            Brain v2.4 · {brainStats.daemons} Daemons · {brainStats.fps} FPS · {brainStats.upscaleLevel.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => callBrain((b) => b.setViewMode?.(brainStats.viewMode === '3d' ? 'movie' : '3d'))}
            className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/12 text-[10px] font-medium text-slate-100 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
          >
            {brainStats.viewMode === '3d' ? <Film className="w-3 h-3 text-amber-300" /> : <Box className="w-3 h-3 text-cyan-300" />}
            <span>{brainStats.viewMode === '3d' ? 'CinemaScope' : '3D Cones'}</span>
          </button>

          <button
            type="button"
            onClick={() => callBrain((b) => b.setLiquid64k?.(brainStats.upscaleLevel !== '64k'))}
            className={`px-2 py-1 rounded border text-[10px] font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              brainStats.upscaleLevel === '64k'
                ? 'bg-amber-500/25 border-amber-400/50 text-amber-100'
                : 'bg-white/8 hover:bg-white/15 border-white/12 text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>64K</span>
          </button>

          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload FractalOS Kernel"
            className="p-1 rounded bg-white/8 hover:bg-white/15 border border-white/12 text-slate-300 cursor-pointer"
          >
            <RotateCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Hosted FractalOS 2.39:1 CinemaScope & Sovereign Brain v2.4 Runtime */}
      <div className="flex-1 min-h-0 relative">
        <iframe
          key={reloadKey}
          ref={iframeRef}
          src="/apps/fractal-os.html"
          title="FractalOS // 2.39:1 CinemaScope & Sovereign Brain Kernel v2.4"
          allow="autoplay; fullscreen"
          className="w-full h-full border-0 block bg-[#040711]"
        />
      </div>
    </div>
  );
}
