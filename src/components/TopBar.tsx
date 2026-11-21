import { useEffect, useRef, useState } from 'react';
import { Command, LayoutGrid, Layers, Mic, MicOff, SunMoon } from 'lucide-react';
import { OS_APPS } from '../kernel/appRegistry';
import type { AppId, CircadianMode, SynesthesiaState } from '../types/os';
import { AppIcon } from './AppIcon';

interface TopBarProps {
  activeAppName: string;
  kernelHealth: number;
  vfsFileCount: number;
  fractalFps: number;
  synesthesia: SynesthesiaState;
  voiceListening: boolean;
  onOpenApp: (id: AppId) => void;
  onOpenCommandBar: () => void;
  onToggleVoice: () => void;
  onTileWindows: () => void;
  onCascadeWindows: () => void;
  onCycleTheme: () => void;
}

const PHASE_LABELS: Record<CircadianMode, string> = {
  auto: 'Auto',
  dawn: 'Dawn',
  noon: 'Noon',
  dusk: 'Dusk',
  midnight: 'Midnight',
};

export function TopBar({
  activeAppName,
  kernelHealth,
  vfsFileCount,
  fractalFps,
  synesthesia,
  voiceListening,
  onOpenApp,
  onOpenCommandBar,
  onToggleVoice,
  onTileWindows,
  onCascadeWindows,
  onCycleTheme,
}: TopBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [clock, setClock] = useState(() =>
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  );
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <header
      id="aether-top-bar"
      className="aether-glass-bar fixed top-0 left-0 right-0 pt-[env(safe-area-inset-top)] min-h-11 px-4 flex items-center justify-between gap-4 z-[1200] text-xs"
    >
      <div className="flex items-center gap-3 min-w-0" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
        >
          <span className="font-display font-semibold tracking-wide text-slate-100 whitespace-nowrap">
            CodeMesh IDE
          </span>
        </button>

        {menuOpen && (
          <div className="aether-glass absolute left-4 top-12 w-72 rounded-2xl p-2 shadow-2xl z-[1300] space-y-1 max-h-[75vh] overflow-y-auto">
            <div className="px-2.5 py-1 text-[11px] font-medium text-slate-400">
              CodeMesh Tools & OS Subsystems
            </div>
            {OS_APPS.map((app) => (
              <button
                key={app.id}
                type="button"
                onClick={() => {
                  onOpenApp(app.id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-2.5 py-2 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <span
                    className={`w-6 h-6 rounded-lg bg-gradient-to-br ${app.accentGradient} flex items-center justify-center shrink-0`}
                  >
                    <AppIcon name={app.iconName} className="w-3.5 h-3.5 text-white" />
                  </span>
                  <span className="font-medium text-slate-100 truncate">{app.shortName}</span>
                </span>
                <span className="text-[11px] text-slate-400 shrink-0">{app.axis}</span>
              </button>
            ))}
          </div>
        )}

        <span className="text-slate-600 select-none" aria-hidden="true">
          /
        </span>
        <span className="text-slate-300 font-medium truncate max-w-[220px] sm:max-w-[320px]">
          {activeAppName}
        </span>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="hidden lg:flex items-center gap-3 pr-2 text-[11px] font-mono-tabular text-slate-300">
          <button
            type="button"
            onClick={() => onOpenApp('auditor')}
            className="hover:text-cyan-300 transition-colors cursor-pointer"
            title="Open AST Code Auditor"
          >
            AST Auditor
          </button>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenApp('microfractal')}
            className="hover:text-cyan-300 transition-colors cursor-pointer"
            title="Open Micro Fractal 120fps Kernel"
          >
            Pace <strong className="text-teal-300">{fractalFps} fps</strong>
          </button>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <span>
            Health{' '}
            <strong className={kernelHealth >= 90 ? 'text-emerald-400' : 'text-amber-400'}>
              {kernelHealth}%
            </strong>
          </span>
          <span className="text-slate-600" aria-hidden="true">
            ·
          </span>
          <button
            type="button"
            onClick={() => onOpenApp('drive')}
            className="hover:text-cyan-300 transition-colors cursor-pointer"
          >
            VFS <strong>{vfsFileCount} files</strong>
          </button>
        </div>

        <button
          type="button"
          onClick={onTileWindows}
          title="Tile open windows"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Tile</span>
        </button>

        <button
          type="button"
          onClick={onCascadeWindows}
          title="Cascade open windows"
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Cascade</span>
        </button>

        <button
          type="button"
          onClick={onCycleTheme}
          title={`Circadian phase: ${synesthesia.resolvedPhase} (click to cycle)`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-slate-200 transition-colors cursor-pointer whitespace-nowrap"
        >
          <SunMoon className="w-3.5 h-3.5" />
          <span>{PHASE_LABELS[synesthesia.circadianMode]}</span>
        </button>

        <button
          type="button"
          onClick={onToggleVoice}
          title="Voice navigation (Web Speech API)"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer whitespace-nowrap ${
            voiceListening
              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
              : 'bg-white/5 hover:bg-white/12 border-white/10 text-slate-200'
          }`}
        >
          {voiceListening ? <Mic className="w-3.5 h-3.5" /> : <MicOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{voiceListening ? 'Listening' : 'Voice'}</span>
        </button>

        <button
          type="button"
          onClick={onOpenCommandBar}
          title="Open Natural Language Command Bar (Ctrl+K)"
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 transition-colors cursor-pointer whitespace-nowrap"
        >
          <Command className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Command</span>
        </button>

        <span className="pl-1 font-mono-tabular text-xs text-slate-200 shrink-0">{clock}</span>
      </div>
    </header>
  );
}
