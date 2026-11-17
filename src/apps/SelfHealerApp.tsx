import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { kernelHealer, type KernelHealthSnapshot } from '../kernel/healerEngine';

export function SelfHealerApp() {
  const [snapshot, setSnapshot] = useState<KernelHealthSnapshot>(kernelHealer.getState());
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    return kernelHealer.subscribe(setSnapshot);
  }, []);

  const handleUpgradeCycle = async () => {
    if (upgrading) return;
    setUpgrading(true);
    await kernelHealer.runHealAndUpgradeCycle();
    setUpgrading(false);
  };

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden text-xs">
      <div className="aether-panel rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-sm font-semibold text-slate-100">
              Internal Self-Healer & Autonomous Upgrade Kernel
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live invariant probes across IndexedDB VFS, 120fps Binary Refraction, Liquid Audio EQ, and 13 Swarm Daemons.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-200 cursor-pointer">
            <input
              type="checkbox"
              checked={snapshot.autoHealEnabled}
              onChange={(e) => kernelHealer.setAutoHealEnabled(e.target.checked)}
              className="accent-emerald-400"
            />
            <span>Auto-Heal</span>
          </label>

          <button
            type="button"
            onClick={() => void kernelHealer.injectSimulatedFault()}
            className="px-3 py-1.5 rounded-lg bg-amber-500/18 hover:bg-amber-500/28 border border-amber-400/45 text-amber-100 font-medium inline-flex items-center gap-1.5 cursor-pointer"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Fault Test</span>
          </button>

          <button
            type="button"
            onClick={() => void kernelHealer.runHealthCheck(true)}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 text-emerald-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Heal Now</span>
          </button>

          <button
            type="button"
            disabled={upgrading}
            onClick={() => void handleUpgradeCycle()}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-100 font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{upgrading ? 'Upgrading...' : 'Run 10-Daemon Upgrade'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0 font-mono-tabular">
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Kernel Health</div>
          <div className={`text-lg font-semibold mt-0.5 ${snapshot.health >= 90 ? 'text-emerald-300' : 'text-amber-300'}`}>
            {snapshot.health}%
          </div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Heals Verified</div>
          <div className="text-lg font-semibold text-cyan-300 mt-0.5">{snapshot.healsCount}</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">Upgrade Sweeps</div>
          <div className="text-lg font-semibold text-indigo-300 mt-0.5">{snapshot.upgradesCount}</div>
        </div>
        <div className="aether-panel rounded-xl p-2.5">
          <div className="text-[11px] text-slate-400">VFS Integrity</div>
          <div className="text-lg font-semibold text-slate-100 mt-0.5">
            {snapshot.vfsOk ? 'Nominal' : 'Alert'}
          </div>
        </div>
      </div>

      {/* Main Split: 5 Subsystem Invariants + Feedback Register */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-5 aether-panel rounded-xl p-3 flex flex-col min-h-0">
          <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
            Internal Subsystem Invariants ({snapshot.invariants.length})
          </div>
          <div className="flex-1 overflow-y-auto pt-2.5 space-y-2">
            {snapshot.invariants.map((inv) => (
              <div
                key={inv.id}
                className="p-2.5 rounded-lg bg-white/[0.03] border border-white/10 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100 truncate">{inv.name}</div>
                  <div className="text-[10px] font-mono-tabular text-slate-400 mt-0.5">{inv.metric}</div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase shrink-0 ${
                    inv.status === 'degraded'
                      ? 'text-amber-300'
                      : inv.status === 'healed'
                      ? 'text-cyan-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="md:col-span-7 aether-panel rounded-xl p-3 flex flex-col min-h-0">
          <div className="text-[11px] font-semibold text-slate-200 pb-2 border-b border-white/10 shrink-0">
            Verified Feedback & Upgrade Register
          </div>
          <div className="flex-1 overflow-y-auto pt-2.5 space-y-2 font-mono text-[11px]">
            {snapshot.logs.map((l) => (
              <div
                key={l.id}
                className={`p-2.5 rounded-xl border ${
                  l.type === 'UPGRADE_APPLIED'
                    ? 'bg-cyan-500/8 border-cyan-400/30 text-cyan-100'
                    : l.verified
                    ? 'bg-emerald-500/8 border-emerald-400/25 text-emerald-100'
                    : 'bg-amber-500/10 border-amber-400/30 text-amber-100'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75 font-mono-tabular">
                  <span>
                    {l.time} · {l.type}
                  </span>
                  <span>{l.verified ? 'Verified' : 'Recovering'}</span>
                </div>
                <div className="mt-1 leading-relaxed">{l.msg}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
