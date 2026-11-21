import { useEffect, useState } from 'react';
import {
  Bot,
  Boxes,
  Check,
  CheckCircle2,
  Copy,
  Flame,
  Merge,
  Network,
  Play,
  Sparkles,
  Wand2,
} from 'lucide-react';
import { aimSpaceStore } from '../kernel/aimSpaceStore';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import { unificatorEngine, type UnificatorTarget } from '../kernel/unificatorEngine';
import { vfs } from '../kernel/vfs';
import type { AppId, SmartGameItem, SyntheticIntegrationRecord, VFSFile } from '../types/os';

interface CodeUnificatorAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const SAMPLE_MODS = [
  {
    label: 'Dash Thruster & Pulse Shield',
    code: `// Mod: Spacebar Dash Thruster + Pulse Shield Ring\nfunction triggerDashPulse(player, enemies) {\n  player.vx *= 1.85;\n  player.vy *= 1.85;\n  player.shieldPulseTimer = 0.7;\n  enemies.forEach(en => {\n    const d = Math.hypot(en.x - player.x, en.y - player.y);\n    if (d < 130) { en.vx *= -1.4; en.vy *= -1.4; }\n  });\n}`,
  },
  {
    label: 'Homing Orb Magnet + Combo',
    code: `// Mod: Magnetic Resonance Pull + Combo Score Multiplier\nlet comboCount = 1;\nfunction applyOrbMagnet(player, orbs, dt) {\n  orbs.forEach(o => {\n    const dx = player.x - o.x, dy = player.y - o.y;\n    const dist = Math.hypot(dx, dy) || 1;\n    if (dist < 175) { o.x += (dx / dist) * 210 * dt; o.y += (dy / dist) * 210 * dt; }\n  });\n}`,
  },
  {
    label: '3D Voxel Crystal Turret',
    code: `// Three.js / Voxel Mod: Auto-spawn emerald crystal + orbit beacon\nif (sceneState.crystals < 8 && Math.random() < dt * 0.8) {\n  api.spawnCrystal();\n  api.addScore(5);\n  api.setFogHue((sceneState.time * 24) % 360);\n}`,
  },
];

export function CodeUnificatorApp({ onOpenApp, onShowToast }: CodeUnificatorAppProps) {
  const [unifyState, setUnifyState] = useState(unificatorEngine.getState());
  const [targets, setTargets] = useState<UnificatorTarget[]>(unificatorEngine.getAvailableTargets());
  const [vfsFiles, setVfsFiles] = useState<VFSFile[]>([]);
  const [smartItems, setSmartItems] = useState<SmartGameItem[]>([]);

  const [sourceCode, setSourceCode] = useState(SAMPLE_MODS[0].code);
  const [targetId, setTargetId] = useState<string>('auto');
  const [directive, setDirective] = useState(
    'Automatically analyze missing dependencies, input keys, HUD feedback, and frame loop hooks to integrate synthetically.'
  );
  const [publishToLibrary, setPublishToLibrary] = useState(true);
  const [selectedRecordId, setSelectedRecordId] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const refreshTargets = () => setTargets(unificatorEngine.getAvailableTargets());
    const unsubUnify = unificatorEngine.subscribe((st) => {
      setUnifyState(st);
      if (st.records.length > 0 && !st.records.some((r) => r.id === selectedRecordId)) {
        setSelectedRecordId(st.records[0].id);
      }
    });
    const unsubPrinted = printedAppsStore.subscribe(refreshTargets);
    const unsubVfs = vfs.subscribe(setVfsFiles);
    const unsubBrain = smartBrainItemStore.subscribe((st) => setSmartItems(st.items));

    return () => {
      unsubUnify();
      unsubPrinted();
      unsubVfs();
      unsubBrain();
    };
  }, [selectedRecordId]);

  const activeRecord: SyntheticIntegrationRecord | null =
    unifyState.records.find((r) => r.id === selectedRecordId) ?? unifyState.records[0] ?? null;

  const handleIntegrate = async () => {
    const rec = await unificatorEngine.integrateCodeIntoGame({
      codeSnippet: sourceCode,
      targetId,
      userDirective: directive,
      publishToLibrary,
    });
    if (rec) {
      setSelectedRecordId(rec.id);
      onShowToast?.(
        `Synthetically integrated "${rec.title}" (${rec.detectedRequirements.length} auto-inferred requirements).`
      );
    }
  };

  const copyText = async (txt: string, key: string) => {
    try {
      await navigator.clipboard.writeText(txt);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(key);
    window.setTimeout(() => setCopiedId((c) => (c === key ? null : c)), 1600);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/30 to-indigo-500/30 border border-cyan-400/50 flex items-center justify-center text-cyan-200 shrink-0">
            <Merge className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100 truncate">
              Synthetic Code-to-Game Unificator (#1)
            </h2>
            <p className="text-[10.5px] text-slate-400 truncate">
              Paste any code · Auto-figures out missing hooks &amp; dependencies · Integrates synthetically with 20 Daemons + Brain
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => onOpenApp('kineticengine')}
            className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/45 text-orange-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Kinetic 2D</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenApp('voxelengine')}
            className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/45 text-sky-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Boxes className="w-3.5 h-3.5" />
            <span>Voxel 3D</span>
          </button>
          <button
            type="button"
            onClick={() => onOpenApp('meshunifier')}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Network className="w-3.5 h-3.5" />
            <span>Mesh Unifier #2</span>
          </button>
          <button
            type="button"
            onClick={() => {
              aimSpaceStore.queueRestructureInput({
                sourceName: activeRecord?.title || 'Code Unifier Module',
                sourceCode: activeRecord?.unifiedHtml || sourceCode,
                directive,
              });
              onOpenApp('aimspace');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Send to AIM Space</span>
          </button>
        </div>
      </div>

      {unifyState.lastError && (
        <div className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3 py-2 text-rose-100 shrink-0">
          {unifyState.lastError}
        </div>
      )}

      {/* Main Split */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-2.5">
        {/* Left: Code Input, Source Pullers & Target Selector */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 lg:min-h-0">
          <div className="aether-panel rounded-xl p-2.5 flex-1 min-h-[210px] lg:min-h-0 flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5 shrink-0">
              <span className="font-semibold text-cyan-200">Incoming Code to Apply</span>
              <div className="flex items-center gap-1.5">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const f = vfsFiles.find((vf) => vf.id === e.target.value);
                    if (f) setSourceCode(f.content);
                  }}
                  className="bg-slate-900 border border-white/15 rounded px-2 py-1 text-[10.5px] text-slate-200 max-w-[130px] outline-none"
                >
                  <option value="">Pull from VFS...</option>
                  {vfsFiles
                    .filter((f) => f.kind === 'js' || f.kind === 'ts' || f.kind === 'html')
                    .map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                </select>
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const it = smartItems.find((s) => s.id === e.target.value);
                    if (it) setSourceCode(it.codeSnippet);
                  }}
                  className="bg-slate-900 border border-white/15 rounded px-2 py-1 text-[10.5px] text-violet-200 max-w-[140px] outline-none"
                >
                  <option value="">Smart Brain Item...</option>
                  {smartItems.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 shrink-0">
              {SAMPLE_MODS.map((m) => (
                <button
                  key={m.label}
                  type="button"
                  onClick={() => setSourceCode(m.code)}
                  className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10px] text-slate-300 cursor-pointer"
                >
                  {m.label}
                </button>
              ))}
            </div>

            <textarea
              value={sourceCode}
              onChange={(e) => setSourceCode(e.target.value)}
              spellCheck={false}
              placeholder="Paste ANY JS function, weapon mechanic, shader effect, HUD system, or enemy logic..."
              className="flex-1 min-h-[120px] w-full rounded-lg bg-[#040812] border border-white/12 p-2.5 font-mono text-[11px] text-emerald-100 leading-relaxed resize-none outline-none focus:border-cyan-400/60"
            />
          </div>

          <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-slate-100">Target Game / Engine</span>
              <label className="inline-flex items-center gap-1 text-[10.5px] text-emerald-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishToLibrary}
                  onChange={(e) => setPublishToLibrary(e.target.checked)}
                  className="accent-emerald-400"
                />
                <span>Print Unified Game</span>
              </label>
            </div>

            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-[#040914] border border-white/15 rounded-lg px-2.5 py-2 text-slate-100 outline-none"
            >
              <option value="auto">Auto-Detect Best Game / Engine (Recommended)</option>
              {targets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={directive}
              onChange={(e) => setDirective(e.target.value)}
              placeholder="Optional integration rule..."
              className="w-full bg-[#040914] border border-white/15 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none"
            />

            <button
              type="button"
              disabled={unifyState.busy || !sourceCode.trim()}
              onClick={() => void handleIntegrate()}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500/35 to-indigo-500/35 hover:from-cyan-500/45 hover:to-indigo-500/45 border border-cyan-400/55 text-cyan-50 font-semibold inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Wand2 className={`w-4 h-4 ${unifyState.busy ? 'animate-spin' : ''}`} />
              <span>
                {unifyState.busy
                  ? 'Analyzing Missing Hooks & Unifying...'
                  : 'Figure Out Needs & Synthetically Integrate'}
              </span>
            </button>
          </div>
        </div>

        {/* Right: Auto-Detected Requirements, Unified Playable Game & Engine Injection */}
        <div className="lg:col-span-7 flex flex-col gap-2.5 min-h-[280px] lg:min-h-0">
          {!activeRecord ? (
            <div className="aether-panel rounded-xl p-6 flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 flex items-center justify-center text-cyan-300">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Synthetic Code-to-Game Integration Ready
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Drop in any code snippet or pick a Smart Brain item on the left. The Unificator &amp; its 20 Support Daemons inspect the game, synthesize missing variables/controls/HUD hooks automatically, apply the bridge live to Kinetic 2D or Voxel 3D, and print the playable unified build.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden">
              {/* Record Switcher & Auto-Detected Requirements */}
              <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 overflow-x-auto max-w-full">
                    {unifyState.records.slice(0, 4).map((rec) => (
                      <button
                        key={rec.id}
                        type="button"
                        onClick={() => setSelectedRecordId(rec.id)}
                        className={`px-2 py-1 rounded-md border text-[10.5px] font-medium whitespace-nowrap cursor-pointer ${
                          rec.id === activeRecord.id
                            ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                            : 'bg-white/[0.04] border-white/10 text-slate-300'
                        }`}
                      >
                        {rec.title}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {activeRecord.bridgeCode && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            unificatorEngine.setKineticHookCode(activeRecord.bridgeCode);
                            onShowToast?.('Injected bridge hook into Kinetic 2D Engine!');
                            onOpenApp('kineticengine');
                          }}
                          className="px-2 py-1 rounded bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/45 text-orange-100 text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3 h-3" />
                          <span>Run in Kinetic 2D</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void copyText(activeRecord.bridgeCode, `bridge-${activeRecord.id}`)
                          }
                          className="px-2 py-1 rounded bg-white/[0.06] hover:bg-white/12 border border-white/15 text-slate-200 text-[10.5px] inline-flex items-center gap-1 cursor-pointer"
                        >
                          {copiedId === `bridge-${activeRecord.id}` ? (
                            <Check className="w-3 h-3 text-emerald-300" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Bridge Code</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="text-slate-200">{activeRecord.synthesisSummary}</p>

                {activeRecord.detectedRequirements.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {activeRecord.detectedRequirements.slice(0, 5).map((req, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-emerald-500/12 border border-emerald-400/35 text-[10px] text-emerald-200 inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                        <span>{req}</span>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-[10px] text-violet-200">
                  <Bot className="w-3 h-3" />
                  <span>
                    Daemons Linked: {activeRecord.supportDaemonsUsed.slice(0, 6).join(' · ')}
                  </span>
                </div>
              </div>

              {/* Live Unified Playable Game Viewport */}
              <div className="flex-1 min-h-[200px] rounded-xl overflow-hidden border border-cyan-400/30 bg-[#03060c]">
                <iframe
                  key={activeRecord.id}
                  title={activeRecord.title}
                  srcDoc={activeRecord.unifiedHtml}
                  sandbox="allow-scripts allow-forms allow-modals allow-downloads"
                  className="w-full h-full border-0 block"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
