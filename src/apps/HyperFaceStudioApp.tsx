import { useEffect, useState } from 'react';
import {
  Bot,
  Eraser,
  Library,
  RefreshCw,
  RotateCcw,
  Shapes,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { aimSpaceStore } from '../kernel/aimSpaceStore';
import {
  hyperfaceStudioStore,
  type HyperFaceStageState,
} from '../kernel/hyperfaceStudioStore';
import type { AppId } from '../types/os';

interface HyperFaceStudioAppProps {
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

const OBJECT_IDEAS = [
  'Glowing cybernetic mech helmet with rotating HUD rings',
  'Floating obsidian crystal reactor core with orbiting energy shards',
  'Sci-fi plasma hoverbike chassis in cobalt & neon cyan',
  'Ancient gold holographic astrolabe artifact with spinning brass rings',
  'Bioluminescent alien jellyfish boss creature with pulsing tentacles',
];

export function HyperFaceStudioApp({ onOpenApp, onShowToast }: HyperFaceStudioAppProps) {
  const [stage, setStage] = useState<HyperFaceStageState>(hyperfaceStudioStore.getState());
  const [objectPrompt, setObjectPrompt] = useState(
    'Clear the face and design a floating cybernetic crystal reactor core with orbiting plasma rings'
  );
  const [reloadNonce, setReloadNonce] = useState(0);
  const [lastUploadedId, setLastUploadedId] = useState<`printed:${string}` | null>(null);

  useEffect(() => {
    void hyperfaceStudioStore.ensureInitialized();
    return hyperfaceStudioStore.subscribe(setStage);
  }, []);

  const handleDesignObject = async () => {
    const ok = await hyperfaceStudioStore.designObject(objectPrompt);
    if (ok) {
      onShowToast?.('Cleared phase and synthesized custom 3D object onto stage.');
    }
  };

  const handleUploadToLibrary = async () => {
    const printedId = await hyperfaceStudioStore.uploadCurrentToLibrary();
    if (printedId) {
      setLastUploadedId(printedId);
      onShowToast?.(`Uploaded "${stage.stageTitle}" to OS Library & Desktop.`);
    }
  };

  return (
    <div className="h-full flex flex-col gap-2.5 p-2.5 sm:p-3 text-xs overflow-hidden">
      {/* Top Toolbar */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400/25 to-fuchsia-500/25 border border-cyan-400/40 flex items-center justify-center text-cyan-200 shrink-0">
            <Shapes className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xs sm:text-sm font-semibold text-slate-100 truncate">
                {stage.stageTitle}
              </h2>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono border shrink-0 ${
                  stage.phaseCleared
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                    : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                }`}
              >
                {stage.phaseCleared ? 'Phase Cleared' : `Stage v${stage.version}`}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 truncate">
              Linked to AI Prompt Editor · Clear face phase · Design any 3D object · Upload directly to Library
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              hyperfaceStudioStore.clearPhase();
              onShowToast?.('HyperFace phase cleared — stage is ready for a new object.');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-100 font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Clear Phase</span>
          </button>

          <button
            type="button"
            onClick={() => void hyperfaceStudioStore.loadOriginalStudio()}
            disabled={stage.busy}
            className="px-2.5 py-1.5 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset v12.0</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('architect')}
            className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/45 text-indigo-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Prompt Editor</span>
          </button>

          <button
            type="button"
            onClick={() => void handleUploadToLibrary()}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload to Library</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('smartbrain')}
            className="px-2.5 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/40 text-violet-100 inline-flex items-center gap-1 cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Smart Brain</span>
          </button>

          <button
            type="button"
            onClick={() => {
              aimSpaceStore.queueRestructureInput({
                sourceName: `HyperFace: ${stage.stageTitle}`,
                sourceCode: stage.html.slice(0, 9000),
                directive: `Restructure the HyperFace 3D object (${stage.stageTitle}) into a full playable AIM Space orbital combat & exploration game.`,
              });
              onOpenApp('aimspace');
            }}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AIM Space Game</span>
          </button>
        </div>
      </div>

      {/* Clear Phase + Design Any Object Bar */}
      <div className="aether-panel rounded-xl p-2.5 flex flex-col gap-2 shrink-0">
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <input
            type="text"
            value={objectPrompt}
            onChange={(e) => setObjectPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleDesignObject();
            }}
            placeholder="Describe any object to replace the face (e.g., dragon skull, plasma cannon, crystal orb, sci-fi ship)..."
            className="flex-1 min-w-0 bg-[#040914] border border-white/15 focus:border-cyan-400/60 rounded-lg px-3 py-2 text-slate-100 placeholder:text-slate-500 outline-none"
          />

          <button
            type="button"
            disabled={stage.busy || !objectPrompt.trim()}
            onClick={() => void handleDesignObject()}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500/30 to-fuchsia-500/30 hover:from-cyan-500/40 hover:to-fuchsia-500/40 border border-cyan-400/50 text-cyan-50 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{stage.busy ? 'Clearing & Designing...' : 'Clear Phase & Design Object'}</span>
          </button>

          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            title="Reload Viewport"
            className="p-2 rounded-lg bg-white/[0.05] hover:bg-white/10 border border-white/10 text-slate-300 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10.5px] text-slate-400 mr-1">Object Presets:</span>
          {OBJECT_IDEAS.map((idea) => (
            <button
              key={idea}
              type="button"
              onClick={() => setObjectPrompt(idea)}
              className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[10.5px] text-slate-300 truncate max-w-[220px] cursor-pointer"
            >
              {idea}
            </button>
          ))}
        </div>
      </div>

      {/* Banners */}
      {stage.lastError && (
        <div className="rounded-xl border border-rose-400/45 bg-rose-500/15 px-3 py-2 text-rose-100 shrink-0">
          {stage.lastError}
        </div>
      )}

      {lastUploadedId && (
        <div className="rounded-xl border border-emerald-400/45 bg-emerald-500/15 px-3 py-2 text-emerald-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <span>Saved "{stage.stageTitle}" into OS Library & Desktop.</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onOpenApp(lastUploadedId)}
              className="px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-[11px] font-semibold cursor-pointer"
            >
              Launch Printed App
            </button>
            <button
              type="button"
              onClick={() => onOpenApp('htmlprinter')}
              className="px-2.5 py-1 rounded bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-400/40 text-[11px] inline-flex items-center gap-1 cursor-pointer"
            >
              <Library className="w-3 h-3" />
              <span>Open Library</span>
            </button>
          </div>
        </div>
      )}

      {/* Embedded Live Stage Viewport */}
      <div className="flex-1 min-h-0 rounded-xl overflow-hidden border border-white/12 bg-[#03060c] relative">
        {stage.html ? (
          <iframe
            key={`${stage.version}-${reloadNonce}`}
            title={stage.stageTitle}
            srcDoc={stage.html}
            sandbox="allow-scripts allow-forms allow-modals allow-downloads"
            className="w-full h-full border-0 block"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-400">
            Loading HyperFace AI Studio v12.0...
          </div>
        )}
      </div>
    </div>
  );
}
