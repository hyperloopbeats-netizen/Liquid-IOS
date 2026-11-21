import { useEffect, useState } from 'react';
import {
  Brain,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Search,
  Sparkles,
} from 'lucide-react';
import { masterBrainEngine } from '../kernel/masterBrainEngine';
import { SMART_TAB_GROUPS, smartSortEngine } from '../kernel/smartSortEngine';
import type {
  AppId,
  PrintedAppDefinition,
  SmartSortGroupKey,
} from '../types/os';
import { AppIcon } from './AppIcon';

interface SmartAppSortTabProps {
  printedApps: PrintedAppDefinition[];
  openAppIds: AppId[];
  activeAppId: AppId | null;
  onOpenApp: (id: AppId) => void;
  onShowToast: (msg: string) => void;
}

export function SmartAppSortTab({
  printedApps,
  openAppIds,
  activeAppId,
  onOpenApp,
  onShowToast,
}: SmartAppSortTabProps) {
  const [sortState, setSortState] = useState(smartSortEngine.getState());
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [brainBusy, setBrainBusy] = useState(masterBrainEngine.getState().busy);

  useEffect(() => {
    const unsubSort = smartSortEngine.subscribe(setSortState);
    const unsubBrain = masterBrainEngine.subscribe((st) => setBrainBusy(st.busy));
    return () => {
      unsubSort();
      unsubBrain();
    };
  }, []);

  const sortedApps = smartSortEngine.getSortedApps({
    printedApps,
    openAppIds,
    activeAppId,
    group: sortState.activeTab,
    searchQuery,
  });

  const handleTabSelect = (key: SmartSortGroupKey) => {
    smartSortEngine.setActiveTab(key);
    setExpanded(true);
  };

  const handleAutoOrganizePods = async () => {
    smartSortEngine.syncSmartGroupsToDesktopFolders(printedApps);
    const plan = await masterBrainEngine.runMasterSort(
      'Auto-sort all OS apps, 14 integrated suite apps, 2 game engines, 2 unificators, and 103 daemons cleanly inside Smart App Tab and Desktop Pods.'
    );
    onShowToast(
      plan
        ? `Smart Tab & Master Brain synced (${plan.coherenceScore}% coherence).`
        : 'Smart Tab auto-sorted OS apps into Desktop Pods.'
    );
  };

  return (
    <div className="fixed top-[calc(48px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[1210] max-w-[95vw] pointer-events-auto">
      {/* Compact Smart Auto-Sort Tab Ribbon */}
      <div
        id="aether-smart-tab-bar"
        className="aether-glass rounded-xl px-2 py-1 flex items-center gap-1 shadow-xl border border-cyan-400/25 overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="px-2 py-1 rounded-lg bg-gradient-to-r from-cyan-500/25 to-violet-500/25 border border-cyan-400/40 text-cyan-100 text-[10.5px] font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
          title="Expand / Collapse Smart App Sort Tab"
        >
          <Sparkles className="w-3 h-3 text-cyan-300" />
          <span>Smart Tab ({sortedApps.length})</span>
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        <div className="h-4 w-px bg-white/10 mx-0.5 shrink-0" />

        {SMART_TAB_GROUPS.map((grp) => {
          const active = sortState.activeTab === grp.key;
          return (
            <button
              key={grp.key}
              type="button"
              onClick={() => handleTabSelect(grp.key)}
              className={`px-2 py-1 rounded-md text-[10.5px] font-medium whitespace-nowrap cursor-pointer transition-colors shrink-0 ${
                active
                  ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/45 shadow-[0_0_10px_rgba(34,211,238,0.28)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
              }`}
            >
              {grp.label}
            </button>
          );
        })}

        <div className="h-4 w-px bg-white/10 mx-0.5 shrink-0" />

        <button
          type="button"
          onClick={() => smartSortEngine.setAutoSortEnabled(!sortState.autoSortEnabled)}
          className={`px-2 py-1 rounded-md text-[10px] font-mono border cursor-pointer shrink-0 ${
            sortState.autoSortEnabled
              ? 'bg-emerald-500/20 border-emerald-400/45 text-emerald-200'
              : 'bg-white/[0.04] border-white/10 text-slate-400'
          }`}
          title="Toggle live automatic usage/focus ranking"
        >
          {sortState.autoSortEnabled ? 'AUTO:ON' : 'AUTO:OFF'}
        </button>

        <button
          type="button"
          disabled={brainBusy}
          onClick={() => void handleAutoOrganizePods()}
          title="Sync Smart Tab groups into Desktop Pods via Master Brain + 103 Daemons"
          className="px-2 py-1 rounded-md bg-indigo-500/20 hover:bg-indigo-500/35 border border-indigo-400/45 text-indigo-100 text-[10.5px] font-medium inline-flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
        >
          <Brain className={`w-3 h-3 ${brainBusy ? 'animate-spin' : ''}`} />
          <span className="hidden md:inline">{brainBusy ? 'Sorting...' : 'Brain Sort'}</span>
        </button>
      </div>

      {/* Expanded Auto-Sorted Apps Shelf */}
      {expanded && (
        <div className="mt-1.5 aether-glass rounded-2xl p-2.5 w-[min(780px,94vw)] shadow-2xl border border-cyan-400/30 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter auto-sorted apps, engines, unificators, or printed builds..."
                className="w-full bg-[#040914]/90 border border-white/15 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-slate-100 placeholder:text-slate-500 outline-none focus:border-cyan-400/50"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                smartSortEngine.syncSmartGroupsToDesktopFolders(printedApps);
                onShowToast('Auto-sorted apps into Desktop Organic Pods cleanly.');
              }}
              className="px-2.5 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/40 text-fuchsia-100 text-[11px] font-medium inline-flex items-center gap-1.5 cursor-pointer"
            >
              <FolderKanban className="w-3.5 h-3.5" />
              <span>Sort Into Pods</span>
            </button>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/12 text-[11px] text-slate-300 cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
            {sortedApps.map((app) => (
              <button
                key={app.id}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/aether-app', app.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => {
                  onOpenApp(app.id);
                  setExpanded(false);
                }}
                title={`${app.name} · Auto-Rank ${app.score} · ${app.category}`}
                className={`p-1.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                  app.isFocused
                    ? 'bg-cyan-500/20 border-cyan-300/65 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                    : app.isOpen
                    ? 'bg-white/[0.08] border-white/25'
                    : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/10'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${app.accentGradient} flex items-center justify-center shrink-0 shadow`}
                >
                  <AppIcon name={app.iconName} className="w-3.5 h-3.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10.5px] font-semibold text-slate-100 truncate">
                    {app.shortName}
                  </div>
                  <div className="text-[9px] font-mono text-cyan-300/80 truncate">
                    #{app.score} · {app.group.split('-')[0]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
