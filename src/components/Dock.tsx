import { OS_APPS } from '../kernel/appRegistry';
import type { AppId, WindowState } from '../types/os';
import { AppIcon } from './AppIcon';

interface DockProps {
  windows: Record<string, WindowState>;
  activeAppId: AppId | null;
  onSelectApp: (id: AppId) => void;
}

export function Dock({ windows, activeAppId, onSelectApp }: DockProps) {
  return (
    <nav
      aria-label="Application Dock"
      className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[1250] max-w-[96vw]"
    >
      <div className="aether-dock px-3 py-2 rounded-2xl flex items-end gap-1.5 sm:gap-2 overflow-x-auto">
        {OS_APPS.map((app) => {
          const win = windows[app.id];
          const isOpen = Boolean(win);
          const isFocused = activeAppId === app.id && win && !win.minimized;
          return (
            <button
              key={app.id}
              type="button"
              onClick={() => onSelectApp(app.id)}
              title={`${app.name} (${app.category})`}
              className="group relative flex flex-col items-center px-1 py-0.5 transition-transform duration-150 hover:-translate-y-1.5 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl"
            >
              <span className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-9 px-2.5 py-1 rounded-lg bg-slate-900/95 border border-white/15 text-[11px] font-medium text-slate-100 whitespace-nowrap shadow-lg">
                {app.shortName}
              </span>
              <div
                className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-gradient-to-br ${app.accentGradient} flex items-center justify-center border shadow-md transition-all ${
                  isFocused ? 'border-white/70 scale-105' : 'border-white/20'
                }`}
              >
                <AppIcon name={app.iconName} className="w-5 h-5 text-white" />
              </div>
              <span
                className={`mt-1 h-1 rounded-full transition-all ${
                  isFocused
                    ? 'w-4 bg-cyan-400 opacity-100'
                    : isOpen
                    ? 'w-1.5 bg-slate-300 opacity-80'
                    : 'w-1 bg-transparent opacity-0'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
