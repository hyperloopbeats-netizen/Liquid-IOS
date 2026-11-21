import { useEffect, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  Eraser,
  FileCode2,
  FolderGit2,
  Layers,
  Play,
  Shapes,
  Sparkles,
  Upload,
  Wand2,
} from 'lucide-react';
import { aimSpaceStore } from '../kernel/aimSpaceStore';
import {
  BLANK_PHASE_HTML,
  hyperfaceStudioStore,
  type HyperFaceStageState,
} from '../kernel/hyperfaceStudioStore';
import { jsonKnowledgeStore } from '../kernel/jsonKnowledgeStore';
import { neuralBus } from '../kernel/neuralBus';
import { extractTitleFromHtml, printedAppsStore } from '../kernel/printedAppsStore';
import { vfs } from '../kernel/vfs';
import type { AppId, VFSFile } from '../types/os';

interface SystemModuleSpec {
  name: string;
  responsibility: string;
}

interface ArchitectPatch {
  fileName: string;
  kind: string;
  action: 'update' | 'create';
  description: string;
  code: string;
}

interface ArchitectResult {
  model: string;
  summary: string;
  architecturalPlan: string[];
  systemModules: SystemModuleSpec[];
  patches: ArchitectPatch[];
}

interface PromptArchitectAppProps {
  onOpenFileInDrive?: (fileName: string) => void;
  onRunInSandbox?: (fileName: string) => void;
  onOpenApp?: (id: AppId) => void;
}

const UPGRADE_RECIPES = [
  {
    label: 'Clear Phase & Design 3D Object',
    prompt:
      'Clear the HyperFace mesh phase completely and build a standalone interactive Three.js 3D object studio for a floating plasma crystal artifact with orbit controls and live HUD sliders.',
  },
  {
    label: 'Modularize & Type-Harden',
    prompt:
      'Restructure this code into clean typed modules with strict interfaces, explicit error handling, and zero side-effect leaks.',
  },
  {
    label: 'Performance & Memory Pass',
    prompt:
      'Execute a full performance upgrade: eliminate redundant allocations inside loops, add cleanup guards for timers/listeners, and optimize DOM updates.',
  },
  {
    label: 'Security & Validation Guard',
    prompt:
      'Audit and upgrade this codebase with strict input validation, safe DOM rendering (no innerHTML/eval), and resilient try/catch recovery.',
  },
  {
    label: 'Scaffold Full Feature System',
    prompt:
      'Structure all necessary state, UI, and persistence subsystems to turn this draft into a complete, self-contained interactive module ready for preview.',
  },
];

export function PromptArchitectApp({
  onOpenFileInDrive,
  onRunInSandbox,
  onOpenApp,
}: PromptArchitectAppProps) {
  const [files, setFiles] = useState<VFSFile[]>([]);
  const [mode, setMode] = useState<'vfs' | 'scratch' | 'hyperface'>('vfs');
  const [hyperfaceStage, setHyperfaceStage] = useState<HyperFaceStageState>(
    hyperfaceStudioStore.getState()
  );
  const [clearPhaseBeforeDesign, setClearPhaseBeforeDesign] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [scratchName, setScratchName] = useState<string>('custom-system.ts');
  const [scratchCode, setScratchCode] = useState<string>(
    `// Paste your code here or switch to Workspace VFS mode\nexport function processQueue(items) {\n  var out = [];\n  for (var i = 0; i < items.length; i++) {\n    out.push(items[i].trim());\n  }\n  return out;\n}\n`
  );

  const [prompt, setPrompt] = useState<string>(
    'Structure clean TypeScript interfaces, add resilient error boundaries and null guards, and upgrade this code to modern ES2025 best practices.'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<ArchitectResult | null>(null);
  const [activePatchIdx, setActivePatchIdx] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [appliedBanner, setAppliedBanner] = useState<string | null>(null);

  useEffect(() => {
    void hyperfaceStudioStore.ensureInitialized();
    const unsubHyper = hyperfaceStudioStore.subscribe(setHyperfaceStage);
    const unsubVfs = vfs.subscribe((next) => {
      setFiles(next);
      if (next.length > 0 && !next.some((f) => f.id === selectedFileId)) {
        const preferred =
          next.find((f) => f.name.endsWith('.js') || f.name.endsWith('.ts')) ?? next[0];
        setSelectedFileId(preferred.id);
      }
    });
    return () => {
      unsubHyper();
      unsubVfs();
    };
  }, [selectedFileId]);

  const activeFile = files.find((f) => f.id === selectedFileId) ?? files[0] ?? null;

  const copyCodeBlock = async (text: string, id: string) => {
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
    }, 1800);
  };

  const handleRunUpgrade = async () => {
    if (!prompt.trim()) {
      setErrorMsg('Enter an architectural or upgrade prompt first.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setAppliedBanner(null);

    try {
      if (mode === 'hyperface' && clearPhaseBeforeDesign) {
        hyperfaceStudioStore.clearPhase();
        const res = await fetch('/api/hyperface/design-object', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: prompt.trim(),
            previousTitle: hyperfaceStage.stageTitle,
          }),
        });
        const data = (await res.json()) as {
          title?: string;
          summary?: string;
          designTags?: string[];
          html?: string;
          error?: string;
        };
        if (!res.ok || !data.html) {
          throw new Error(data.error || `Server returned HTTP ${res.status}`);
        }

        const title = data.title || 'AI Designed 3D Object';
        hyperfaceStudioStore.setStageHtmlFromArchitect(title, data.html, prompt.trim());

        const parsed: ArchitectResult = {
          model: 'gemini-4-hydrogen',
          summary:
            data.summary ||
            `Cleared HyperFace phase and synthesized "${title}" ready for HyperFace stage & Library.`,
          architecturalPlan: [
            'Cleared active HyperFace mesh phase to blank Three.js stage.',
            `Synthesized "${title}" procedural 3D geometry & interactive controls.`,
            'Synced output directly to HyperFace Studio and ready to upload to Library.',
          ],
          systemModules: [
            { name: 'HyperFaceStage', responsibility: 'Live Three.js WebGL interactive viewport' },
            { name: 'LibraryBridge', responsibility: 'Direct HTML5 Printer & JSON Vault sync' },
          ],
          patches: [
            {
              fileName: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'object-3d'}.html`,
              kind: 'html',
              action: 'create',
              description: data.summary || `Custom 3D object design: ${title}`,
              code: data.html,
            },
          ],
        };
        setResult(parsed);
        setActivePatchIdx(0);
        setAppliedBanner(`Phase cleared & "${title}" pushed live to HyperFace Studio!`);
        return;
      }

      const targetFileName =
        mode === 'hyperface'
          ? 'hyperface-studio.html'
          : mode === 'vfs' && activeFile
          ? activeFile.name
          : scratchName.trim() || 'module.ts';
      const targetCode =
        mode === 'hyperface'
          ? (hyperfaceStage.html || BLANK_PHASE_HTML).slice(0, 14000)
          : mode === 'vfs' && activeFile
          ? activeFile.content
          : scratchCode;

      const res = await fetch('/api/architect/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          targetFileName,
          targetCode,
          workspaceFiles: files.slice(0, 6).map((f) => ({
            name: f.name,
            kind: f.kind,
            content: f.content,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Server returned HTTP ${res.status}`);
      }

      const parsed: ArchitectResult = {
        model: data.model || 'gemini-4-hydrogen',
        summary: data.summary || 'Upgrades prepared.',
        architecturalPlan: Array.isArray(data.architecturalPlan) ? data.architecturalPlan : [],
        systemModules: Array.isArray(data.systemModules) ? data.systemModules : [],
        patches: Array.isArray(data.patches) ? data.patches : [],
      };

      setResult(parsed);
      setActivePatchIdx(0);
      neuralBus.publish(
        'SWARM',
        'ARCHITECT_UPGRADE_READY',
        `AI Architect generated ${parsed.patches.length} upgraded module(s) for "${targetFileName}".`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to execute AI upgrade.');
    } finally {
      setLoading(false);
    }
  };

  const applyPatchToVfs = async (patch: ArchitectPatch) => {
    await vfs.createSnapshot('Before AI Architect Patch', `Snapshot prior to patching ${patch.fileName}`);
    const existing = files.find((f) => f.name === patch.fileName || f.path === `/${patch.fileName}`);
    await vfs.saveFile({
      id: existing?.id,
      name: patch.fileName,
      path: existing?.path ?? `/workspace/src/${patch.fileName}`,
      content: patch.code,
      patchedBy: 'AI Prompt Architect',
    });
    setAppliedBanner(`Applied upgrade to "${patch.fileName}" (snapshot saved).`);
    neuralBus.publish('VFS', 'ARCHITECT_PATCH_APPLIED', `Applied AI upgrade to ${patch.fileName}.`);
  };

  const applyAllPatchesToVfs = async () => {
    if (!result || result.patches.length === 0) return;
    await vfs.createSnapshot(
      'Before System Upgrade',
      `Batch upgrade across ${result.patches.length} file(s)`
    );
    for (const patch of result.patches) {
      const existing = files.find((f) => f.name === patch.fileName || f.path === `/${patch.fileName}`);
      await vfs.saveFile({
        id: existing?.id,
        name: patch.fileName,
        path: existing?.path ?? `/workspace/src/${patch.fileName}`,
        content: patch.code,
        patchedBy: 'AI Prompt Architect',
      });
    }
    setAppliedBanner(`Executed ${result.patches.length} system upgrades in VFS (snapshot saved).`);
    neuralBus.publish(
      'VFS',
      'ARCHITECT_BATCH_APPLIED',
      `Applied ${result.patches.length} system upgrades into IndexedDB VFS.`
    );
  };

  const pushPatchToHyperFace = (patch: ArchitectPatch) => {
    const title = extractTitleFromHtml(patch.code) || patch.fileName.replace(/\.[^.]+$/, '');
    hyperfaceStudioStore.setStageHtmlFromArchitect(title, patch.code, prompt);
    setAppliedBanner(`Pushed "${title}" onto HyperFace Object Stage.`);
    onOpenApp?.('hyperface');
  };

  const uploadPatchToLibrary = async (patch: ArchitectPatch) => {
    const title = extractTitleFromHtml(patch.code) || patch.fileName.replace(/\.[^.]+$/, '');
    const printed = await printedAppsStore.printApp({
      name: title,
      description: patch.description || `Uploaded from AI Prompt Editor: ${prompt.slice(0, 120)}`,
      html: patch.code,
      improvementNote: 'Designed in AI Prompt Architect & uploaded to OS Library.',
    });
    jsonKnowledgeStore.saveEntry({
      title: `Library Upload: ${printed.name}`,
      category: 'style-theme',
      tags: ['library-upload', 'prompt-architect', 'hyperface'],
      summary: `Uploaded "${printed.name}" to OS Library & Desktop.`,
      sideNotes: [`Prompt: ${prompt.slice(0, 160)}`],
      linkedAppIds: ['architect', 'hyperface', 'htmlprinter'],
      data: { printedAppId: printed.id, name: printed.name, version: printed.version },
    });
    setAppliedBanner(`Uploaded "${printed.name}" directly to OS Library & Desktop!`);
    onOpenApp?.(printed.id);
  };

  const currentPatch = result?.patches[activePatchIdx] ?? null;

  return (
    <div className="h-full flex flex-col gap-3 p-3 sm:p-4 overflow-y-auto lg:overflow-hidden text-xs">
      {/* Header Toolbar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/35 flex items-center justify-center text-indigo-300 shrink-0">
            <Wand2 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-sm font-semibold text-slate-100 truncate">
              AI Prompt Architect & System Upgrader
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              Write prompts · Structure multi-file systems · Execute code upgrades · Copy ready-to-run blocks
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => setMode('vfs')}
            className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-colors whitespace-nowrap ${
              mode === 'vfs'
                ? 'bg-indigo-500/25 text-indigo-100 border border-indigo-400/40'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Workspace VFS ({files.length})
          </button>
          <button
            type="button"
            onClick={() => setMode('scratch')}
            className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-colors whitespace-nowrap ${
              mode === 'scratch'
                ? 'bg-indigo-500/25 text-indigo-100 border border-indigo-400/40'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Paste Code Snippet
          </button>
          <button
            type="button"
            onClick={() => setMode('hyperface')}
            className={`px-2.5 py-1.5 rounded-md font-medium cursor-pointer transition-colors whitespace-nowrap inline-flex items-center gap-1 ${
              mode === 'hyperface'
                ? 'bg-cyan-500/25 text-cyan-100 border border-cyan-400/45'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Shapes className="w-3.5 h-3.5" />
            <span>HyperFace Stage</span>
          </button>
        </div>
      </div>

      {/* Main Split */}
      <div className="flex-none lg:flex-1 lg:min-h-0 flex flex-col lg:grid lg:grid-cols-12 gap-3">
        {/* Left: Target Source & Prompt Composer */}
        <div className="lg:col-span-5 flex flex-col gap-3 lg:min-h-0">
          {/* Source Selector / Editor */}
          <div className="aether-panel rounded-xl p-3 flex flex-col gap-2 min-h-[210px] lg:flex-1 lg:min-h-0">
            <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                <FileCode2 className="w-3.5 h-3.5 text-cyan-300" />
                <span>{mode === 'hyperface' ? 'HyperFace 3D Stage' : 'Target Code Context'}</span>
              </span>

              {mode === 'vfs' ? (
                <select
                  value={activeFile?.id ?? ''}
                  onChange={(e) => setSelectedFileId(e.target.value)}
                  className="bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 max-w-[200px] outline-none"
                >
                  {files.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              ) : mode === 'scratch' ? (
                <input
                  type="text"
                  value={scratchName}
                  onChange={(e) => setScratchName(e.target.value)}
                  placeholder="filename.ts"
                  className="bg-slate-900 border border-white/15 rounded-md px-2 py-1 text-slate-100 w-40 font-mono text-[11px] outline-none"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => hyperfaceStudioStore.clearPhase()}
                    className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 text-[11px] inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Eraser className="w-3 h-3" />
                    <span>Clear Phase</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenApp?.('hyperface')}
                    className="px-2 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 text-[11px] cursor-pointer"
                  >
                    View Stage
                  </button>
                </div>
              )}
            </div>

            {mode === 'hyperface' ? (
              <div className="flex-1 flex flex-col gap-2 min-h-[140px]">
                <div className="rounded-lg bg-[#050a14] border border-white/10 p-2.5 flex items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-300 truncate">
                    Active: <strong className="text-cyan-200">{hyperfaceStage.stageTitle}</strong>
                  </span>
                  <label className="inline-flex items-center gap-1.5 text-amber-200 cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={clearPhaseBeforeDesign}
                      onChange={(e) => setClearPhaseBeforeDesign(e.target.checked)}
                      className="accent-cyan-400"
                    />
                    <span>Clear phase &amp; design new 3D object</span>
                  </label>
                </div>
                <textarea
                  readOnly
                  value={hyperfaceStage.html}
                  className="flex-1 min-h-[110px] w-full rounded-lg bg-[#050a14] border border-white/10 p-2.5 font-mono text-[10.5px] text-slate-400 leading-relaxed resize-none outline-none"
                />
              </div>
            ) : mode === 'vfs' ? (
              <textarea
                value={activeFile?.content ?? ''}
                onChange={(e) => {
                  if (activeFile) {
                    void vfs.saveFile({
                      id: activeFile.id,
                      name: activeFile.name,
                      path: activeFile.path,
                      content: e.target.value,
                    });
                  }
                }}
                spellCheck={false}
                className="flex-1 min-h-[140px] w-full rounded-lg bg-[#050a14] border border-white/10 p-2.5 font-mono text-[11px] text-slate-200 leading-relaxed resize-none outline-none focus:border-cyan-400/50"
              />
            ) : (
              <textarea
                value={scratchCode}
                onChange={(e) => setScratchCode(e.target.value)}
                spellCheck={false}
                placeholder="Paste any JavaScript, TypeScript, HTML, or CSS code here..."
                className="flex-1 min-h-[140px] w-full rounded-lg bg-[#050a14] border border-white/10 p-2.5 font-mono text-[11px] text-slate-200 leading-relaxed resize-none outline-none focus:border-indigo-400/50"
              />
            )}
          </div>

          {/* Prompt Composer */}
          <div className="aether-panel rounded-xl p-3 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                <span>Architecture & Upgrade Prompt</span>
              </span>
              <span className="text-[11px] text-slate-400">Gemini 4 Hydrogen</span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {UPGRADE_RECIPES.map((r) => (
                <button
                  key={r.label}
                  type="button"
                  onClick={() => setPrompt(r.prompt)}
                  className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/10 border border-white/10 text-[11px] text-slate-300 cursor-pointer transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe how the AI should restructure systems, add features, or upgrade your code..."
              className="w-full rounded-lg bg-[#050a14] border border-white/12 p-2.5 text-slate-100 placeholder:text-slate-500 resize-none outline-none focus:border-indigo-400/60"
            />

            <button
              type="button"
              disabled={loading}
              onClick={() => void handleRunUpgrade()}
              className="w-full py-2.5 px-4 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/35 disabled:opacity-50 border border-indigo-400/50 text-indigo-100 font-semibold inline-flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              <Wand2 className="w-4 h-4" />
              <span>{loading ? 'Structuring Systems & Upgrading Code...' : 'Structure Systems & Execute Upgrades'}</span>
            </button>
          </div>
        </div>

        {/* Right: Structured Architecture Plan & Copyable Upgraded Code Blocks */}
        <div className="lg:col-span-7 flex flex-col gap-3 min-h-[320px] lg:min-h-0">
          {errorMsg && (
            <div className="rounded-xl border border-rose-400/40 bg-rose-500/12 px-3 py-2 text-rose-100 shrink-0">
              {errorMsg}
            </div>
          )}

          {appliedBanner && (
            <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/12 px-3 py-2 text-emerald-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <span>{appliedBanner}</span>
              {currentPatch && onOpenFileInDrive && (
                <button
                  type="button"
                  onClick={() => onOpenFileInDrive(currentPatch.fileName)}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium cursor-pointer"
                >
                  Open in Code Editor
                </button>
              )}
            </div>
          )}

          {!result ? (
            <div className="aether-panel rounded-xl p-6 flex-1 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/12 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                <Layers className="w-6 h-6" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="font-display text-sm font-semibold text-slate-100">
                  Ready to Structure & Upgrade Your Code
                </h3>
                <p className="text-slate-400 leading-relaxed">
                  Select a workspace file or paste custom code on the left, enter your architectural prompt, and run the AI Upgrader. Each generated module includes a 1-click Copy Code Block button and instant VFS application.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col gap-3">
              {/* Architectural Plan & Modules Overview */}
              <div className="aether-panel rounded-xl p-3 space-y-2.5 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-semibold text-slate-100 inline-flex items-center gap-1.5">
                    <FolderGit2 className="w-4 h-4 text-emerald-300" />
                    <span>Executed System Plan</span>
                  </div>
                  {result.patches.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void applyAllPatchesToVfs()}
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 font-semibold cursor-pointer whitespace-nowrap"
                    >
                      Apply All ({result.patches.length}) to VFS
                    </button>
                  )}
                </div>

                <p className="text-slate-300 leading-relaxed">{result.summary}</p>

                {result.systemModules.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {result.systemModules.slice(0, 4).map((m) => (
                      <div
                        key={m.name}
                        className="rounded-lg bg-white/[0.03] border border-white/10 px-2.5 py-2"
                      >
                        <div className="font-mono text-[11px] font-semibold text-cyan-300 truncate">
                          {m.name}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">
                          {m.responsibility}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Upgraded Code Block Viewer */}
              <div className="aether-panel rounded-xl p-3 flex-1 min-h-[220px] flex flex-col gap-2">
                {result.patches.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {result.patches.map((p, idx) => (
                        <button
                          key={`${p.fileName}-${idx}`}
                          type="button"
                          onClick={() => setActivePatchIdx(idx)}
                          className={`px-2.5 py-1 rounded-md border font-mono text-[11px] cursor-pointer transition-colors ${
                            idx === activePatchIdx
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                              : 'bg-white/[0.03] hover:bg-white/10 border-white/10 text-slate-300'
                          }`}
                        >
                          {p.fileName} · {p.action}
                        </button>
                      ))}
                    </div>

                    {currentPatch && (
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            void copyCodeBlock(currentPatch.code, `patch-${activePatchIdx}`)
                          }
                          className="px-3 py-1.5 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/50 text-indigo-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          {copiedId === `patch-${activePatchIdx}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-300" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {copiedId === `patch-${activePatchIdx}` ? 'Copied Code' : 'Copy Code Block'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => void applyPatchToVfs(currentPatch)}
                          className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          <span>Save File</span>
                        </button>

                        {onRunInSandbox &&
                          (currentPatch.fileName.endsWith('.html') ||
                            currentPatch.fileName.endsWith('.js')) && (
                            <button
                              type="button"
                              onClick={async () => {
                                await applyPatchToVfs(currentPatch);
                                onRunInSandbox(currentPatch.fileName);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-cyan-100 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Play className="w-3.5 h-3.5" />
                              <span>Run</span>
                            </button>
                          )}

                        {(currentPatch.fileName.endsWith('.html') || mode === 'hyperface') && (
                          <>
                            <button
                              type="button"
                              onClick={() => pushPatchToHyperFace(currentPatch)}
                              className="px-2.5 py-1.5 rounded-lg bg-fuchsia-500/20 hover:bg-fuchsia-500/30 border border-fuchsia-400/45 text-fuchsia-100 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Shapes className="w-3.5 h-3.5" />
                              <span>Push to HyperFace</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => void uploadPatchToLibrary(currentPatch)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-emerald-100 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Upload to Library</span>
                            </button>
                          </>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            aimSpaceStore.queueRestructureInput({
                              sourceName: `Architect: ${currentPatch.fileName}`,
                              sourceCode: currentPatch.code,
                              directive: prompt,
                            });
                            onOpenApp?.('aimspace');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/45 text-amber-100 font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Send to AIM Space</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {currentPatch && (
                  <>
                    <div className="text-[11px] text-slate-300 shrink-0">
                      {currentPatch.description}
                    </div>
                    <pre className="flex-1 overflow-auto rounded-lg bg-[#040812] border border-white/10 p-3 font-mono text-[11px] text-emerald-100 leading-relaxed select-text">
                      <code>{currentPatch.code}</code>
                    </pre>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
