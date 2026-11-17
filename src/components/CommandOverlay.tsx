import { useEffect, useRef, useState } from 'react';
import { CornerDownLeft, Mic, MicOff, Volume2, VolumeX, X } from 'lucide-react';
import { parseVoiceIntent, voiceNavigator } from '../kernel/voiceNavigator';
import type { VoiceIntentResult } from '../types/os';

interface CommandOverlayProps {
  open: boolean;
  listening: boolean;
  transcript: string;
  lastResult: VoiceIntentResult | null;
  spokenFeedback: boolean;
  onToggleSpokenFeedback: () => void;
  onToggleVoice: () => void;
  onExecuteCommand: (text: string) => void;
  onClose: () => void;
}

const SAMPLE_COMMANDS = [
  'Open Code Editor',
  'Open AI Companion',
  'Open Code Auditor',
  'Open Live Sandbox',
  'Scan workspace',
  'Tile windows',
  'Trigger self-heal',
  'Create snapshot',
];

export function CommandOverlay({
  open,
  listening,
  transcript,
  lastResult,
  spokenFeedback,
  onToggleSpokenFeedback,
  onToggleVoice,
  onExecuteCommand,
  onClose,
}: CommandOverlayProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  useEffect(() => {
    if (transcript) {
      setInput(transcript);
    }
  }, [transcript]);

  if (!open) return null;

  const livePreview = input.trim() ? parseVoiceIntent(input) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onExecuteCommand(input.trim());
    setInput('');
  };

  return (
    <div
      role="dialog"
      aria-label="Voice and Natural Language OS Command Bar"
      className="fixed inset-0 z-[1500] bg-black/55 flex items-start justify-center pt-20 px-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="aether-glass w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl">
        <form onSubmit={handleSubmit} className="p-4 border-b border-white/10 flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleVoice}
            title={voiceNavigator.isSupported() ? 'Toggle Web Speech API' : 'Speech API unavailable'}
            className={`p-2.5 rounded-xl border transition-colors cursor-pointer shrink-0 ${
              listening
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                : 'bg-white/5 hover:bg-white/10 border-white/15 text-slate-200'
            }`}
          >
            {listening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              listening
                ? 'Listening for natural voice command...'
                : 'Type or speak a command (e.g. "Open Model Forge", "Trigger self-heal")...'
            }
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder:text-slate-500 outline-none"
          />

          <button
            type="button"
            onClick={onToggleSpokenFeedback}
            title={spokenFeedback ? 'Mute voice confirmations' : 'Enable voice confirmations'}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            {spokenFeedback ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <button
            type="submit"
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-semibold text-cyan-200 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Run</span>
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close command bar"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </form>

        <div className="p-4 space-y-3 text-xs">
          {livePreview && (
            <div className="aether-panel rounded-xl p-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-slate-400 text-[11px]">Parsed Intent · {livePreview.action}</div>
                <div className="text-slate-100 font-medium mt-0.5">{livePreview.message}</div>
              </div>
              <span className="font-mono-tabular text-[11px] text-cyan-300">
                {Math.round(livePreview.confidence * 100)}% match
              </span>
            </div>
          )}

          {lastResult && !livePreview && (
            <div className="aether-panel rounded-xl p-3">
              <div className="text-slate-400 text-[11px]">Last Executed · {lastResult.action}</div>
              <div className="text-emerald-300 font-medium mt-0.5">{lastResult.message}</div>
            </div>
          )}

          <div>
            <div className="text-[11px] font-medium text-slate-400 mb-2">
              Natural Language & Voice Commands
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_COMMANDS.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => onExecuteCommand(cmd)}
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 border border-white/10 text-slate-200 transition-colors cursor-pointer"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
