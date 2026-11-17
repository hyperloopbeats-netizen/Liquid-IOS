import { useRef, useState } from 'react';
import { Maximize2, Minimize2, PanelLeft, PanelRight, X } from 'lucide-react';
import type { AppId, OSAppDefinition, WindowState } from '../types/os';
import { AppIcon } from './AppIcon';

interface WindowFrameProps {
  app: OSAppDefinition;
  win: WindowState;
  isActive: boolean;
  onFocus: (id: AppId) => void;
  onClose: (id: AppId) => void;
  onMinimize: (id: AppId) => void;
  onToggleMaximize: (id: AppId) => void;
  onSnap: (id: AppId, side: 'left' | 'right') => void;
  onMoveResize: (id: AppId, rect: Partial<Pick<WindowState, 'x' | 'y' | 'width' | 'height'>>) => void;
  children: React.ReactNode;
}

export function WindowFrame({
  app,
  win,
  isActive,
  onFocus,
  onClose,
  onMinimize,
  onToggleMaximize,
  onSnap,
  onMoveResize,
  children,
}: WindowFrameProps) {
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocus(app.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const origX = win.x;
    const origY = win.y;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const nextX = Math.max(8, Math.min(window.innerWidth - 180, origX + (ev.clientX - startX)));
      const nextY = Math.max(48, Math.min(window.innerHeight - 100, origY + (ev.clientY - startY)));
      onMoveResize(app.id, { x: nextX, y: nextY });
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onFocus(app.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const origW = win.width;
    const origH = win.height;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const minW = Math.min(340, window.innerWidth - 16);
      const nextW = Math.max(minW, Math.min(window.innerWidth - win.x - 12, origW + (ev.clientX - startX)));
      const nextH = Math.max(280, Math.min(window.innerHeight - win.y - 78, origH + (ev.clientY - startY)));
      onMoveResize(app.id, { width: nextW, height: nextH });
    };

    const onUp = () => {
      setDragging(false);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };

  return (
    <section
      ref={frameRef}
      aria-label={app.name}
      onMouseDown={() => onFocus(app.id)}
      style={{
        left: `${win.x}px`,
        top: `${win.y}px`,
        width: `${win.width}px`,
        height: `${win.height}px`,
        zIndex: win.zIndex,
      }}
      className={`aether-glass absolute rounded-2xl flex flex-col overflow-hidden pointer-events-auto ${
        dragging ? '' : 'transition-[opacity,transform] duration-200 ease-out'
      } ${win.minimized ? 'opacity-0 scale-90 translate-y-12 pointer-events-none' : 'opacity-100 scale-100'} ${
        isActive ? 'ring-1 ring-white/20' : 'opacity-95'
      }`}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={() => onToggleMaximize(app.id)}
        className="h-10 px-3.5 flex items-center justify-between border-b border-white/10 bg-white/[0.04] cursor-grab active:cursor-grabbing shrink-0 select-none touch-none"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={`w-5 h-5 rounded-md bg-gradient-to-br ${app.accentGradient} flex items-center justify-center shrink-0`}
          >
            <AppIcon name={app.iconName} className="w-3 h-3 text-white" />
          </span>
          <span className="text-xs font-semibold text-slate-100 truncate">{app.name}</span>
          <span className="hidden sm:inline text-[11px] text-slate-400 truncate">
            · {app.category}
          </span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onSnap(app.id, 'left')}
            title="Snap Left Half"
            className="hidden md:inline-flex p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PanelLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onSnap(app.id, 'right')}
            title="Snap Right Half"
            className="hidden md:inline-flex p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PanelRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMinimize(app.id)}
            title="Minimize"
            className="p-1.5 rounded-md text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onToggleMaximize(app.id)}
            title={win.maximized ? 'Restore' : 'Maximize'}
            className="p-1.5 rounded-md text-slate-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onClose(app.id)}
            title="Close Window"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-slate-950/35">{children}</div>

      {!win.maximized && (
        <div
          onPointerDown={handleResizePointerDown}
          title="Resize window"
          className="absolute right-0 bottom-0 w-5 h-5 cursor-nwse-resize flex items-end justify-end p-1 text-slate-500 hover:text-slate-200 touch-none"
        >
          <span className="w-2.5 h-2.5 border-r-2 border-b-2 border-current rounded-br-[1px]" />
        </div>
      )}
    </section>
  );
}
