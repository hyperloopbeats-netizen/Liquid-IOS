import { useEffect, useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import { vfs } from '../kernel/vfs';
import type { VFSFile, VFSSnapshot } from '../types/os';

function computeLineDiff(oldText: string, newText: string): Array<{ type: 'same' | 'add' | 'del'; line: string }> {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const out: Array<{ type: 'same' | 'add' | 'del'; line: string }> = [];
  const max = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < max; i++) {
    const a = oldLines[i];
    const b = newLines[i];
    if (a === b && a !== undefined) {
      out.push({ type: 'same', line: a });
    } else {
      if (a !== undefined) out.push({ type: 'del', line: a });
      if (b !== undefined) out.push({ type: 'add', line: b });
    }
  }
  return out;
}

export function SnapshotManagerApp() {
  const [files, setFiles] = useState<VFSFile[]>([]);
  const [snapshots, setSnapshots] = useState<VFSSnapshot[]>([]);
  const [selectedSnapId, setSelectedSnapId] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [labelInput, setLabelInput] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    void vfs.init();
    const unsub = vfs.subscribe((nextFiles, nextSnaps) => {
      setFiles(nextFiles);
      setSnapshots(nextSnaps);
      if (nextSnaps.length > 0) {
        setSelectedSnapId((prev) => (prev && nextSnaps.some((s) => s.id === prev) ? prev : nextSnaps[0].id));
      }
      if (nextFiles.length > 0 && !selectedFileName) {
        setSelectedFileName(nextFiles[0].name);
      }
    });
    return unsub;
  }, [selectedFileName]);

  const activeSnap = snapshots.find((s) => s.id === selectedSnapId) ?? null;
  const snapFile = activeSnap?.files.find((f) => f.name === selectedFileName);
  const currentFile = files.find((f) => f.name === selectedFileName);

  const diffRows = computeLineDiff(snapFile?.content ?? '', currentFile?.content ?? '');

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    const snap = await vfs.createSnapshot(
      labelInput.trim() || `Manual Checkpoint`,
      'Operator snapshot via Time-Travel Inspector'
    );
    setLabelInput('');
    setSelectedSnapId(snap.id);
    setStatus(`Captured "${snap.label}"`);
    setTimeout(() => setStatus(''), 2500);
  };

  const handleRestore = async (snapId: string) => {
    const ok = await vfs.restoreSnapshot(snapId);
    if (ok) {
      setStatus('Workspace restored atomically from IndexedDB snapshot.');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      <form
        onSubmit={handleCreateCheckpoint}
        className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shrink-0"
      >
        <div className="flex-1 min-w-[200px] flex items-center gap-2">
          <input
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Checkpoint label (e.g. Before security patch)..."
            className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-1.5 text-xs text-slate-100 outline-none"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capture Snapshot</span>
          </button>
        </div>
        {status && <span className="text-[11px] text-emerald-300">{status}</span>}
      </form>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Snapshot Timeline */}
        <div className="md:col-span-5 aether-panel rounded-xl p-2.5 overflow-y-auto space-y-2">
          <div className="px-1 text-[11px] font-semibold text-slate-300">
            IndexedDB Checkpoints ({snapshots.length})
          </div>
          {snapshots.map((s) => {
            const active = s.id === selectedSnapId;
            return (
              <div
                key={s.id}
                className={`p-2.5 rounded-xl border transition-colors ${
                  active
                    ? 'bg-white/10 border-amber-400/50'
                    : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedSnapId(s.id)}
                    className="flex-1 text-left cursor-pointer min-w-0"
                  >
                    <div className="font-semibold text-slate-100 truncate">{s.label}</div>
                    <div className="text-[11px] text-slate-400 mt-0.5 truncate">{s.reason}</div>
                    <div className="text-[10px] text-slate-500 font-mono-tabular mt-1">
                      {new Date(s.createdAt).toLocaleTimeString()} · {s.files.length} files
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRestore(s.id)}
                    className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/40 text-amber-100 text-[11px] font-medium inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Diff Inspector */}
        <div className="md:col-span-7 aether-panel rounded-xl p-3 flex flex-col min-h-0 gap-2">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10 shrink-0">
            <span className="font-semibold text-slate-100">
              Diff vs Current Workspace
            </span>
            <select
              value={selectedFileName}
              onChange={(e) => setSelectedFileName(e.target.value)}
              className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-100 outline-none cursor-pointer"
            >
              {Array.from(
                new Set([
                  ...files.map((f) => f.name),
                  ...(activeSnap?.files.map((f) => f.name) ?? []),
                ])
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-auto rounded-xl bg-slate-950/90 border border-white/10 p-2.5 font-mono text-[11px] space-y-0.5 select-text">
            {diffRows.map((r, idx) => (
              <div
                key={idx}
                className={`px-2 py-0.5 rounded-sm whitespace-pre-wrap break-all ${
                  r.type === 'add'
                    ? 'bg-emerald-500/15 text-emerald-200'
                    : r.type === 'del'
                    ? 'bg-rose-500/15 text-rose-200'
                    : 'text-slate-400'
                }`}
              >
                <span className="inline-block w-4 select-none opacity-70">
                  {r.type === 'add' ? '+' : r.type === 'del' ? '-' : ' '}
                </span>
                {r.line}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
