import { useEffect, useMemo, useState } from 'react';
import {
  Brain,
  Code2,
  Cpu,
  Layers,
  Orbit,
  Play,
  Printer,
  RefreshCw,
  Rocket,
  Sparkles,
  Wand2,
} from 'lucide-react';
import {
  awarenessMatrixEngine,
  SUITE_APP_CATALOG,
  type SuiteAppId,
} from '../kernel/awarenessMatrixEngine';
import { codeClusterStore, type CodeClusterStoreState } from '../kernel/codeClusterStore';
import { sentientCoreEngine, type SentientCoreState } from '../kernel/sentientCoreEngine';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import { swarmEngine } from '../kernel/swarmEngine';
import type { AppId, SentientContentDraft } from '../types/os';

interface SentientNexusAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const KIND_OPTIONS: Array<{ value: SentientContentDraft['kind']; label: string }> = [
  { value: 'simulation', label: 'Simulation' },
  { value: 'game', label: 'Full Game' },
  { value: 'visual-tool', label: '3D / Visual Tool' },
  { value: 'audio-synth', label: 'Audio Synth' },
  { value: 'workspace-app', label: 'Workstation App' },
];

export function SentientNexusApp({ onOpenApp, onShowToast }: SentientNexusAppProps) {
  const [sentient, setSentient] = useState<SentientCoreState>(() => sentientCoreEngine.getState());
  const [clusters, setClusters] = useState<CodeClusterStoreState>(() =>
    codeClusterStore.getState()
  );
  const [daemonCount, setDaemonCount] = useState(() => swarmEngine.getDaemons().length);
  const [smartItemCount, setSmartItemCount] = useState(
    () => smartBrainItemStore.getState().items.length
  );

  const [prompt, setPrompt] = useState(
    'Build an orbital solar harmonic arena combining WebGL starfield bloom, WebAudio chord pulses, and autonomous boid drones orbiting a reactive shield core.'
  );
  const [kind, setKind] = useState<SentientContentDraft['kind']>('simulation');
  const [selectedClusterIds, setSelectedClusterIds] = useState<string[]>(() =>
    codeClusterStore
      .getState()
      .clusters.slice(0, 3)
      .map((c) => c.id)
  );
  const [rightTab, setRightTab] = useState<'preview' | 'architecture' | 'code'>('preview');

  useEffect(() => {
    const u1 = sentientCoreEngine.subscribe(setSentient);
    const u2 = codeClusterStore.subscribe(setClusters);
    const u3 = swarmEngine.subscribe((d) => setDaemonCount(d.length));
    const u4 = smartBrainItemStore.subscribe((s) => setSmartItemCount(s.items.length));
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, []);

  const activeDraft = useMemo(
    () => sentient.drafts.find((d) => d.id === sentient.activeDraftId) ?? sentient.drafts[0],
    [sentient.drafts, sentient.activeDraftId]
  );

  const toggleClusterSelection = (id: string) => {
    setSelectedClusterIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleGenerate = async (refine = false) => {
    const draft = await sentientCoreEngine.generateFromMainPrompt({
      prompt,
      kind,
      selectedClusterIds,
      refineExistingId: refine && activeDraft ? activeDraft.id : undefined,
    });
    if (draft) {
      setRightTab('preview');
      onShowToast?.(
        `Sentient Core synthesized "${draft.title}" (rev ${draft.revision}). Ready to Mint as App.`
      );
    }
  };

  const handleMintAsApp = async () => {
    if (!activeDraft) return;
    const appId = await sentientCoreEngine.mintDraftAsApp(activeDraft.id);
    if (appId) {
      onShowToast?.(`Minted "${activeDraft.title}" into live OS App & Desktop!`);
      onOpenApp(appId);
    }
  };

  const handleCohesiveSweep = async () => {
    const msg = await sentientCoreEngine.runCohesiveSelfImprovementCycle();
    onShowToast?.(msg);
  };

  const suiteList = Object.values(SUITE_APP_CATALOG);

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 text-xs overflow-hidden">
      {/* Unified Header Contract */}
      <div className="shrink-0 px-4 py-2.5 border-b border-white/10 bg-slate-900/90 flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-3 min-w-0 shrink-0">
          <span className="font-display font-semibold text-sm text-slate-100 whitespace-nowrap">
            Sentient AI Core & App Minter
          </span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="font-mono tabular-nums text-slate-300 whitespace-nowrap">
            {suiteList.length} Suite Apps · {daemonCount} Daemons · {clusters.clusters.length} Clusters · {smartItemCount} Smart Items
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => sentientCoreEngine.toggleAutonomousThinking()}
            className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer ${
              sentient.autonomousThinking
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/[0.05] border-white/15 text-slate-300'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>{sentient.autonomousThinking ? 'Autonomy ON' : 'Autonomy Off'}</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCohesiveSweep()}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-[11px] font-medium whitespace-nowrap shrink-0 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-300" />
            <span>Self-Improve All ({sentient.selfImproveCycles})</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('synthhybrid')}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-[11px] whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-amber-300" />
            <span>Hybrid 10</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('liveplayground')}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-[11px] whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-300" />
            <span>Playground</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('companion')}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/15 text-slate-200 text-[11px] whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
          >
            <Orbit className="w-3.5 h-3.5 text-indigo-300" />
            <span>Companion</span>
          </button>
        </div>
      </div>

      {/* Cohesive Autonomous Thought Line */}
      <div className="shrink-0 px-4 py-1.5 border-b border-white/5 bg-slate-900/40 text-[11px] text-slate-300 flex items-center justify-between gap-3">
        <span className="truncate">{sentient.lastThought}</span>
        <button
          type="button"
          onClick={() => {
            awarenessMatrixEngine.toggleFullAppLoop(true);
            onShowToast?.('Engaged Full Apps Loop across integrated suite runtimes.');
          }}
          className="text-cyan-300 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
        >
          Sync Full Loop
        </button>
      </div>

      {/* Main Split Body */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Main Prompt Window & Bound Systems */}
        <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-white/10 flex flex-col min-h-0 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-slate-100">Main Prompt Window</h2>
              <span className="text-[11px] text-slate-400">All Systems Combined</span>
            </div>

            {/* Kind segmented selector */}
            <div className="flex items-center gap-1 p-1 bg-slate-900 border border-white/10 rounded-lg overflow-x-auto no-scrollbar">
              {KIND_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setKind(opt.value)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                    kind === opt.value
                      ? 'bg-cyan-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={5}
              placeholder="Describe the game, simulation, tool, synth, or hybrid OS app to generate…"
              className="w-full rounded-lg bg-slate-900 border border-white/15 p-3 text-xs text-slate-100 leading-relaxed focus:outline-none focus:border-cyan-400 resize-y"
            />

            {/* Library Clusters Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-300">
                <span>Bind Library Clusters ({selectedClusterIds.length} active)</span>
                <button
                  type="button"
                  onClick={() => onOpenApp('liveplayground')}
                  className="text-cyan-300 hover:underline cursor-pointer"
                >
                  Edit Clusters
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-28 overflow-y-auto">
                {clusters.clusters.map((c) => {
                  const picked = selectedClusterIds.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleClusterSelection(c.id)}
                      className={`text-left px-2.5 py-1.5 rounded-md border text-[11px] transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                        picked
                          ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-100'
                          : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-[10px] shrink-0">G{c.generation}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                disabled={sentient.busyGenerating}
                onClick={() => void handleGenerate(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold whitespace-nowrap inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles
                  className={`w-3.5 h-3.5 ${sentient.busyGenerating ? 'animate-spin' : ''}`}
                />
                <span>{sentient.busyGenerating ? 'Generating…' : 'Generate Content'}</span>
              </button>

              {activeDraft && (
                <button
                  type="button"
                  disabled={sentient.busyGenerating}
                  onClick={() => void handleGenerate(true)}
                  className="px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-xs font-medium whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Iterate</span>
                </button>
              )}
            </div>

            {sentient.lastError && (
              <div className="text-[11px] text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-md px-2.5 py-1.5">
                {sentient.lastError}
              </div>
            )}
          </div>

          {/* 14 Integrated Suite Apps Matrix Links */}
          <div className="border-t border-white/10 pt-3 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-slate-200">
                14 Linked Suite Apps (Click to Launch)
              </span>
              <button
                type="button"
                onClick={() => onOpenApp('masterbrain')}
                className="text-cyan-300 hover:underline cursor-pointer"
              >
                Awareness Matrix
              </button>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {suiteList.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onOpenApp(s.id as SuiteAppId)}
                  className="text-left px-2.5 py-1.5 rounded-md bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 text-[11px] text-slate-200 truncate cursor-pointer"
                  title={s.title}
                >
                  {s.shortTitle}
                </button>
              ))}
            </div>
          </div>

          {/* Draft History */}
          {sentient.drafts.length > 0 && (
            <div className="border-t border-white/10 pt-3 space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-200">Staged Creations</div>
              <div className="divide-y divide-white/10 border border-white/10 rounded-lg overflow-hidden bg-slate-900/50">
                {sentient.drafts.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => sentientCoreEngine.selectDraft(d.id)}
                    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 cursor-pointer ${
                      d.id === activeDraft?.id ? 'bg-cyan-500/15' : 'hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-slate-100 truncate">{d.title}</div>
                      <div className="text-[10.5px] text-slate-400 truncate">
                        {d.kind} · rev {d.revision} · {d.clustersBound.length} clusters
                      </div>
                    </div>
                    {d.mintedAppId && (
                      <span className="text-[10.5px] font-mono text-emerald-300 shrink-0">
                        Minted
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Staging Preview & Mint as App */}
        <div className="lg:col-span-7 flex flex-col min-h-0">
          <div className="shrink-0 px-4 py-2 border-b border-white/10 bg-slate-900/60 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-950 border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setRightTab('preview')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                  rightTab === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Play className="w-3 h-3" />
                <span>Live Content</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('architecture')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                  rightTab === 'architecture' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Systems & Smart Item</span>
              </button>
              <button
                type="button"
                onClick={() => setRightTab('code')}
                className={`px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer ${
                  rightTab === 'code' ? 'bg-slate-800 text-white' : 'text-slate-400'
                }`}
              >
                <Code2 className="w-3 h-3" />
                <span>HTML5 Source</span>
              </button>
            </div>

            {activeDraft && (
              <div className="flex items-center gap-2 shrink-0">
                {activeDraft.mintedAppId && (
                  <button
                    type="button"
                    onClick={() => onOpenApp(activeDraft.mintedAppId!)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-slate-100 text-[11px] font-medium whitespace-nowrap inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Rocket className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Open Minted App</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={sentient.busyMinting}
                  onClick={() => void handleMintAsApp()}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-[11px] font-semibold whitespace-nowrap inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className={`w-3.5 h-3.5 ${sentient.busyMinting ? 'animate-spin' : ''}`} />
                  <span>
                    {sentient.busyMinting
                      ? 'Minting App…'
                      : activeDraft.mintedAppId
                      ? 'Re-Mint App Update'
                      : 'Mint as App'}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 relative bg-slate-950">
            {!activeDraft ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                <Sparkles className="w-8 h-8 text-cyan-400/75" />
                <div className="text-sm font-semibold text-slate-200">
                  Sentient Main Prompt Window Ready
                </div>
                <p className="text-xs text-slate-400 max-w-md">
                  Describe any experience in the prompt window on the left. Sentient AI fuses
                  Playground Library Clusters, 103 Daemons, and Master Brain synthesis into live
                  content you can inspect and mint directly as an OS App.
                </p>
              </div>
            ) : rightTab === 'preview' ? (
              <iframe
                key={`${activeDraft.id}-${activeDraft.revision}`}
                srcDoc={activeDraft.html5Code}
                title={activeDraft.title}
                sandbox="allow-scripts allow-forms allow-modals"
                className="w-full h-full border-0 block bg-slate-950"
              />
            ) : rightTab === 'architecture' ? (
              <div className="h-full overflow-y-auto p-4 space-y-4">
                <div className="border border-white/10 rounded-lg bg-slate-900/60 p-3.5 space-y-2">
                  <div className="font-semibold text-sm text-slate-100">{activeDraft.title}</div>
                  <p className="text-slate-300 leading-relaxed">
                    {activeDraft.synthesizedNarrative}
                  </p>
                  <div className="text-[11px] text-slate-400">
                    {activeDraft.architectureNotes}
                  </div>
                  <div className="pt-1 text-[11px] font-mono text-cyan-200">
                    Clusters: {activeDraft.clustersBound.join(' · ')}
                  </div>
                </div>

                {activeDraft.smartItemName && (
                  <div className="border border-white/10 rounded-lg bg-slate-900/60 p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-emerald-300">
                        Generated Smart Module: {activeDraft.smartItemName}
                      </span>
                      <button
                        type="button"
                        onClick={() => onOpenApp('jsonvault')}
                        className="text-[11px] text-cyan-300 hover:underline cursor-pointer"
                      >
                        View in JSON Vault
                      </button>
                    </div>
                    <p className="text-slate-300">{activeDraft.smartItemSummary}</p>
                    <pre className="p-2.5 rounded bg-slate-950 border border-white/10 font-mono text-[11px] text-slate-200 overflow-x-auto">
                      {activeDraft.smartItemSnippet}
                    </pre>
                  </div>
                )}
              </div>
            ) : (
              <pre className="h-full overflow-auto p-4 font-mono text-[11px] text-slate-200 bg-slate-950">
                {activeDraft.html5Code}
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
