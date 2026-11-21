import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  BrainCircuit,
  Copy,
  GitBranch,
  Infinity as InfinityIcon,
  Pause,
  Play,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { vfs } from '../kernel/vfs';
import type { AppId } from '../types/os';

interface MatrixNode {
  id: string;
  parentId: string | null;
  depth: number;
  axis: string;
  title: string;
  insight: string;
  nextPrompt: string;
  codeSnippet: string;
  score: number;
  expanded: boolean;
}

interface ThinkingMatrixAppProps {
  onOpenApp?: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

export function ThinkingMatrixApp({ onOpenApp, onShowToast }: ThinkingMatrixAppProps) {
  // Quick Response State
  const [quickPrompt, setQuickPrompt] = useState('');
  const [quickReply, setQuickReply] = useState('');
  const [quickStreaming, setQuickStreaming] = useState(false);
  const [quickLatencyMs, setQuickLatencyMs] = useState<number | null>(null);
  const [includeVfsContext, setIncludeVfsContext] = useState(true);
  const quickAbortRef = useRef<AbortController | null>(null);

  // Infinite Thinking Matrix State
  const [matrixSeed, setMatrixSeed] = useState(
    'Design a self-organizing distributed cognitive workspace kernel at 120fps'
  );
  const [nodes, setNodes] = useState<MatrixNode[]>([
    {
      id: 'node-root',
      parentId: null,
      depth: 0,
      axis: 'Root Seed',
      title: 'Cognitive Kernel Architecture',
      insight:
        'Unifies low-latency micro-inference, reactive WebGL spatial views, and IndexedDB persistence into a single composable feedback loop.',
      nextPrompt:
        'How should telemetry events, binary frame pacing, and autonomous agents coordinate without UI jitter?',
      codeSnippet: '',
      score: 98,
      expanded: false,
    },
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string>('node-root');
  const [expandingId, setExpandingId] = useState<string | null>(null);
  const [infiniteLoop, setInfiniteLoop] = useState(false);
  const [matrixError, setMatrixError] = useState<string | null>(null);

  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const infiniteRef = useRef(infiniteLoop);
  infiniteRef.current = infiniteLoop;

  const getVfsContextSummary = () => {
    if (!includeVfsContext) return undefined;
    const active = vfs.getActiveFile();
    if (!active) return undefined;
    return `Active File: ${active.path} (${active.kind})\n${active.content.slice(0, 2200)}`;
  };

  const handleQuickResponse = async (overridePrompt?: string) => {
    const prompt = (overridePrompt ?? quickPrompt).trim();
    if (!prompt) return;

    quickAbortRef.current?.abort();
    const ctrl = new AbortController();
    quickAbortRef.current = ctrl;

    setQuickStreaming(true);
    setQuickReply('');
    setQuickLatencyMs(null);
    const t0 = performance.now();
    let firstTokenMs: number | null = null;

    try {
      const res = await fetch('/api/matrix/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify({
          prompt,
          contextSummary: getVfsContextSummary(),
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('Readable stream unavailable.');
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const payload = JSON.parse(line.slice(6)) as {
              text?: string;
              done?: boolean;
              error?: string;
            };
            if (payload.error) throw new Error(payload.error);
            if (payload.text) {
              if (firstTokenMs === null) {
                firstTokenMs = Math.round(performance.now() - t0);
                setQuickLatencyMs(firstTokenMs);
              }
              setQuickReply((prev) => prev + payload.text);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }

      neuralBus.publish('SYSTEM', 'QUICK_RESPONSE', `Quick Response answered "${prompt.slice(0, 48)}" in ${firstTokenMs ?? Math.round(performance.now() - t0)}ms.`);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        const msg = err instanceof Error ? err.message : 'Quick response error';
        setQuickReply(`Error: ${msg}`);
      }
    } finally {
      setQuickStreaming(false);
    }
  };

  const expandNode = useCallback(
    async (targetNode: MatrixNode) => {
      if (expandingId) return;
      setExpandingId(targetNode.id);
      setMatrixError(null);
      try {
        const res = await fetch('/api/matrix/branch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rootTopic: matrixSeed,
            parentTitle: targetNode.title,
            parentInsight: `${targetNode.insight}\nNext prompt: ${targetNode.nextPrompt}`,
            depth: targetNode.depth,
            contextSummary: getVfsContextSummary(),
          }),
        });
        const data = (await res.json()) as {
          branches?: Array<{
            axis: string;
            title: string;
            insight: string;
            nextPrompt: string;
            codeSnippet: string;
            score: number;
          }>;
          error?: string;
        };
        if (!res.ok || !Array.isArray(data.branches)) {
          throw new Error(data.error || 'Matrix branch expansion failed.');
        }

        const newChildren: MatrixNode[] = data.branches.slice(0, 3).map((b, i) => ({
          id: `node-${Date.now()}-${targetNode.depth + 1}-${i}-${Math.random().toString(36).slice(2, 5)}`,
          parentId: targetNode.id,
          depth: targetNode.depth + 1,
          axis: b.axis || 'Synthesis',
          title: b.title || 'Thought Branch',
          insight: b.insight || '',
          nextPrompt: b.nextPrompt || '',
          codeSnippet: b.codeSnippet || '',
          score: typeof b.score === 'number' ? b.score : 85,
          expanded: false,
        }));

        setNodes((prev) =>
          prev
            .map((n) => (n.id === targetNode.id ? { ...n, expanded: true } : n))
            .concat(newChildren)
        );
        if (newChildren[0]) setSelectedNodeId(newChildren[0].id);
        neuralBus.publish(
          'SYSTEM',
          'MATRIX_BRANCH',
          `Thinking Matrix expanded D${targetNode.depth} "${targetNode.title}" → ${newChildren.length} branches.`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Matrix error';
        setMatrixError(msg);
        setInfiniteLoop(false);
      } finally {
        setExpandingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expandingId, matrixSeed, includeVfsContext]
  );

  // Infinite Matrix Autonomous Depth Loop
  useEffect(() => {
    if (!infiniteLoop) return;
    const timer = window.setInterval(() => {
      if (!infiniteRef.current || expandingId) return;
      const leaves = nodesRef.current
        .filter((n) => !n.expanded)
        .sort((a, b) => b.score - a.score || b.depth - a.depth);
      const nextTarget = leaves[0];
      if (nextTarget) {
        void expandNode(nextTarget);
      }
    }, 2400);
    return () => clearInterval(timer);
  }, [infiniteLoop, expandingId, expandNode]);

  const handleSeedNewMatrix = () => {
    const clean = matrixSeed.trim();
    if (!clean) return;
    setInfiniteLoop(false);
    const root: MatrixNode = {
      id: `node-root-${Date.now()}`,
      parentId: null,
      depth: 0,
      axis: 'Root Seed',
      title: clean.slice(0, 44),
      insight: clean,
      nextPrompt: clean,
      codeSnippet: '',
      score: 100,
      expanded: false,
    };
    setNodes([root]);
    setSelectedNodeId(root.id);
    void expandNode(root);
  };

  const handlePrintNodeToApp = async (node: MatrixNode) => {
    const html = `<!doctype html>
<html lang="en">
<head><meta charset="UTF-8"/><title>${node.title.replace(/[<>]/g, '')}</title>
<style>body{background:#040814;color:#e2e8f0;font-family:system-ui,sans-serif;padding:16px;margin:0}h1{color:#38bdf8;font-size:16px;margin-bottom:8px}p{font-size:13px;line-height:1.5;color:#cbd5e1}pre{background:#020617;padding:10px;border-radius:8px;overflow:auto;font-size:11px;border:1px solid rgba(56,189,248,.25)}</style>
</head>
<body>
<h1>${node.title.replace(/[<>]/g, '')}</h1>
<p>${node.insight.replace(/[<>]/g, '')}</p>
${node.codeSnippet ? `<pre>${node.codeSnippet.replace(/[<>]/g, '')}</pre>` : ''}
<button onclick="if(window.AetherOS) AetherOS.publish('MATRIX_NODE','Executed insight from ${node.title.replace(/['<>]/g, '')}')" style="margin-top:10px;padding:6px 12px;border-radius:8px;border:1px solid #22d3ee;background:#083344;color:#cffafe;cursor:pointer">Broadcast to OS Bus</button>
</body></html>`;
    const created = await printedAppsStore.printApp({
      name: node.title,
      description: `Synthesized from Infinite Thinking Matrix (D${node.depth})`,
      html,
    });
    onShowToast?.(`Printed "${created.shortName}" to Library!`);
    onOpenApp?.(created.id);
  };

  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? nodes[0];

  return (
    <div className="h-full flex flex-col bg-slate-950/75 text-xs overflow-hidden">
      {/* Lane 1: Sub-second Quick Response Strip */}
      <div className="p-2.5 border-b border-white/10 bg-gradient-to-r from-violet-950/50 via-slate-900/80 to-cyan-950/50 space-y-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span className="font-semibold text-slate-100">Quick Response Kernel</span>
            {quickLatencyMs !== null && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono-tabular text-[10px]">
                {quickLatencyMs} ms TTFB
              </span>
            )}
          </div>
          <label className="inline-flex items-center gap-1.5 text-[10px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={includeVfsContext}
              onChange={(e) => setIncludeVfsContext(e.target.checked)}
              className="accent-cyan-400"
            />
            <span>Include Active VFS File</span>
          </label>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleQuickResponse();
          }}
          className="flex items-center gap-1.5"
        >
          <input
            type="text"
            value={quickPrompt}
            onChange={(e) => setQuickPrompt(e.target.value)}
            placeholder="Ask for an instant streamed response (e.g. Optimize render loop in active file)..."
            className="flex-1 bg-slate-950/85 border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            type="submit"
            disabled={quickStreaming || !quickPrompt.trim()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/40 border border-cyan-400/50 text-cyan-100 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3 h-3" />
            <span>{quickStreaming ? 'Streaming...' : 'Quick Ask'}</span>
          </button>
          {quickReply && (
            <button
              type="button"
              onClick={() => {
                setMatrixSeed(quickPrompt || quickReply.slice(0, 80));
                handleSeedNewMatrix();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-violet-500/25 hover:bg-violet-500/40 border border-violet-400/45 text-violet-100 font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
              title="Escalate to Infinite Thinking Matrix"
            >
              <InfinityIcon className="w-3 h-3" />
              <span>Matrix</span>
            </button>
          )}
        </form>

        {quickReply && (
          <div className="max-h-24 overflow-y-auto rounded-lg bg-slate-950/85 border border-cyan-400/20 p-2 text-[11px] text-slate-200 whitespace-pre-wrap leading-relaxed">
            {quickReply}
          </div>
        )}
      </div>

      {/* Lane 2: Infinite Thinking Matrix Controls */}
      <div className="px-2.5 py-1.5 border-b border-white/10 bg-slate-900/65 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <BrainCircuit className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
          <input
            type="text"
            value={matrixSeed}
            onChange={(e) => setMatrixSeed(e.target.value)}
            placeholder="Matrix root objective..."
            className="flex-1 bg-slate-950/80 border border-white/12 rounded-md px-2 py-1 text-[11px] text-slate-100 focus:outline-none focus:border-violet-400"
          />
          <button
            type="button"
            onClick={handleSeedNewMatrix}
            disabled={Boolean(expandingId)}
            className="px-2 py-1 rounded-md bg-violet-500/25 hover:bg-violet-500/40 border border-violet-400/45 text-violet-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-3 h-3" />
            <span>Seed Matrix</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono-tabular text-slate-400">
            {nodes.length} nodes · Depth {maxDepth}
          </span>
          <button
            type="button"
            onClick={() => setInfiniteLoop((v) => !v)}
            className={`px-2.5 py-1 rounded-md border text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer transition-all ${
              infiniteLoop
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-100 shadow-[0_0_16px_rgba(16,185,129,0.45)]'
                : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-200'
            }`}
          >
            {infiniteLoop ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{infiniteLoop ? 'Infinite Loop ON' : 'Auto Infinite Loop'}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setInfiniteLoop(false);
              setNodes((prev) => prev.slice(0, 1).map((n) => ({ ...n, expanded: false })));
            }}
            title="Prune tree back to root"
            className="p-1 rounded-md bg-white/5 hover:bg-rose-500/20 border border-white/10 text-slate-400 hover:text-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {matrixError && (
        <div className="px-3 py-1 bg-rose-950/60 border-b border-rose-500/40 text-rose-200 text-[10px] shrink-0">
          {matrixError}
        </div>
      )}

      {/* Matrix Multi-Depth Grid + Node Inspector */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
        {/* Matrix Columns by Depth */}
        <div className="md:col-span-8 overflow-x-auto overflow-y-auto p-2.5 flex gap-2.5 items-start">
          {Array.from({ length: maxDepth + 1 }, (_, depth) => {
            const colNodes = nodes.filter((n) => n.depth === depth);
            return (
              <div key={depth} className="w-52 shrink-0 space-y-2">
                <div className="px-2 py-1 rounded-md bg-white/[0.04] border border-white/10 text-[10px] font-mono-tabular text-cyan-300 flex items-center justify-between">
                  <span>DEPTH L{depth}</span>
                  <span>{colNodes.length}</span>
                </div>
                {colNodes.map((node) => {
                  const isSel = node.id === selectedNode?.id;
                  const isExpanding = expandingId === node.id;
                  return (
                    <div
                      key={node.id}
                      onClick={() => setSelectedNodeId(node.id)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isSel
                          ? 'bg-violet-500/18 border-cyan-300/65 shadow-[0_0_20px_-6px_rgba(34,211,238,0.5)]'
                          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[9.5px]">
                        <span className="text-violet-300 font-semibold uppercase tracking-wider truncate">
                          {node.axis}
                        </span>
                        <span className="font-mono-tabular text-emerald-300 shrink-0">
                          {node.score}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-100 leading-snug">{node.title}</div>
                      <p className="text-[10px] text-slate-400 line-clamp-2">{node.insight}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void expandNode(node);
                        }}
                        disabled={Boolean(expandingId)}
                        className="w-full py-1 rounded-md bg-cyan-500/15 hover:bg-cyan-500/30 border border-cyan-400/35 text-cyan-100 text-[10px] font-medium inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <GitBranch className="w-2.5 h-2.5" />
                        <span>{isExpanding ? 'Thinking...' : 'Branch Deeper'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Selected Thought Node Inspector */}
        {selectedNode && (
          <div className="md:col-span-4 border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/50 p-3 flex flex-col gap-2 overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10px] font-semibold">
                L{selectedNode.depth} · {selectedNode.axis}
              </span>
              <span className="text-[10px] font-mono-tabular text-emerald-300">
                Leverage {selectedNode.score}/100
              </span>
            </div>

            <h3 className="text-sm font-semibold text-slate-100">{selectedNode.title}</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">{selectedNode.insight}</p>

            {selectedNode.nextPrompt && (
              <div className="p-2 rounded-lg bg-white/[0.04] border border-white/10">
                <div className="text-[9.5px] text-cyan-300 font-semibold uppercase mb-0.5">
                  Next Recursive Seed
                </div>
                <div className="text-[10.5px] text-slate-300">{selectedNode.nextPrompt}</div>
              </div>
            )}

            {selectedNode.codeSnippet && (
              <pre className="p-2 rounded-lg bg-[#020617] border border-white/10 text-[10px] font-mono-tabular text-emerald-200 overflow-x-auto max-h-32">
                {selectedNode.codeSnippet}
              </pre>
            )}

            <div className="mt-auto pt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => void expandNode(selectedNode)}
                disabled={Boolean(expandingId)}
                className="flex-1 py-1.5 px-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/35 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <ArrowRight className="w-3 h-3" />
                <span>Expand</span>
              </button>
              <button
                type="button"
                onClick={() => void handlePrintNodeToApp(selectedNode)}
                className="py-1.5 px-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/35 border border-emerald-400/45 text-emerald-100 font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                title="Print this Matrix node into a live Library App"
              >
                <Sparkles className="w-3 h-3" />
                <span>Print App</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  void navigator.clipboard?.writeText(
                    `${selectedNode.title}\n\n${selectedNode.insight}\n\n${selectedNode.codeSnippet}`
                  )
                }
                title="Copy thought node"
                className="p-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/12 text-slate-300 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
