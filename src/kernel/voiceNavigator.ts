import type { VoiceIntentResult } from '../types/os';
import { neuralBus } from './neuralBus';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  0: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechCtor = new () => SpeechRecognitionLike;

export function parseVoiceIntent(rawInput: string): VoiceIntentResult {
  const rawText = rawInput.trim();
  const q = rawText.toLowerCase();

  // Trilateral Expansion Matrix & Liquid Audio Intents
  const triadMatch = q.match(/(?:activate|switch|open|run)\s+(research|flow|resilience)\s*(?:triad|matrix|mode)?/i);
  if (triadMatch) {
    const preset = triadMatch[1].toLowerCase();
    return {
      rawText,
      action: 'ACTIVATE_TRIAD',
      target: preset,
      confidence: 0.96,
      message: `Activating ${preset} Trilateral Workspace Matrix.`,
    };
  }

  if (/(run|execute|start)\s+(trilateral|3[\s-]*axis)\s*(pipeline|matrix)?/i.test(q)) {
    return {
      rawText,
      action: 'RUN_TRILATERAL_PIPELINE',
      confidence: 0.95,
      message: 'Executing 3-Axis Trilateral Pipeline across Persistence, Cognitive, and Spatial blocks.',
    };
  }

  if (/(play|pause|stop|toggle)\s+(liquid|mp3|music|flow\s*audio)/i.test(q)) {
    return {
      rawText,
      action: 'TOGGLE_LIQUID_PLAY',
      target: /pause|stop/i.test(q) ? 'pause' : 'play',
      confidence: 0.94,
      message: /pause|stop/i.test(q) ? 'Pausing Liquid MP3 Free-Flow Player.' : 'Starting Liquid MP3 Free-Flow Player.',
    };
  }

  if (/(refract|lock|stabilize|hold)\s*(120\s*fps|120\s*hz|fractal|binary\s*refraction)/i.test(q)) {
    return {
      rawText,
      action: 'REFRACT_120FPS',
      confidence: 0.96,
      message: 'Rebalancing Micro Fractal Binary Refraction agents to hold 120fps.',
    };
  }

  // App routing rules
  const appAliases: Array<[RegExp, string, string]> = [
    [/(sentient\s*(ai|core|nexus)|mint\s*as\s*app|metal\s*it)/i, 'sentientai', 'Opening Sentient AI Core & App Minter'],
    [/(hybrid\s*(synth|10|app)|synthetic\s*hybrid|10\s*daemon)/i, 'synthhybrid', 'Opening 10-Daemon Synthetic Hybrid App Synthesizer'],
    [/(live\s*playground|code\s*playground|library\s*cluster|cluster\s*code)/i, 'liveplayground', 'Opening Live Code Playground & Library Clusters'],
    [/(model\s*forge\s*v?3\.?8|skin\s*master\s*suite)/i, 'modelforgesuite', 'Opening AIM OS v3.8 Model Forge & Skin Master Suite'],
    [/(orion\s*fps|sovereign\s*fps|ps7.*fps|matrix\s*sovereign)/i, 'sovereignfps', 'Opening PS7 Orion OS v15 Matrix Sovereign FPS'],
    [/(odonata|dragonfly\s*swarm|mesh\s*relay)/i, 'odonatamesh', 'Opening Odonata Mesh Relay & Dragonfly Swarm'],
    [/(sentient\s*sun|fractal\s*core)/i, 'sentientsun', 'Opening Sentient Sun OS Fractal Core'],
    [/(cometic\s*(matrix|visual)|v26\.?3)/i, 'cometicmatrix', 'Opening Cometic Engine v26.3 Data Visual Matrix'],
    [/(aim\s*os\s*nexus|nexus\s*v?5)/i, 'aimosnexus', 'Opening AIM OS Nexus Sentient Game Generator v5.0'],
    [/(liquid\s*quantum|quantum\s*matrix)/i, 'liquidquantum', 'Opening PS7 Orion Liquid Core & Quantum Matrix'],
    [/(ballistic|photo\s*fabric)/i, 'cometicballistic', 'Opening Cometic Engine Photo Fabric Ballistic Range v5'],
    [/(zero[\s-]*cross|cad\s*kernel)/i, 'zerocrossingcad', 'Opening AiM Zero-Crossing CAD Kernel'],
    [/(aim\s*os\s*v?7|monolith)/i, 'aimosv7', 'Opening AIM OS v7.0 Master Monolithic Cognitive Suite'],
    [/(aim\s*os|workstation|opfs\s*scratch)/i, 'aimworkstation', 'Opening AIM OS v9.5 Master Workstation'],
    [/(fractal\s*csp|home\s*fractal|tapered\s*collector|solar\s*pid)/i, 'fractalcsp', 'Opening Home Fractal CSP 3D Collector'],
    [/(helio\s*cell|hellcat|solar\s*battery|photo[\s-]*isomer)/i, 'heliocell', 'Opening HelioCell HELLCAT OS'],
    [/(space\s*jet|light[\s-]*reception|planet\s*cosmos|aim\s*space\s*jet)/i, 'aimspacejet', 'Opening AIM Space 3D Glass Jet & Cosmos'],
    [/(aim\s*space|aimspace|astra[\s-]*7)/i, 'aimspace', 'Launching AIM Space Synthetic Game & 50 Assist Daemons'],
    [/(drift\s*mode|awareness\s*matrix|full\s*apps?\s*loop|master\s*brain|brain\s*sorter|sort\s*everything)/i, 'masterbrain', 'Opening AI Brain Awareness Matrix & Drift Generator'],
    [/(smart\s*(ai|companion)|env(ironment)?\s*(builder|arch)|hdd\s*space|volume\s*growth|system\s*monitor|home\s*companion)/i, 'companion', 'Opening Smart AI Companion & Environment Architect'],
    [/(code\s*unif|unif.*code|apply.*code|synth.*integrat)/i, 'codeunifier', 'Opening Synthetic Code-to-Game Unificator'],
    [/(mesh\s*unif|engine\s*unif|cross[\s-]*engine)/i, 'meshunifier', 'Opening Cross-Engine Mesh & Brain Unificator'],
    [/(kinetic\s*(2d|engine)?|2d\s*engine|physics\s*engine)/i, 'kineticengine', 'Opening Kinetic 2D Physics & Sprite Engine'],
    [/(voxel\s*(3d|engine)?|3d\s*engine|shader\s*engine)/i, 'voxelengine', 'Opening Voxel & Shader 3D Game Engine'],
    [/(hyper\s*face|face\s*studio|object\s*design|clear\s*phase|v12)/i, 'hyperface', 'Opening HyperFace AI Studio v12.0 & Object Designer'],
    [/(smart\s*brain|game\s*items|fill\s*blanks|item\s*forge|item\s*gen)/i, 'smartbrain', 'Opening Smart Brain // Auto Game Item Generator'],
    [/(game\s*forge|one[\s-]*button\s*game|game\s*generator|make\s*a?\s*game)/i, 'gameforge', 'Opening 1-Button Gemini Game Forge'],
    [/(sprite\s*lab|sprite\s*composer|physics\s*rig|physics\s*lab)/i, 'spritecomposer', 'Opening Sprite, Physics & Asset Lab'],
    [/(json\s*vault|json\s*library|research\s*vault|data\s*sorter)/i, 'jsonvault', 'Opening JSON Research Vault & Sorter'],
    [/(master\s*brain|brain\s*sorter|sort\s*everything)/i, 'masterbrain', 'Opening Master Brain & 10 Sorter Daemons'],
    [/(think\s*matrix|infinite\s*think|quick\s*response|thinking\s*matrix)/i, 'thinkmatrix', 'Opening Quick Response & Infinite Thinking Matrix'],
    [/(universal\s*stream|stream\s*hub|streaming|live\s*stream|broadcast)/i, 'streamhub', 'Opening Universal Streaming Hub'],
    [/(html5?\s*printer|app\s*printer|print\s*app|auto[\s-]*improve)/i, 'htmlprinter', 'Opening HTML5 App Printer & Auto-Improver'],
    [/(architect|upgrade\s*code|prompt\s*architect|code\s*upgrader)/i, 'architect', 'Opening AI Prompt Architect & System Upgrader'],
    [/(music\s*studio|music\s*gen|generate\s*music|beat\s*maker|sequencer)/i, 'musicstudio', 'Opening AI Music Generation Studio'],
    [/(video\s*editor|edit\s*video|timeline\s*editor)/i, 'videoeditor', 'Opening Non-Linear Video Editor'],
    [/(doom|3d\s*doom|fps\s*game|sector\s*09)/i, 'doom3d', 'Launching Doom 3D // Phobos Sector 09'],
    [/(code\s*auditor|ast\s*auditor|auditor|lint|audit\s*code)/i, 'auditor', 'Opening AST Code Auditor'],
    [/(code\s*companion|ai\s*companion|companion|terminal|shell|console|repl|cli)/i, 'terminal', 'Opening AI Code Companion & Shell'],
    [/(code\s*editor|editor|drive|files|file\s*manager|vfs|explorer|indexeddb)/i, 'drive', 'Opening CodeMesh Editor & VFS'],
    [/(sandbox|preview|runner)/i, 'sandbox', 'Opening Instant Sandboxed Preview'],
    [/(liquid\s*eq|graphic\s*eq|equalizer|\beq\b)/i, 'liquideq', 'Opening Liquid 10-Band Graphic EQ'],
    [/(visual\s*synth|image\s*morph|morph\s*synth)/i, 'visualsynth', 'Opening Visual Morph Synthesizer'],
    [/(micro\s*fractal|120\s*fps|binary\s*refraction|refraction\s*kernel)/i, 'microfractal', 'Opening Micro Fractal 120fps Kernel'],
    [/(engine\s*blocks|blocks|trilateral|matrix)/i, 'blocks', 'Opening Engine Blocks & Trilateral Matrix'],
    [/(fractal\s*os|cinema\s*scope|sovereign\s*brain|theatre\s*view|2\.39)/i, 'fractalcinema', 'Opening FractalOS // 2.39:1 CinemaScope & Brain v2.4'],
    [/(liquid\s*video|pixel\s*matrix|fused\s*screen)/i, 'liquidvideo', 'Opening Liquid Video // Pixel Matrix Screen'],
    [/(organic\s*mp4|mp4\s*player|synthetic\s*screen|video\s*player|\bmp4\b)/i, 'organicmp4', 'Opening Organic MP4 Player & Synthetic Screen'],
    [/(liquid|mp3|music|player|free[\s-]*flow)/i, 'liquidmp3', 'Opening Liquid MP3 & Free-Flow Player'],
    [/(model\s*forge|forge|3d\s*skin|gltf)/i, 'modelforge', 'Opening AI Model Forge'],
    [/(swarm|agent|cognition|mesh|daemon|llm)/i, 'swarm', 'Opening AI Agent Swarm Mesh'],
    [/(synesthesia|mic|microphone|fft|audio|spectrum|visualizer)/i, 'synesthesia', 'Opening Synesthesia & FFT Studio'],
    [/(healer|self[\s-]*heal|health|diagnostic)/i, 'healer', 'Opening Internal Self-Healer'],
    [/(game|physics)/i, 'gamedev', 'Opening 3D Physics Sandbox'],
    [/(neural\s*bus|ledger|events|telemetry\s*bus)/i, 'neuralbus', 'Opening Neural Ledger Bus'],
    [/(snapshot|time[\s-]*travel|diff|rollback|history)/i, 'snapshots', 'Opening Time-Travel Snapshots'],
  ];

  if (/(trigger|run|start|execute)\s+(self[\s-]*heal|heal|recovery|repair)/i.test(q) || q === 'heal') {
    return {
      rawText,
      action: 'TRIGGER_HEAL',
      confidence: 0.96,
      message: 'Triggering Autonomous Kernel Self-Heal cycle.',
    };
  }

  if (/(scan|audit|check|review)\s+(workspace|files|code|security|swarm)/i.test(q)) {
    return {
      rawText,
      action: 'SWARM_SCAN',
      target: /security/i.test(q) ? 'security-guard' : 'all',
      confidence: 0.94,
      message: 'Dispatching AI Agent Swarm workspace scan.',
    };
  }

  if (/(start|enable|toggle|stop|mute)\s+(mic|microphone|audio)/i.test(q)) {
    return {
      rawText,
      action: 'TOGGLE_MIC',
      target: /stop|mute/i.test(q) ? 'off' : 'on',
      confidence: 0.93,
      message: /stop|mute/i.test(q) ? 'Stopping Microphone FFT stream.' : 'Starting Microphone FFT stream.',
    };
  }

  if (/(tile|grid)\s*(windows|all)?/i.test(q)) {
    return {
      rawText,
      action: 'TILE_WINDOWS',
      confidence: 0.95,
      message: 'Tiling open windows into workspace grid.',
    };
  }

  if (/cascade\s*(windows|all)?/i.test(q)) {
    return {
      rawText,
      action: 'CASCADE_WINDOWS',
      confidence: 0.95,
      message: 'Cascading open workspace windows.',
    };
  }

  if (/(minimize|hide|clear)\s*(all|windows|desktop)/i.test(q)) {
    return {
      rawText,
      action: 'MINIMIZE_ALL',
      confidence: 0.94,
      message: 'Minimizing all open windows.',
    };
  }

  if (/(create|take|save)\s*(a\s*)?(snapshot|checkpoint|backup)/i.test(q)) {
    return {
      rawText,
      action: 'CREATE_SNAPSHOT',
      confidence: 0.94,
      message: 'Capturing workspace snapshot in IndexedDB.',
    };
  }

  const themeMatch = q.match(/(?:theme|phase|mode)\s+(?:to\s+)?(auto|dawn|noon|dusk|midnight)/i);
  if (themeMatch) {
    return {
      rawText,
      action: 'SET_THEME',
      target: themeMatch[1].toLowerCase(),
      confidence: 0.95,
      message: `Switching Synesthesia phase to ${themeMatch[1].toLowerCase()}.`,
    };
  }

  const runFileMatch = q.match(/^(?:run|execute|launch)\s+([a-z0-9._-]+\.(?:js|html|md|json))$/i);
  if (runFileMatch) {
    return {
      rawText,
      action: 'RUN_FILE',
      target: runFileMatch[1],
      confidence: 0.94,
      message: `Executing ${runFileMatch[1]} in Sandboxed Window.`,
    };
  }

  if (/(open|launch|show|focus|switch\s+to|go\s+to|start)/i.test(q) || appAliases.some(([re]) => re.test(q))) {
    for (const [regex, appId, label] of appAliases) {
      if (regex.test(q)) {
        return {
          rawText,
          action: 'OPEN_APP',
          target: appId,
          confidence: 0.92,
          message: label,
        };
      }
    }
  }

  return {
    rawText,
    action: 'UNKNOWN',
    confidence: 0.15,
    message: `Unrecognized command: "${rawText}". Try "Activate Flow Triad", "Open Liquid MP3", or "Run trilateral pipeline".`,
  };
}

class VoiceNavigatorService {
  private recognition: SpeechRecognitionLike | null = null;
  private listening = false;
  private voiceFeedbackEnabled = false;

  isSupported(): boolean {
    const win = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  isListening(): boolean {
    return this.listening;
  }

  setSpokenConfirmation(enabled: boolean): void {
    this.voiceFeedbackEnabled = enabled;
  }

  speak(text: string): void {
    if (!this.voiceFeedbackEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 1.05;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore
    }
  }

  startListening(handlers: {
    onTranscript: (text: string, isFinal: boolean) => void;
    onStateChange: (listening: boolean) => void;
    onError: (message: string) => void;
  }): boolean {
    const win = window as unknown as {
      SpeechRecognition?: SpeechCtor;
      webkitSpeechRecognition?: SpeechCtor;
    };
    const Ctor = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!Ctor) {
      handlers.onError('Web Speech API is unavailable in this browser. Use the text Command Bar (Ctrl+K).');
      return false;
    }

    if (this.listening && this.recognition) {
      this.stopListening();
      return false;
    }

    const rec = new Ctor();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let transcript = '';
      let isFinal = false;
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
      }
      handlers.onTranscript(transcript.trim(), isFinal);
    };

    rec.onerror = (event) => {
      this.listening = false;
      handlers.onStateChange(false);
      handlers.onError(`Speech recognition error: ${event.error}`);
      neuralBus.publish('VOICE', 'SPEECH_ERROR', `Speech recognition reported: ${event.error}`);
    };

    rec.onend = () => {
      this.listening = false;
      handlers.onStateChange(false);
    };

    this.recognition = rec;
    this.listening = true;
    handlers.onStateChange(true);
    rec.start();
    neuralBus.publish('VOICE', 'SPEECH_ACTIVE', 'Web Speech API voice command listener active.');
    return true;
  }

  stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {
        // ignore
      }
    }
    this.listening = false;
  }
}

export const voiceNavigator = new VoiceNavigatorService();
