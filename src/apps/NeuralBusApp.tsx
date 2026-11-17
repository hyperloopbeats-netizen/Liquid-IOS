import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { neuralBus } from '../kernel/neuralBus';
import type { BusChannel, NeuralBusEvent } from '../types/os';

const CHANNELS: Array<'ALL' | BusChannel> = [
  'ALL',
  'TRILATERAL',
  'FRACTAL',
  'SWARM',
  'VFS',
  'HEALER',
  'VOICE',
  'AUDIO',
  'FORGE',
  'SANDBOX',
  'SYSTEM',
];

export function NeuralBusApp() {
  const [events, setEvents] = useState<NeuralBusEvent[]>(neuralBus.getEvents());
  const [channel, setChannel] = useState<'ALL' | BusChannel>('ALL');
  const [query, setQuery] = useState('');

  useEffect(() => {
    return neuralBus.subscribe((all) => setEvents([...all]));
  }, []);

  const filtered = events.filter((e) => {
    if (channel !== 'ALL' && e.channel !== channel) return false;
    if (query.trim()) {
      const q = query.toLowerCase();
      return e.summary.toLowerCase().includes(q) || e.type.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      <div className="aether-panel rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex flex-wrap items-center gap-1">
          {CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChannel(c)}
              className={`px-2 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                channel === c
                  ? 'bg-indigo-500/25 text-indigo-100 border border-indigo-400/40'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-white/8'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter events..."
            className="bg-slate-900 border border-white/15 rounded-lg px-2.5 py-1 text-xs text-slate-100 outline-none w-40"
          />
          <button
            type="button"
            onClick={() => neuralBus.clear()}
            className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 border border-white/15 text-slate-200 inline-flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 aether-panel rounded-xl p-3 overflow-y-auto space-y-1.5 font-mono text-[11px]">
        {filtered.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            No matching telemetry events on this channel.
          </div>
        ) : (
          filtered.map((evt) => (
            <div key={evt.id} className="p-2.5 rounded-lg bg-white/[0.03] border border-white/8">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-tabular">
                <span>
                  {evt.timestamp} · {evt.channel} · {evt.type}
                </span>
              </div>
              <div className="mt-1 text-slate-100">{evt.summary}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
