import type { WindowState } from '../types/os';

export interface WorkspaceBounds {
  vw: number;
  vh: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  usableWidth: number;
  usableHeight: number;
}

/**
 * Measures actual live DOM rects of the TopBar, top scrolling SmartTab menu,
 * and bottom Dock menu so every OS window sits strictly below the top menus
 * and strictly above the bottom Dock / browser chrome.
 */
export function getWorkspaceBounds(): WorkspaceBounds {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const isCompact = vw < 640;

  let topEdge = 96;
  let bottomEdge = vh - 78;

  if (typeof document !== 'undefined') {
    const topBarEl = document.getElementById('aether-top-bar');
    const smartTabEl = document.getElementById('aether-smart-tab-bar');
    const dockEl = document.getElementById('aether-bottom-dock');

    const topBarBottom = topBarEl ? topBarEl.getBoundingClientRect().bottom : 44;
    const smartTabBottom = smartTabEl ? smartTabEl.getBoundingClientRect().bottom : 88;
    const measuredTop = Math.max(topBarBottom, smartTabBottom);
    if (measuredTop > 0) {
      topEdge = Math.max(88, Math.ceil(measuredTop + 8));
    }

    if (dockEl) {
      const dockTop = dockEl.getBoundingClientRect().top;
      if (dockTop > topEdge + 120) {
        bottomEdge = Math.floor(dockTop - 8);
      }
    }
  }

  const left = isCompact ? 8 : 12;
  const right = Math.max(left + 260, vw - left);
  const top = Math.min(topEdge, Math.max(48, vh - 220));
  const bottom = Math.max(top + 180, Math.min(vh - 10, bottomEdge));

  return {
    vw,
    vh,
    left,
    right,
    top,
    bottom,
    usableWidth: Math.max(260, right - left),
    usableHeight: Math.max(180, bottom - top),
  };
}

export function clampWindowRect(
  rect: { x: number; y: number; width: number; height: number },
  bounds: WorkspaceBounds = getWorkspaceBounds()
): { x: number; y: number; width: number; height: number } {
  const minW = Math.min(280, bounds.usableWidth);
  const width = Math.max(minW, Math.min(bounds.usableWidth, Math.round(rect.width)));
  const minH = Math.min(200, bounds.usableHeight);
  const height = Math.max(minH, Math.min(bounds.usableHeight, Math.round(rect.height)));

  const maxX = Math.max(bounds.left, bounds.right - width);
  const maxY = Math.max(bounds.top, bounds.bottom - height);

  const x = Math.max(bounds.left, Math.min(maxX, Math.round(rect.x)));
  const y = Math.max(bounds.top, Math.min(maxY, Math.round(rect.y)));

  return { x, y, width, height };
}

export function reclampWindowState(
  win: WindowState,
  bounds: WorkspaceBounds = getWorkspaceBounds()
): WindowState {
  if (win.maximized) {
    return {
      ...win,
      x: bounds.left,
      y: bounds.top,
      width: bounds.usableWidth,
      height: bounds.usableHeight,
    };
  }
  const clamped = clampWindowRect(win, bounds);
  return {
    ...win,
    ...clamped,
  };
}
