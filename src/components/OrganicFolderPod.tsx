import { useState } from 'react';
import { ArrowUpRight, FolderPlus, Palette, Trash2, X } from 'lucide-react';
import type { AppId, OrganicFolder, OSAppDefinition, PrintedAppDefinition } from '../types/os';
import { AppIcon } from './AppIcon';

export interface ResolvedAppItem {
  id: AppId;
  name: string;
  shortName: string;
  category: string;
  accentGradient: string;
  iconName: string;
  isPrinted?: boolean;
  version?: number;
}

export function resolveUnifiedApp(
  id: AppId,
  builtInApps: OSAppDefinition[],
  printedApps: PrintedAppDefinition[]
): ResolvedAppItem | null {
  const b = builtInApps.find((a) => a.id === id);
  if (b) {
    return {
      id: b.id,
      name: b.name,
      shortName: b.shortName,
      category: b.category,
      accentGradient: b.accentGradient,
      iconName: b.iconName,
    };
  }
  const p = printedApps.find((a) => a.id === id);
  if (p) {
    return {
      id: p.id,
      name: p.name,
      shortName: p.shortName,
      category: `Printed v${p.version}`,
      accentGradient: p.accentGradient,
      iconName: 'printer',
      isPrinted: true,
      version: p.version,
    };
  }
  return null;
}

const HUE_STYLES: Record<
  OrganicFolder['hue'],
  { shell: string; glow: string; border: string; text: string }
> = {
  cyan: {
    shell: 'from-cyan-500/25 via-sky-500/15 to-teal-500/25',
    glow: 'shadow-[0_0_24px_-4px_rgba(34,211,238,0.55)]',
    border: 'border-cyan-300/45',
    text: 'text-cyan-200',
  },
  emerald: {
    shell: 'from-emerald-500/25 via-teal-500/15 to-lime-500/20',
    glow: 'shadow-[0_0_24px_-4px_rgba(52,211,153,0.55)]',
    border: 'border-emerald-300/45',
    text: 'text-emerald-200',
  },
  fuchsia: {
    shell: 'from-fuchsia-500/25 via-purple-500/15 to-pink-500/25',
    glow: 'shadow-[0_0_24px_-4px_rgba(232,121,249,0.55)]',
    border: 'border-fuchsia-300/45',
    text: 'text-fuchsia-200',
  },
  amber: {
    shell: 'from-amber-500/25 via-orange-500/15 to-rose-500/20',
    glow: 'shadow-[0_0_24px_-4px_rgba(251,191,36,0.55)]',
    border: 'border-amber-300/45',
    text: 'text-amber-200',
  },
  indigo: {
    shell: 'from-indigo-500/25 via-violet-500/15 to-blue-500/25',
    glow: 'shadow-[0_0_24px_-4px_rgba(129,140,248,0.55)]',
    border: 'border-indigo-300/45',
    text: 'text-indigo-200',
  },
};

export function OrganicFolderTile({
  folder,
  builtInApps,
  printedApps,
  rms,
  isOpen,
  onToggleOpen,
  onDropApp,
}: {
  folder: OrganicFolder;
  builtInApps: OSAppDefinition[];
  printedApps: PrintedAppDefinition[];
  rms: number;
  isOpen: boolean;
  onToggleOpen: () => void;
  onDropApp: (appId: AppId, folderId: string) => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const style = HUE_STYLES[folder.hue];
  const previewApps = folder.appIds
    .slice(0, 4)
    .map((id) => resolveUnifiedApp(id, builtInApps, printedApps))
    .filter((x): x is ResolvedAppItem => Boolean(x));

  const scale = dragOver ? 1.14 : isOpen ? 1.07 : 1 + rms * 0.05;

  return (
    <button
      type="button"
      onClick={onToggleOpen}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/aether-app')) {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        const droppedId = e.dataTransfer.getData('text/aether-app') as AppId;
        if (droppedId) {
          e.preventDefault();
          e.stopPropagation();
          onDropApp(droppedId, folder.id);
        }
      }}
      style={{
        transform: `perspective(420px) scale(${scale.toFixed(3)})`,
        borderRadius: '44% 56% 52% 48% / 48% 42% 58% 52%',
      }}
      title={`${folder.name} (${folder.appIds.length} apps) — Drag apps here or click to open`}
      className={`pointer-events-auto relative w-[64px] p-1.5 flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 ${
        dragOver ? 'ring-2 ring-cyan-300 scale-110' : ''
      } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400`}
    >
      <div
        style={{ borderRadius: '42% 58% 48% 52% / 50% 44% 56% 50%' }}
        className={`relative w-10 h-10 p-1 bg-gradient-to-br ${style.shell} ${style.border} ${
          isOpen || dragOver ? style.glow : ''
        } border backdrop-blur-md grid grid-cols-2 gap-0.5 place-items-center transition-all`}
      >
        {previewApps.length > 0 ? (
          previewApps.map((item) => (
            <span
              key={item.id}
              className={`w-3.5 h-3.5 rounded-[4px] bg-gradient-to-br ${item.accentGradient} flex items-center justify-center shadow`}
            >
              <AppIcon name={item.iconName} className="w-2 h-2 text-white" />
            </span>
          ))
        ) : (
          <span className="col-span-2 text-[9px] text-slate-300 opacity-75">+Drop</span>
        )}
        <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[14px] rounded-full bg-slate-950/90 border border-white/25 text-[8.5px] font-mono-tabular text-cyan-200 flex items-center justify-center">
          {folder.appIds.length}
        </span>
      </div>
      <span className={`text-[9.5px] font-semibold leading-tight truncate max-w-full ${style.text} drop-shadow`}>
        {folder.name}
      </span>
    </button>
  );
}

export function OrganicFolderDrawer({
  folder,
  builtInApps,
  printedApps,
  openWindowIds,
  activeAppId,
  onClose,
  onOpenApp,
  onExtractApp,
  onDropApp,
  onRename,
  onCycleHue,
  onDissolve,
  onCreateNewFolder,
}: {
  folder: OrganicFolder;
  builtInApps: OSAppDefinition[];
  printedApps: PrintedAppDefinition[];
  openWindowIds: Set<string>;
  activeAppId: AppId | null;
  onClose: () => void;
  onOpenApp: (id: AppId) => void;
  onExtractApp: (id: AppId) => void;
  onDropApp: (appId: AppId, folderId: string) => void;
  onRename: (folderId: string, name: string) => void;
  onCycleHue: (folderId: string) => void;
  onDissolve: (folderId: string) => void;
  onCreateNewFolder: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);
  const [dragOver, setDragOver] = useState(false);
  const style = HUE_STYLES[folder.hue];

  const items = folder.appIds
    .map((id) => resolveUnifiedApp(id, builtInApps, printedApps))
    .filter((x): x is ResolvedAppItem => Boolean(x));

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('text/aether-app')) {
          e.preventDefault();
          e.stopPropagation();
          setDragOver(true);
        }
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        setDragOver(false);
        const droppedId = e.dataTransfer.getData('text/aether-app') as AppId;
        if (droppedId) {
          e.preventDefault();
          e.stopPropagation();
          onDropApp(droppedId, folder.id);
        }
      }}
      style={{ borderRadius: '26px 34px 28px 32px / 30px 26px 34px 28px' }}
      className={`pointer-events-auto fixed left-4 sm:left-24 top-[calc(98px+env(safe-area-inset-top))] z-[1190] w-[300px] sm:w-[340px] max-w-[92vw] max-h-[calc(100dvh-180px)] overflow-y-auto aether-glass p-3 border ${
        style.border
      } ${style.glow} transition-all ${dragOver ? 'ring-2 ring-cyan-300 scale-[1.02]' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/10">
        {editingName ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onRename(folder.id, nameDraft);
              setEditingName(false);
            }}
            className="flex-1"
          >
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={() => {
                onRename(folder.id, nameDraft);
                setEditingName(false);
              }}
              className="w-full bg-slate-950/90 border border-cyan-400/50 rounded px-2 py-0.5 text-xs text-slate-100 focus:outline-none"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setNameDraft(folder.name);
              setEditingName(true);
            }}
            title="Click to rename organic folder"
            className={`text-xs font-semibold ${style.text} hover:underline cursor-pointer truncate`}
          >
            {folder.name} ({items.length})
          </button>
        )}

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onCreateNewFolder}
            title="New Organic Folder"
            className="p-1 rounded hover:bg-white/10 text-slate-300 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onCycleHue(folder.id)}
            title="Cycle Organic Hue"
            className="p-1 rounded hover:bg-white/10 text-slate-300 cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onDissolve(folder.id);
              onClose();
            }}
            title="Dissolve folder & extract all apps to desktop"
            className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-200 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close folder drawer"
            className="p-1 rounded hover:bg-white/10 text-slate-300 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* App Tiles Grid inside Organic Pod */}
      <div className="grid grid-cols-3 gap-2 max-h-[240px] overflow-y-auto p-0.5">
        {items.length === 0 ? (
          <div className="col-span-3 py-6 text-center text-[11px] text-slate-400">
            Drag any app tile from the desktop into this organic pod.
          </div>
        ) : (
          items.map((item) => {
            const isOpen = openWindowIds.has(item.id);
            const isFocused = activeAppId === item.id;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/aether-app', item.id);
                  e.dataTransfer.setData('text/aether-source-folder', folder.id);
                  e.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => onOpenApp(item.id)}
                className={`group relative p-1.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing flex flex-col items-center gap-1 text-center ${
                  isFocused
                    ? 'bg-cyan-500/20 border-cyan-300/70 shadow-[0_0_16px_rgba(34,211,238,0.45)]'
                    : isOpen
                    ? 'bg-white/10 border-white/25'
                    : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.09]'
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onExtractApp(item.id);
                  }}
                  title="Extract to Main Desktop"
                  className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-0.5 right-0.5 p-0.5 rounded bg-slate-950/90 border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/30 cursor-pointer"
                >
                  <ArrowUpRight className="w-2.5 h-2.5" />
                </button>

                <div
                  className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.accentGradient} flex items-center justify-center shadow border border-white/25`}
                >
                  <AppIcon name={item.iconName} className="w-4 h-4 text-white" />
                </div>
                <span className="text-[9.5px] font-medium text-slate-200 leading-tight truncate w-full">
                  {item.shortName}
                </span>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 pt-1.5 border-t border-white/10 text-[9.5px] text-slate-400 flex items-center justify-between">
        <span>Drag outside or click ↗ to extract</span>
        <span>Drop apps inside</span>
      </div>
    </div>
  );
}
