import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, RefreshCw, Sparkles, Terminal } from 'lucide-react';
import { OS_APPS } from '../kernel/appRegistry';
import { kernelHealer } from '../kernel/healerEngine';
import { microFractalKernel } from '../kernel/microFractalKernel';
import { neuralBus } from '../kernel/neuralBus';
import { printedAppsStore } from '../kernel/printedAppsStore';
import { synesthesiaEngine } from '../kernel/synesthesiaEngine';
import { vfs } from '../kernel/vfs';
import type { AppId, PrintedAppDefinition } from '../types/os';

interface PrintedAppRuntimeProps {
  app: PrintedAppDefinition;
  openAppIds: string[];
  onOpenApp: (id: AppId) => void;
  onShowToast?: (msg: string) => void;
}

function injectAetherBridge(rawHtml: string, appId: string): string {
  const bridgeScript = `<script>
(function(){
  if (window.AetherOS) return;
  const listeners = new Set();
  let state = { bass: 0.12, mid: 0.12, treble: 0.12, rms: 0.12, activeHue: 185, fps: 60, kernelHealth: 100, openApps: [], recentEvents: [] };
  window.addEventListener('message', function(ev) {
    const d = ev.data;
    if (!d || d.__aetherHost !== true) return;
    if (d.type === 'STATE_TICK') {
      state = d.state || state;
      listeners.forEach(function(fn){ try { fn({ type: 'STATE_TICK', state: state }); } catch(e){} });
    } else if (d.type === 'BUS_EVENT') {
      if (d.event) {
        state.recentEvents = [d.event].concat(state.recentEvents || []).slice(0, 20);
      }
      listeners.forEach(function(fn){ try { fn({ type: 'BUS_EVENT', event: d.event, state: state }); } catch(e){} });
    }
  });
  window.AetherOS = {
    appId: ${JSON.stringify(appId)},
    getState: function(){ return state; },
    subscribe: function(fn){ listeners.add(fn); return function(){ listeners.delete(fn); }; },
    publish: function(type, summary, payload){
      window.parent.postMessage({ __aetherBridge: true, appId: ${JSON.stringify(appId)}, action: 'PUBLISH_BUS', type: String(type || 'CUSTOM'), summary: String(summary || ''), payload: payload || {} }, '*');
    },
    openApp: function(targetId){
      window.parent.postMessage({ __aetherBridge: true, appId: ${JSON.stringify(appId)}, action: 'OPEN_APP', targetId: String(targetId || '') }, '*');
    },
    saveVfs: function(name, content){
      window.parent.postMessage({ __aetherBridge: true, appId: ${JSON.stringify(appId)}, action: 'SAVE_VFS', name: String(name || 'output.txt'), content: String(content || '') }, '*');
    }
  };
})();
</script>`;

  if (/<\/body>/i.test(rawHtml)) {
    return rawHtml.replace(/<\/body>/i, `${bridgeScript}\n</body>`);
  }
  return `${rawHtml}\n${bridgeScript}`;
}

export function PrintedAppRuntime({ app, openAppIds, onOpenApp, onShowToast }: PrintedAppRuntimeProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [improving, setImproving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(app.lastImprovementNote || null);

  const srcDoc = useMemo(() => injectAetherBridge(app.html, app.id), [app.html, app.id]);

  // Listen for bridge calls from inside the printed HTML5 app
  useEffect(() => {
    const onMessage = (ev: MessageEvent) => {
      const iframeWin = iframeRef.current?.contentWindow;
      if (!iframeWin || ev.source !== iframeWin) return;
      const msg = ev.data;
      if (!msg || msg.__aetherBridge !== true) return;

      if (msg.action === 'PUBLISH_BUS') {
        neuralBus.publish('SANDBOX', msg.type || 'PRINTED_EVENT', `[${app.shortName}] ${msg.summary || 'Signal'}`, msg.payload);
        printedAppsStore.recordBusTraffic(app.id);
      } else if (msg.action === 'OPEN_APP' && msg.targetId) {
        onOpenApp(msg.targetId as AppId);
      } else if (msg.action === 'SAVE_VFS' && msg.name) {
        void vfs.saveFile({
          name: msg.name,
          path: `/workspace/printed-apps/${app.slug}-${msg.name}`,
          content: String(msg.content ?? ''),
          patchedBy: app.shortName,
        });
        onShowToast?.(`${app.shortName} saved ${msg.name} to VFS.`);
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [app.id, app.shortName, app.slug, onOpenApp, onShowToast]);

  // Sync live OS telemetry & Neural Bus events into the printed app
  useEffect(() => {
    const pushState = () => {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      const syn = synesthesiaEngine.getState();
      const mfk = microFractalKernel.getState();
      const heal = kernelHealer.getState();
      win.postMessage(
        {
          __aetherHost: true,
          type: 'STATE_TICK',
          state: {
            bass: Number(syn.bass.toFixed(3)),
            mid: Number(syn.mid.toFixed(3)),
            treble: Number(syn.treble.toFixed(3)),
            rms: Number(syn.rms.toFixed(3)),
            activeHue: syn.activeHue,
            fps: mfk.measuredFps,
            kernelHealth: heal.health,
            openApps: openAppIds,
            recentEvents: neuralBus.getEvents().slice(0, 12),
          },
        },
        '*'
      );
    };

    const tick = window.setInterval(pushState, 140);
    const unsubBus = neuralBus.subscribe((_all, latest) => {
      if (!latest) return;
      iframeRef.current?.contentWindow?.postMessage(
        {
          __aetherHost: true,
          type: 'BUS_EVENT',
          event: latest,
        },
        '*'
      );
    });

    return () => {
      window.clearInterval(tick);
      unsubBus();
    };
  }, [openAppIds, reloadNonce]);

  const handleSingleButtonImprove = async () => {
    if (improving) return;
    setImproving(true);
    setStatusMsg('AI Auto-Improver upgrading HTML5 & cross-app links...');
    try {
      const res = await fetch('/api/printer/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: app.name,
          html: app.html,
          version: app.version,
          availableApps: OS_APPS.map((a) => `${a.id} (${a.shortName})`),
        }),
      });
      const data = (await res.json()) as {
        improvedHtml?: string;
        summary?: string;
        error?: string;
      };
      if (!res.ok || !data.improvedHtml) {
        throw new Error(data.error || 'Auto-improve failed.');
      }
      await printedAppsStore.printApp({
        id: app.id,
        name: app.name,
        description: app.description,
        html: data.improvedHtml,
        improvementNote: data.summary || 'Auto-improved via 1-button AI pass.',
      });
      setStatusMsg(data.summary || `Upgraded to v${app.version + 1}.`);
      setReloadNonce((n) => n + 1);
      onShowToast?.(`Auto-improved "${app.shortName}" to v${app.version + 1}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Auto-improve error';
      setStatusMsg(msg);
      onShowToast?.(msg);
    } finally {
      setImproving(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#040711] text-xs overflow-hidden">
      <div className="px-2.5 py-1.5 border-b border-white/10 bg-slate-950/90 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 font-mono-tabular text-[10px]">
            v{app.version}
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-cyan-300 font-mono-tabular">
            <Activity className="w-3 h-3" />
            {app.busMessagesSent} bus tx
          </span>
          {statusMsg && <span className="text-[10px] text-slate-400 truncate max-w-[200px]">{statusMsg}</span>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => void handleSingleButtonImprove()}
            disabled={improving}
            className="px-2 py-1 rounded-md bg-gradient-to-r from-emerald-500/25 to-cyan-500/25 hover:from-emerald-500/40 hover:to-cyan-500/40 border border-cyan-400/45 text-cyan-100 text-[10px] font-semibold inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>{improving ? 'Improving...' : 'Auto-Improve'}</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenApp('htmlprinter')}
            title="Edit in HTML5 Printer"
            className="px-2 py-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/12 text-slate-200 text-[10px] inline-flex items-center gap-1 cursor-pointer"
          >
            <Terminal className="w-3 h-3" />
            <span>Printer</span>
          </button>

          <button
            type="button"
            onClick={() => setReloadNonce((n) => n + 1)}
            title="Reload Printed App"
            className="p-1 rounded-md bg-white/8 hover:bg-white/15 border border-white/12 text-slate-300 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <iframe
          key={reloadNonce}
          ref={iframeRef}
          srcDoc={srcDoc}
          title={app.name}
          sandbox="allow-scripts allow-forms allow-modals"
          className="w-full h-full border-0 block bg-[#040711]"
        />
      </div>
    </div>
  );
}
