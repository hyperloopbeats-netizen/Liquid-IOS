import { useState } from 'react';
import { OS_APPS } from '../kernel/appRegistry';
import type { AppId, PrintedAppDefinition, WindowState } from '../types/os';
import { AppIcon } from './AppIcon';

interface DockProps {
  panelAppIds: AppId[];
  printedApps: PrintedAppDefinition[];
  windows: Record<string, WindowState>;
  activeAppId: AppId | null;
  onSelectApp: (id: AppId) => void;
  onSwapSlot?: (slotIndex: number, appId: AppId) => void;
}

export function Dock({
  panelAppIds,
  printedApps,
  windows,
  activeAppId,
  onSelectApp,
  onSwapSlot,
}: DockProps) {
  const [dragHoverSlot, setDragHoverSlot] = useState<number | null>(null);
  const nineSlots = panelAppIds.slice(0, 9);

  const resolveAppMeta = (id: AppId) => {
    const builtIn = OS_APPS.find((a) => a.id === id);
    if (builtIn) {
      return {
        id: builtIn.id,
        shortName: builtIn.shortName,
        category: builtIn.category,
        accentGradient: builtIn.accentGradient,
        iconName: builtIn.iconName,
      };
    }
    const printed = printedApps.find((p) => p.id === id);
    if (printed) {
      return {
        id: printed.id,
        shortName: printed.shortName,
        category: `Printed v${printed.version}`,
        accentGradient: printed.accentGradient,
        iconName: 'printer',
      };
    }
    const fallback = OS_APPS[0];
    return {
      id: fallback.id,
      shortName: fallback.shortName,
      category: fallback.category,
      accentGradient: fallback.accentGradient,
      iconName: fallback.iconName,
    };
  };

  return (
    <nav
      id="aether-bottom-dock"
      aria-label="9-App Glowing Button Panel"
      className="fixed bottom-[max(10px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-[1250] max-w-[96vw]"
    >
      <div
        style={{ perspective: '700px' }}
        className="aether-dock px-2.5 py-1.5 rounded-2xl flex items-end gap-1.5"
      >
        {nineSlots.map((slotAppId, slotIdx) => {
          const app = resolveAppMeta(slotAppId);
          const win = windows[app.id];
          const isOpen = Boolean(win);
          const isFocused = activeAppId === app.id && Boolean(win) && !win.minimized;
          const isDropTarget = dragHoverSlot === slotIdx;

          return (
            <button
              key={`${slotIdx}-${app.id}`}
              type="button"
              onClick={() => onSelectApp(app.id)}
              onDragOver={(e) => {
                if (onSwapSlot && e.dataTransfer.types.includes('text/aether-app')) {
                  e.preventDefault();
                  setDragHoverSlot(slotIdx);
                }
              }}
              onDragLeave={() => setDragHoverSlot(null)}
              onDrop={(e) => {
                setDragHoverSlot(null);
                const droppedId = e.dataTransfer.getData('text/aether-app') as AppId;
                if (droppedId && onSwapSlot) {
                  e.preventDefault();
                  onSwapSlot(slotIdx, droppedId);
                }
              }}
              title={`${app.shortName} · ${app.category} (Slot ${slotIdx + 1}/9)`}
              className={`group relative flex flex-col items-center px-0.5 py-0.5 transition-all duration-200 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-xl ${
                isFocused
                  ? '-translate-y-2 scale-110'
                  : isDropTarget
                  ? '-translate-y-1.5 scale-105'
                  : 'hover:-translate-y-1.5 hover:scale-105'
              }`}
            >
              {/* Volumetric selection glow halo */}
              {isFocused && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -inset-1.5 rounded-2xl bg-cyan-400/30 blur-md animate-pulse"
                />
              )}

              <span className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute -top-8 px-2 py-0.5 rounded-md bg-slate-950/95 border border-cyan-400/35 text-[10px] font-medium text-cyan-100 whitespace-nowrap shadow-lg">
                {app.shortName}
              </span>

              <div
                className={`relative w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br ${app.accentGradient} flex items-center justify-center border transition-all duration-200 group-hover:rotate-3 ${
                  isFocused
                    ? 'border-white ring-2 ring-cyan-300 shadow-[0_0_22px_rgba(34,211,238,0.85),inset_0_1px_2px_rgba(255,255,255,0.8)] brightness-125'
                    : isOpen
                    ? 'border-cyan-300/65 shadow-[0_0_12px_rgba(56,189,248,0.45),inset_0_1px_1px_rgba(255,255,255,0.45)] opacity-100'
                    : 'border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_6px_14px_-4px_rgba(0,0,0,0.75)] opacity-80 hover:opacity-100'
                }`}
              >
                <AppIcon name={app.iconName} className="w-4 h-4 text-white drop-shadow" />
              </div>

              <span
                className={`relative mt-1 h-1 rounded-full transition-all duration-200 ${
                  isFocused
                    ? 'w-5 bg-cyan-300 shadow-[0_0_10px_#22d3ee] opacity-100'
                    : isOpen
                    ? 'w-2.5 bg-cyan-400/80 opacity-85'
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
