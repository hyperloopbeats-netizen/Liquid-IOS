import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Cpu, Send, Sparkles, Terminal, Wrench } from 'lucide-react';
import { codeAuditor } from '../kernel/codeAuditor';
import { kernelHealer } from '../kernel/healerEngine';
import { swarmEngine } from '../kernel/swarmEngine';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import { vfs } from '../kernel/vfs';
import type { AppId, CircadianMode, VFSFile } from '../types/os';

interface TerminalAppProps {
  onOpenApp: (id: AppId) => void;
  onRunInSandbox: (fileName: string) => void;
}

interface TermLine {
  id: string;
  kind: 'input' | 'output' | 'error' | 'info';
  text: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  fileName?: string;
  modelLabel?: string;
}

interface ParsedSegment {
  type: 'text' | 'code';
  lang?: string;
  content: string;
}

function parseCodeBlocks(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const regex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) {
      segments.push({ type: 'text', content: text.slice(last, m.index) });
    }
    segments.push({ type: 'code', lang: m[1] || 'code', content: m[2].trimEnd() });
    last = m.index + m[0].length;
  }
  if (last < text.length) {
    segments.push({ type: 'text', content: text.slice(last) });
  }
  return segments;
}

const QUICK_PROMPTS = [
  'Find the bug in this module',
  'Refactor this function cleanly',
  'Add error handling and edge guards',
  'Optimize loop & memory performance',
];

export function TerminalApp({ onOpenApp, onRunInSandbox }: TerminalAppProps) {
  const [tab, setTab] = useState<'companion' | 'shell'>('companion');

  // AI Code Companion State
  const [files, setFiles] = useState<VFSFile[]>([]);
  const [targetFileId, setTargetFileId] = useState<string>('');
  const [includeAllFiles, setIncludeAllFiles] = useState(false);
  const [provider, setProvider] = useState<'gemini-cloud' | 'ollama-local'>('gemini-cloud');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder:7b');
  const [chatInput, setChatInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [appliedBanner, setAppliedBanner] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'AI Code Companion ready. Select or open any file in the Workspace Editor — I read its live IndexedDB source so you can ask to find bugs, refactor functions, or apply fixes directly.',
      modelLabel: 'CodeMesh Companion',
    },
  ]);

  // CLI Shell State
  const [lines, setLines] = useState<TermLine[]>([
    {
      id: 'boot-1',
      kind: 'info',
      text: 'CodeMesh IDE Shell — Type "help" for workspace & AST audit commands.',
    },
  ]);
  const [cmd, setCmd] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void vfs.init();
    return vfs.subscribe((nextFiles, _snaps, activeId) => {
      setFiles(nextFiles);
      if (activeId && nextFiles.some((f) => f.id === activeId)) {
        setTargetFileId(activeId);
      } else if (nextFiles.length > 0) {
        setTargetFileId((prev) => (prev && nextFiles.some((f) => f.id === prev) ? prev : nextFiles[0].id));
      }
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const activeFile = useMemo(
    () => files.find((f) => f.id === targetFileId) ?? files[0] ?? null,
    [files, targetFileId]
  );

  const sendCompanionQuery = async (promptText: string) => {
    const clean = promptText.trim();
    if (!clean || busy) return;

    await vfs.init();
    const currentFile = activeFile;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: clean,
      fileName: currentFile?.name,
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput('');
    setBusy(true);
    setAppliedBanner('');

    const fileContextParts: string[] = [];
    if (currentFile) {
      fileContextParts.push(
        `ACTIVE FILE: ${currentFile.path} (${currentFile.kind}, ${currentFile.size} bytes)\n\`\`\`${currentFile.kind}\n${currentFile.content.slice(0, 7500)}\n\`\`\``
      );
    }
    if (includeAllFiles) {
      for (const f of files) {
        if (f.id === currentFile?.id) continue;
        fileContextParts.push(
          `WORKSPACE FILE: ${f.path} (${f.kind})\n${f.content.slice(0, 1800)}`
        );
      }
    }

    const contextSummary = fileContextParts.join('\n\n') || 'No workspace files currently open.';

    try {
      let reply = '';
      let modelLabel = 'Gemini (gemini-4-hydrogen)';

      if (provider === 'gemini-cloud') {
        const res = await fetch('/api/cognition/query', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: `${clean}\n\nWhen proposing code changes for the active file, include the complete updated code inside a fenced markdown code block so the user can apply it with one click.`,
            contextSummary,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || `Gemini API returned ${res.status}`);
        reply = data.reply || 'No response received.';
        modelLabel = data.model || 'gemini-4-hydrogen';
      } else {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 15000);
        try {
          const res = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: ollamaModel,
              prompt: `You are an expert code companion.\n\n${contextSummary}\n\nDeveloper request: ${clean}\nIf proposing edits, include a fenced code block with the full updated file.`,
              stream: false,
            }),
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
          const data = await res.json();
          reply = data.response || 'No response from local Ollama.';
          modelLabel = `Ollama (${ollamaModel})`;
        } catch (err) {
          clearTimeout(timer);
          const msg = err instanceof Error ? err.message : 'Connection failed';
          throw new Error(
            `Unable to reach Local Ollama at ${ollamaUrl} (${msg}). Make sure Ollama is running with OLLAMA_ORIGINS=* or switch to Cloud Gemini.`
          );
        }
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          content: reply,
          fileName: currentFile?.name,
          modelLabel,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content: `Error: ${err instanceof Error ? err.message : 'Failed to query AI Code Companion.'}`,
          modelLabel: 'Diagnostic',
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const applyCodeToActiveFile = async (code: string) => {
    if (!activeFile) return;
    await vfs.createSnapshot(`Before AI Patch (${activeFile.name})`, 'AI Code Companion edit checkpoint');
    await vfs.saveFile({
      id: activeFile.id,
      name: activeFile.name,
      path: activeFile.path,
      content: code,
      patchedBy: 'ai-companion',
    });
    setAppliedBanner(`Applied patch to ${activeFile.path} (Snapshot saved).`);
    window.setTimeout(() => setAppliedBanner(''), 3500);
  };

  // CLI Shell methods
  const append = (kind: TermLine['kind'], text: string) => {
    setLines((prev) => [...prev, { id: `t-${Date.now()}-${Math.random()}`, kind, text }]);
  };

  const execute = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) return;
    append('input', `dev@codemesh:~$ ${trimmed}`);
    setHistory((h) => [trimmed, ...h].slice(0, 40));
    setHistIdx(-1);

    const parts = trimmed.split(/\s+/);
    const base = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ');

    try {
      switch (base) {
        case 'help':
          append(
            'info',
            [
              'ls                     List IndexedDB workspace files',
              'cat <file>             Print file contents',
              'touch <file>           Create new file in workspace',
              'rm <file>              Delete file from workspace',
              'run <file>             Run file in Sandboxed Preview',
              'audit                  Run AST Code Auditor across workspace',
              'swarm scan             Run AI Swarm daemons',
              'heal                   Trigger kernel self-heal check',
              'snap <label>           Create IndexedDB snapshot',
              'theme <mode>           Set theme (auto|dawn|noon|dusk|midnight)',
              'open <app>             Open window (drive|auditor|sandbox|terminal|...)',
              'clear                  Clear terminal buffer',
            ].join('\n')
          );
          break;
        case 'clear':
          setLines([]);
          break;
        case 'ls': {
          await vfs.init();
          append(
            'output',
            vfs
              .getFiles()
              .map((f) => `${f.kind.padEnd(5)} ${String(f.size).padStart(6)} B   ${f.path}`)
              .join('\n')
          );
          break;
        }
        case 'cat': {
          if (!arg) {
            append('error', 'Usage: cat <filename>');
            break;
          }
          await vfs.init();
          const f = vfs.getFileByName(arg);
          if (!f) append('error', `File not found: ${arg}`);
          else append('output', f.content);
          break;
        }
        case 'touch': {
          if (!arg) {
            append('error', 'Usage: touch <filename>');
            break;
          }
          const created = await vfs.saveFile({ name: arg, content: '// Created via CodeMesh Shell\n' });
          append('info', `Created ${created.path} (${created.size} B)`);
          break;
        }
        case 'rm': {
          if (!arg) {
            append('error', 'Usage: rm <filename>');
            break;
          }
          await vfs.init();
          const f = vfs.getFileByName(arg);
          if (!f) append('error', `File not found: ${arg}`);
          else {
            await vfs.deleteFile(f.id);
            append('info', `Deleted ${f.path}`);
          }
          break;
        }
        case 'run': {
          if (!arg) {
            append('error', 'Usage: run <filename>');
            break;
          }
          await vfs.init();
          const f = vfs.getFileByName(arg);
          if (!f) append('error', `File not found: ${arg}`);
          else {
            onRunInSandbox(f.name);
            append('info', `Launched ${f.name} in Instant Sandboxed Preview.`);
          }
          break;
        }
        case 'audit': {
          append('info', 'Running Automated AST Code Auditor...');
          const report = await codeAuditor.scanWorkspace();
          append(
            'output',
            `Scanned ${report.fileCount} files: ${report.counts.critical} critical, ${report.counts.warning} warnings.`
          );
          break;
        }
        case 'swarm': {
          append('info', 'Running enabled Swarm daemons across workspace...');
          const findings = await swarmEngine.runAllEnabled();
          append('output', `Swarm scan complete: ${findings.length} finding(s) reported.`);
          break;
        }
        case 'heal':
          await kernelHealer.runHealthCheck(true);
          append('info', 'Kernel Self-Heal check completed.');
          break;
        case 'snap': {
          const snap = await vfs.createSnapshot(arg || 'Shell Checkpoint', 'Created via CodeMesh Shell');
          append('info', `Snapshot captured: "${snap.label}" (${snap.files.length} files).`);
          break;
        }
        case 'theme': {
          const valid: CircadianMode[] = ['auto', 'dawn', 'noon', 'dusk', 'midnight'];
          if (!valid.includes(arg as CircadianMode)) {
            append('error', `Invalid theme. Choose: ${valid.join(', ')}`);
          } else {
            synesthesiaEngine.setCircadianMode(arg as CircadianMode);
            append('info', `Theme switched to ${arg}.`);
          }
          break;
        }
        case 'open': {
          const validApps: AppId[] = [
            'drive',
            'terminal',
            'auditor',
            'sandbox',
            'swarm',
            'snapshots',
            'healer',
            'modelforge',
            'synesthesia',
            'neuralbus',
          ];
          if (validApps.includes(arg as AppId)) {
            onOpenApp(arg as AppId);
            append('info', `Opened ${arg}.`);
          } else {
            append('error', `Unknown app "${arg}". Valid: ${validApps.join(', ')}`);
          }
          break;
        }
        default:
          append('error', `Command not found: ${base}. Type "help" for commands.`);
      }
    } catch (err) {
      append('error', err instanceof Error ? err.message : 'Command failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const next = Math.min(history.length - 1, histIdx + 1);
      setHistIdx(next);
      setCmd(history[next]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx <= 0) {
        setHistIdx(-1);
        setCmd('');
      } else {
        const next = histIdx - 1;
        setHistIdx(next);
        setCmd(history[next]);
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#040812] text-xs overflow-hidden">
      {/* Mode & Context Header */}
      <div className="px-3.5 py-2.5 border-b border-white/10 bg-slate-950/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1 bg-white/[0.04] p-0.5 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => setTab('companion')}
            className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'companion' ? 'bg-indigo-500/30 text-indigo-100' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Code Companion</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('shell')}
            className={`px-2.5 py-1 rounded-md font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              tab === 'shell' ? 'bg-cyan-500/25 text-cyan-100' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>CLI Shell</span>
          </button>
        </div>

        {tab === 'companion' && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={activeFile?.id ?? ''}
              onChange={(e) => {
                setTargetFileId(e.target.value);
                vfs.setActiveFile(e.target.value);
              }}
              aria-label="Active context file"
              className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-100 outline-none max-w-[190px]"
            >
              {files.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>

            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as 'gemini-cloud' | 'ollama-local')}
              aria-label="AI Provider"
              className="bg-slate-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] text-slate-100 outline-none"
            >
              <option value="gemini-cloud">Gemini Cloud (gemini-4-hydrogen)</option>
              <option value="ollama-local">Local Ollama HTTP</option>
            </select>

            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeAllFiles}
                onChange={(e) => setIncludeAllFiles(e.target.checked)}
                className="accent-indigo-400"
              />
              <span>All Files</span>
            </label>
          </div>
        )}
      </div>

      {tab === 'companion' ? (
        <div className="flex-1 min-h-0 flex flex-col p-3 gap-2.5">
          {provider === 'ollama-local' && (
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <input
                type="text"
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                placeholder="http://localhost:11434"
                className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-200 outline-none"
              />
              <input
                type="text"
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                placeholder="qwen2.5-coder:7b"
                className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-200 outline-none"
              />
            </div>
          )}

          {appliedBanner && (
            <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-[11px] shrink-0">
              {appliedBanner}
            </div>
          )}

          {/* Chat Thread */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
            {messages.map((msg) => {
              const segments = msg.role === 'assistant' ? parseCodeBlocks(msg.content) : null;
              return (
                <div
                  key={msg.id}
                  className={`rounded-xl p-3 border ${
                    msg.role === 'user'
                      ? 'bg-indigo-500/12 border-indigo-400/25 ml-8'
                      : 'bg-white/[0.03] border-white/10 mr-4'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-slate-400 mb-1.5">
                    <span>
                      {msg.role === 'user' ? 'Developer' : msg.modelLabel || 'AI Companion'}
                      {msg.fileName ? ` · ${msg.fileName}` : ''}
                    </span>
                  </div>

                  {segments ? (
                    <div className="space-y-2 text-slate-200 leading-relaxed">
                      {segments.map((seg, idx) =>
                        seg.type === 'text' ? (
                          <div key={idx} className="whitespace-pre-wrap break-words select-text">
                            {seg.content.trim()}
                          </div>
                        ) : (
                          <div key={idx} className="rounded-lg border border-white/15 bg-black/70 overflow-hidden">
                            <div className="px-2.5 py-1.5 bg-white/[0.04] border-b border-white/10 flex items-center justify-between gap-2">
                              <span className="font-mono text-[10px] text-cyan-300 uppercase">
                                {seg.lang}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => void navigator.clipboard?.writeText(seg.content)}
                                  className="px-2 py-0.5 rounded bg-white/8 hover:bg-white/15 text-[10px] text-slate-200 inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Copy</span>
                                </button>
                                {activeFile && (
                                  <button
                                    type="button"
                                    onClick={() => void applyCodeToActiveFile(seg.content)}
                                    className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[10px] text-emerald-100 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    <Wrench className="w-3 h-3" />
                                    <span>Apply to {activeFile.name}</span>
                                  </button>
                                )}
                              </div>
                            </div>
                            <pre className="p-2.5 font-mono text-[11px] text-emerald-100 overflow-x-auto select-text">
                              {seg.content}
                            </pre>
                          </div>
                        )
                      )}
                    </div>
                  ) : (
                    <div className="text-slate-100 whitespace-pre-wrap break-words select-text">
                      {msg.content}
                    </div>
                  )}
                </div>
              );
            })}
            {busy && (
              <div className="rounded-xl p-3 bg-white/[0.03] border border-white/10 text-slate-400 flex items-center gap-2">
                <Cpu className="w-4 h-4 animate-spin text-indigo-300" />
                <span>Analyzing {activeFile?.name ?? 'workspace'}...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Chips & Chat Form */}
          <div className="space-y-2 shrink-0 pt-1 border-t border-white/10">
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((qp) => (
                <button
                  key={qp}
                  type="button"
                  disabled={busy}
                  onClick={() => void sendCompanionQuery(qp)}
                  className="px-2 py-1 rounded-md bg-white/[0.04] hover:bg-white/12 border border-white/10 text-[11px] text-slate-300 cursor-pointer disabled:opacity-50"
                >
                  {qp}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void sendCompanionQuery(chatInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  activeFile
                    ? `Ask about ${activeFile.name} (e.g. "Refactor this function")...`
                    : 'Ask a coding question...'
                }
                className="flex-1 bg-slate-900 border border-white/15 rounded-lg px-3 py-2 text-xs text-slate-100 outline-none focus:border-indigo-400/50"
              />
              <button
                type="submit"
                disabled={busy || !chatInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-indigo-500/25 hover:bg-indigo-500/35 border border-indigo-400/50 text-indigo-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 min-h-0 flex flex-col bg-[#03060f] p-3.5 font-mono text-xs cursor-text"
        >
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {lines.map((l) => (
              <pre
                key={l.id}
                className={`whitespace-pre-wrap break-words leading-relaxed select-text ${
                  l.kind === 'input'
                    ? 'text-cyan-300 font-semibold'
                    : l.kind === 'error'
                    ? 'text-rose-300'
                    : l.kind === 'info'
                    ? 'text-emerald-300'
                    : 'text-slate-200'
                }`}
              >
                {l.text}
              </pre>
            ))}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const toRun = cmd;
              setCmd('');
              void execute(toRun);
            }}
            className="pt-2 mt-2 border-t border-white/10 flex items-center gap-2 shrink-0"
          >
            <span className="text-emerald-400 font-semibold shrink-0">dev@codemesh:~$</span>
            <input
              ref={inputRef}
              type="text"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command (help, ls, audit, run index.html, snap)..."
              className="flex-1 bg-transparent text-slate-100 outline-none placeholder:text-slate-600"
              autoFocus
            />
          </form>
        </div>
      )}
    </div>
  );
}
