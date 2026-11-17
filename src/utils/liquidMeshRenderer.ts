export type LiquidMeshMode = 'bio-caustics' | 'ferro-pulse' | 'neural-phosphor' | 'mycelial-field';

export interface LiquidMeshOptions {
  mode: LiquidMeshMode;
  phase: number;
  bass: number;
  mid: number;
  treble: number;
  hue: number;
  intensity: number;
  pointerX: number;
  pointerY: number;
  pointerActive: boolean;
  spectrum?: Uint8Array | null;
}

export function drawLiquidMeshFrame(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  opts: LiquidMeshOptions
): void {
  const { mode, phase, bass, mid, treble, hue, intensity, pointerX, pointerY, pointerActive, spectrum } = opts;

  ctx.save();
  // Deep Obsidian substrate beneath the mesh
  ctx.fillStyle = '#030712';
  ctx.fillRect(0, 0, w, h);

  // Subtle geometric wireframe grid that deforms with audio bass & mid energy
  const cols = 14;
  const rows = 9;
  const cellW = w / cols;
  const cellH = h / rows;
  const amp = (8 + bass * 26) * intensity;

  ctx.strokeStyle = `hsla(${hue}, 76%, 56%, ${0.14 + intensity * 0.22})`;
  ctx.lineWidth = 1.1;

  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    for (let c = 0; c <= cols; c++) {
      const gx = c * cellW;
      const gy = r * cellH;
      const dx = Math.sin(r * 0.65 + phase * 1.1 + c * 0.3) * amp;
      const dy = Math.cos(c * 0.55 - phase * 0.9 + r * 0.4) * amp;
      const px = gx + dx;
      const py = gy + dy;
      if (c === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    for (let r = 0; r <= rows; r++) {
      const gx = c * cellW;
      const gy = r * cellH;
      const dx = Math.sin(r * 0.65 + phase * 1.1 + c * 0.3) * amp;
      const dy = Math.cos(c * 0.55 - phase * 0.9 + r * 0.4) * amp;
      const px = gx + dx;
      const py = gy + dy;
      if (r === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // Primary Liquid Mesh Mode Layer
  if (mode === 'bio-caustics') {
    const cellCount = 7;
    for (let i = 0; i < cellCount; i++) {
      const ang = phase * (0.38 + i * 0.06) + i * 0.95;
      const cx =
        w * (0.5 + Math.cos(ang) * (0.28 + bass * 0.14)) +
        (pointerActive ? (pointerX - 0.5) * 90 : 0);
      const cy =
        h * (0.5 + Math.sin(ang * 1.2) * (0.24 + mid * 0.12)) +
        (pointerActive ? (pointerY - 0.5) * 70 : 0);
      const rad = (68 + (i % 3) * 32 + bass * 85) * (0.65 + intensity * 0.65);

      const grad = ctx.createRadialGradient(cx, cy, rad * 0.08, cx, cy, rad);
      const cHue = (hue + i * 28) % 360;
      grad.addColorStop(0, `hsla(${cHue}, 88%, 60%, ${0.28 + intensity * 0.25})`);
      grad.addColorStop(0.55, `hsla(${(cHue + 45) % 360}, 78%, 46%, 0.12)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = `hsla(${hue}, 85%, 66%, ${0.28 + intensity * 0.35})`;
    ctx.lineWidth = 1.6;
    for (let ring = 0; ring < 3; ring++) {
      ctx.beginPath();
      for (let a = 0; a <= 64; a++) {
        const theta = (a / 64) * Math.PI * 2;
        const wobble =
          Math.sin(theta * (3 + ring) + phase * (1.4 - ring * 0.3)) * (12 + bass * 34) * intensity +
          Math.cos(theta * 5 - phase * 2) * (6 + treble * 18);
        const r = Math.min(w, h) * (0.2 + ring * 0.1) + wobble;
        const rx = w * 0.5 + Math.cos(theta) * r;
        const ry = h * 0.5 + Math.sin(theta) * r;
        if (a === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();
    }
  } else if (mode === 'ferro-pulse') {
    const ribbons = 6;
    for (let r = 0; r < ribbons; r++) {
      ctx.beginPath();
      const rHue = (hue + r * 28 + bass * 50) % 360;
      for (let i = 0; i <= 72; i++) {
        const t = i / 72;
        const x = t * w;
        const bin = spectrum ? spectrum[Math.min(spectrum.length - 1, Math.floor(t * 48))] / 255 : 0;
        const y =
          h * (0.2 + r * 0.12) +
          Math.sin(t * 7 + phase * (1.1 + r * 0.25)) * (18 + bass * 42) * intensity +
          bin * 36;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `hsla(${rHue}, 88%, 62%, ${0.38 + intensity * 0.4})`;
      ctx.lineWidth = 2.0;
      ctx.stroke();
    }
  } else if (mode === 'neural-phosphor') {
    ctx.strokeStyle = `hsla(${(hue + 18) % 360}, 92%, 66%, ${0.55 + intensity * 0.35})`;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    for (let i = 0; i <= 140; i++) {
      const t = i / 140;
      const x = t * w;
      const env = Math.sin(t * Math.PI);
      const harmonic =
        Math.sin(t * 26 + phase * 3.1) * (24 + bass * 60) +
        Math.cos(t * 50 - phase * 4.5) * (10 + treble * 34);
      const y = h * 0.5 + harmonic * env * (0.35 + intensity * 0.85);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  } else {
    // mycelial-field
    const nodeCount = 26;
    const pts: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < nodeCount; i++) {
      const ang = phase * (0.28 + (i % 5) * 0.08) + i * 2.399;
      const r = Math.min(w, h) * (0.14 + (i / nodeCount) * 0.38) * (0.85 + bass * 0.35);
      pts.push({
        x: w * 0.5 + Math.cos(ang) * r * (w / Math.max(1, h)) * 0.72,
        y: h * 0.5 + Math.sin(ang * 1.15) * r,
      });
    }
    ctx.lineWidth = 1.1;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        if (d < Math.min(w, h) * 0.34) {
          ctx.strokeStyle = `hsla(${(hue + i * 7) % 360}, 82%, 62%, ${(1 - d / (Math.min(w, h) * 0.34)) * 0.45 * intensity})`;
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }
      ctx.fillStyle = `hsla(${(hue + i * 11) % 360}, 90%, 68%, ${0.5 + intensity * 0.4})`;
      ctx.beginPath();
      ctx.arc(pts[i].x, pts[i].y, 2.5 + mid * 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}
