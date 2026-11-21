import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Bot,
  Check,
  Copy,
  Database,
  Gamepad2,
  Palette,
  Play,
  Shapes,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
} from 'lucide-react';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { smartBrainItemStore } from '../kernel/smartBrainItemStore';
import type { AppId, ContentBlankGap, JsonLibraryEntry, SmartGameItem } from '../types/os';

interface SmartBrainForgeAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const RARITY_STYLES: Record<SmartGameItem['rarity'], string> = {
  common: 'bg-slate-500/20 text-slate-200 border-slate-400/35',
  rare: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/45',
  epic: 'bg-violet-500/20 text-violet-200 border-violet-400/45',
  sovereign: 'bg-amber-500/20 text-amber-200 border-amber-400/50',
};

const QUICK_ISSUE_PROMPTS = [
  'Fix mid-game difficulty spike with a defensive shield powerup and tactical dash upgrade',
  'Create an audio-reactive boss enemy and rare score multiplier relic',
  'Balance low-ammo content issue with rapid-cool energy weapon & kinetic bumper obstacle',
];

export function SmartBrainForgeApp({ onOpenApp, onShowToast }: SmartBrainForgeAppProps) {
  const [state, setState] = useState(smartBrainItemStore.getState());
  const [gameEntries, setGameEntries] = useState<JsonLibraryEntry[]>([]);
  const [prompt, setPrompt] = useState(
    'Generate balanced upgrade items and enemy countermeasures to fix mid-wave content gaps'
  );
  const [targetGame, setTargetGame] = useState('All Aether Games');
  const [selectedId, setSelectedId] = useState<string>(state.items[0]?.id ?? '');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsubBrain = smartBrainItemStore.subscribe((next) => {
      setState(next);
      if (next.items.length > 0 && !next.items.some((i) => i.id === selectedId)) {
        setSelectedId(next.items[0].id);
      }
    });
    const unsubJson = jsonKnowledgeStore.subscribe((snap) => {
      setGameEntries(snap.entries.filter((e) => e.category === 'game-spec'));
    });
    return () => {
      unsubBrain();
      unsubJson();
    };
  }, [selectedId]);

  const selectedItem = state.items.find((i) => i.id === selectedId) ?? state.items[0] ?? null;

  const handleGeneratePrompted = async () => {
    if (!prompt.trim()) return;
    const created = await smartBrainItemStore.generateItems({
      mode: 'user-prompt',
      prompt: prompt.trim(),
      targetGame,
    });
    if (created.length > 0) {
      setSelectedId(created[0].id);
      onShowToast?.(`Smart Brain created & stored ${created.length} game item(s).`);
    }
  };

  const handleFillBlank = async (blank?: ContentBlankGap) => {
    const targetBlank = blank ?? state.blanks[0];
    const created = await smartBrainItemStore.generateItems({
      mode: 'auto-blank-fill',
      prompt: targetBlank?.suggestedPrompt,
      targetGame: targetBlank?.targetGame || targetGame,
      blankTitle: targetBlank?.title,
    });
    if (created.length > 0) {
      setSelectedId(created[0].id);
      onShowToast?.(`Auto-filled content blank: "${created[0].name}" stored.`);
    }
  };

  const copySnippet = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((curr) => (curr === id ? null : curr));
    }, 1600);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-y-auto lg:overflow-hidden">
      {/* Header */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/25 to-emerald-500/25 border border-violet-400/45 flex items-center justify-center text-violet-200 shrink-0">
            <Bot className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100 truncate">
                Smart Brain // Auto Game Item Generator
              </h2>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 font-mono text-[10px]">
                {state.items.length} Stored
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 truncate">
              Generates & stores items on demand or autonomously detects & fills missing gameplay blanks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => smartBrainItemStore.setAutoFillEnabled(!state.autoFillEnabled)}
            className={`px-2.5 py-1.5 rounded-lg border font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              state.autoFillEnabled
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-100'
                : 'bg-white/[0.04] border-white/15 text-slate-300'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{state.autoFillEnabled ? 'Auto-Filler: ON' : 'Auto-Filler: PAUSED'}</span>
          </button>

          <button
            type="button"
            disabled={state.busy}
            onClick={() => void handleFillBlank()}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{state.busy ? 'Synthesizing...' : 'Auto-Fill Blank Now'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('gameforge')}
            className="px-2.5 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Game Forge</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('hyperface')}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>HyperFace</span>
          </button>
        </div>
      </div>

      {/* On-Demand Prompt & Game Selector */}
      <div className="aether-panel rounded-xl p-2.5 space-y-2 shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <select
            value={targetGame}
            onChange={(e) => setTargetGame(e.target.value)}
            className="bg-[#040914] border border-white/15 rounded-lg px-2.5 py-2 text-slate-100 outline-none sm:max-w-[200px]"
          >
            <option value="All Aether Games">All Aether Games</option>
            <option value="Nebula Bounce Core">Nebula Bounce Core</option>
            {gameEntries.map((g) => (
              <option key={g.id} value={g.title}>
                {g.title}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleGeneratePrompted();
            }}
            placeholder="Describe a game upgrade request, missing mechanic, or content issue..."
            className="flex-1 min-w-0 bg-[#040914] border border-white/15 focus:border-violet-400/60 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none"
          />

          <button
            type="button"
            disabled={state.busy || !prompt.trim()}
            onClick={() => void handleGeneratePrompted()}
            className="px-3.5 py-2 rounded-lg bg-violet-500/30 hover:bg-violet-500/40 border border-violet-400/50 text-violet-50 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{state.busy ? 'Generating...' : 'Generate & Store Items'}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] text-slate-400">Upgrade / Content Prompts:</span>
          {QUICK_ISSUE_PROMPTS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setPrompt(q)}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10.5px] text-slate-300 truncate max-w-[260px] cursor-pointer"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {state.lastError && (
        <div className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3 py-2 text-rose-100 shrink-0">
          {state.lastError}
        </div>
      )}

      {/* Split Workspace: Blanks + Vault on Left, Item Inspector on Right */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-2.5">
        {/* Left Column */}
        <div className="lg:col-span-5 flex flex-col gap-2.5 lg:min-h-0">
          {/* Detected Content Blanks */}
          <div className="aether-panel rounded-xl p-2.5 flex flex-col gap-1.5 shrink-0 max-h-[175px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-amber-200 inline-flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Detected Content Blanks ({state.blanks.length})</span>
              </span>
              <span className="text-[10px] text-slate-400">Auto-monitored</span>
            </div>

            {state.blanks.length === 0 ? (
              <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-400/30 rounded-lg px-2.5 py-2">
                All core gameplay categories are filled! Add new games or trigger custom prompts above.
              </div>
            ) : (
              state.blanks.map((blank) => (
                <div
                  key={blank.id}
                  className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-1.5 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-slate-100 truncate">{blank.title}</div>
                    <div className="text-[10px] text-slate-400 truncate">{blank.description}</div>
                  </div>
                  <button
                    type="button"
                    disabled={state.busy}
                    onClick={() => void handleFillBlank(blank)}
                    className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-100 text-[10.5px] font-semibold shrink-0 cursor-pointer disabled:opacity-50"
                  >
                    Fill
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Stored Items Vault */}
          <div className="aether-panel rounded-xl p-2.5 flex-1 min-h-[190px] lg:min-h-0 flex flex-col gap-1.5 overflow-hidden">
            <div className="flex items-center justify-between shrink-0">
              <span className="font-semibold text-slate-100">
                Stored Game Items ({state.items.length})
              </span>
              <button
                type="button"
                onClick={() => onOpenApp('jsonvault')}
                className="text-[10.5px] text-emerald-300 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Database className="w-3 h-3" />
                <span>JSON Vault</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {state.items.map((item) => {
                const active = selectedItem?.id === item.id;
                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={`rounded-lg border p-2 cursor-pointer transition-colors flex items-start justify-between gap-2 ${
                      active
                        ? 'bg-violet-500/18 border-violet-400/55'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                    }`}
                  >
                    <div className="flex items-start gap-2 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-md mt-0.5 shrink-0 border border-white/30"
                        style={{ backgroundColor: item.iconColor }}
                      />
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-100 truncate">{item.name}</div>
                        <div className="flex flex-wrap items-center gap-1 mt-0.5">
                          <span
                            className={`px-1.5 py-0.2 rounded border text-[9.5px] uppercase font-mono ${RARITY_STYLES[item.rarity]}`}
                          >
                            {item.rarity}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-white/[0.06] text-[9.5px] text-slate-300 font-mono">
                            {item.category}
                          </span>
                          <span className="text-[9.5px] text-slate-400">
                            {item.originMode === 'auto-blank-fill' ? 'Auto-Blank' : 'Prompted'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        smartBrainItemStore.deleteItem(item.id);
                      }}
                      title="Delete item"
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-200 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Selected Item Details & Drop-in Code */}
        <div className="lg:col-span-7 aether-panel rounded-xl p-3 flex flex-col gap-2.5 min-h-[260px] lg:min-h-0 overflow-hidden">
          {!selectedItem ? (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Select or generate a game item to inspect its stats & integration snippet.
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-4 h-4 rounded-md border border-white/40 shrink-0"
                      style={{ backgroundColor: selectedItem.iconColor }}
                    />
                    <h3 className="font-display text-sm font-bold text-slate-100 truncate">
                      {selectedItem.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded border text-[10px] font-mono uppercase ${RARITY_STYLES[selectedItem.rarity]}`}
                    >
                      {selectedItem.rarity}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Target: <span className="text-cyan-300">{selectedItem.targetGame}</span> · Category:{' '}
                    <span className="text-violet-300 font-mono">{selectedItem.category}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      smartBrainItemStore.syncItemAsSprite(selectedItem);
                      onShowToast?.(`Synced "${selectedItem.name}" icon to Sprite Lab & Game Forge!`);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/45 text-pink-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Sync to Sprite Lab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenApp('gameforge')}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 font-medium inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Inject in Game Forge</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 shrink-0">
                <p className="text-slate-200 leading-relaxed">{selectedItem.summary}</p>
                <div className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-2 text-[11px] text-slate-300 space-y-1">
                  <div>
                    <span className="text-violet-300 font-semibold">Upgrade / Blank Resolution: </span>
                    {selectedItem.upgradeReason}
                  </div>
                  <div>
                    <span className="text-cyan-300 font-semibold">Spawn Rule: </span>
                    {selectedItem.spawnRule}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {selectedItem.stats.map((st, idx) => (
                    <div
                      key={`${st.label}-${idx}`}
                      className="rounded-lg bg-[#050a14] border border-white/10 px-2.5 py-1.5"
                    >
                      <div className="text-[10px] text-slate-400 truncate">{st.label}</div>
                      <div className="font-mono text-xs font-semibold text-cyan-200 truncate">
                        {st.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                <div className="flex items-center justify-between shrink-0">
                  <span className="font-semibold text-slate-200">Drop-in Game Integration Code</span>
                  <button
                    type="button"
                    onClick={() => void copySnippet(selectedItem.codeSnippet, selectedItem.id)}
                    className="px-2.5 py-1 rounded bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/45 text-indigo-100 inline-flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === selectedItem.id ? (
                      <Check className="w-3 h-3 text-emerald-300" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedId === selectedItem.id ? 'Copied' : 'Copy Snippet'}</span>
                  </button>
                </div>
                <pre className="flex-1 overflow-auto rounded-lg bg-[#040812] border border-white/10 p-2.5 font-mono text-[11px] text-emerald-100 leading-relaxed select-text">
                  <code>{selectedItem.codeSnippet}</code>
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
