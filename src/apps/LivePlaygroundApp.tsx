import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Code2,
  Cpu,
  Download,
  GitMerge,
  Layers,
  Play,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { codeClusterStore, type CodeClusterStoreState } from '../kernel/codeClusterStore';
import type { AppId, CodeLibraryCluster } from '../types/os';

interface LivePlaygroundAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const SAMPLE_SNIPPET = `// Drop or edit any JS/WebGL/Audio snippet to self-assemble into Library Clusters
function createPlasmaRing(radius, freq) {
  const pts = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    pts.push({
      x: Math.cos(a) * (radius + Math.sin(a * 6 + freq) * 12),
      y: Math.sin(a) * (radius + Math.cos(a * 4 + freq) * 12),
    });
  }
  return pts;
}

function playSynthBell(ctx, hz = 440) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(hz, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}`;

export function LivePlaygroundApp({ onOpenApp, onShowToast }: LivePlaygroundAppProps) {
  const [store, setStore] = useState<CodeClusterStoreState>(() => codeClusterStore.getState());
  const [selectedId, setSelectedId] = useState<string>(
    () => codeClusterStore.getState().clusters[0]?.id ?? ''
  );
  const [mergeTargetId, setMergeTargetId] = useState<string>('');
  const [codeDraft, setCodeDraft] = useState(SAMPLE_SNIPPET);
  const [sourceLabel, setSourceLabel] = useState('Playground Scratch Buffer');
  const [rightTab, setRightTab] = useState<'constellation' | 'sandbox' | 'modules'>('constellation');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    return codeClusterStore.subscribe((next) => {
      setStore(next);
      if (next.clusters.length > 0 && !next.clusters.some((c) => c.id === selectedId)) {
        setSelectedId(next.clusters[0].id);
      }
    });
  }, [selectedId]);

  const activeCluster: CodeLibraryCluster | undefined = useMemo(
    () => store.clusters.find((c) => c.id === selectedId) ?? store.clusters[0],
    [store.clusters, selectedId]
  );

  // Live animated cluster constellation canvas
  useEffect(() => {
    if (rightTab !== 'constellation') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    let phase = 0;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.max(300, Math.floor(rect.width * dpr));
      canvas.height = Math.max(200, Math.floor(rect.height * dpr));
    };
    resize();

    const draw = () => {
      phase += 0.014;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = '#030712';
      ctx.fillRect(0, 0, w, h);

      // Subtle coordinate grid
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.06)';
      ctx.lineWidth = 1;
      for (let gx = 40; gx < w; gx += 48) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, h);
        ctx.stroke();
      }
      for (let gy = 40; gy < h; gy += 48) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(w, gy);
        ctx.stroke();
      }

      const cx = w / 2;
      const cy = h / 2;
      const clusters = store.clusters;
      const nodes = clusters.map((c, idx) => {
        const angle = (idx / Math.max(1, clusters.length)) * Math.PI * 2 + phase * 0.25;
        const orbitR = Math.min(w, h) * 0.31;
        return {
          cluster: c,
          x: cx + Math.cos(angle) * orbitR,
          y: cy + Math.sin(angle) * orbitR * 0.78,
        };
      });

      // Edges between dependent clusters
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i];
          const b = nodes[j];
          const linked =
            a.cluster.dependencies.includes(b.cluster.domain) ||
            b.cluster.dependencies.includes(a.cluster.domain);
          ctx.strokeStyle = linked ? 'rgba(56, 189, 248, 0.35)' : 'rgba(148, 163, 184, 0.1)';
          ctx.lineWidth = linked ? 1.6 : 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      // Draw each library cluster + orbiting module satellites
      for (const node of nodes) {
        const isSelected = node.cluster.id === activeCluster?.id;
        const modCount = node.cluster.modules.length;
        const baseR = 20 + Math.min(18, modCount * 3);

        // Orbiting module particles
        for (let m = 0; m < Math.min(10, modCount); m++) {
          const ma = phase * (1.1 + m * 0.1) + (m / Math.max(1, modCount)) * Math.PI * 2;
          const mx = node.x + Math.cos(ma) * (baseR + 18);
          const my = node.y + Math.sin(ma) * (baseR + 18);
          ctx.fillStyle = node.cluster.colorHex;
          ctx.beginPath();
          ctx.arc(mx, my, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = isSelected ? 'rgba(15, 23, 42, 0.95)' : 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = isSelected ? '#f8fafc' : node.cluster.colorHex;
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.arc(node.x, node.y, baseR, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#f8fafc';
        ctx.font = '600 12px "Plus Jakarta Sans", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.cluster.name.slice(0, 22), node.x, node.y - 2);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px "JetBrains Mono", monospace';
        ctx.fillText(`${modCount} mod · G${node.cluster.generation}`, node.x, node.y + 13);
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [rightTab, store.clusters, activeCluster?.id]);

  const handleAssemble = async () => {
    const added = await codeClusterStore.clusterIncomingCode(codeDraft, sourceLabel);
    if (added.length > 0) {
      setSelectedId(added[0].id);
      onShowToast?.(`Self-assembled ${added.length} library cluster(s) in Playground.`);
    }
  };

  const handleHarvest = async () => {
    const count = await codeClusterStore.harvestFromVfsModules();
    onShowToast?.(
      count > 0
        ? `Pulled ${count} module(s) from Integrated Suite Apps & VFS into Library Clusters.`
        : 'All Suite & VFS modules are already linked into Library Clusters.'
    );
  };

  const handleMerge = () => {
    if (!activeCluster || !mergeTargetId || activeCluster.id === mergeTargetId) return;
    const merged = codeClusterStore.mergeClusters(activeCluster.id, mergeTargetId);
    if (merged) {
      setSelectedId(merged.id);
      setMergeTargetId('');
      onShowToast?.(`Merged into "${merged.name}".`);
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 text-xs overflow-hidden">
      {/* Header Bar */}
      <div className="shrink-0 px-4 py-2.5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 shrink-0">
          <span className="font-display font-semibold text-sm text-slate-100 whitespace-nowrap">
            Live Code Cluster Playground
          </span>
          <span className="text-slate-600">/</span>
          <span className="font-mono tabular-nums text-slate-300 whitespace-nowrap">
            {store.clusters.length} Clusters ·{' '}
            {store.clusters.reduce((a, c) => a + c.modules.length, 0)} Modules
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => void handleHarvest()}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-cyan-300" />
            <span>Harvest Suite & VFS</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('synthhybrid')}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-emerald-300" />
            <span>Send to Hybrid 10</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('sentientai')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Sentient Mint</span>
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Code Injector + Cluster Index */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-semibold text-slate-200">
                Drop Code to Self-Cluster
              </label>
              <input
                value={sourceLabel}
                onChange={(e) => setSourceLabel(e.target.value)}
                aria-label="Code Origin Label"
                className="w-44 bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <textarea
              value={codeDraft}
              onChange={(e) => setCodeDraft(e.target.value)}
              rows={8}
              spellCheck={false}
              className="w-full rounded-lg bg-slate-900/90 border border-white/15 p-2.5 font-mono text-[11px] leading-relaxed text-cyan-100 focus:outline-none focus:border-cyan-400 resize-y"
            />

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-400 truncate">{store.lastSummary}</span>
              <button
                type="button"
                disabled={store.busy}
                onClick={() => void handleAssemble()}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${store.busy ? 'animate-spin' : ''}`} />
                <span>{store.busy ? 'Clustering...' : 'Run & Self-Cluster'}</span>
              </button>
            </div>
            {store.lastError && (
              <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-md px-2.5 py-1.5">
                {store.lastError}
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-200">
                Formed Library Clusters
              </h3>
              {activeCluster && store.clusters.length > 1 && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={mergeTargetId}
                    onChange={(e) => setMergeTargetId(e.target.value)}
                    aria-label="Merge target cluster"
                    className="bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-[11px] text-slate-200 max-w-[130px]"
                  >
                    <option value="">Merge with…</option>
                    {store.clusters
                      .filter((c) => c.id !== activeCluster.id)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    disabled={!mergeTargetId}
                    onClick={handleMerge}
                    className="px-2.5 py-1 rounded-md bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-white/15 text-[11px] text-slate-100 whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                  >
                    <GitMerge className="w-3 h-3" />
                    <span>Merge</span>
                  </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden bg-slate-900/50">
              {store.clusters.map((cluster) => {
                const selected = cluster.id === activeCluster?.id;
                return (
                  <button
                    key={cluster.id}
                    type="button"
                    onClick={() => setSelectedId(cluster.id)}
                    className={`w-full text-left px-3 py-2.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                      selected ? 'bg-cyan-500/15' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: cluster.colorHex }}
                        />
                        <span className="font-semibold text-slate-100 truncate">
                          {cluster.name}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                        {cluster.summary}
                      </p>
                    </div>
                    <div className="text-right font-mono tabular-nums text-[11px] text-slate-300 shrink-0">
                      <div>{cluster.modules.length} mod</div>
                      <div className="text-[10px] text-slate-500">Gen {cluster.generation}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Constellation / Live Sandbox / Module Inspector */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-2 border-b border-white/10 bg-slate-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-white/10">
              <button
                type="button"
                onClick={() => setRightTab('constellation')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                  rightTab === 'constellation'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Cluster Graph</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('sandbox')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                  rightTab === 'sandbox'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Run Sandbox</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('modules')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer ${
                  rightTab === 'modules'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>Modules ({activeCluster?.modules.length ?? 0})</span>
              </button>
            </div>

            {activeCluster && (
              <span className="text-[11px] font-mono tabular-nums text-slate-400 truncate">
                {activeCluster.domain} · deps: {activeCluster.dependencies.join(', ') || 'root'}
              </span>
            )}
          </div>

          <div className="flex-1 min-h-0 relative bg-slate-950">
            {rightTab === 'constellation' && (
              <canvas ref={canvasRef} className="w-full h-full block" />
            )}

            {rightTab === 'sandbox' && activeCluster && (
              <iframe
                key={activeCluster.id + activeCluster.generation}
                srcDoc={activeCluster.previewHtml}
                title={activeCluster.name}
                sandbox="allow-scripts"
                className="w-full h-full border-0 block bg-slate-950"
              />
            )}

            {rightTab === 'modules' && activeCluster && (
              <div className="h-full overflow-y-auto p-4 space-y-3">
                {activeCluster.modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="border border-white/10 rounded-lg bg-slate-900/70 p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-semibold text-cyan-200">
                        {mod.name}
                      </span>
                      <span className="text-[11px] font-mono tabular-nums text-slate-400">
                        {mod.sourceLabel} · {mod.bytes} B
                      </span>
                    </div>
                    {mod.symbols.length > 0 && (
                      <div className="text-[11px] text-slate-300 font-mono">
                        Exports: {mod.symbols.join(' · ')}
                      </div>
                    )}
                    <pre className="p-2.5 rounded bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto max-h-44">
                      {mod.code}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
