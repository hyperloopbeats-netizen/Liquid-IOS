import { useEffect, useState } from 'react';
import {
  Brain,
  Database,
  ExternalLink,
  Gamepad2,
  Plus,
  Save,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import type { AppId, JsonEntryCategory, JsonLibraryEntry, PhysicsPresetSpec } from '../types/os';

interface JsonResearchVaultAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const CATEGORIES: Array<{ id: JsonEntryCategory | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'game-spec', label: 'Games' },
  { id: 'research', label: 'Research' },
  { id: 'physics-rig', label: 'Physics' },
  { id: 'sprite-pack', label: 'Sprites' },
  { id: 'narration', label: 'Narration' },
  { id: 'system-sort', label: 'Master Brain' },
];

export function JsonResearchVaultApp({ onOpenApp, onShowToast }: JsonResearchVaultAppProps) {
  const [entries, setEntries] = useState<JsonLibraryEntry[]>(jsonKnowledgeStore.getEntries());
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id ?? '');
  const [filterCat, setFilterCat] = useState<JsonEntryCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [researchTopic, setResearchTopic] = useState('');
  const [researchBusy, setResearchBusy] = useState(false);

  const [sideNoteDraft, setSideNoteDraft] = useState('');
  const [jsonEditorText, setJsonEditorText] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = jsonKnowledgeStore.subscribe((st) => {
      setEntries(st.entries);
      if (st.entries.length > 0 && !st.entries.some((e) => e.id === selectedId)) {
        setSelectedId(st.entries[0].id);
      }
    });
    return unsub;
  }, [selectedId]);

  const selected = entries.find((e) => e.id === selectedId) ?? entries[0] ?? null;

  useEffect(() => {
    if (selected) {
      setJsonEditorText(JSON.stringify(selected.data, null, 2));
      setJsonError(null);
    }
  }, [selected?.id, selected?.updatedAt]);

  const filteredEntries = entries.filter((e) => {
    if (filterCat !== 'all' && e.category !== filterCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.title.toLowerCase().includes(q) ||
      e.summary.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const handleGeminiResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!researchTopic.trim() || researchBusy) return;
    setResearchBusy(true);
    try {
      const res = await fetch('/api/vault/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: researchTopic.trim(),
          entryJson: selected ? JSON.stringify(selected.data) : '{}',
          existingTitles: entries.map((item) => item.title),
        }),
      });
      const data = (await res.json()) as {
        title?: string;
        summary?: string;
        tags?: string[];
        sideNotes?: string[];
        enrichedDataJson?: string;
        suggestedLinks?: string[];
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || 'Gemini Vault research failed.');

      let parsedData: Record<string, unknown> = { topic: researchTopic.trim() };
      if (data.enrichedDataJson) {
        try {
          parsedData = JSON.parse(data.enrichedDataJson) as Record<string, unknown>;
        } catch {
          parsedData = { rawResearch: data.enrichedDataJson };
        }
      }

      const saved = jsonKnowledgeStore.saveEntry({
        title: data.title || `Research: ${researchTopic.trim()}`,
        category: 'research',
        tags: Array.isArray(data.tags) ? data.tags : ['research'],
        summary: data.summary || `Structured Gemini research on ${researchTopic.trim()}.`,
        sideNotes: Array.isArray(data.sideNotes) ? data.sideNotes : [],
        linkedAppIds: ['jsonvault', 'gameforge', 'spritecomposer', 'masterbrain'],
        data: {
          ...parsedData,
          suggestedLinks: data.suggestedLinks ?? [],
        },
      });
      setSelectedId(saved.id);
      setResearchTopic('');
      onShowToast?.(`Archived "${saved.title}" into JSON Library & VFS.`);
    } catch (err) {
      onShowToast?.(err instanceof Error ? err.message : 'Research request failed.');
    } finally {
      setResearchBusy(false);
    }
  };

  const handleAddSideNote = () => {
    if (!selected || !sideNoteDraft.trim()) return;
    jsonKnowledgeStore.saveEntry({
      ...selected,
      sideNotes: [...selected.sideNotes, sideNoteDraft.trim()],
    });
    setSideNoteDraft('');
    onShowToast?.('Added side note to JSON record.');
  };

  const handleSaveJsonData = () => {
    if (!selected) return;
    try {
      const parsed = JSON.parse(jsonEditorText) as Record<string, unknown>;
      setJsonError(null);
      jsonKnowledgeStore.saveEntry({
        ...selected,
        data: parsed,
      });
      onShowToast?.(`Saved "${selected.title}" JSON to Vault & VFS.`);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON syntax');
    }
  };

  const handleApplyPhysicsIfApplicable = () => {
    if (!selected) return;
    const d = selected.data;
    const preset: PhysicsPresetSpec = {
      id: selected.id,
      name: selected.title,
      gravity: typeof d.gravity === 'number' ? d.gravity : 480,
      friction: typeof d.friction === 'number' ? d.friction : 0.985,
      restitution: typeof d.restitution === 'number' ? d.restitution : 0.72,
      maxSpeed: typeof d.maxSpeed === 'number' ? d.maxSpeed : 540,
      collisionShape: d.collisionShape === 'aabb' ? 'aabb' : 'circle',
    };
    jsonKnowledgeStore.updatePhysics(preset);
    onShowToast?.(`Pushed "${selected.title}" physics to Sprite Lab & Game Forge!`);
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-3 overflow-hidden text-xs">
      {/* Header + Gemini Research Bar */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow">
              <Database className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-slate-100">
                JSON Research Vault &amp; Side-Data Library (Helper #2)
              </h2>
              <p className="text-[10px] text-slate-400">
                Research, attach side-notes, edit JSON &amp; cross-connect directly to Game Forge &amp; Master Brain
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenApp('gameforge')}
              className="px-2 py-1 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Gamepad2 className="w-3 h-3" />
              <span>Game Forge</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenApp('masterbrain')}
              className="px-2 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/40 text-indigo-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <Brain className="w-3 h-3" />
              <span>Master Brain</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleGeminiResearch} className="flex gap-2">
          <input
            type="text"
            value={researchTopic}
            onChange={(e) => setResearchTopic(e.target.value)}
            placeholder="Research topic with Gemini (e.g. 'Verlet rope physics', 'Cyberpunk boss wave pacing')..."
            className="flex-1 bg-slate-950/90 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 outline-none focus:border-amber-400/60"
          />
          <button
            type="submit"
            disabled={researchBusy}
            className="px-3 py-1.5 rounded-lg bg-amber-500/25 hover:bg-amber-500/35 border border-amber-400/45 text-amber-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className={`w-3.5 h-3.5 ${researchBusy ? 'animate-spin' : ''}`} />
            <span>{researchBusy ? 'Researching...' : 'Gemini Research & Store'}</span>
          </button>
        </form>
      </div>

      {/* Main Split View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2.5">
        {/* Left: Search & Library List */}
        <div className="lg:col-span-5 aether-panel rounded-xl p-2.5 flex flex-col gap-2 min-h-0">
          <div className="flex items-center gap-1.5 bg-slate-950/80 border border-white/12 rounded-lg px-2 py-1">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search JSON vault..."
              className="flex-1 bg-transparent text-xs text-slate-100 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setFilterCat(c.id)}
                className={`px-2 py-0.5 rounded-md text-[10px] border cursor-pointer ${
                  filterCat === c.id
                    ? 'bg-amber-500/20 border-amber-400/45 text-amber-100'
                    : 'bg-white/[0.04] border-white/10 text-slate-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {filteredEntries.map((entry) => {
              const active = entry.id === selected?.id;
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={`w-full text-left p-2 rounded-lg border transition-colors cursor-pointer ${
                    active
                      ? 'bg-amber-500/15 border-amber-400/50'
                      : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100 truncate">{entry.title}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-200 shrink-0">
                      {entry.category}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">{entry.summary}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: JSON Inspector, Side Notes & Cross-App Actions */}
        <div className="lg:col-span-7 aether-panel rounded-xl p-2.5 flex flex-col gap-2 min-h-0">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-100 text-sm truncate">{selected.title}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{selected.summary}</div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selected.category === 'physics-rig' && (
                    <button
                      type="button"
                      onClick={handleApplyPhysicsIfApplicable}
                      className="px-2 py-1 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-100 text-[10px] cursor-pointer"
                    >
                      Apply Physics
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => jsonKnowledgeStore.deleteEntry(selected.id)}
                    title="Delete JSON entry"
                    className="p-1 rounded-md bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/35 text-rose-200 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Connected Apps */}
              <div className="flex flex-wrap items-center gap-1 shrink-0">
                <span className="text-[10px] text-slate-400 mr-1">Connected Apps:</span>
                {selected.linkedAppIds.map((appId) => (
                  <button
                    key={appId}
                    type="button"
                    onClick={() => onOpenApp(appId as AppId)}
                    className="px-2 py-0.5 rounded-md bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 text-[10px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                    <span>{appId}</span>
                  </button>
                ))}
              </div>

              {/* Side Notes */}
              <div className="p-2 rounded-lg bg-slate-950/70 border border-white/10 space-y-1.5 shrink-0">
                <div className="text-[10px] font-semibold text-amber-300">
                  Side Notes ({selected.sideNotes.length})
                </div>
                <div className="max-h-20 overflow-y-auto space-y-1">
                  {selected.sideNotes.map((n, i) => (
                    <div key={i} className="text-[11px] text-slate-300">
                      • {n}
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={sideNoteDraft}
                    onChange={(e) => setSideNoteDraft(e.target.value)}
                    placeholder="Attach side note..."
                    className="flex-1 bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-[11px] text-slate-100 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSideNote}
                    className="px-2 py-1 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-100 text-[10px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Note</span>
                  </button>
                </div>
              </div>

              {/* JSON Payload Editor */}
              <div className="flex-1 min-h-0 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    /workspace/json-library/{selected.slug}.json
                  </span>
                  <button
                    type="button"
                    onClick={handleSaveJsonData}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Save JSON</span>
                  </button>
                </div>
                {jsonError && <div className="text-[10px] text-rose-300">{jsonError}</div>}
                <textarea
                  value={jsonEditorText}
                  onChange={(e) => setJsonEditorText(e.target.value)}
                  spellCheck={false}
                  className="flex-1 min-h-[110px] w-full rounded-lg bg-black/75 border border-white/12 p-2 font-mono text-[11px] text-emerald-100 outline-none resize-none"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Select a JSON Library entry or run Gemini Research above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
