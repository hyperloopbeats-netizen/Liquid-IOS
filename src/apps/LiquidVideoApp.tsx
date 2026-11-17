import { useCallback, useEffect, useRef, useState } from 'react';
import {
  CircleDot,
  Droplets,
  Film,
  Pause,
  Play,
  Repeat,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { liquidAudioEngine } from '../kernel/liquidAudioEngine';
import { mediaBridge } from '../kernel/mediaBridge';
import { neuralBus } from '../kernel/neuralBus';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import type { AppId } from '../types/os';

export interface PixelMatrixParams {
  presetName: string;
  shaderSummary: string;
  warpStrength: number; // 0 .. 0.14
  meshFreq: number; // 1.5 .. 18.0
  meshBlend: number; // 0 .. 1.0
  prismSplit: number; // 0 .. 0.05
  pixelSize: number; // 1 .. 32
  kernelEdge: number; // -0.8 .. 2.2
  redGain: number; // 0.2 .. 2.0
  greenGain: number; // 0.2 .. 2.0
  blueGain: number; // 0.2 .. 2.0
  hueShift: number; // -180 .. 180
  contrast: number; // 0.6 .. 2.0
  saturation: number; // 0 .. 2.2
  solarize: number; // 0 .. 1.0
  scanlines: number; // 0 .. 0.85
  tintHex: string;
}

const DEFAULT_MATRIX: PixelMatrixParams = {
  presetName: 'Crystal Liquid',
  shaderSummary: 'Balanced fluid refraction fused directly into HD video pixels.',
  warpStrength: 0.022,
  meshFreq: 5.5,
  meshBlend: 0.34,
  prismSplit: 0.008,
  pixelSize: 1,
  kernelEdge: 0.35,
  redGain: 1.0,
  greenGain: 1.04,
  blueGain: 1.1,
  hueShift: 0,
  contrast: 1.08,
  saturation: 1.15,
  solarize: 0,
  scanlines: 0.1,
  tintHex: '#22d3ee',
};

const MATRIX_PRESETS: PixelMatrixParams[] = [
  DEFAULT_MATRIX,
  {
    presetName: 'Cyber Prism Matrix',
    shaderSummary: 'High-dispersion RGB chromatic split with sharp edge matrix & phosphor grid.',
    warpStrength: 0.042,
    meshFreq: 9.2,
    meshBlend: 0.56,
    prismSplit: 0.026,
    pixelSize: 3,
    kernelEdge: 1.45,
    redGain: 1.15,
    greenGain: 0.92,
    blueGain: 1.38,
    hueShift: 18,
    contrast: 1.34,
    saturation: 1.45,
    solarize: 0.08,
    scanlines: 0.42,
    tintHex: '#a855f7',
  },
  {
    presetName: 'Bio-Caustic Reef',
    shaderSummary: 'Deep underwater harmonic wave refraction with emerald/cyan bioluminescence.',
    warpStrength: 0.058,
    meshFreq: 4.4,
    meshBlend: 0.68,
    prismSplit: 0.012,
    pixelSize: 1,
    kernelEdge: 0.2,
    redGain: 0.78,
    greenGain: 1.28,
    blueGain: 1.32,
    hueShift: -14,
    contrast: 1.16,
    saturation: 1.32,
    solarize: 0,
    scanlines: 0.04,
    tintHex: '#2dd4bf',
  },
  {
    presetName: 'Molten Gold Solarize',
    shaderSummary: 'Heavy ferrofluid thermal folds with amber specular inversion.',
    warpStrength: 0.075,
    meshFreq: 7.0,
    meshBlend: 0.72,
    prismSplit: 0.018,
    pixelSize: 2,
    kernelEdge: 0.85,
    redGain: 1.48,
    greenGain: 1.12,
    blueGain: 0.62,
    hueShift: -28,
    contrast: 1.42,
    saturation: 1.55,
    solarize: 0.55,
    scanlines: 0.16,
    tintHex: '#f59e0b',
  },
  {
    presetName: '8-Bit Phosphor Synth',
    shaderSummary: 'Quantized pixel-block matrix driven by acoustic emerald scanlines.',
    warpStrength: 0.016,
    meshFreq: 11.5,
    meshBlend: 0.44,
    prismSplit: 0.014,
    pixelSize: 10,
    kernelEdge: 1.1,
    redGain: 0.68,
    greenGain: 1.45,
    blueGain: 0.92,
    hueShift: 8,
    contrast: 1.36,
    saturation: 1.22,
    solarize: 0.05,
    scanlines: 0.62,
    tintHex: '#10b981',
  },
];

const QUICK_PROMPTS = [
  'Cyberpunk neon rain with heavy RGB prism matrix',
  'Underwater bioluminescent caustic crystal wave',
  'Molten liquid mercury solarized night vision',
  'Retro 8-bit emerald phosphor arcade grid',
];

const VERTEX_SHADER_SRC = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = vec2(aPos.x * 0.5 + 0.5, 0.5 - aPos.y * 0.5);
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER_SRC = `
  precision mediump float;
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uAudioBass;
  uniform float uAudioTreble;
  uniform float uAudioRms;
  uniform vec2 uPointer;
  uniform float uPointerAmp;

  uniform float uWarpStrength;
  uniform float uMeshFreq;
  uniform float uMeshBlend;
  uniform float uPrismSplit;
  uniform float uPixelSize;
  uniform float uKernelEdge;
  uniform vec3 uRgbGain;
  uniform float uHueShift;
  uniform float uContrast;
  uniform float uSaturation;
  uniform float uSolarize;
  uniform float uScanlines;
  uniform vec3 uTintColor;

  float liquidPotential(vec2 p, float t, float freq, float bass) {
    float wave1 = sin(p.x * freq + t * 1.45 + sin(p.y * (freq * 0.72) - t * 0.9));
    float wave2 = cos(p.y * (freq * 1.15) - t * 1.15 + cos(p.x * (freq * 0.85) + t * 0.7));
    float radial = length(p - uPointer);
    float ripple = exp(-radial * 7.5) * sin(radial * 42.0 - t * 9.0) * (0.35 + uPointerAmp * 2.2);
    float pulse = sin(length(p - vec2(0.5)) * (freq * 1.8) - t * 2.1) * (0.25 + bass * 0.75);
    return (wave1 * 0.42 + wave2 * 0.42 + ripple + pulse * 0.35);
  }

  vec3 rotateHue(vec3 col, float deg) {
    float rad = radians(deg);
    const vec3 k = vec3(0.57735);
    float cosA = cos(rad);
    return col * cosA + cross(k, col) * sin(rad) + k * dot(k, col) * (1.0 - cosA);
  }

  void main() {
    vec2 pxStep = max(vec2(1.0), vec2(uPixelSize)) / max(vec2(64.0), uRes);
    vec2 gridUv = uPixelSize > 1.5
      ? (floor(vUv / pxStep) + 0.5) * pxStep
      : vUv;

    // Continuous liquid mesh gradient evaluated inside the video pixel coordinate space
    float eps = 0.0045;
    float c0 = liquidPotential(gridUv, uTime, uMeshFreq, uAudioBass);
    float cx = liquidPotential(gridUv + vec2(eps, 0.0), uTime, uMeshFreq, uAudioBass);
    float cy = liquidPotential(gridUv + vec2(0.0, eps), uTime, uMeshFreq, uAudioBass);
    vec2 grad = vec2(cx - c0, cy - c0) / eps;

    float dynamicWarp = uWarpStrength * (1.0 + uAudioBass * 0.85 + uPointerAmp * 0.9);
    vec2 warpedUv = clamp(gridUv + grad * dynamicWarp * 0.045, vec2(0.001), vec2(0.999));

    // Chromatic prism matrix split aligned with the liquid mesh tangent
    vec2 tangent = vec2(-grad.y, grad.x);
    vec2 prismVec = normalize(tangent + vec2(0.0001)) * uPrismSplit * (0.65 + uAudioTreble * 0.85);

    vec3 centerCol;
    centerCol.r = texture2D(uTex, clamp(warpedUv + prismVec, 0.001, 0.999)).r;
    centerCol.g = texture2D(uTex, warpedUv).g;
    centerCol.b = texture2D(uTex, clamp(warpedUv - prismVec, 0.001, 0.999)).b;

    // 3x3 Spatial Convolution Kernel (Sharpen / Edge Matrix / Ferro Soften)
    vec2 kStep = pxStep * 1.4;
    vec3 nN = texture2D(uTex, clamp(warpedUv + vec2(0.0, -kStep.y), 0.001, 0.999)).rgb;
    vec3 nS = texture2D(uTex, clamp(warpedUv + vec2(0.0, kStep.y), 0.001, 0.999)).rgb;
    vec3 nW = texture2D(uTex, clamp(warpedUv + vec2(-kStep.x, 0.0), 0.001, 0.999)).rgb;
    vec3 nE = texture2D(uTex, clamp(warpedUv + vec2(kStep.x, 0.0), 0.001, 0.999)).rgb;
    vec3 laplacian = centerCol * 4.0 - (nN + nS + nW + nE);
    vec3 col = clamp(centerCol + laplacian * (uKernelEdge * 0.65), 0.0, 1.0);

    // RGB Color Matrix Transform + Hue + Contrast + Saturation
    col = rotateHue(col, uHueShift);
    col *= uRgbGain;

    float luma = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(luma), col, uSaturation);
    col = (col - 0.5) * uContrast + 0.5;
    col = clamp(col, 0.0, 1.0);

    // Wave-fold Solarization
    if (uSolarize > 0.01) {
      vec3 folded = abs(col - 0.5) * 2.0;
      col = mix(col, folded, uSolarize);
    }

    // Fuse organic caustic isolines directly into the video pixel brightness
    float caustic = pow(clamp(1.0 - abs(c0) * 1.35, 0.0, 1.0), 2.4);
    float crest = smoothstep(0.55, 0.95, abs(c0));
    vec3 meshEnergy = uTintColor * (caustic * 0.7 + crest * 0.55) * (0.65 + uAudioRms * 0.9);
    col = clamp(col + meshEnergy * uMeshBlend * (0.45 + luma * 0.85), 0.0, 1.0);

    // Phosphor matrix subpixel scanlines
    if (uScanlines > 0.01) {
      float scanY = 0.5 + 0.5 * sin(vUv.y * uRes.y * 1.05);
      float scanX = 0.5 + 0.5 * sin(vUv.x * uRes.x * 0.65);
      float gridMask = mix(1.0, 0.55 + 0.45 * scanY * (0.8 + 0.2 * scanX), uScanlines);
      col *= gridMask;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

function hexToRgbNorm(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return [0.13, 0.83, 0.93];
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  return [
    Number.isFinite(r) ? r : 0.13,
    Number.isFinite(g) ? g : 0.83,
    Number.isFinite(b) ? b : 0.93,
  ];
}

function clampNum(v: unknown, min: number, max: number, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function drawSyntheticFeedFrame(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, bass: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${(t * 28) % 360}, 62%, 14%)`);
  grad.addColorStop(0.5, `hsl(${(t * 28 + 75) % 360}, 68%, 20%)`);
  grad.addColorStop(1, `hsl(${(t * 28 + 165) % 360}, 58%, 12%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Flowing geometric organic ribbons as default live feed
  for (let i = 0; i < 6; i++) {
    const cx = w * (0.5 + 0.34 * Math.cos(t * (0.6 + i * 0.13) + i));
    const cy = h * (0.5 + 0.32 * Math.sin(t * (0.7 + i * 0.11) + i * 1.4));
    const rad = (54 + i * 24) * (1 + bass * 0.45);
    const rg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rad);
    rg.addColorStop(0, `hsla(${(t * 42 + i * 52) % 360}, 90%, 66%, 0.72)`);
    rg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizon perspective grid inside texture
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.22)';
  ctx.lineWidth = 1.5;
  for (let i = -4; i <= 4; i++) {
    ctx.beginPath();
    ctx.moveTo(w * 0.5 + i * 22, h * 0.42);
    ctx.lineTo(w * 0.5 + i * 125, h);
    ctx.stroke();
  }
}

export function LiquidVideoApp({ onOpenApp }: { onOpenApp?: (id: AppId) => void }) {
  const glCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const feedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const videoGainRef = useRef<GainNode | null>(null);
  const localAnalyserRef = useRef<AnalyserNode | null>(null);
  const freqBufRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const audioWiredRef = useRef(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [videoSrc, setVideoSrc] = useState<{ title: string; url: string | null }>({
    title: 'Synthetic Plasma Matrix Signal',
    url: null,
  });
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [loop, setLoop] = useState(true);
  const [volume, setVolume] = useState(0.9);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [fps, setFps] = useState(60);
  const [videoFrames, setVideoFrames] = useState(0);
  const [webglActive, setWebglActive] = useState(true);

  const [matrix, setMatrix] = useState<PixelMatrixParams>(DEFAULT_MATRIX);
  const targetMatrixRef = useRef<PixelMatrixParams>(DEFAULT_MATRIX);
  const smoothMatrixRef = useRef<PixelMatrixParams>({ ...DEFAULT_MATRIX });
  const pointerRef = useRef<{ x: number; y: number; amp: number }>({ x: 0.5, y: 0.5, amp: 0 });
  const hasVideoRef = useRef(false);

  const [prompt, setPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(
    'Single-layer WebGL pixel matrix ready. Upload an MP4 or tune sliders/prompts in real time.'
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    targetMatrixRef.current = matrix;
  }, [matrix]);

  useEffect(() => {
    hasVideoRef.current = Boolean(videoSrc.url);
  }, [videoSrc.url]);

  const ensureAudioPipeline = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    try {
      liquidAudioEngine.unlockFromUserGesture();
      const { ctx, analyser: kernelAnalyser } = synesthesiaEngine.getSharedAudioNodes();
      if (ctx.state === 'suspended') {
        void ctx.resume().catch(() => {});
      }
      if (!audioWiredRef.current) {
        const source = mediaBridge.getOrCreateMediaSource(ctx, vid);
        if (source) {
          const gain = ctx.createGain();
          gain.gain.value = muted ? 0 : volume;
          const localAn = ctx.createAnalyser();
          localAn.fftSize = 256;
          localAn.smoothingTimeConstant = 0.78;
          const dest = ctx.createMediaStreamDestination();

          source.connect(gain);
          gain.connect(localAn);
          localAn.connect(ctx.destination);
          gain.connect(kernelAnalyser);
          gain.connect(dest);

          videoGainRef.current = gain;
          localAnalyserRef.current = localAn;
          freqBufRef.current = new Uint8Array(new ArrayBuffer(localAn.frequencyBinCount));
          audioDestRef.current = dest;
          audioWiredRef.current = true;
        }
      }
      if (videoGainRef.current) {
        videoGainRef.current.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
      }
    } catch {
      // Fallback: keep native HTMLMediaElement output
    }
  }, [muted, volume]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.loop = loop;
    vid.muted = audioWiredRef.current ? false : muted;
    vid.volume = muted ? 0 : volume;
    if (videoGainRef.current) {
      const { ctx } = synesthesiaEngine.getSharedAudioNodes();
      videoGainRef.current.gain.setTargetAtTime(muted ? 0 : volume, ctx.currentTime, 0.02);
    }
  }, [loop, muted, volume]);

  const loadVideoUrl = useCallback(
    async (title: string, objectUrl: string) => {
      setErrorMsg(null);
      setVideoSrc((prev) => {
        if (prev.url && prev.url.startsWith('blob:') && prev.url !== objectUrl) {
          // Only revoke if we created it directly; handoff blobs may still be shared
        }
        return { title, url: objectUrl };
      });
      setVideoFrames(0);

      const vid = videoRef.current;
      if (vid) {
        ensureAudioPipeline();
        vid.src = objectUrl;
        vid.loop = loop;
        vid.load();
        try {
          await vid.play();
          setPlaying(true);
          synesthesiaEngine.setLiquidAudioActive(true);
        } catch {
          setPlaying(false);
        }
      }
      setStatusMsg(`Loaded "${title}" directly into fused WebGL pixel matrix.`);
      neuralBus.publish('FORGE', 'LIQUID_VIDEO_LOAD', `Loaded "${title}" into Liquid Video shader.`);
    },
    [ensureAudioPipeline, loop]
  );

  // Consume pending handoffs from Organic MP4 Player or Video Editor
  useEffect(() => {
    const applyPayload = (p: ReturnType<typeof mediaBridge.consumePendingLiquidVideo>) => {
      if (!p) return;
      void loadVideoUrl(p.title, p.objectUrl);
      setMatrix((prev) => ({
        ...prev,
        contrast: clampNum(p.contrast, 0.6, 2.0, prev.contrast),
        saturation: clampNum(p.saturation, 0, 2.2, prev.saturation),
      }));
    };
    applyPayload(mediaBridge.consumePendingLiquidVideo());
    return mediaBridge.subscribeLiquidVideoHandoffs((payload) => {
      applyPayload(payload);
    });
  }, [loadVideoUrl]);

  const handleUploadFile = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = Array.from(files).find((f) => f.type.startsWith('video/') || /\.(mp4|mov|webm|m4v|ogv)$/i.test(f.name));
    if (!file) {
      setErrorMsg('Please select an MP4, MOV, or WebM video file.');
      return;
    }
    const url = URL.createObjectURL(file);
    void loadVideoUrl(file.name, url);
  };

  // Track hardware decoded video frames via requestVideoFrameCallback
  useEffect(() => {
    const vid = videoRef.current as (HTMLVideoElement & {
      requestVideoFrameCallback?: (cb: () => void) => number;
      cancelVideoFrameCallback?: (id: number) => void;
    }) | null;
    if (!vid || !vid.requestVideoFrameCallback) return;

    let id = 0;
    let active = true;
    const onFrame = () => {
      if (!active) return;
      setVideoFrames((f) => f + 1);
      id = vid.requestVideoFrameCallback!(onFrame);
    };
    id = vid.requestVideoFrameCallback(onFrame);
    return () => {
      active = false;
      if (id && vid.cancelVideoFrameCallback) vid.cancelVideoFrameCallback(id);
    };
  }, [videoSrc.url]);

  // Unified 60fps Single-Layer WebGL Pixel Matrix Loop
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;

    const feedCanvas = document.createElement('canvas');
    feedCanvas.width = 640;
    feedCanvas.height = 360;
    feedCanvasRef.current = feedCanvas;
    const feedCtx = feedCanvas.getContext('2d');

    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, antialias: false });
    let prog: WebGLProgram | null = null;
    let tex: WebGLTexture | null = null;

    if (gl) {
      const compile = (type: number, src: string) => {
        const s = gl.createShader(type);
        if (!s) return null;
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) return null;
        return s;
      };
      const vs = compile(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
      const fs = compile(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
      if (vs && fs) {
        const p = gl.createProgram();
        if (p) {
          gl.attachShader(p, vs);
          gl.attachShader(p, fs);
          gl.linkProgram(p);
          if (gl.getProgramParameter(p, gl.LINK_STATUS)) {
            prog = p;
          }
        }
      }

      if (prog) {
        setWebglActive(true);
        gl.useProgram(prog);
        const buf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
        const loc = gl.getAttribLocation(prog, 'aPos');
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

        tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      } else {
        setWebglActive(false);
      }
    } else {
      setWebglActive(false);
    }

    const locCache = prog && gl
      ? {
          uTex: gl.getUniformLocation(prog, 'uTex'),
          uRes: gl.getUniformLocation(prog, 'uRes'),
          uTime: gl.getUniformLocation(prog, 'uTime'),
          uAudioBass: gl.getUniformLocation(prog, 'uAudioBass'),
          uAudioTreble: gl.getUniformLocation(prog, 'uAudioTreble'),
          uAudioRms: gl.getUniformLocation(prog, 'uAudioRms'),
          uPointer: gl.getUniformLocation(prog, 'uPointer'),
          uPointerAmp: gl.getUniformLocation(prog, 'uPointerAmp'),
          uWarpStrength: gl.getUniformLocation(prog, 'uWarpStrength'),
          uMeshFreq: gl.getUniformLocation(prog, 'uMeshFreq'),
          uMeshBlend: gl.getUniformLocation(prog, 'uMeshBlend'),
          uPrismSplit: gl.getUniformLocation(prog, 'uPrismSplit'),
          uPixelSize: gl.getUniformLocation(prog, 'uPixelSize'),
          uKernelEdge: gl.getUniformLocation(prog, 'uKernelEdge'),
          uRgbGain: gl.getUniformLocation(prog, 'uRgbGain'),
          uHueShift: gl.getUniformLocation(prog, 'uHueShift'),
          uContrast: gl.getUniformLocation(prog, 'uContrast'),
          uSaturation: gl.getUniformLocation(prog, 'uSaturation'),
          uSolarize: gl.getUniformLocation(prog, 'uSolarize'),
          uScanlines: gl.getUniformLocation(prog, 'uScanlines'),
          uTintColor: gl.getUniformLocation(prog, 'uTintColor'),
        }
      : null;

    let rafId = 0;
    let frameCounter = 0;
    let lastFpsAt = performance.now();
    const startTs = performance.now();

    const lerp = (a: number, b: number, k = 0.22) => a + (b - a) * k;

    const renderFrame = (now: number) => {
      rafId = requestAnimationFrame(renderFrame);
      frameCounter += 1;
      if (now - lastFpsAt >= 500) {
        setFps(Math.min(60, Math.round((frameCounter * 1000) / Math.max(1, now - lastFpsAt))));
        frameCounter = 0;
        lastFpsAt = now;
      }

      const t = (now - startTs) * 0.001;
      const vid = videoRef.current;

      // Sample live FFT audio from video OR global Synesthesia engine
      let bass = 0;
      let treble = 0;
      let rms = 0;
      if (localAnalyserRef.current && freqBufRef.current) {
        localAnalyserRef.current.getByteFrequencyData(freqBufRef.current);
        const buf = freqBufRef.current;
        for (let i = 0; i < 10; i++) bass += buf[i];
        for (let i = 28; i < Math.min(72, buf.length); i++) treble += buf[i];
        for (let i = 0; i < Math.min(64, buf.length); i++) rms += buf[i];
        bass /= 10 * 255;
        treble /= 44 * 255;
        rms /= 64 * 255;
      } else {
        const syn = synesthesiaEngine.getState();
        bass = syn.bass;
        treble = syn.treble;
        rms = syn.rms;
      }

      pointerRef.current.amp *= 0.93;

      // Smoothly interpolate active GPU matrix towards target slider/AI values
      const tgt = targetMatrixRef.current;
      const cur = smoothMatrixRef.current;
      cur.warpStrength = lerp(cur.warpStrength, tgt.warpStrength);
      cur.meshFreq = lerp(cur.meshFreq, tgt.meshFreq);
      cur.meshBlend = lerp(cur.meshBlend, tgt.meshBlend);
      cur.prismSplit = lerp(cur.prismSplit, tgt.prismSplit);
      cur.pixelSize = lerp(cur.pixelSize, tgt.pixelSize);
      cur.kernelEdge = lerp(cur.kernelEdge, tgt.kernelEdge);
      cur.redGain = lerp(cur.redGain, tgt.redGain);
      cur.greenGain = lerp(cur.greenGain, tgt.greenGain);
      cur.blueGain = lerp(cur.blueGain, tgt.blueGain);
      cur.hueShift = lerp(cur.hueShift, tgt.hueShift);
      cur.contrast = lerp(cur.contrast, tgt.contrast);
      cur.saturation = lerp(cur.saturation, tgt.saturation);
      cur.solarize = lerp(cur.solarize, tgt.solarize);
      cur.scanlines = lerp(cur.scanlines, tgt.scanlines);
      cur.tintHex = tgt.tintHex;

      const usingLiveVideo = Boolean(hasVideoRef.current && vid && vid.readyState >= 2);
      if (!usingLiveVideo && feedCtx) {
        drawSyntheticFeedFrame(feedCtx, feedCanvas.width, feedCanvas.height, t, bass);
      }

      if (gl && prog && tex && locCache) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        if (usingLiveVideo && vid) {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, vid);
        } else {
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, feedCanvas);
        }

        const [tr, tg, tb] = hexToRgbNorm(cur.tintHex);
        gl.uniform1i(locCache.uTex, 0);
        gl.uniform2f(locCache.uRes, canvas.width, canvas.height);
        gl.uniform1f(locCache.uTime, t);
        gl.uniform1f(locCache.uAudioBass, bass);
        gl.uniform1f(locCache.uAudioTreble, treble);
        gl.uniform1f(locCache.uAudioRms, rms);
        gl.uniform2f(locCache.uPointer, pointerRef.current.x, pointerRef.current.y);
        gl.uniform1f(locCache.uPointerAmp, pointerRef.current.amp);

        gl.uniform1f(locCache.uWarpStrength, cur.warpStrength);
        gl.uniform1f(locCache.uMeshFreq, cur.meshFreq);
        gl.uniform1f(locCache.uMeshBlend, cur.meshBlend);
        gl.uniform1f(locCache.uPrismSplit, cur.prismSplit);
        gl.uniform1f(locCache.uPixelSize, cur.pixelSize);
        gl.uniform1f(locCache.uKernelEdge, cur.kernelEdge);
        gl.uniform3f(locCache.uRgbGain, cur.redGain, cur.greenGain, cur.blueGain);
        gl.uniform1f(locCache.uHueShift, cur.hueShift);
        gl.uniform1f(locCache.uContrast, cur.contrast);
        gl.uniform1f(locCache.uSaturation, cur.saturation);
        gl.uniform1f(locCache.uSolarize, cur.solarize);
        gl.uniform1f(locCache.uScanlines, cur.scanlines);
        gl.uniform3f(locCache.uTintColor, tr, tg, tb);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      } else {
        // Software 2D fallback if WebGL unavailable
        const ctx2d = canvas.getContext('2d');
        if (ctx2d) {
          ctx2d.clearRect(0, 0, canvas.width, canvas.height);
          if (usingLiveVideo && vid) {
            ctx2d.drawImage(vid, 0, 0, canvas.width, canvas.height);
          } else {
            ctx2d.drawImage(feedCanvas, 0, 0, canvas.width, canvas.height);
          }
        }
      }
    };

    rafId = requestAnimationFrame(renderFrame);
    return () => {
      cancelAnimationFrame(rafId);
      if (gl && tex) gl.deleteTexture(tex);
      if (gl && prog) gl.deleteProgram(prog);
    };
  }, []);

  const handleTogglePlay = async () => {
    const vid = videoRef.current;
    if (!videoSrc.url || !vid) {
      setPlaying((p) => !p);
      return;
    }
    ensureAudioPipeline();
    if (vid.paused) {
      try {
        await vid.play();
        setPlaying(true);
        synesthesiaEngine.setLiquidAudioActive(true);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Unable to start video.');
      }
    } else {
      vid.pause();
      setPlaying(false);
      synesthesiaEngine.setLiquidAudioActive(false);
    }
  };

  const handleAiPromptMatrix = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || aiBusy) return;
    setAiBusy(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/liquid-video/matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

      const nextMatrix: PixelMatrixParams = {
        presetName: String(data.presetName || 'AI Matrix'),
        shaderSummary: String(data.shaderSummary || 'Prompt-sculpted pixel matrix uniform set.'),
        warpStrength: clampNum(data.warpStrength, 0, 0.14, matrix.warpStrength),
        meshFreq: clampNum(data.meshFreq, 1.5, 18, matrix.meshFreq),
        meshBlend: clampNum(data.meshBlend, 0, 1, matrix.meshBlend),
        prismSplit: clampNum(data.prismSplit, 0, 0.05, matrix.prismSplit),
        pixelSize: Math.round(clampNum(data.pixelSize, 1, 32, matrix.pixelSize)),
        kernelEdge: clampNum(data.kernelEdge, -0.8, 2.2, matrix.kernelEdge),
        redGain: clampNum(data.redGain, 0.2, 2, matrix.redGain),
        greenGain: clampNum(data.greenGain, 0.2, 2, matrix.greenGain),
        blueGain: clampNum(data.blueGain, 0.2, 2, matrix.blueGain),
        hueShift: clampNum(data.hueShift, -180, 180, matrix.hueShift),
        contrast: clampNum(data.contrast, 0.6, 2, matrix.contrast),
        saturation: clampNum(data.saturation, 0, 2.2, matrix.saturation),
        solarize: clampNum(data.solarize, 0, 1, matrix.solarize),
        scanlines: clampNum(data.scanlines, 0, 0.85, matrix.scanlines),
        tintHex: typeof data.tintHex === 'string' && /^#[0-9a-fA-F]{6}$/.test(data.tintHex) ? data.tintHex : matrix.tintHex,
      };
      setMatrix(nextMatrix);
      setStatusMsg(`Morphed Pixel Matrix → ${nextMatrix.presetName}: ${nextMatrix.shaderSummary}`);
      neuralBus.publish('FORGE', 'LIQUID_VIDEO_AI', `Morphed Pixel Matrix via prompt: "${clean}"`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Matrix prompt failed.');
    } finally {
      setAiBusy(false);
    }
  };

  const handleToggleRecord = () => {
    if (recording && recorderRef.current) {
      recorderRef.current.stop();
      setRecording(false);
      return;
    }
    const canvas = glCanvasRef.current;
    if (!canvas || typeof canvas.captureStream !== 'function' || typeof MediaRecorder === 'undefined') {
      setErrorMsg('60fps canvas capture is unavailable in this browser.');
      return;
    }
    ensureAudioPipeline();
    const stream = canvas.captureStream(60);
    if (audioDestRef.current && !muted) {
      audioDestRef.current.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
    }

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';
    const rec = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 6_000_000 });
    recordedChunksRef.current = [];
    rec.ondataavailable = (ev) => {
      if (ev.data.size > 0) recordedChunksRef.current.push(ev.data);
    };
    rec.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `liquid-video-${Date.now()}.webm`;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
      setStatusMsg('Exported 60fps Liquid Video with fused pixel matrix & audio.');
    };
    recorderRef.current = rec;
    rec.start(250);
    setRecording(true);
    setStatusMsg('Recording 60fps fused Liquid Video shader output...');
  };

  const handleSendToEditor = () => {
    if (!videoSrc.url) {
      setErrorMsg('Upload an MP4/WebM clip first before sending to the Video Editor.');
      return;
    }
    mediaBridge.sendVideoToEditor({
      id: `lv-${Date.now().toString(36)}`,
      title: `${videoSrc.title} (${matrix.presetName})`,
      objectUrl: videoSrc.url,
      duration: duration || 12,
      trimIn: 0,
      trimOut: duration || 12,
      speed: 1.0,
      brightness: 100,
      contrast: Math.round(matrix.contrast * 100),
      saturation: Math.round(matrix.saturation * 100),
      opacity: 1,
      overlayText: '',
      overlayPos: 'bottom',
      liquidUnderlay: true,
      liquidMode: 'bio-caustics',
    });
    onOpenApp?.('videoeditor');
  };

  const injectPointerRipple = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointerRef.current = {
      x: Math.max(0, Math.min(1, (e.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.max(0, Math.min(1, (e.clientY - rect.top) / Math.max(1, rect.height))),
      amp: 1.0,
    };
  };

  const updateField = <K extends keyof PixelMatrixParams>(key: K, value: PixelMatrixParams[K]) => {
    setMatrix((prev) => ({ ...prev, presetName: 'Custom Matrix', [key]: value }));
  };

  return (
    <div
      className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto text-xs"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleUploadFile(e.dataTransfer.files);
      }}
    >
      {/* Hidden hardware-active video decoder bay (never display:none so 60fps decoding stays unthrottled) */}
      <video
        ref={videoRef}
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => {
          if (!loop) {
            setPlaying(false);
            synesthesiaEngine.setLiquidAudioActive(false);
          }
        }}
        className="fixed bottom-0 right-0 w-2 h-2 opacity-[0.002] pointer-events-none"
      />

      {/* Top Header & Actions */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <Droplets className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              Liquid Video · Single-Layer Pixel Matrix
            </h2>
            <p className="text-[11px] text-slate-400 truncate mt-0.5">
              {videoSrc.title} · <span className="text-cyan-300">{matrix.presetName}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {videoSrc.url && (
            <button
              type="button"
              onClick={handleSendToEditor}
              className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Film className="w-3.5 h-3.5" />
              <span>To Editor</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleToggleRecord}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              recording
                ? 'bg-rose-500/25 border-rose-400/55 text-rose-100 animate-pulse'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-100'
            }`}
          >
            <CircleDot className="w-3.5 h-3.5" />
            <span>{recording ? 'Stop Export' : 'Export 60fps'}</span>
          </button>

          <label className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap">
            <Upload className="w-3.5 h-3.5" />
            <span>Load MP4</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime,video/*"
              onChange={(e) => {
                handleUploadFile(e.target.files);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Prompt-Driven Real-Time Matrix Bar */}
      <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleAiPromptMatrix(prompt);
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe how to morph the video's pixel matrix in real time (e.g. Holographic liquid emerald prism)..."
            className="flex-1 bg-[#050a14] border border-white/15 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/60"
          />
          <button
            type="submit"
            disabled={aiBusy || !prompt.trim()}
            className="px-3.5 py-2 rounded-lg bg-fuchsia-500/25 hover:bg-fuchsia-500/35 border border-fuchsia-400/50 text-fuchsia-100 font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiBusy ? 'Morphing...' : 'Morph Matrix'}</span>
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-1.5">
          {MATRIX_PRESETS.map((p) => (
            <button
              key={p.presetName}
              type="button"
              onClick={() => {
                setMatrix(p);
                setStatusMsg(`Applied "${p.presetName}": ${p.shaderSummary}`);
              }}
              className={`px-2 py-1 rounded-md border text-[11px] cursor-pointer transition-colors ${
                matrix.presetName === p.presetName
                  ? 'bg-cyan-500/25 border-cyan-400/50 text-cyan-100'
                  : 'bg-white/[0.04] hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              {p.presetName}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setMatrix(DEFAULT_MATRIX)}
            className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 inline-flex items-center gap-1 cursor-pointer ml-auto"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {QUICK_PROMPTS.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={aiBusy}
              onClick={() => {
                setPrompt(qp);
                void handleAiPromptMatrix(qp);
              }}
              className="px-2 py-0.5 rounded bg-indigo-500/12 hover:bg-indigo-500/22 border border-indigo-400/25 text-[10px] text-indigo-200 cursor-pointer disabled:opacity-50"
            >
              ✦ {qp}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split: Fused Single-Layer WebGL Screen + Transport vs Pixel Matrix Sliders */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 shrink-0 lg:flex-1 lg:min-h-0">
        {/* Left: Unified Single-Layer Synthetic Screen + Transport */}
        <div className="lg:col-span-7 flex flex-col gap-2.5">
          <div className="relative rounded-xl overflow-hidden border border-cyan-400/25 bg-[#030712] aspect-video max-h-[340px] lg:max-h-none lg:flex-1 lg:min-h-[250px] touch-none">
            <canvas
              ref={glCanvasRef}
              width={960}
              height={540}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                injectPointerRipple(e);
              }}
              onPointerMove={(e) => {
                if (e.buttons > 0 || e.pointerType === 'touch') injectPointerRipple(e);
              }}
              className="w-full h-full block object-contain cursor-crosshair"
            />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-md bg-slate-950/75 border border-white/10 text-[10px] font-mono-tabular text-cyan-200 pointer-events-none">
              {webglActive ? 'WebGL Fused Shader' : 'Canvas Fallback'} · {fps}fps
              {videoSrc.url ? ` · ${videoFrames} frames` : ' · Drag to inject ripple'}
            </div>
          </div>

          {/* Transport Bar */}
          <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
            {videoSrc.url && (
              <div className="flex items-center gap-2.5 font-mono-tabular text-[11px] text-slate-300">
                <span className="w-10">{formatTime(currentTime)}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0.1, duration)}
                  step={0.05}
                  value={currentTime}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setCurrentTime(next);
                    if (videoRef.current) videoRef.current.currentTime = next;
                  }}
                  className="flex-1 accent-cyan-400 cursor-pointer"
                />
                <span className="w-10 text-right">{formatTime(duration)}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleTogglePlay()}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/50 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{playing ? 'Pause' : 'Play'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    ensureAudioPipeline();
                    setMuted((m) => !m);
                  }}
                  aria-label="Toggle Mute"
                  className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 cursor-pointer"
                >
                  {muted ? <VolumeX className="w-4 h-4 text-rose-300" /> : <Volume2 className="w-4 h-4 text-cyan-300" />}
                </button>

                <button
                  type="button"
                  onClick={() => setLoop((l) => !l)}
                  className={`px-2.5 py-1.5 rounded-lg border text-[11px] inline-flex items-center gap-1 cursor-pointer ${
                    loop ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100' : 'bg-white/6 border-white/10 text-slate-400'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  <span>Loop</span>
                </button>
              </div>

              <label className="inline-flex items-center gap-2 text-[11px] font-mono-tabular text-slate-300">
                <span>Vol</span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.02}
                  value={volume}
                  onChange={(e) => {
                    ensureAudioPipeline();
                    setVolume(Number(e.target.value));
                  }}
                  className="w-20 accent-cyan-400 cursor-pointer"
                />
                <span>{Math.round(volume * 100)}%</span>
              </label>
            </div>
          </div>

          {(errorMsg || statusMsg) && (
            <div
              className={`rounded-xl border px-3 py-2 text-[11px] shrink-0 ${
                errorMsg
                  ? 'border-rose-400/35 bg-rose-500/12 text-rose-100'
                  : 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100'
              }`}
            >
              {errorMsg || statusMsg}
            </div>
          )}
        </div>

        {/* Right: Real-Time Pixel Matrix & Shader Sliders */}
        <div className="lg:col-span-5 aether-panel rounded-xl p-3 space-y-3 lg:overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-300" />
              <span>Real-Time Pixel Matrix Controls</span>
            </span>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <span>Tint</span>
              <input
                type="color"
                value={matrix.tintHex}
                onChange={(e) => updateField('tintHex', e.target.value)}
                className="w-6 h-5 rounded bg-transparent border border-white/20 cursor-pointer"
              />
            </label>
          </div>

          {/* Group 1: Liquid Wave Fusion */}
          <div className="space-y-2">
            <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
              01 · Liquid Mesh Refraction (Fused into Pixels)
            </div>
            <MatrixSlider
              label="Fluid Refraction Warp"
              value={matrix.warpStrength}
              min={0}
              max={0.14}
              step={0.002}
              display={`${(matrix.warpStrength * 100).toFixed(1)}%`}
              onChange={(v) => updateField('warpStrength', v)}
            />
            <MatrixSlider
              label="Mesh Wave Frequency"
              value={matrix.meshFreq}
              min={1.5}
              max={18}
              step={0.2}
              display={`${matrix.meshFreq.toFixed(1)}Hz`}
              onChange={(v) => updateField('meshFreq', v)}
            />
            <MatrixSlider
              label="Caustic Energy Fusion"
              value={matrix.meshBlend}
              min={0}
              max={1}
              step={0.02}
              display={`${Math.round(matrix.meshBlend * 100)}%`}
              onChange={(v) => updateField('meshBlend', v)}
            />
            <MatrixSlider
              label="RGB Chromatic Prism"
              value={matrix.prismSplit}
              min={0}
              max={0.05}
              step={0.001}
              display={`${(matrix.prismSplit * 1000).toFixed(0)}px`}
              onChange={(v) => updateField('prismSplit', v)}
            />
          </div>

          {/* Group 2: Spatial Matrix & Convolution Kernel */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-wider text-fuchsia-300">
              02 · Spatial Pixel Matrix & Kernel
            </div>
            <MatrixSlider
              label="Pixel Matrix Cell Size"
              value={matrix.pixelSize}
              min={1}
              max={32}
              step={1}
              display={matrix.pixelSize === 1 ? 'HD 1px' : `${matrix.pixelSize}px`}
              onChange={(v) => updateField('pixelSize', Math.round(v))}
            />
            <MatrixSlider
              label="3×3 Kernel Edge / Sharpen"
              value={matrix.kernelEdge}
              min={-0.8}
              max={2.2}
              step={0.05}
              display={matrix.kernelEdge.toFixed(2)}
              onChange={(v) => updateField('kernelEdge', v)}
            />
            <MatrixSlider
              label="Phosphor Scanlines"
              value={matrix.scanlines}
              min={0}
              max={0.85}
              step={0.02}
              display={`${Math.round(matrix.scanlines * 100)}%`}
              onChange={(v) => updateField('scanlines', v)}
            />
            <MatrixSlider
              label="Wave-Fold Solarize"
              value={matrix.solarize}
              min={0}
              max={1}
              step={0.02}
              display={`${Math.round(matrix.solarize * 100)}%`}
              onChange={(v) => updateField('solarize', v)}
            />
          </div>

          {/* Group 3: RGB Color Matrix Gains */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
              03 · RGB Color Matrix Transform
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MatrixSlider
                label="R Gain"
                value={matrix.redGain}
                min={0.2}
                max={2.0}
                step={0.04}
                display={matrix.redGain.toFixed(2)}
                onChange={(v) => updateField('redGain', v)}
              />
              <MatrixSlider
                label="G Gain"
                value={matrix.greenGain}
                min={0.2}
                max={2.0}
                step={0.04}
                display={matrix.greenGain.toFixed(2)}
                onChange={(v) => updateField('greenGain', v)}
              />
              <MatrixSlider
                label="B Gain"
                value={matrix.blueGain}
                min={0.2}
                max={2.0}
                step={0.04}
                display={matrix.blueGain.toFixed(2)}
                onChange={(v) => updateField('blueGain', v)}
              />
            </div>
            <MatrixSlider
              label="Hue Matrix Rotation"
              value={matrix.hueShift}
              min={-180}
              max={180}
              step={2}
              display={`${Math.round(matrix.hueShift)}°`}
              onChange={(v) => updateField('hueShift', v)}
            />
            <div className="grid grid-cols-2 gap-2">
              <MatrixSlider
                label="Contrast"
                value={matrix.contrast}
                min={0.6}
                max={2.0}
                step={0.02}
                display={`${Math.round(matrix.contrast * 100)}%`}
                onChange={(v) => updateField('contrast', v)}
              />
              <MatrixSlider
                label="Saturation"
                value={matrix.saturation}
                min={0}
                max={2.2}
                step={0.02}
                display={`${Math.round(matrix.saturation * 100)}%`}
                onChange={(v) => updateField('saturation', v)}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MatrixSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (val: number) => void;
}) {
  return (
    <label className="block space-y-1 text-[11px]">
      <div className="flex items-center justify-between text-slate-300 font-mono-tabular">
        <span className="truncate pr-2">{label}</span>
        <span className="text-cyan-300 shrink-0">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-cyan-400 cursor-pointer"
      />
    </label>
  );
}
