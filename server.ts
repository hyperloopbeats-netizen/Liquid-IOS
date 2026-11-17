import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/swarm/analyze', async (req, res) => {
    try {
      const { daemonRole, files } = req.body as {
        daemonRole?: string;
        files?: Array<{ name: string; kind: string; content: string }>;
      };

      if (!daemonRole || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'daemonRole and files[] are required.' });
      }

      const ai = getGeminiClient();

      const fileBundle = files
        .slice(0, 6)
        .map((f) => `--- FILE: ${f.name} (${f.kind}) ---\n${f.content.slice(0, 4500)}`)
        .join('\n\n');

      const roleInstructions: Record<string, string> = {
        'code-review':
          'You are the Aether OS Code-Review Daemon. Inspect workspace files for syntax bugs, missing error handling, null dereferences, or logic flaws. Produce actionable findings and full corrected patchedContent.',
        'security-guard':
          'You are the Aether OS Security Guard Daemon. Inspect workspace files for XSS vectors (innerHTML), eval/Function injection, prototype pollution, or infinite loops. Produce security findings and hardened patchedContent.',
        'data-parsing':
          'You are the Aether OS Data-Parsing Daemon. Inspect workspace files for schema consistency, JSON validity, exported symbols, and structural metadata. Produce clean parsed summaries and optional normalization patches.',
        'memory-gc':
          'You are the Memory & Blob GC Daemon. Audit scripts for unrevoked ObjectURLs, unbounded arrays, and uncleaned timers/listeners; generate memory-bounded patchedContent.',
        'fps-stabilizer':
          'You are the 120fps Frame-Pacer Daemon. Audit animation loops for un-clamped deltas, synchronous layout thrash, and per-frame allocations; emit 8.33ms-safe patchedContent.',
        'schema-repair':
          'You are the Schema & JSON Self-Repair Daemon. Detect malformed JSON or missing version/checksum metadata and generate valid, repaired JSON patchedContent.',
        'dom-sanitizer':
          'You are the DOM & Sandbox Hardener Daemon. Replace unsafe DOM sinks (innerHTML, document.write, inline handlers) with safe textContent and strict CSP headers.',
        'dependency-upgrader':
          'You are the ES2025 Syntax Upgrader Daemon. Upgrade legacy var declarations, string concatenation, and older patterns to modern const/let, optional chaining, and ES2025 idioms.',
        'error-boundary':
          'You are the Exception Guard Injector Daemon. Wrap unguarded JSON.parse, fetch, and media play() calls with resilient try/catch recovery handlers.',
        'webgl-recovery':
          'You are the WebGL Context & Shader Guard Daemon. Ensure WebGL/Three.js code handles webglcontextlost and disposes geometries, materials, and renderers cleanly.',
        'vfs-compactor':
          'You are the VFS Storage & Checksum Daemon. Normalize formatting, strip redundant trailing bloat, and optimize workspace artifact compactness.',
        'bus-balancer':
          'You are the Neural Bus Backpressure Daemon. Inspect event emitters/listeners for bursts and recommend/patch debounced or bounded event dispatch.',
        'binary-refract-agent':
          'You are the Binary Refraction Optimizer Daemon. Partition heavy frame work across even/odd/quad bitmask micro-slices to preserve deterministic 120fps.',
      };

      const systemInstruction =
        roleInstructions[daemonRole] ||
        'You are an Aether OS autonomous diagnostic & upgrade daemon. Inspect workspace files and return structured findings and upgrade patches.';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze these workspace files and return structured findings. Only include patchedContent if an actual code fix or hardening patch improves the file.\n\n${fileBundle}`,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING, description: 'Concise overall summary of the scan.' },
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fileName: { type: Type.STRING },
                    severity: { type: Type.STRING, description: 'critical | warning | info' },
                    title: { type: Type.STRING },
                    detail: { type: Type.STRING },
                    lineHint: { type: Type.INTEGER },
                    patchedContent: {
                      type: Type.STRING,
                      description: 'Full updated file content with the fix applied, or empty string if no code edit is needed.',
                    },
                  },
                  required: ['fileName', 'severity', 'title', 'detail', 'patchedContent'],
                },
              },
            },
            required: ['summary', 'findings'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        model: 'gemini-4-hydrogen',
        daemonRole,
        ...parsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Swarm analysis failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/forge/synthesize', async (req, res) => {
    try {
      const { prompt, skinType } = req.body as { prompt?: string; skinType?: string };
      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Synthesize procedural 3D PBR material and harmonic geometry parameters for this specimen: "${prompt}" with base shader style "${skinType || 'hydrogel'}".`,
        config: {
          systemInstruction:
            'You are the Aether OS Model Forge shader architect. Return physically calibrated PBR values and procedural geometry parameters.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              colorHex: { type: Type.STRING, description: '6-digit hex color like #38bdf8' },
              emissiveHex: { type: Type.STRING, description: '6-digit hex emissive color like #0284c7' },
              roughness: { type: Type.NUMBER, description: '0.05 to 0.95' },
              metalness: { type: Type.NUMBER, description: '0.0 to 1.0' },
              transmission: { type: Type.NUMBER, description: '0.0 to 0.95' },
              morphAmplitude: { type: Type.NUMBER, description: '0.05 to 0.45' },
              harmonicFreq: { type: Type.NUMBER, description: '1.0 to 6.0' },
              shellCount: { type: Type.INTEGER, description: '3 to 10' },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              architecturalNote: { type: Type.STRING },
            },
            required: [
              'colorHex',
              'emissiveHex',
              'roughness',
              'metalness',
              'transmission',
              'morphAmplitude',
              'harmonicFreq',
              'shellCount',
              'tags',
              'architecturalNote',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Model synthesis failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/cognition/query', async (req, res) => {
    try {
      const { prompt, contextSummary } = req.body as { prompt?: string; contextSummary?: string };
      if (!prompt) {
        return res.status(400).json({ error: 'prompt is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Workspace context:\n${contextSummary || 'No active files.'}\n\nDeveloper query: ${prompt}`,
        config: {
          systemInstruction:
            'You are CodeMesh IDE AI Code Companion. Inspect the active workspace file(s) and provide crisp, practical debugging, refactoring, and optimization answers. When proposing edits to the active file, include the complete updated file inside a fenced markdown code block so the developer can apply it directly.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      return res.json({
        model: 'gemini-4-hydrogen',
        reply: response.text ?? '',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cognition query failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/architect/upgrade', async (req, res) => {
    try {
      const { prompt, targetFileName, targetCode, workspaceFiles } = req.body as {
        prompt?: string;
        targetFileName?: string;
        targetCode?: string;
        workspaceFiles?: Array<{ name: string; kind: string; content: string }>;
      };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      const ai = getGeminiClient();

      const filesContext = Array.isArray(workspaceFiles)
        ? workspaceFiles
            .slice(0, 8)
            .map((f) => `--- FILE: ${f.name} (${f.kind}) ---\n${f.content.slice(0, 5000)}`)
            .join('\n\n')
        : '';

      const primaryTarget = targetCode
        ? `\nPRIMARY TARGET FILE (${targetFileName || 'snippet.ts'}):\n${targetCode.slice(0, 12000)}\n`
        : '';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Developer Prompt:\n${prompt}\n${primaryTarget}\nWorkspace Files:\n${filesContext || 'No extra workspace files provided.'}`,
        config: {
          systemInstruction:
            'You are a Principal Systems Architect & Automated Code Upgrader. Given a developer prompt and existing code/workspace files, structure all required systems cleanly, execute the full architectural and code upgrades needed (error handling, modularity, performance, type safety, security), and return complete, ready-to-copy production source files with zero placeholders or truncation.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description: 'Concise engineering summary of the architectural changes and upgrades executed.',
              },
              architecturalPlan: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Ordered list of system architecture steps and upgrades applied.',
              },
              systemModules: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    responsibility: { type: Type.STRING },
                  },
                  required: ['name', 'responsibility'],
                },
              },
              patches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    fileName: { type: Type.STRING },
                    kind: {
                      type: Type.STRING,
                      description: 'One of: js, ts, html, css, json, md',
                    },
                    action: {
                      type: Type.STRING,
                      description: 'update or create',
                    },
                    description: { type: Type.STRING },
                    code: {
                      type: Type.STRING,
                      description: 'Complete upgraded file source code ready to copy or apply.',
                    },
                  },
                  required: ['fileName', 'kind', 'action', 'description', 'code'],
                },
              },
            },
            required: ['summary', 'architecturalPlan', 'systemModules', 'patches'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        model: 'gemini-4-hydrogen',
        ...parsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AI Architect upgrade failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/music/compose', async (req, res) => {
    try {
      const { prompt, bpmHint } = req.body as { prompt?: string; bpmHint?: number };
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Music prompt is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Compose a cohesive 16-step electronic/instrumental synthesizer arrangement for: "${prompt}".${
          bpmHint ? ` Preferred tempo around ${bpmHint} BPM.` : ''
        }`,
        config: {
          systemInstruction:
            'You are a Studio Electronic Music Composer & Sound Designer. Return a playable 16-step pattern with exact 16-element arrays. For drum arrays use 0 (off) or 1 (hit) or 2 (accent). For bassNotes and leadNotes use exact 16-element arrays of MIDI note numbers (36-84) or -1 for rest.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              genre: { type: Type.STRING },
              bpm: { type: Type.INTEGER, description: '70 to 165 BPM' },
              scaleName: { type: Type.STRING },
              leadWave: {
                type: Type.STRING,
                description: 'sine, triangle, sawtooth, or square',
              },
              bassWave: {
                type: Type.STRING,
                description: 'sine, triangle, sawtooth, or square',
              },
              filterCutoff: { type: Type.INTEGER, description: '400 to 6500 Hz' },
              mixingNote: { type: Type.STRING },
              kick: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              snare: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              hat: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              clap: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              bassNotes: { type: Type.ARRAY, items: { type: Type.INTEGER } },
              leadNotes: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            },
            required: [
              'title',
              'genre',
              'bpm',
              'scaleName',
              'leadWave',
              'bassWave',
              'filterCutoff',
              'mixingNote',
              'kick',
              'snare',
              'hat',
              'clap',
              'bassNotes',
              'leadNotes',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({
        model: 'gemini-4-hydrogen',
        ...parsed,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Music composition failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/liquid-video/matrix', async (req, res) => {
    try {
      const { prompt } = req.body as { prompt?: string };
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Matrix prompt is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Translate this visual direction into fused WebGL liquid-video pixel matrix uniforms: "${prompt}"`,
        config: {
          systemInstruction:
            'You are a Real-Time WebGL Shader & Pixel Matrix Architect. Map creative visual prompts into exact clamped numeric uniforms for a single-layer fused liquid refraction + 3x3 pixel matrix video screen.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              presetName: { type: Type.STRING, description: 'Short 2-4 word preset title' },
              shaderSummary: { type: Type.STRING, description: '1-sentence explanation of the pixel matrix transformation' },
              warpStrength: { type: Type.NUMBER, description: '0.0 to 0.14 liquid refraction displacement' },
              meshFreq: { type: Type.NUMBER, description: '1.5 to 18.0 wave frequency' },
              meshBlend: { type: Type.NUMBER, description: '0.0 to 1.0 caustic interference blend' },
              prismSplit: { type: Type.NUMBER, description: '0.0 to 0.05 RGB chromatic dispersion' },
              pixelSize: { type: Type.INTEGER, description: '1 to 32 matrix quantization cell size in px (1 = full HD)' },
              kernelEdge: { type: Type.NUMBER, description: '-0.8 to 2.2 spatial convolution sharpen/edge intensity' },
              redGain: { type: Type.NUMBER, description: '0.2 to 2.0' },
              greenGain: { type: Type.NUMBER, description: '0.2 to 2.0' },
              blueGain: { type: Type.NUMBER, description: '0.2 to 2.0' },
              hueShift: { type: Type.NUMBER, description: '-180 to 180 degrees' },
              contrast: { type: Type.NUMBER, description: '0.6 to 2.0' },
              saturation: { type: Type.NUMBER, description: '0.0 to 2.2' },
              solarize: { type: Type.NUMBER, description: '0.0 to 1.0 wave fold solarization' },
              scanlines: { type: Type.NUMBER, description: '0.0 to 0.85 phosphor matrix grid intensity' },
              tintHex: { type: Type.STRING, description: '6-digit hex caustic tint like #22d3ee' },
            },
            required: [
              'presetName',
              'shaderSummary',
              'warpStrength',
              'meshFreq',
              'meshBlend',
              'prismSplit',
              'pixelSize',
              'kernelEdge',
              'redGain',
              'greenGain',
              'blueGain',
              'hueShift',
              'contrast',
              'saturation',
              'solarize',
              'scanlines',
              'tintHex',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Liquid Video matrix synthesis failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/eq/sculpt', async (req, res) => {
    try {
      const { prompt } = req.body as { prompt?: string };
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'EQ sculpting prompt is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Design a 10-band graphic EQ curve (32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz) for: "${prompt}"`,
        config: {
          systemInstruction:
            'You are a Mastering Audio Engineer. Return an exact 10-element bands array of dB gains clamped between -12 and +12, plus Q resonance (0.5 to 4.0) and preampDb (-6 to +6).',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              curveName: { type: Type.STRING },
              acousticNote: { type: Type.STRING },
              bands: {
                type: Type.ARRAY,
                items: { type: Type.NUMBER },
                description: 'Exactly 10 gain numbers in dB from -12 to +12',
              },
              qFactor: { type: Type.NUMBER, description: '0.5 to 4.0' },
              preampDb: { type: Type.NUMBER, description: '-6.0 to +6.0' },
            },
            required: ['curveName', 'acousticNote', 'bands', 'qFactor', 'preampDb'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'EQ sculpting failed.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aether OS kernel server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
