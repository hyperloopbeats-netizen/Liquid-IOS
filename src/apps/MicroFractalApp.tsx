import { useEffect, useRef, useState } from 'react';
import { Cpu, Flame, Lock, Unlock, Zap } from 'lucide-react';
import { microFractalKernel } from '../kernel/microFractalKernel';
import type { MicroFractalState } from '../types/os';

export function MicroFractalApp() {
  const [state, setState] = useState<MicroFractalState>(microFractalKernel.getState());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return microFractalKernel.subscribe(setState);
  }, []);

  // Binary Refraction Fractal Tree + 120Hz 8.33ms Frame Budget Oscilloscope
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;

    const drawBranch = (
      x: number,
      y: number,
      len: number,
      angle: number,
      depth: number,
      maxDepth: number,
      refract: number,
      tick: number
    ) => {
      if (depth > maxDepth || len < 5) return;
      const spread = 0.36 + (refract - 1) * 0.28;
      const nx = x + Math.cos(angle) * len;
      const ny = y + Math.sin(angle) * len;

      const bitActive = ((tick + depth) & 1) === 0;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(nx, ny);
      ctx.strokeStyle = bitActive
        ? `rgba(56, 189, 248, ${Math.max(0.25, 0.9 - depth * 0.16)})`
        : `rgba(45, 212, 191, ${Math.max(0.25, 0.85 - depth * 0.16)})`;
      ctx.lineWidth = Math.max(1, 3.2 - depth * 0.6);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(nx, ny, Math.max(2, 4.5 - depth * 0.7), 0, Math.PI * 2);
      ctx.fillStyle = bitActive ? '#38bdf8' : '#2dd4bf';
      ctx.fill();

      const wobble = Math.sin(tick * 0.04 + depth) * 0.06;
      drawBranch(nx, ny, len * 0.68, angle - spread + wobble, depth + 1, maxDepth, refract, tick);
      drawBranch(nx, ny, len * 0.68, angle + spread - wobble, depth + 1, maxDepth, refract, tick);
    };

    const render = () => {
      rafId = requestAnimationFrame(render);
      const parent = canvas.parentElement;
      if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
        canvas.width = parent.clientWidth;
        canvas.height = Math.max(180, parent.clientHeight);
      }

      const w = canvas.width;
      const h = canvas.height;
      const st = microFractalKernel.getState();

      ctx.fillStyle = '#040814';
      ctx.fillRect(0, 0, w, h);

      // Left half: Recursive Binary Refraction Tree
      const treeOriginX = w * 0.28;
      const treeOriginY = h - 22;
      drawBranch(
        treeOriginX,
        treeOriginY,
        Math.min(54, h * 0.25),
        -Math.PI / 2,
        1,
        st.fractalDepth + 1,
        st.refractionIndex,
        st.frameTick
      );

      // Right half: 120Hz (8.33ms) Frame Time Histogram
      const gx = w * 0.54;
      const gw = w * 0.42;
      const gy = 20;
      const gh = h - 42;

      ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
      ctx.strokeRect(gx, gy, gw, gh);

      // 8.33ms 120fps target budget line
      const budgetRatio = Math.min(1, 8.33 / 16.67);
      const budgetY = gy + gh * (1 - budgetRatio);
      ctx.beginPath();
      ctx.setLineDash([4, 4]);
      ctx.moveTo(gx, budgetY);
      ctx.lineTo(gx + gw, budgetY);
      ctx.strokeStyle = '#34d399';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#34d399';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('8.33ms (120fps Target)', gx + 6, budgetY - 5);

      const hist = st.frameHistoryMs;
      const stepX = gw / Math.max(1, hist.length - 1);
      ctx.beginPath();
      hist.forEach((ms, i) => {
        const px = gx + i * stepX;
        const norm = Math.min(1, ms / 16.67);
        const py = gy + gh * (1 - norm);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = st.lastFrameMs <= 8.5 ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();
    };

    render();
    return () => cancelAnimationFrame(rafId);
  }, []);

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      {/* Top Control Header */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Micro Fractal 120fps Kernel & Binary Refraction Agents
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 font-mono-tabular">
              Bitmask 0b{state.binaryMask.toString(2).padStart(8, '0')} · Frame Slice {state.lastFrameMs.toFixed(2)}ms / {state.frameBudgetMs}ms
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => microFractalKernel.setAutoRefractLock(!state.autoRefractLock)}
            className={`px-3 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer ${
              state.autoRefractLock
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/8 border-white/15 text-slate-300'
            }`}
          >
            {state.autoRefractLock ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            <span>{state.autoRefractLock ? '120Hz Lock Active' : 'Lock Disengaged'}</span>
          </button>

          <button
            type="button"
            onClick={() => microFractalKernel.triggerStressBurst()}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{state.stressBurstActive ? 'Stress Active...' : 'Simulate Load Burst'}</span>
          </button>

          <button
            type="button"
            onClick={() => microFractalKernel.rebalance120fps()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Refract & Hold 120fps</span>
          </button>
        </div>
      </div>

      {/* Telemetry Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 font-mono-tabular">
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Target Pacing</div>
          <div className="text-lg font-semibold text-cyan-300 mt-0.5">{state.measuredFps} FPS</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Slice Duration</div>
          <div className={`text-lg font-semibold mt-0.5 ${state.lastFrameMs <= 8.5 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {state.lastFrameMs.toFixed(2)} ms
          </div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Jitter Variance</div>
          <div className="text-lg font-semibold text-slate-100 mt-0.5">±{state.jitterMs.toFixed(2)} ms</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Refraction Stability</div>
          <div className="text-lg font-semibold text-teal-300 mt-0.5">{state.stabilityScore}%</div>
        </div>
      </div>

      {/* Fractal Canvas + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0">
        <div className="lg:col-span-6 flex flex-col gap-2.5 min-h-0">
          <div className="flex-1 min-h-[180px] rounded-xl overflow-hidden border border-white/10 bg-[#040814]">
            <canvas ref={canvasRef} className="w-full h-full block" />
          </div>

          <div className="aether-panel rounded-xl p-3 grid grid-cols-2 gap-3 shrink-0">
            <label className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Fractal Recursion Depth</span>
                <span>L{state.fractalDepth}</span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                step={1}
                value={state.fractalDepth}
                onChange={(e) => microFractalKernel.setFractalDepth(Number(e.target.value))}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </label>

            <label className="space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-300 font-mono-tabular">
                <span>Refraction Index</span>
                <span>{state.refractionIndex.toFixed(2)}η</span>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.4}
                step={0.05}
                value={state.refractionIndex}
                onChange={(e) => microFractalKernel.setRefractionIndex(Number(e.target.value))}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </label>
          </div>
        </div>

        {/* Right: 8 Binary Refraction Subsystem Management Agents */}
        <div className="lg:col-span-6 aether-panel rounded-xl p-3 flex flex-col min-h-0">
          <div className="flex items-center justify-between pb-2 border-b border-white/10 shrink-0">
            <span className="font-semibold text-slate-100">
              Binary Refraction Subsystem Agents ({state.agents.length})
            </span>
            <span className="text-[10px] text-slate-400">
              Click phase to cycle continuous / even / odd / quad slice
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pt-2 space-y-1.5">
            {state.agents.map((agent) => (
              <div
                key={agent.id}
                className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono-tabular">
                    <span className="text-[11px] font-semibold text-cyan-300">{agent.bitmask}</span>
                    <span className="font-sans font-medium text-slate-100 truncate">{agent.name}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 font-mono-tabular">
                    {agent.subsystem} · {agent.actualUs}µs / {agent.budgetUs}µs · Refracted {agent.throttledCount}x
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => microFractalKernel.cycleAgentPhase(agent.id)}
                    className="px-2 py-1 rounded bg-white/8 hover:bg-white/15 border border-white/12 text-[10px] font-mono text-teal-200 cursor-pointer"
                  >
                    {agent.phase}
                  </button>
                  <input
                    type="checkbox"
                    checked={agent.enabled}
                    onChange={() => microFractalKernel.toggleAgent(agent.id)}
                    aria-label={`Enable ${agent.name}`}
                    className="accent-cyan-400 cursor-pointer"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
