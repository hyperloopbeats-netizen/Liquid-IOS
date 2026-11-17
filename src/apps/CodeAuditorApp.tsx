import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileCode2, RefreshCw, Sparkles, Wrench } from 'lucide-react';
import { codeAuditor } from '../kernel/codeAuditor';
import { swarmEngine } from '../kernel/swarmEngine';
import { vfs } from '../kernel/vfs';
import type { AuditIssue, AuditIssueCategory, AuditReport, VFSFile } from '../types/os';

interface CodeAuditorAppProps {
  onOpenFileInDrive: (fileName: string) => void;
  onRunFileInSandbox: (fileName: string) => void;
}

export function CodeAuditorApp({ onOpenFileInDrive, onRunFileInSandbox }: CodeAuditorAppProps) {
  const [report, setReport] = useState<AuditReport | null>(codeAuditor.getLastReport());
  const [files, setFiles] = useState<VFSFile[]>(vfs.getFiles());
  const [categoryFilter, setCategoryFilter] = useState<'all' | AuditIssueCategory>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [deepAuditBusy, setDeepAuditBusy] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => {
    void vfs.init();
    const unsubVfs = vfs.subscribe((nextFiles) => setFiles(nextFiles));
    const unsubAudit = codeAuditor.subscribe((nextReport) => {
      setReport(nextReport);
      setSelectedId((prev) =>
        prev && nextReport.issues.some((i) => i.id === prev) ? prev : nextReport.issues[0]?.id ?? null
      );
    });
    if (!codeAuditor.getLastReport()) {
      void codeAuditor.scanWorkspace();
    }
    return () => {
      unsubVfs();
      unsubAudit();
    };
  }, []);

  const handleScanAll = async () => {
    setScanning(true);
    setActionMsg('');
    await codeAuditor.scanWorkspace();
    setScanning(false);
  };

  const handleDeepGeminiAudit = async () => {
    setDeepAuditBusy(true);
    setActionMsg('');
    try {
      swarmEngine.setDaemonBackend('code-review', 'gemini-cloud');
      const findings = await swarmEngine.runDaemon('code-review');
      setActionMsg(`Gemini Code-Review Daemon completed with ${findings.length} finding(s) in Swarm Mesh.`);
    } catch (err) {
      setActionMsg(err instanceof Error ? err.message : 'Deep audit failed.');
    } finally {
      setDeepAuditBusy(false);
    }
  };

  const handleApplyFix = async (issue: AuditIssue) => {
    const msg = await codeAuditor.applyFix(issue);
    setActionMsg(msg);
  };

  const filteredIssues = (report?.issues ?? []).filter((i) =>
    categoryFilter === 'all' ? true : i.category === categoryFilter
  );
  const selectedIssue = filteredIssues.find((i) => i.id === selectedId) ?? filteredIssues[0] ?? null;

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      {/* Top Bar */}
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display text-sm font-semibold text-slate-100">
            Automated AST Code Auditor
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5 font-mono-tabular">
            {report
              ? `${report.fileCount} files scanned · ${report.counts.critical} critical · ${report.counts.warning} warnings · ${report.counts.dependency} dependency · ${report.counts.performance} perf`
              : `${files.length} workspace files indexed`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDeepGeminiAudit}
            disabled={deepAuditBusy}
            className="px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-400/45 text-indigo-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{deepAuditBusy ? 'Auditing...' : 'Gemini Deep Audit'}</span>
          </button>

          <button
            type="button"
            onClick={handleScanAll}
            disabled={scanning}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/25 hover:bg-cyan-500/35 border border-cyan-400/45 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${scanning ? 'animate-spin' : ''}`} />
            <span>{scanning ? 'Scanning AST...' : 'Scan Workspace AST'}</span>
          </button>
        </div>
      </div>

      {actionMsg && (
        <div className="px-3 py-2 rounded-lg bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 text-[11px] shrink-0">
          {actionMsg}
        </div>
      )}

      {/* Category Filter Strip */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {(
          [
            ['all', `All Diagnostics (${report?.issues.length ?? 0})`],
            ['syntax', `Syntax (${report?.counts.syntax ?? 0})`],
            ['dependency', `Dependencies (${report?.counts.dependency ?? 0})`],
            ['performance', `Performance (${report?.counts.performance ?? 0})`],
            ['security', `Security (${report?.counts.security ?? 0})`],
          ] as const
        ).map(([cat, label]) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoryFilter(cat)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
              categoryFilter === cat
                ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                : 'bg-white/[0.03] hover:bg-white/10 border-white/10 text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Split View */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 aether-panel rounded-xl p-2.5 overflow-y-auto space-y-1.5">
          {filteredIssues.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <CheckCircle2 className="w-8 h-8 mb-2 text-emerald-400" />
              <div className="font-medium text-slate-100">Zero AST issues in this category</div>
              <p className="text-[11px] mt-1">
                All scanned JavaScript, TypeScript, CSS, and JSON files passed checks cleanly.
              </p>
            </div>
          ) : (
            filteredIssues.map((issue) => {
              const active = selectedIssue?.id === issue.id;
              return (
                <button
                  key={issue.id}
                  type="button"
                  onClick={() => setSelectedId(issue.id)}
                  className={`w-full text-left p-2.5 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'bg-white/10 border-cyan-400/50'
                      : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular">
                    <span
                      className={
                        issue.severity === 'critical'
                          ? 'text-rose-300 font-semibold'
                          : issue.severity === 'warning'
                          ? 'text-amber-300 font-semibold'
                          : 'text-sky-300'
                      }
                    >
                      {issue.severity.toUpperCase()} · {issue.category.toUpperCase()}
                    </span>
                    <span className="text-slate-400">Line {issue.line}</span>
                  </div>
                  <div className="font-medium text-slate-100 mt-1 truncate">{issue.title}</div>
                  <div className="text-[11px] font-mono text-slate-400 truncate mt-0.5">{issue.filePath}</div>
                </button>
              );
            })
          )}
        </div>

        <div className="lg:col-span-7 aether-panel rounded-xl p-3.5 flex flex-col min-h-0 gap-3">
          {selectedIssue ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-white/10 shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlertTriangle
                      className={`w-4 h-4 shrink-0 ${
                        selectedIssue.severity === 'critical' ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    />
                    <h3 className="font-semibold text-sm text-slate-100 truncate">
                      {selectedIssue.title}
                    </h3>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 mt-1">
                    {selectedIssue.filePath}:{selectedIssue.line}
                    {selectedIssue.column ? `:${selectedIssue.column}` : ''}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenFileInDrive(selectedIssue.fileName)}
                    className="px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <FileCode2 className="w-3.5 h-3.5" />
                    <span>Open in Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRunFileInSandbox(selectedIssue.fileName)}
                    className="px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/10 text-slate-200 cursor-pointer"
                  >
                    Run
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/75 border border-white/10 text-slate-200 leading-relaxed shrink-0">
                {selectedIssue.detail}
              </div>

              {selectedIssue.fixLabel ? (
                <div className="flex-1 min-h-0 flex flex-col gap-2">
                  <div className="text-[11px] font-medium text-emerald-300">
                    Clickable Auto-Fix Recommendation (Creates Snapshot Before Patching)
                  </div>
                  <pre className="flex-1 min-h-0 overflow-auto rounded-lg bg-black/70 border border-white/10 p-3 font-mono text-[11px] text-emerald-100 select-text">
                    {selectedIssue.patchedContent ||
                      selectedIssue.stubContent ||
                      `Will add "${selectedIssue.missingDependency}" to /workspace/package.json`}
                  </pre>
                  <div className="flex justify-end shrink-0">
                    <button
                      type="button"
                      onClick={() => void handleApplyFix(selectedIssue)}
                      className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{selectedIssue.fixLabel}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400 text-center p-4">
                  Open this file in the Split Editor or ask the AI Code Companion to refactor this pattern manually.
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              Select a diagnostic finding to inspect line location and clickable fix recommendations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
