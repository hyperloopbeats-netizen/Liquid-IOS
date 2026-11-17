import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Columns2,
  Download,
  FileCode2,
  FilePlus,
  Folder,
  FolderOpen,
  FolderUp,
  Play,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { vfs } from '../kernel/vfs';
import type { AppId, VFSFile, VFSFileKind } from '../types/os';
import {
  buildSandboxedSrcDoc,
  extractOutline,
  TOKEN_CLASS_MAP,
  tokenizeCodeLine,
} from '../utils/codeTools';

interface AetherDriveAppProps {
  initialFileName?: string | null;
  onRunInSandbox: (fileName: string) => void;
  onOpenApp?: (id: AppId) => void;
}

interface TreeNode {
  name: string;
  path: string;
  children: Map<string, TreeNode>;
  files: VFSFile[];
}

interface DroppedFileEntry {
  name: string;
  path: string;
  content: string;
}

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.cache', 'coverage']);

async function traverseWebkitEntry(
  entry: FileSystemEntry,
  basePath: string,
  out: DroppedFileEntry[]
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    if (!vfs.isSupportedCodeFile(entry.name)) return;
    await new Promise<void>((resolve) => {
      fileEntry.file(
        async (file) => {
          try {
            if (file.size <= 512 * 1024) {
              const content = await file.text();
              out.push({
                name: file.name,
                path: `${basePath}/${file.name}`.replace(/\/+/g, '/'),
                content,
              });
            }
          } catch {
            // ignore unreadable files
          }
          resolve();
        },
        () => resolve()
      );
    });
    return;
  }

  if (entry.isDirectory) {
    if (SKIP_DIRS.has(entry.name)) return;
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve) => {
        reader.readEntries(
          (entries) => resolve(entries),
          () => resolve([])
        );
      });

    let batch = await readBatch();
    while (batch.length > 0) {
      for (const child of batch) {
        await traverseWebkitEntry(child, `${basePath}/${entry.name}`, out);
      }
      batch = await readBatch();
    }
  }
}

function buildFileTree(files: VFSFile[]): TreeNode {
  const root: TreeNode = { name: '', path: '', children: new Map(), files: [] };

  for (const file of files) {
    const segments = file.path.split('/').filter(Boolean);
    const dirs = segments.slice(0, -1);
    let cursor = root;
    let currPath = '';
    for (const dir of dirs) {
      currPath += `/${dir}`;
      if (!cursor.children.has(dir)) {
        cursor.children.set(dir, { name: dir, path: currPath, children: new Map(), files: [] });
      }
      cursor = cursor.children.get(dir)!;
    }
    cursor.files.push(file);
  }
  return root;
}

const KIND_COLOR: Record<VFSFileKind, string> = {
  ts: 'text-sky-300',
  js: 'text-amber-300',
  html: 'text-orange-300',
  css: 'text-indigo-300',
  json: 'text-emerald-300',
  md: 'text-teal-300',
};

export function AetherDriveApp({ initialFileName, onRunInSandbox, onOpenApp }: AetherDriveAppProps) {
  const [files, setFiles] = useState<VFSFile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | VFSFileKind>('all');
  const [collapsedDirs, setCollapsedDirs] = useState<Record<string, boolean>>({});
  const [newFileModal, setNewFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('/workspace/src/widget.ts');
  const [statusMessage, setStatusMessage] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [splitPaneMode, setSplitPaneMode] = useState<'preview' | 'outline' | 'none'>('preview');
  const [previewNonce, setPreviewNonce] = useState(1);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const highlightPreRef = useRef<HTMLPreElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    void vfs.init();
    const unsub = vfs.subscribe((nextFiles, _snaps, activeId) => {
      setFiles(nextFiles);
      if (nextFiles.length > 0) {
        setSelectedId((prev) => {
          if (initialFileName) {
            const target = nextFiles.find(
              (f) => f.name === initialFileName || f.path.endsWith(initialFileName)
            );
            if (target) return target.id;
          }
          if (activeId && nextFiles.some((f) => f.id === activeId)) return activeId;
          if (prev && nextFiles.some((f) => f.id === prev)) return prev;
          return nextFiles[0].id;
        });
      }
    });
    return unsub;
  }, [initialFileName]);

  // Attach webkitdirectory attribute safely without TS JSX friction
  useEffect(() => {
    if (folderInputRef.current) {
      folderInputRef.current.setAttribute('webkitdirectory', '');
      folderInputRef.current.setAttribute('directory', '');
    }
  }, []);

  const selectedFile = files.find((f) => f.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedFile) {
      setDraftName(selectedFile.name);
      setDraftContent(selectedFile.content);
    }
  }, [selectedFile?.id, selectedFile?.updatedAt]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return files.filter((f) => {
      if (filterKind !== 'all' && f.kind !== filterKind) return false;
      if (q && !f.path.toLowerCase().includes(q) && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [files, filterKind, searchQuery]);

  const fileTree = useMemo(() => buildFileTree(filteredFiles), [filteredFiles]);

  const isDirty = selectedFile
    ? draftContent !== selectedFile.content || draftName !== selectedFile.name
    : false;

  const setBannerStatus = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => {
      setStatusMessage((curr) => (curr === msg ? '' : curr));
    }, 3200);
  };

  const handleSelectFile = (file: VFSFile) => {
    setSelectedId(file.id);
    vfs.setActiveFile(file.id);
  };

  const handleSave = useCallback(async () => {
    if (!selectedFile) return;
    const cleanName = draftName.trim() || selectedFile.name;
    const dir = selectedFile.path.includes('/')
      ? selectedFile.path.slice(0, selectedFile.path.lastIndexOf('/'))
      : '/workspace/custom';
    const nextPath = `${dir}/${cleanName}`.replace(/\/+/g, '/');
    const saved = await vfs.saveFile({
      id: selectedFile.id,
      name: cleanName,
      path: nextPath,
      content: draftContent,
    });
    setSelectedId(saved.id);
    setPreviewNonce((n) => n + 1);
    setBannerStatus(`Saved ${saved.path}`);
  }, [selectedFile, draftName, draftContent]);

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = newFileName.trim() || '/workspace/custom/module.ts';
    const normPath = rawInput.startsWith('/') ? rawInput : `/workspace/custom/${rawInput}`;
    const cleanName = normPath.split('/').pop() || 'module.ts';
    const template = cleanName.endsWith('.html')
      ? '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <title>Workspace App</title>\n</head>\n<body style="background:#070d1b;color:#e2e8f0;font-family:sans-serif;padding:20px">\n  <h2>New CodeMesh Preview</h2>\n  <script>console.log("Sandboxed HTML ready");</script>\n</body>\n</html>'
      : cleanName.endsWith('.css')
      ? 'body {\n  background: #060b16;\n  color: #e2e8f0;\n  font-family: system-ui, sans-serif;\n}\n'
      : cleanName.endsWith('.ts')
      ? 'export interface TelemetryRecord {\n  id: string;\n  value: number;\n}\n\nexport function summarize(items: TelemetryRecord[]): number {\n  return items.reduce((acc, item) => acc + item.value, 0);\n}\n\nconsole.log("Summary:", summarize([{ id: "a", value: 42 }]));\n'
      : cleanName.endsWith('.md')
      ? '# Workspace Note\n\nDocument architecture decisions or run in preview.\n'
      : cleanName.endsWith('.json')
      ? '{\n  "status": "active",\n  "nodes": []\n}\n'
      : 'console.log("Executing CodeMesh module...");\nconst result = [1, 2, 3, 4].map((n) => n * n);\nconsole.log("Squares:", result);\n';

    const created = await vfs.saveFile({ name: cleanName, path: normPath, content: template });
    setSelectedId(created.id);
    setNewFileModal(false);
    setBannerStatus(`Created ${created.path}`);
  };

  const handleFilesInput = async (e: React.ChangeEvent<HTMLInputElement>, isFolder: boolean) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const batch: DroppedFileEntry[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      if (!vfs.isSupportedCodeFile(f.name) || f.size > 512 * 1024) continue;
      const rel = (f as File & { webkitRelativePath?: string }).webkitRelativePath;
      if (rel && rel.split('/').some((seg) => SKIP_DIRS.has(seg))) continue;
      const content = await f.text();
      batch.push({
        name: f.name,
        path: rel ? `/${rel}` : `/workspace/imported/${f.name}`,
        content,
      });
    }

    if (batch.length > 0) {
      const imported = await vfs.importFilesBatch(batch, isFolder ? 'Folder Upload' : 'File Upload');
      setSelectedId(imported[0]?.id ?? null);
      setBannerStatus(`Imported ${imported.length} file(s) into IndexedDB.`);
    } else {
      setBannerStatus('No supported code files (.js, .ts, .html, .css, .json, .md) found.');
    }
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);

    const collected: DroppedFileEntry[] = [];
    const items = e.dataTransfer.items;

    if (items && items.length > 0) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = (item as DataTransferItem & { webkitGetAsEntry?: () => FileSystemEntry | null })
          .webkitGetAsEntry?.();
        if (entry) {
          await traverseWebkitEntry(entry, '/workspace/imported', collected);
        } else if (item.kind === 'file') {
          const f = item.getAsFile();
          if (f && vfs.isSupportedCodeFile(f.name) && f.size <= 512 * 1024) {
            collected.push({
              name: f.name,
              path: `/workspace/imported/${f.name}`,
              content: await f.text(),
            });
          }
        }
      }
    } else if (e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i];
        if (vfs.isSupportedCodeFile(f.name) && f.size <= 512 * 1024) {
          collected.push({
            name: f.name,
            path: `/workspace/imported/${f.name}`,
            content: await f.text(),
          });
        }
      }
    }

    if (collected.length > 0) {
      const imported = await vfs.importFilesBatch(collected, 'Drag & Drop');
      setSelectedId(imported[0]?.id ?? null);
      setBannerStatus(`Imported ${imported.length} file(s) via drag-and-drop.`);
    } else {
      setBannerStatus('Drop .js, .ts, .html, .css, .json, .md files or project folders.');
    }
  };

  const handleDownload = () => {
    if (!selectedFile) return;
    const blob = new Blob([draftContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = draftName || selectedFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id: string) => {
    await vfs.deleteFile(id);
    if (selectedId === id) {
      setSelectedId(null);
      setDraftName('');
      setDraftContent('');
    }
  };

  const syncScroll = () => {
    if (!textareaRef.current) return;
    const { scrollTop, scrollLeft } = textareaRef.current;
    if (highlightPreRef.current) {
      highlightPreRef.current.scrollTop = scrollTop;
      highlightPreRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void handleSave();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const next = draftContent.slice(0, start) + '  ' + draftContent.slice(end);
      setDraftContent(next);
      requestAnimationFrame(() => {
        el.selectionStart = el.selectionEnd = start + 2;
      });
    }
  };

  const editorKind: VFSFileKind = vfs.inferKind(draftName || selectedFile?.name || 'file.js');
  const codeLines = useMemo(() => draftContent.split('\n'), [draftContent]);
  const outline = useMemo(() => extractOutline(draftContent, editorKind), [draftContent, editorKind]);

  const inlinePreviewDoc = useMemo(() => {
    if (!selectedFile || splitPaneMode !== 'preview') return '';
    const liveFile: VFSFile = {
      ...selectedFile,
      name: draftName || selectedFile.name,
      kind: editorKind,
      content: draftContent,
    };
    return buildSandboxedSrcDoc(liveFile, files, previewNonce);
  }, [selectedFile, draftName, editorKind, draftContent, files, splitPaneMode, previewNonce]);

  const renderTree = (node: TreeNode, depth = 0): React.ReactNode => {
    const dirs = Array.from(node.children.values()).sort((a, b) => a.name.localeCompare(b.name));
    const sortedFiles = [...node.files].sort((a, b) => a.name.localeCompare(b.name));

    return (
      <>
        {dirs.map((dir) => {
          const collapsed = Boolean(collapsedDirs[dir.path]);
          return (
            <div key={dir.path}>
              <button
                type="button"
                onClick={() => setCollapsedDirs((prev) => ({ ...prev, [dir.path]: !prev[dir.path] }))}
                style={{ paddingLeft: `${depth * 12 + 6}px` }}
                className="w-full flex items-center gap-1.5 py-1 pr-2 rounded-md text-left text-[11px] font-medium text-slate-300 hover:bg-white/8 cursor-pointer"
              >
                {collapsed ? (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
                {collapsed ? (
                  <Folder className="w-3.5 h-3.5 text-amber-300/80 shrink-0" />
                ) : (
                  <FolderOpen className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                )}
                <span className="truncate">{dir.name}</span>
              </button>
              {!collapsed && renderTree(dir, depth + 1)}
            </div>
          );
        })}

        {sortedFiles.map((file) => {
          const active = file.id === selectedId;
          return (
            <div
              key={file.id}
              style={{ paddingLeft: `${depth * 12 + 18}px` }}
              className={`group pr-1.5 py-1 rounded-md flex items-center justify-between gap-1.5 transition-colors ${
                active ? 'bg-cyan-500/18 text-slate-100' : 'text-slate-300 hover:bg-white/[0.06]'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSelectFile(file)}
                className="flex-1 flex items-center gap-1.5 min-w-0 text-left cursor-pointer"
              >
                <span className={`font-mono text-[10px] font-semibold w-7 shrink-0 ${KIND_COLOR[file.kind]}`}>
                  {file.kind.toUpperCase()}
                </span>
                <span className="font-mono text-[11px] truncate">{file.name}</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(file.id)}
                title={`Delete ${file.name}`}
                className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-500 hover:text-rose-300 cursor-pointer shrink-0 transition-opacity"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </>
    );
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(false);
      }}
      onDrop={(e) => void handleDrop(e)}
      className={`relative h-full flex flex-col gap-2.5 p-3 overflow-hidden text-xs ${
        dragOver ? 'ring-2 ring-cyan-400/70 bg-cyan-500/5' : ''
      }`}
    >
      {dragOver && (
        <div className="absolute inset-3 z-50 rounded-xl bg-slate-950/90 border-2 border-dashed border-cyan-400 flex flex-col items-center justify-center text-center pointer-events-none">
          <FolderUp className="w-10 h-10 text-cyan-300 mb-2" />
          <div className="font-display text-sm font-semibold text-slate-100">
            Drop Code Files or Project Folders
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supports recursive folder import (.js, .ts, .html, .css, .json, .md) into IndexedDB VFS
          </p>
        </div>
      )}

      {/* Top Importer & Filter Toolbar */}
      <div className="aether-panel rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {(['all', 'ts', 'js', 'html', 'css', 'json', 'md'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilterKind(k)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                filterKind === k
                  ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
              }`}
            >
              {k === 'all' ? `All (${files.length})` : `.${k}`}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {statusMessage && <span className="text-[11px] text-emerald-300 pr-1">{statusMessage}</span>}

          <button
            type="button"
            onClick={() => setNewFileModal((v) => !v)}
            className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>

          <label className="px-2.5 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-100 inline-flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Files</span>
            <input
              type="file"
              multiple
              accept=".js,.jsx,.mjs,.ts,.tsx,.html,.htm,.css,.json,.md,.txt"
              onChange={(e) => void handleFilesInput(e, false)}
              className="hidden"
            />
          </label>

          <label className="px-2.5 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/40 text-teal-100 font-medium inline-flex items-center gap-1.5 cursor-pointer">
            <FolderUp className="w-3.5 h-3.5" />
            <span>Import Folder</span>
            <input
              ref={folderInputRef}
              type="file"
              multiple
              onChange={(e) => void handleFilesInput(e, true)}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={async () => {
              const count = await vfs.loadStarterProject();
              setBannerStatus(`Loaded ${count} starter project files.`);
            }}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-slate-300 cursor-pointer"
            title="Restore or load starter multi-file project"
          >
            Demo Project
          </button>
        </div>
      </div>

      {newFileModal && (
        <form onSubmit={handleCreateFile} className="aether-panel rounded-xl p-2.5 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder="/workspace/src/module.ts"
            className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs font-mono text-slate-100 outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/40 text-cyan-100 font-semibold cursor-pointer"
          >
            Create File
          </button>
          <button
            type="button"
            onClick={() => setNewFileModal(false)}
            className="px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            Cancel
          </button>
        </form>
      )}

      {/* Main Split IDE Workspace: File Tree + Syntax Editor + Optional Live Split Pane */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Left: File Tree Explorer */}
        <div className="md:col-span-3 aether-panel rounded-xl p-2 flex flex-col min-h-0">
          <div className="relative mb-2 shrink-0">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter tree..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-400/40"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-0.5 pr-0.5">
            {filteredFiles.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-[11px]">
                No matching files. Drag & drop a folder here to populate the workspace.
              </div>
            ) : (
              renderTree(fileTree)
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-white/10 text-[10px] text-slate-500 shrink-0">
            Drag & drop files or folders anywhere
          </div>
        </div>

        {/* Center/Right: Split-Pane Code Editor */}
        <div className="md:col-span-9 aether-panel rounded-xl p-2.5 flex flex-col min-h-0 gap-2">
          {selectedFile ? (
            <>
              {/* Editor Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <FileCode2 className="w-4 h-4 text-cyan-300 shrink-0" />
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Active filename"
                    className="bg-slate-900/90 border border-white/15 rounded-md px-2 py-1 text-xs font-mono text-slate-100 outline-none w-44"
                  />
                  <span className="hidden xl:inline font-mono text-[11px] text-slate-400 truncate max-w-[200px]">
                    {selectedFile.path}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setSplitPaneMode((m) =>
                        m === 'preview' ? 'outline' : m === 'outline' ? 'none' : 'preview'
                      )
                    }
                    title="Cycle split pane: Live Preview / AST Outline / Editor Only"
                    className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Columns2 className="w-3.5 h-3.5" />
                    <span>
                      {splitPaneMode === 'preview'
                        ? 'Split: Preview'
                        : splitPaneMode === 'outline'
                        ? 'Split: Outline'
                        : 'Split: Off'}
                    </span>
                  </button>

                  {onOpenApp && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          vfs.setActiveFile(selectedFile.id);
                          onOpenApp('auditor');
                        }}
                        className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                        title="Inspect in AST Code Auditor"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Audit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          vfs.setActiveFile(selectedFile.id);
                          onOpenApp('terminal');
                        }}
                        className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                        title="Ask AI Code Companion about this file"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                        <span>Ask AI</span>
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={handleDownload}
                    title="Export file"
                    className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleSave()}
                    className={`px-2.5 py-1 rounded-md border font-semibold inline-flex items-center gap-1 cursor-pointer ${
                      isDirty
                        ? 'bg-amber-500/25 border-amber-400/50 text-amber-100'
                        : 'bg-white/8 hover:bg-white/15 border-white/15 text-slate-100'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isDirty ? 'Save' : 'Saved'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (isDirty) await handleSave();
                      onRunInSandbox(draftName || selectedFile.name);
                    }}
                    className="px-2.5 py-1 rounded-md bg-sky-500/25 hover:bg-sky-500/35 border border-sky-400/50 text-sky-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Sandbox</span>
                  </button>
                </div>
              </div>

              {/* Split Body: Syntax Highlighted Editor + Split Preview / Outline */}
              <div
                className={`flex-1 min-h-0 grid gap-2.5 ${
                  splitPaneMode === 'none' ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-12'
                }`}
              >
                <div
                  className={`${
                    splitPaneMode === 'none' ? 'col-span-1' : 'xl:col-span-7'
                  } relative flex min-h-0 rounded-xl bg-slate-950/95 border border-white/10 overflow-hidden`}
                >
                  {/* Line Numbers Gutter */}
                  <div
                    ref={gutterRef}
                    aria-hidden="true"
                    className="w-11 shrink-0 py-3 pr-2.5 text-right font-mono-tabular text-[11px] leading-6 text-slate-600 bg-slate-950 border-r border-white/10 overflow-hidden select-none"
                  >
                    {codeLines.map((_, idx) => (
                      <div key={idx}>{idx + 1}</div>
                    ))}
                  </div>

                  {/* Overlay Syntax Highlighter + Editable Textarea */}
                  <div className="relative flex-1 min-w-0 overflow-hidden">
                    <pre
                      ref={highlightPreRef}
                      aria-hidden="true"
                      className="absolute inset-0 m-0 p-3 font-mono text-xs leading-6 whitespace-pre overflow-hidden pointer-events-none"
                    >
                      {codeLines.map((line, lineIdx) => (
                        <div key={lineIdx} className="min-h-[1.5rem]">
                          {tokenizeCodeLine(line, editorKind).map((tok, tIdx) => (
                            <span key={tIdx} className={TOKEN_CLASS_MAP[tok.type]}>
                              {tok.text}
                            </span>
                          ))}
                        </div>
                      ))}
                    </pre>

                    <textarea
                      ref={textareaRef}
                      value={draftContent}
                      onChange={(e) => setDraftContent(e.target.value)}
                      onScroll={syncScroll}
                      onKeyDown={handleEditorKeyDown}
                      spellCheck={false}
                      autoCapitalize="off"
                      autoComplete="off"
                      autoCorrect="off"
                      className="relative z-10 w-full h-full resize-none bg-transparent p-3 font-mono text-xs leading-6 text-transparent caret-cyan-300 selection:bg-cyan-500/30 outline-none whitespace-pre overflow-auto select-text"
                    />
                  </div>
                </div>

                {splitPaneMode === 'preview' && (
                  <div className="xl:col-span-5 flex flex-col min-h-0 rounded-xl border border-white/10 bg-[#040812] overflow-hidden">
                    <div className="px-3 py-1.5 border-b border-white/10 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-300 shrink-0">
                      <span className="font-medium">Instant Live Preview</span>
                      <button
                        type="button"
                        onClick={() => setPreviewNonce((n) => n + 1)}
                        className="text-cyan-300 hover:underline cursor-pointer"
                      >
                        Reload
                      </button>
                    </div>
                    <iframe
                      key={`${selectedFile.id}-${previewNonce}`}
                      title={`Split preview of ${draftName}`}
                      sandbox="allow-scripts"
                      srcDoc={inlinePreviewDoc}
                      className="flex-1 w-full border-0 bg-[#040812]"
                    />
                  </div>
                )}

                {splitPaneMode === 'outline' && (
                  <div className="xl:col-span-5 flex flex-col min-h-0 rounded-xl border border-white/10 bg-slate-950/80 p-3 overflow-y-auto">
                    <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 mb-2">
                      AST Symbol Outline ({outline.length})
                    </div>
                    {outline.length === 0 ? (
                      <div className="text-slate-500 text-[11px]">No top-level symbols detected.</div>
                    ) : (
                      <div className="space-y-1">
                        {outline.map((sym, idx) => (
                          <div
                            key={`${sym.name}-${sym.line}-${idx}`}
                            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-white/[0.03] border border-white/5 text-[11px]"
                          >
                            <span className="font-mono text-slate-200 truncate">
                              <span className="text-cyan-300 mr-1.5">{sym.kind}</span>
                              {sym.name}
                            </span>
                            <span className="font-mono-tabular text-slate-500 shrink-0">L{sym.line}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400 p-6">
              <FileCode2 className="w-8 h-8 text-slate-500 mb-2" />
              <div className="font-medium text-slate-200">Select a file or drop a project folder</div>
              <p className="text-[11px] mt-1 max-w-sm">
                CodeMesh IDE stores your project inside IndexedDB with syntax highlighting, live split preview, and AST auditing.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
