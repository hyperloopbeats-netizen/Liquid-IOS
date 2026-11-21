import { useRef, useState } from 'react';
import { Box, Maximize2, Minimize2, PanelLeft, PanelRight, X } from 'lucide-react';
import { getWorkspaceBounds } from '../kernel/workspaceBounds';
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
  onToggleMini: (id: AppId) => void;
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
  onToggleMini,
  onSnap,
  onMoveResize,
  children,
}: WindowFrameProps) {
  const [dragging, setDragging] = useState(false);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({ rx: 0, ry: 0 });
  const frameRef = useRef<HTMLDivElement | null>(null);
  const lastPtrRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleHeaderPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    onFocus(app.id);

    const startX = e.clientX;
    const startY = e.clientY;
    lastPtrRef.current = { x: e.clientX, y: e.clientY };
    const origX = win.x;
    const origY = win.y;
    setDragging(true);

    const onMove = (ev: PointerEvent) => {
      const vx = ev.clientX - lastPtrRef.current.x;
      const vy = ev.clientY - lastPtrRef.current.y;
      lastPtrRef.current = { x: ev.clientX, y: ev.clientY };
      setTilt({
        rx: Math.max(-5.5, Math.min(5.5, -vy * 0.25)),
        ry: Math.max(-5.5, Math.min(5.5, vx * 0.25)),
      });

      const bounds = getWorkspaceBounds();
      const maxX = Math.max(bounds.left, bounds.right - Math.min(win.width, 160));
      const maxY = Math.max(bounds.top, bounds.bottom - win.height);
      const nextX = Math.max(bounds.left, Math.min(maxX, origX + (ev.clientX - startX)));
      const nextY = Math.max(bounds.top, Math.min(maxY, origY + (ev.clientY - startY)));
      onMoveResize(app.id, { x: nextX, y: nextY });
    };

    const onUp = () => {
      setDragging(false);
      setTilt({ rx: 0, ry: 0 });
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
      const bounds = getWorkspaceBounds();
      const minW = Math.min(280, bounds.usableWidth);
      const minH = Math.min(200, bounds.usableHeight);
      const maxW = Math.max(minW, bounds.right - win.x);
      const maxH = Math.max(minH, bounds.bottom - win.y);
      const nextW = Math.max(minW, Math.min(maxW, origW + (ev.clientX - startX)));
      const nextH = Math.max(minH, Math.min(maxH, origH + (ev.clientY - startY)));
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

  const transform3D = win.minimized
    ? 'perspective(1100px) translate3d(0, 44px, -60px) scale(0.76) rotateX(16deg)'
    : dragging
    ? `perspective(1100px) translate3d(0, 0, 26px) rotateX(${tilt.rx.toFixed(2)}deg) rotateY(${tilt.ry.toFixed(2)}deg)`
    : isActive
    ? 'perspective(1100px) translate3d(0, 0, 14px) scale(1)'
    : 'perspective(1100px) translate3d(0, 0, -18px) scale(0.985)';

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
        transform: transform3D,
        transformStyle: 'preserve-3d',
      }}
      className={`aether-glass absolute rounded-xl flex flex-col overflow-hidden pointer-events-auto ${
        dragging
          ? 'transition-none shadow-[0_28px_60px_-14px_rgba(0,0,0,0.9)]'
          : 'transition-[opacity,transform,box-shadow] duration-200 ease-out'
      } ${win.minimized ? 'opacity-0 pointer-events-none' : 'opacity-100'} ${
        isActive ? 'ring-1 ring-cyan-300/35 shadow-[0_22px_50px_-14px_rgba(0,0,0,0.85)]' : 'opacity-90'
      }`}
    >
      <div
        onPointerDown={handleHeaderPointerDown}
        onDoubleClick={() => onToggleMaximize(app.id)}
        className="h-8 px-2.5 flex items-center justify-between border-b border-white/12 bg-gradient-to-b from-white/[0.08] to-white/[0.02] cursor-grab active:cursor-grabbing shrink-0 select-none touch-none"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-4 h-4 rounded-md bg-gradient-to-br ${app.accentGradient} flex items-center justify-center shrink-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.45)]`}
          >
            <AppIcon name={app.iconName} className="w-2.5 h-2.5 text-white" />
          </span>
          <span className="text-[11px] font-semibold text-slate-100 truncate">{app.shortName}</span>
          {!win.miniMode && (
            <span className="hidden sm:inline text-[10px] text-slate-400 truncate">
              · {app.category}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={() => onToggleMini(app.id)}
            title={win.miniMode ? 'Restore Standard Size' : 'Tiny 3D Mini Mode'}
            className={`p-1 rounded transition-colors cursor-pointer ${
              win.miniMode
                ? 'text-cyan-300 bg-cyan-500/20'
                : 'text-slate-400 hover:text-cyan-200 hover:bg-white/10'
            }`}
          >
            <Box className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSnap(app.id, 'left')}
            title="Snap Left Half"
            className="hidden md:inline-flex p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PanelLeft className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onSnap(app.id, 'right')}
            title="Snap Right Half"
            className="hidden md:inline-flex p-1 rounded text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <PanelRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onMinimize(app.id)}
            title="Minimize"
            className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Minimize2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onToggleMaximize(app.id)}
            title={win.maximized ? 'Restore' : 'Maximize'}
            className="p-1 rounded text-slate-400 hover:text-emerald-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onClose(app.id)}
            title="Close Window"
            className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden bg-slate-950/40">{children}</div>

      {!win.maximized && (
        <div
          onPointerDown={handleResizePointerDown}
          title="Resize window"
          className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize flex items-end justify-end p-0.5 text-slate-500 hover:text-cyan-300 touch-none"
        >
          <span className="w-2 h-2 border-r-2 border-b-2 border-current rounded-br-[1px]" />
        </div>
      )}
    </section>
  );
}
