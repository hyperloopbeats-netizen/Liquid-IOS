(function () {
  if (window.__AetherLoopBridgeInstalled) return;
  window.__AetherLoopBridgeInstalled = true;

  var appMeta = window.__AETHER_SUITE_META || {
    id: 'suite-app',
    title: document.title || 'Aether Suite App',
  };

  function detectSuiteId() {
    if (appMeta && appMeta.id && appMeta.id !== 'suite-app') return appMeta.id;
    var path = (window.location && window.location.pathname) || '';
    if (path.indexOf('aim-workstation') !== -1) return 'aimworkstation';
    if (path.indexOf('home-fractal-csp') !== -1) return 'fractalcsp';
    if (path.indexOf('heliocell-hellcat') !== -1) return 'heliocell';
    if (path.indexOf('aim-space-jet') !== -1) return 'aimspacejet';
    if (path.indexOf('aim-model-forge-v38') !== -1) return 'modelforgesuite';
    if (path.indexOf('ps7-sovereign-fps') !== -1) return 'sovereignfps';
    if (path.indexOf('odonata-mesh-relay') !== -1) return 'odonatamesh';
    if (path.indexOf('sentient-sun-os') !== -1) return 'sentientsun';
    if (path.indexOf('cometic-visual-matrix') !== -1) return 'cometicmatrix';
    if (path.indexOf('aim-os-nexus-v5') !== -1) return 'aimosnexus';
    if (path.indexOf('ps7-liquid-quantum') !== -1) return 'liquidquantum';
    if (path.indexOf('cometic-ballistic-v5') !== -1) return 'cometicballistic';
    if (path.indexOf('aim-zero-crossing-cad') !== -1) return 'zerocrossingcad';
    if (path.indexOf('aim-os-v7-monolith') !== -1) return 'aimosv7';
    return appMeta.id || 'suite-app';
  }

  var suiteId = detectSuiteId();
  var driftState = {
    active: false,
    intensity: 0.75,
    phaseVelocity: 1.0,
    colorShiftDeg: 0,
    phase: 0,
    fullAppLoopActive: false,
    autoCameraDrift: true,
    thermalOscillation: true,
  };

  var autonomousState = {
    thinkingActive: true,
    improvementGeneration: 1,
    lastThought: 'Initialized synthetic OS neural telemetry link.',
  };

  var frameCounter = 0;
  var lastFpsCheck = performance.now();
  var measuredFps = 60;
  var lastMoveSwapAt = 0;
  var lastSysSpawnAt = 0;

  if (!window.AetherOS) {
    window.AetherOS = {
      appId: suiteId,
      publish: function (type, summary) {
        try {
          window.parent.postMessage(
            {
              __aetherBridge: true,
              action: 'PUBLISH_BUS',
              appId: suiteId,
              type: String(type || 'SUITE_EVENT'),
              summary: String(summary || ''),
            },
            '*'
          );
        } catch (_) {}
      },
      openApp: function (targetId) {
        try {
          window.parent.postMessage(
            {
              __aetherBridge: true,
              action: 'OPEN_APP',
              targetId: String(targetId || ''),
            },
            '*'
          );
        } catch (_) {}
      },
      getDriftState: function () {
        return driftState;
      },
      getAutonomousState: function () {
        return autonomousState;
      },
    };
  }

  function safeText(id) {
    var el = document.getElementById(id);
    return el && el.textContent ? el.textContent.trim() : '';
  }

  function setSliderValue(id, nextVal) {
    var el = document.getElementById(id);
    if (!el) return;
    var min = parseFloat(el.min || '0');
    var max = parseFloat(el.max || '100');
    var clamped = Math.max(min, Math.min(max, nextVal));
    if (Math.abs(parseFloat(el.value) - clamped) < 0.01) return;
    el.value = String(clamped);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function clickSelector(sel) {
    var el = document.querySelector(sel);
    if (el && typeof el.click === 'function') el.click();
  }

  function collectTelemetry() {
    var canvasCount = document.querySelectorAll('canvas').length;
    var controlCount = document.querySelectorAll('button, input, select').length;
    var metrics = {
      suiteId: suiteId,
      fps: measuredFps,
      driftActive: driftState.active,
      fullAppLoopActive: driftState.fullAppLoopActive,
      improvementGeneration: autonomousState.improvementGeneration,
      autonomousThought: autonomousState.lastThought,
      timestamp: Date.now(),
      headline: (document.title || suiteId).slice(0, 42),
      subMetric: canvasCount + ' Canvas · ' + controlCount + ' Controls · Gen v' + autonomousState.improvementGeneration,
      detail: autonomousState.lastThought,
    };

    if (suiteId === 'aimworkstation') {
      metrics.headline = safeText('system-status-text') || 'All 5 Subsystems Nominal';
      metrics.subMetric = 'OPFS 29.6% · SDF Ready';
      metrics.detail = safeText('fps-display') || measuredFps + ' FPS';
    } else if (suiteId === 'fractalcsp') {
      metrics.headline = safeText('topModePill') || 'M4 · Solar Tracking';
      metrics.subMetric = safeText('topScalePill') || '1x';
      metrics.detail = safeText('daemonStripText') || '4 RT Daemons Online';
    } else if (suiteId === 'heliocell') {
      metrics.headline = safeText('topSocPill') || 'SoC 42%';
      metrics.subMetric = (safeText('topModePill') || 'M4') + ' · ' + (safeText('topScalePill') || '1x');
      metrics.detail = safeText('daemonStripText') || 'HELLCAT 50 Daemons Online';
    } else if (suiteId === 'aimspacejet') {
      metrics.headline = 'PTS ' + (safeText('hud-score') || '0') + ' · ' + (safeText('hud-systems') || 'SYS 01');
      metrics.subMetric = 'HULL ' + (safeText('val-hull') || '100%') + ' · ' + (safeText('hud-temp') || '50.0°C');
      metrics.detail = safeText('smart-ai-summary') || '20 Smart AI Daemons Active';
    } else if (suiteId === 'modelforgesuite') {
      metrics.headline = 'AI Model Forge v3.8';
      metrics.subMetric = 'PBR Shader · Impact Mesh · Vault';
    } else if (suiteId === 'sovereignfps') {
      metrics.headline = 'Orion v15 Sovereign FPS';
      metrics.subMetric = (safeText('fps-badge') || measuredFps + ' FPS') + ' · AI Medic · WebAudio';
    } else if (suiteId === 'odonatamesh') {
      metrics.headline = 'Odonata Swarm Command';
      metrics.subMetric = (safeText('active-nodes') || 'MESH') + ' · Boids Relay';
    } else if (suiteId === 'sentientsun') {
      metrics.headline = 'Sentient Sun Fractal Core';
      metrics.subMetric = 'WebGL Fractal · 3-Band Sovereign EQ';
    } else if (suiteId === 'cometicmatrix') {
      metrics.headline = 'Cometic Visual Matrix v26';
      metrics.subMetric = 'UnrealBloom · 800 Spark Motes';
    } else if (suiteId === 'aimosnexus') {
      metrics.headline = 'AIM OS Nexus v5.0';
      metrics.subMetric = 'Sentient Game Generator · 3D Viewport';
    } else if (suiteId === 'liquidquantum') {
      metrics.headline = 'PS7 Liquid Quantum v15';
      metrics.subMetric = (safeText('hud-tempo') || '120 BPM') + ' · ' + (safeText('hud-chord') || 'Am');
    } else if (suiteId === 'cometicballistic') {
      metrics.headline = 'Ballistic Cloth Range v5';
      metrics.subMetric = 'ROUNDS ' + (safeText('hud-rounds') || '0') + ' · TEARS ' + (safeText('hud-tears') || '0');
    } else if (suiteId === 'zerocrossingcad') {
      metrics.headline = 'Zero-Crossing CAD Kernel';
      metrics.subMetric = 'Parametric SDF · Single-File Lab';
    } else if (suiteId === 'aimosv7') {
      metrics.headline = 'AIM OS v7.0 Cognitive Suite';
      metrics.subMetric = 'Monolithic Workstation · Multi-Window';
    }
    return metrics;
  }

  function applyDriftLoopStep(nowMs) {
    if (!driftState.active && !driftState.fullAppLoopActive) {
      if (document.documentElement.style.filter) {
        document.documentElement.style.filter = '';
      }
      return;
    }

    var hueShift = driftState.colorShiftDeg + (driftState.active ? Math.sin(driftState.phase * 0.7) * 18 * driftState.intensity : 0);
    if (Math.abs(hueShift) > 1.2) {
      document.documentElement.style.filter = 'hue-rotate(' + hueShift.toFixed(1) + 'deg)';
    } else if (document.documentElement.style.filter) {
      document.documentElement.style.filter = '';
    }

    var s = Math.sin(driftState.phase);
    var c = Math.cos(driftState.phase * 0.6);

    if (suiteId === 'aimworkstation') {
      if (driftState.fullAppLoopActive && nowMs - lastMoveSwapAt > 5200 && window.WorkstationApp) {
        lastMoveSwapAt = nowMs;
        var nextShape = s > 0 ? 'gyroid' : 'torus';
        try {
          window.WorkstationApp.setCadShape(nextShape);
          window.WorkstationApp.logEvent('MATRIX_LOOP', 'Drift cycle aligned SDF kernel -> ' + nextShape.toUpperCase());
        } catch (_) {}
      }
    } else if (suiteId === 'fractalcsp') {
      if (driftState.thermalOscillation) {
        setSliderValue('fluxSlider', 760 + s * 280 * Math.min(1.4, driftState.intensity));
        setSliderValue('dtSlider', 26 + c * 11 * Math.min(1.4, driftState.intensity));
      }
      if (driftState.fullAppLoopActive && nowMs - lastMoveSwapAt > 7000) {
        lastMoveSwapAt = nowMs;
        var scales = [1, 2, 5, 10];
        var pickScale = scales[Math.floor((driftState.phase * 0.4) % scales.length)];
        var cmdInput = document.getElementById('daemonCmdInput');
        var cmdForm = document.getElementById('daemonCmdForm');
        if (cmdInput && cmdForm) {
          cmdInput.value = 'scale ' + pickScale;
          cmdForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    } else if (suiteId === 'heliocell') {
      if (driftState.thermalOscillation) {
        setSliderValue('fluxSlider', 780 + s * 260 * Math.min(1.4, driftState.intensity));
        setSliderValue('dischargeSlider', 40 + c * 30 * Math.min(1.4, driftState.intensity));
      }
      if (driftState.autoCameraDrift && nowMs - lastMoveSwapAt > 8500) {
        lastMoveSwapAt = nowMs;
        var moves = ['dolly', 'crane', 'chase'];
        var mv = moves[Math.floor((driftState.phase * 0.5) % moves.length)];
        var hInput = document.getElementById('daemonCmdInput');
        var hForm = document.getElementById('daemonCmdForm');
        if (hInput && hForm) {
          hInput.value = 'move ' + mv;
          hForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    } else if (suiteId === 'aimspacejet') {
      var launchBtn = document.getElementById('btn-launch');
      var introOverlay = document.getElementById('intro-overlay');
      if (driftState.fullAppLoopActive && introOverlay && !introOverlay.classList.contains('hidden') && launchBtn) {
        launchBtn.click();
      }
      if (driftState.thermalOscillation) {
        setSliderValue('rng-din', 0.65 + s * 0.22 * Math.min(1.3, driftState.intensity));
        setSliderValue('rng-cg', 2.8 + c * 1.4 * Math.min(1.3, driftState.intensity));
      }
      if (driftState.fullAppLoopActive && nowMs - lastSysSpawnAt > 9500) {
        lastSysSpawnAt = nowMs;
        clickSelector('#btn-gen-sys');
      }
    } else if (suiteId === 'cometicballistic' && driftState.thermalOscillation) {
      setSliderValue('sliderTear', 2.6 + s * 1.1);
    }
  }

  function loopTick(now) {
    frameCounter += 1;
    if (now - lastFpsCheck >= 1000) {
      measuredFps = Math.min(120, Math.round((frameCounter * 1000) / Math.max(1, now - lastFpsCheck)));
      frameCounter = 0;
      lastFpsCheck = now;
    }

    if (driftState.active || driftState.fullAppLoopActive) {
      driftState.phase += 0.024 * (driftState.phaseVelocity || 1.0);
    }

    requestAnimationFrame(loopTick);
  }
  requestAnimationFrame(loopTick);

  window.setInterval(function () {
    applyDriftLoopStep(performance.now());
    try {
      window.parent.postMessage(
        {
          type: 'AETHER_SUITE_TELEMETRY',
          payload: collectTelemetry(),
        },
        '*'
      );
    } catch (_) {}
  }, 600);

  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object') return;

    if (d.type === 'AETHER_DRIFT_SYNC' && d.drift) {
      driftState.active = Boolean(d.drift.active);
      driftState.intensity = Number(d.drift.intensity ?? 0.75);
      driftState.phaseVelocity = Number(d.drift.phaseVelocity ?? 1.0);
      driftState.colorShiftDeg = Number(d.drift.colorShiftDeg ?? 0);
      driftState.fullAppLoopActive = Boolean(d.drift.fullAppLoopActive);
      driftState.autoCameraDrift = d.drift.autoCameraDrift !== false;
      driftState.thermalOscillation = d.drift.thermalOscillation !== false;
      if (typeof d.drift.phase === 'number') {
        driftState.phase = d.drift.phase;
      }
      applyDriftLoopStep(performance.now());
    } else if (d.type === 'AETHER_SELF_IMPROVE') {
      autonomousState.improvementGeneration += 1;
      autonomousState.lastThought =
        String(d.note || 'Applied self-improvement optimization pass (Gen v' + autonomousState.improvementGeneration + ').');
      window.AetherOS.publish('SELF_IMPROVE', suiteId + ' upgraded to Gen v' + autonomousState.improvementGeneration);
    } else if (d.type === 'AETHER_THINK_CYCLE') {
      autonomousState.thinkingActive = true;
      autonomousState.lastThought = String(
        d.thought || 'Autonomous synthesis aligned ' + suiteId + ' symbols with Sentient Core.'
      );
    } else if (d.type === 'AETHER_MATRIX_DIRECTIVE') {
      var directive = String(d.directive || '');
      autonomousState.lastThought = directive || autonomousState.lastThought;
      if (suiteId === 'aimworkstation' && window.WorkstationApp) {
        try {
          window.WorkstationApp.logEvent('AI_BRAIN', directive || 'Awareness Matrix synced.');
          if (/stress|audit|full/i.test(directive)) {
            window.WorkstationApp.triggerStressTest();
          }
        } catch (_) {}
      } else if (suiteId === 'fractalcsp' || suiteId === 'heliocell') {
        var inp = document.getElementById('daemonCmdInput');
        var frm = document.getElementById('daemonCmdForm');
        if (inp && frm && d.cliCommand) {
          inp.value = String(d.cliCommand);
          frm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      } else if (suiteId === 'aimspacejet') {
        var gfxInp = document.getElementById('gfx-prompt-input');
        var gfxBtn = document.getElementById('btn-send-gfx-prompt');
        if (gfxInp && gfxBtn && directive) {
          gfxInp.value = directive;
          gfxBtn.click();
        }
      } else if (suiteId === 'liquidquantum' && directive) {
        var sInp = document.getElementById('swarm-input');
        if (sInp) sInp.value = directive;
      }
    } else if (d.type === 'CAPTURE_SUITE_FRAME') {
      var cvs = document.querySelector('canvas');
      if (cvs && cvs.toDataURL) {
        try {
          window.parent.postMessage(
            {
              type: 'AIMSPACE_FRAME_CAPTURED',
              suiteId: suiteId,
              dataUrl: cvs.toDataURL('image/jpeg', 0.86),
            },
            '*'
          );
        } catch (_) {}
      }
    }
  });
})();
