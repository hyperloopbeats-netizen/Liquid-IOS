import express from 'express';
import http from 'http';
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
  const httpServer = http.createServer(app);
  app.use(express.json({ limit: '8mb' }));

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
        'style-curator':
          'You are the Style & Palette Curator Daemon. Harmonize game visual contrast, dark-glass UI tokens, and Synesthesia palettes.',
        'logic-weaver':
          'You are the Game Logic Weaver Daemon. Audit game state machines, score progression, and win/loss restarts.',
        'physics-tuner':
          'You are the Physics Integrator Daemon. Verify delta-time clamping and stable 2D/3D gravity/restitution physics.',
        'sprite-optimizer':
          'You are the Sprite & Atlas Optimizer Daemon. Audit procedural/uploaded sprites and optimize canvas rendering.',
        'narrator-scribe':
          'You are the Auto-Narration Scribe Daemon. Enrich game scripts with vivid prologue, wave cues, and victory voice lines.',
        'json-indexer':
          'You are the JSON Research & Indexer Daemon. Validate JSON Library manifests, tags, and cross-references.',
        'asset-linker':
          'You are the Cross-App Asset Linker Daemon. Verify AetherOS bridge calls and shared sprite/audio wiring across apps.',
        'performance-watchdog':
          'You are the 60/120fps Loop Watchdog Daemon. Check requestAnimationFrame loops for bounded entity pools.',
        'safety-sanitizer':
          'You are the Game Sandbox Sanitizer Daemon. Ensure HTML5 widgets avoid unsafe sinks and respect sandbox boundaries.',
        'knowledge-synthesizer':
          'You are the Knowledge Side-Linker Daemon. Connect JSON Vault research notes to active workspace code.',
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

  app.post('/api/matrix/quick', async (req, res) => {
    try {
      const { prompt, contextSummary } = req.body as {
        prompt?: string;
        contextSummary?: string;
      };
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required.' });
      }

      const ai = getGeminiClient();
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = await ai.models.generateContentStream({
        model: 'gemini-4-hydrogen',
        contents: contextSummary
          ? `Workspace Context:\n${contextSummary.slice(0, 3500)}\n\nQuestion:\n${prompt}`
          : prompt,
        config: {
          systemInstruction:
            'You are the CodeMesh Quick Response Kernel. Give sharp, ultra-fast, directly actionable engineering answers in under 180 words with clean code or steps when useful.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      for await (const chunk of stream) {
        if (chunk.text) {
          res.write(`data: ${JSON.stringify({ text: chunk.text })}\n\n`);
        }
      }
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      return res.end();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Quick response failed.';
      if (!res.headersSent) {
        return res.status(500).json({ error: message });
      }
      res.write(`data: ${JSON.stringify({ error: message })}\n\n`);
      return res.end();
    }
  });

  app.post('/api/matrix/branch', async (req, res) => {
    try {
      const { rootTopic, parentTitle, parentInsight, depth, contextSummary } = req.body as {
        rootTopic?: string;
        parentTitle?: string;
        parentInsight?: string;
        depth?: number;
        contextSummary?: string;
      };

      if (!rootTopic || !rootTopic.trim()) {
        return res.status(400).json({ error: 'rootTopic is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Root Objective: ${rootTopic}\nCurrent Node (Depth ${depth ?? 0}): ${parentTitle || rootTopic}\nCurrent Insight: ${parentInsight || 'Initial root spark'}\n${
          contextSummary ? `\nWorkspace Context:\n${contextSummary.slice(0, 3000)}` : ''
        }\nGenerate 3 deeper orthogonal child thinking branches so this matrix can expand endlessly.`,
        config: {
          systemInstruction:
            'You are the Infinite Thinking Matrix Recursive Engine. Expand a thought node into exactly 3 distinct, non-repetitive orthogonal child branches covering Systems Architecture, Adversarial Edge-Cases, and Executable Synthesis.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              branches: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    axis: {
                      type: Type.STRING,
                      description: 'First Principles | Architecture | Edge Cases | Synthesis',
                    },
                    title: { type: Type.STRING, description: 'Short 3-6 word branch title' },
                    insight: { type: Type.STRING, description: 'Dense, concrete 2-3 sentence reasoning insight' },
                    nextPrompt: { type: Type.STRING, description: 'Follow-up seed question to deepen this branch next' },
                    codeSnippet: { type: Type.STRING, description: 'Optional small HTML5/JS/TS snippet or command if applicable, else empty string' },
                    score: { type: Type.INTEGER, description: 'Leverage score 1 to 100' },
                  },
                  required: ['axis', 'title', 'insight', 'nextPrompt', 'codeSnippet', 'score'],
                },
              },
            },
            required: ['branches'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Infinite Thinking Matrix expansion failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/printer/improve', async (req, res) => {
    try {
      const { name, html, version, availableApps } = req.body as {
        name?: string;
        html?: string;
        version?: number;
        availableApps?: string[];
      };

      if (!html || !html.trim()) {
        return res.status(400).json({ error: 'HTML5 code is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `App Name: ${name || 'Printed App'} (Current Version: v${version ?? 1})\nAvailable OS Apps to link with: ${(availableApps || []).join(', ')}\n\nExisting HTML5 Source:\n${html.slice(0, 14000)}`,
        config: {
          systemInstruction:
            'You are the Aether OS HTML5 App Auto-Improver. Upgrade the provided HTML5 app into a refined, responsive, visually crisp single-file HTML5 app. Preserve its core purpose while adding: (1) modern dark-glass polish and smooth micro-interactions, (2) rock-solid error handling & responsive layout, and (3) seamless live integration with window.AetherOS SDK (window.AetherOS.publish(type, summary, payload), window.AetherOS.subscribe(fn), window.AetherOS.openApp(appId), window.AetherOS.getState() returning { bass, mid, treble, rms, activeHue, fps, kernelHealth, openApps, recentEvents }, window.AetherOS.saveVfs(name, content)). Always guard window.AetherOS calls safely with optional checks.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              improvedHtml: {
                type: Type.STRING,
                description: 'Complete self-contained <!doctype html> HTML5 document with all upgrades integrated.',
              },
              summary: {
                type: Type.STRING,
                description: '1-sentence summary of the upgrade.',
              },
              changelog: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '3-5 concise bullet improvements implemented.',
              },
            },
            required: ['improvedHtml', 'summary', 'changelog'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'HTML5 App auto-improvement failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/gameforge/generate', async (req, res) => {
    try {
      const { prompt, autoNarrate, images, sprites, physics, libraryHints } = req.body as {
        prompt?: string;
        autoNarrate?: boolean;
        images?: Array<{ mimeType: string; base64Data: string; name?: string }>;
        sprites?: Array<{ name: string; role: string; dataUrl?: string; palette?: string[] }>;
        physics?: {
          name?: string;
          gravity?: number;
          friction?: number;
          restitution?: number;
          maxSpeed?: number;
          collisionShape?: string;
        };
        libraryHints?: string[];
      };

      const ai = getGeminiClient();

      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
      if (Array.isArray(images)) {
        for (const img of images.slice(0, 3)) {
          if (img.base64Data && img.mimeType) {
            parts.push({
              inlineData: {
                mimeType: img.mimeType,
                data: img.base64Data.replace(/^data:[^;]+;base64,/, ''),
              },
            });
          }
        }
      }

      const spriteSummary = Array.isArray(sprites) && sprites.length > 0
        ? sprites.map((s) => `- ${s.name} (${s.role}, palette: ${(s.palette || []).join('/')})`).join('\n')
        : 'None pre-drawn; synthesize crisp procedural vector/pixel canvas sprites.';

      const physicsSummary = physics
        ? `Physics Preset "${physics.name}": gravity=${physics.gravity}, friction=${physics.friction}, restitution=${physics.restitution}, maxSpeed=${physics.maxSpeed}, shape=${physics.collisionShape}`
        : 'Use tuned arcade 2D physics with gravity/bounce or top-down inertia.';

      const userDirection =
        prompt && prompt.trim()
          ? `User Prompt: "${prompt.trim()}"`
          : 'Auto-Invent & Self-Narrate an exciting original HTML5 arcade/physics game from scratch based on the uploaded images (if any), active sprites, and physics rig!';

      parts.push({
        text: `${userDirection}
Auto-Narrate Voice/Subtitles: ${autoNarrate !== false ? 'ENABLED' : 'OPTIONAL'}
Shared Sprites Available:
${spriteSummary}
${physicsSummary}
JSON Research Library Hints: ${(libraryHints || []).slice(0, 6).join(' | ') || 'None'}

Build a COMPLETE, immediately playable, self-contained HTML5 Canvas game (\`<!doctype html>\`). Include:
1. Distinct visual style, glowing background, particle FX, and animated procedural/sprite rendering on \`<canvas>\`.
2. Responsive keyboard (Arrows / WASD / Space) + mouse/touch controls so it works smoothly on both desktop and mobile!
3. Real clamped delta-time physics matching the physics config.
4. Self-narration banner + \`window.speechSynthesis\` voice trigger (with safe guard and mute toggle) speaking key events.
5. Score, health/lives, Game Over + Restart button, AND safe optional hooks to \`if (window.AetherOS) { window.AetherOS.publish(...); }\`.`,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: { parts },
        config: {
          systemInstruction:
            'You are the Gemini 1-Button Game Forge Engine. Return a complete playable HTML5 game alongside rich structured JSON specs (style, physics, logic, sprites, narration cues, and JSON research notes) cleanly.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              genre: { type: Type.STRING },
              styleSpec: {
                type: Type.OBJECT,
                properties: {
                  artStyle: { type: Type.STRING },
                  atmosphere: { type: Type.STRING },
                  palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ['artStyle', 'atmosphere', 'palette'],
              },
              physicsSpec: {
                type: Type.OBJECT,
                properties: {
                  gravity: { type: Type.NUMBER },
                  friction: { type: Type.NUMBER },
                  restitution: { type: Type.NUMBER },
                  rulesSummary: { type: Type.STRING },
                },
                required: ['gravity', 'friction', 'restitution', 'rulesSummary'],
              },
              logicSpec: {
                type: Type.OBJECT,
                properties: {
                  objective: { type: Type.STRING },
                  controls: { type: Type.STRING },
                  winCondition: { type: Type.STRING },
                  loseCondition: { type: Type.STRING },
                },
                required: ['objective', 'controls', 'winCondition', 'loseCondition'],
              },
              spritesSpec: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    role: { type: Type.STRING },
                    visualDesign: { type: Type.STRING },
                  },
                  required: ['name', 'role', 'visualDesign'],
                },
              },
              narration: {
                type: Type.OBJECT,
                properties: {
                  voiceTone: { type: Type.STRING },
                  prologue: { type: Type.STRING },
                  waveCue: { type: Type.STRING },
                  victoryLine: { type: Type.STRING },
                  defeatLine: { type: Type.STRING },
                },
                required: ['voiceTone', 'prologue', 'waveCue', 'victoryLine', 'defeatLine'],
              },
              researchTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              sideNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
              html5Game: {
                type: Type.STRING,
                description: 'Complete playable self-contained <!doctype html> Canvas game.',
              },
            },
            required: [
              'title',
              'genre',
              'styleSpec',
              'physicsSpec',
              'logicSpec',
              'spritesSpec',
              'narration',
              'researchTags',
              'sideNotes',
              'html5Game',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : '1-Button Game Forge failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/vault/research', async (req, res) => {
    try {
      const { topic, entryJson, existingTitles } = req.body as {
        topic?: string;
        entryJson?: string;
        existingTitles?: string[];
      };
      if (!topic || !topic.trim()) {
        return res.status(400).json({ error: 'Research topic is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Research Topic: ${topic}\nExisting JSON Record:\n${(entryJson || '{}').slice(0, 5000)}\nExisting Library Entries to cross-link: ${(existingTitles || []).slice(0, 15).join(', ')}`,
        config: {
          systemInstruction:
            'You are the JSON Research Vault & Side-Data Architect. Conduct structured research, produce clean JSON knowledge data, attach concise side notes, and suggest links to existing library entries and OS apps.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              summary: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              sideNotes: { type: Type.ARRAY, items: { type: Type.STRING } },
              enrichedDataJson: {
                type: Type.STRING,
                description: 'Valid JSON object string holding researched structured metrics, mechanics, or design data.',
              },
              suggestedLinks: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['title', 'summary', 'tags', 'sideNotes', 'enrichedDataJson', 'suggestedLinks'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'JSON Vault research failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/masterbrain/sort', async (req, res) => {
    try {
      const { directive, snapshot } = req.body as {
        directive?: string;
        snapshot?: Record<string, unknown>;
      };

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Directive: ${directive || 'Sort everything out cleanly across apps, daemons, and JSON library.'}\n\nOS Live Snapshot:\n${JSON.stringify(snapshot || {}).slice(0, 8000)}`,
        config: {
          systemInstruction:
            'You are the Master Brain Orchestrator of CodeMesh / Aether OS. Analyze all workspace files, JSON library records, printed HTML5 apps, organic folders, and the 10 sorting daemons. Produce a cohesive sorting plan that computes a system coherence score, dispatches the most relevant sorter daemon roles, organizes folders cleanly, and maps cross-app connections.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              coherenceScore: { type: Type.INTEGER, description: '75 to 100' },
              summary: { type: Type.STRING },
              dispatchedDaemons: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Subset of sorter daemon role IDs such as style-curator, logic-weaver, physics-tuner, sprite-optimizer, narrator-scribe, json-indexer, asset-linker, performance-watchdog, safety-sanitizer, knowledge-synthesizer',
              },
              folderActions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    folderName: { type: Type.STRING },
                    appIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    reason: { type: Type.STRING },
                  },
                  required: ['folderName', 'appIds', 'reason'],
                },
              },
              crossAppLinks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sourceApp: { type: Type.STRING },
                    targetApp: { type: Type.STRING },
                    payloadSummary: { type: Type.STRING },
                  },
                  required: ['sourceApp', 'targetApp', 'payloadSummary'],
                },
              },
              researchRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'coherenceScore',
              'summary',
              'dispatchedDaemons',
              'folderActions',
              'crossAppLinks',
              'researchRecommendations',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Master Brain sort failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/hyperface/design-object', async (req, res) => {
    try {
      const { prompt, previousTitle } = req.body as {
        prompt?: string;
        previousTitle?: string;
      };
      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Object design prompt is required.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Previous Stage: ${previousTitle || 'HyperFace AI Studio v12.0'}\nUser Object Design Directive (Clear Phase & Build New Object): "${prompt.trim()}"`,
        config: {
          systemInstruction:
            'You are the HyperFace AI Object Designer. Clear the previous face/phase completely and synthesize a sleek, interactive single-file HTML5 + Three.js (using importmap for https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js and OrbitControls) 3D studio scene showcasing the exact custom object requested by the user. Include: (1) rich compound 3D geometry/shaders/materials and ambient/directional/rim lighting for the requested object, (2) interactive controls (rotation speed, morph/explode slider, lighting hue, wireframe toggle, and Reset View), (3) smooth OrbitControls, preserveDrawingBuffer:true, and dark-glass studio styling matching HyperFace v12.0, and (4) optional safe window.AetherOS hooks.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Short 2-4 word object title.' },
              summary: { type: Type.STRING, description: '1-sentence summary of the 3D object design.' },
              designTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              html: {
                type: Type.STRING,
                description: 'Complete self-contained <!doctype html> Three.js 3D Object Studio page.',
              },
            },
            required: ['title', 'summary', 'designTags', 'html'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'HyperFace Object Designer failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/smartbrain/generate-items', async (req, res) => {
    try {
      const { mode, prompt, targetGame, existingItems, gameContext } = req.body as {
        mode?: string;
        prompt?: string;
        targetGame?: string;
        existingItems?: string[];
        gameContext?: string[];
      };

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Generation Mode: ${mode || 'user-prompt'}
Target Game: ${targetGame || 'All Aether Games'}
Directive / Content Issue / Blank to Fill: ${prompt || 'Auto-fill missing game upgrade and item blanks.'}
Existing Items (avoid duplicates): ${(existingItems || []).join(', ') || 'None'}
Active Game Context:\n${(gameContext || []).join('\n') || 'HTML5 Canvas Arcade & Action Games'}`,
        config: {
          systemInstruction:
            'You are the Smart Brain Autonomous Game Item Generator. Generate 2 distinct, deeply useful game items/modules that either resolve the user-prompted upgrade/content issue OR automatically fill missing gameplay blanks (weapons, powerups, upgrades, enemies, obstacles, NPCs, relics, fx-modules). Provide balanced stats, clear upgrade rationale, spawn rules, vibrant hex iconColor, and clean drop-in JavaScript codeSnippet.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    category: {
                      type: Type.STRING,
                      enum: ['weapon', 'powerup', 'upgrade', 'enemy', 'obstacle', 'npc', 'relic', 'fx-module'],
                    },
                    rarity: {
                      type: Type.STRING,
                      enum: ['common', 'rare', 'epic', 'sovereign'],
                    },
                    targetGame: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    upgradeReason: { type: Type.STRING },
                    stats: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          label: { type: Type.STRING },
                          value: { type: Type.STRING },
                        },
                        required: ['label', 'value'],
                      },
                    },
                    spawnRule: { type: Type.STRING },
                    iconColor: { type: Type.STRING },
                    codeSnippet: { type: Type.STRING },
                  },
                  required: [
                    'name',
                    'category',
                    'rarity',
                    'targetGame',
                    'summary',
                    'upgradeReason',
                    'stats',
                    'spawnRule',
                    'iconColor',
                    'codeSnippet',
                  ],
                },
              },
            },
            required: ['items'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Smart Brain item generation failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/unificator/integrate', async (req, res) => {
    try {
      const { codeSnippet, targetName, targetKind, targetSource, userDirective, activeDaemons } = req.body as {
        codeSnippet?: string;
        targetName?: string;
        targetKind?: string;
        targetSource?: string;
        userDirective?: string;
        activeDaemons?: string[];
      };

      if (!codeSnippet || !codeSnippet.trim()) {
        return res.status(400).json({ error: 'Source code snippet is required for synthetic integration.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Target Game / Engine: ${targetName || 'Auto-Detect Game'} (${targetKind || 'html5-game'})
User Note: ${userDirective || 'Figure out everything needed and synthetically integrate this code cleanly into the game.'}
Supporting Daemons Online: ${(activeDaemons || []).join(', ')}

--- SOURCE CODE TO INTEGRATE ---
${codeSnippet.slice(0, 8000)}

--- TARGET GAME CURRENT SOURCE ---
${(targetSource || '').slice(0, 12000)}`,
        config: {
          systemInstruction:
            'You are the Synthetic Code-to-Game Unificator linked to Master Brain and 20 Support Daemons. Analyze the incoming code snippet AND the target game source. Automatically figure out every missing binding, variable, frame loop tick hook, HUD display, event listener, collision check, or audio trigger needed so the new code integrates synthetically without errors. Return: (1) integrationTitle, (2) detectedRequirements (array of specific missing hooks/deps/bindings you inferred & bridged), (3) synthesisSummary, (4) bridgeCode (a clean standalone JS runtime function body accepting (ctx, state, dt, api) or window hook that also works inside Kinetic 2D / Voxel 3D engines), (5) unifiedHtml5Game (the COMPLETE valid self-contained <!doctype html> runnable game HTML5 with the code integrated and tested cleanly), and (6) supportDaemonsUsed (list of supporting daemon role names).',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              integrationTitle: { type: Type.STRING },
              detectedRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
              synthesisSummary: { type: Type.STRING },
              bridgeCode: {
                type: Type.STRING,
                description: 'Self-contained JS plugin hook that integrates cleanly into live 2D/3D engines.',
              },
              unifiedHtml5Game: {
                type: Type.STRING,
                description: 'Complete playable <!doctype html> game with the new code synthetically integrated.',
              },
              supportDaemonsUsed: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: [
              'integrationTitle',
              'detectedRequirements',
              'synthesisSummary',
              'bridgeCode',
              'unifiedHtml5Game',
              'supportDaemonsUsed',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Synthetic game unification failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/unificator/mesh-bundle', async (req, res) => {
    try {
      const { goal, assetsSummary, codeSnippet } = req.body as {
        goal?: string;
        assetsSummary?: string;
        codeSnippet?: string;
      };

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Unification Goal: ${goal || 'Fuse Kinetic 2D Engine, Voxel 3D Engine, Smart Brain Items, Sprites, and Physics into a unified playable experience.'}
OS Assets & Engines Summary:
${(assetsSummary || '').slice(0, 6000)}
Custom Code Module:
${(codeSnippet || '// auto-generated cross-engine adapter').slice(0, 4000)}`,
        config: {
          systemInstruction:
            'You are the Cross-Engine Mesh & Brain Unificator. Synthesize a cohesive multi-engine fusion adapter plus a complete, playable hybrid HTML5 + Canvas/WebGL experience that connects Sprite Lab badges, Smart Brain items, physics presets, and AetherOS bus events.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              bundleTitle: { type: Type.STRING },
              synthesisSummary: { type: Type.STRING },
              detectedRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
              bridgeCode: { type: Type.STRING },
              unifiedHtml5Game: { type: Type.STRING },
            },
            required: [
              'bundleTitle',
              'synthesisSummary',
              'detectedRequirements',
              'bridgeCode',
              'unifiedHtml5Game',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Cross-engine mesh unification failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/companion/build-environment', async (req, res) => {
    try {
      const { mode, userPrompt, selectedApps, vfsSummary, storageSummary } = req.body as {
        mode?: 'synthesize-prompt' | 'build-environment';
        userPrompt?: string;
        selectedApps?: Array<{ id: string; name: string; role?: string }>;
        vfsSummary?: string;
        storageSummary?: string;
      };

      if (!userPrompt || !userPrompt.trim()) {
        return res.status(400).json({ error: 'Prompt is required for synthesis.' });
      }

      const ai = getGeminiClient();
      const chosenList =
        Array.isArray(selectedApps) && selectedApps.length > 0
          ? selectedApps.map((a) => `- ${a.id} (${a.name})`).join('\n')
          : '- hyperface (HyperFace 3D Stage)\n- kineticengine (Kinetic 2D Physics)\n- voxelengine (Voxel 3D Arena)\n- smartbrain (Smart Brain Item Forge)\n- codeunifier (Synthetic Code Unificator)';

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Mode: ${mode || 'build-environment'}
User Goal / Seed Prompt:
"${userPrompt.trim()}"

Participating Aether OS Apps to Coordinate:
${chosenList}

Current Storage & Workspace Context:
${(storageSummary || 'IndexedDB VFS + LocalStorage active').slice(0, 1500)}
${(vfsSummary || '').slice(0, 3000)}`,
        config: {
          systemInstruction:
            'You are the Aether OS Smart AI Companion & Multi-App Environment Architect. Given a user seed prompt and selected OS apps, synthesize: (1) an enhanced, structured engineering prompt (`synthesizedPrompt`) that expands user intent cleanly across geometry, simulation mechanics, audio-visual coupling, and storage artifacts; (2) an `architectureSummary`; (3) `orchestratedApps` mapping how each selected app participates; (4) `vfsFiles` (1 to 3 clean VFS modules saved to `/workspace/environments/...`); (5) `hookCode` (a compact safe JS runtime snippet compatible with Kinetic 2D / Voxel 3D engines); and (6) if mode is `build-environment`, a complete, interactive, self-contained single-file HTML5 environment (`environmentHtml5`, starting with `<!doctype html>`) using Canvas/WebGL/Three.js (via jsdelivr importmap if 3D) with responsive mouse/touch/keyboard controls, real simulation parameters, HUD controls, and guarded `if (window.AetherOS)` bus/state hooks.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              environmentName: { type: Type.STRING, description: 'Concise 2-5 word title of the environment.' },
              synthesizedPrompt: {
                type: Type.STRING,
                description: 'Rich structured prompt ready to reuse across AI Architect, Game Forge, or HyperFace.',
              },
              architectureSummary: {
                type: Type.STRING,
                description: 'Concise 2-sentence explanation of how apps collaborate to power this environment.',
              },
              orchestratedApps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    appId: { type: Type.STRING },
                    appName: { type: Type.STRING },
                    roleInEnvironment: { type: Type.STRING },
                  },
                  required: ['appId', 'appName', 'roleInEnvironment'],
                },
              },
              vfsFiles: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    path: { type: Type.STRING },
                    content: { type: Type.STRING },
                  },
                  required: ['name', 'path', 'content'],
                },
              },
              hookCode: {
                type: Type.STRING,
                description: 'Drop-in Kinetic/Voxel JS runtime hook code.',
              },
              environmentHtml5: {
                type: Type.STRING,
                description: 'Complete interactive <!doctype html> environment runnable in full-size viewport (or empty string if synthesize-prompt only).',
              },
            },
            required: [
              'environmentName',
              'synthesizedPrompt',
              'architectureSummary',
              'orchestratedApps',
              'vfsFiles',
              'hookCode',
              'environmentHtml5',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Environment synthesis failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/aimspace/restructure', async (req, res) => {
    try {
      const { sourceLabel, sourceCode, directive, designers, daemonCount, context } = req.body as {
        sourceLabel?: string;
        sourceCode?: string;
        directive?: string;
        designers?: string[];
        daemonCount?: number;
        context?: Record<string, unknown>;
      };

      if (!directive && !sourceCode) {
        return res.status(400).json({ error: 'directive or sourceCode is required for AIM Space restructuring.' });
      }

      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Source App / Code to Restructure: ${sourceLabel || 'AIM Space Core Module'}
Active Synthetic Designers: ${(designers || ['codeunifier', 'meshunifier', 'hyperface', 'architect', 'gameforge']).join(', ')}
Mounted AIM Space Assist Daemons: ${daemonCount ?? 50}
Directive: ${directive || 'Restructure into a full playable AIM Space game linked to all OS systems.'}
Shared OS Context (Sprites / Physics / Smart Items):
${JSON.stringify(context || {}).slice(0, 3500)}

--- SOURCE INPUT ---
${(sourceCode || '// Existing AIM Space orbital mechanics').slice(0, 9000)}`,
        config: {
          systemInstruction:
            'You are the AIM Space Synthetic Designers & 50-Daemon Game Restructurer Engine. Take the input app/module/prompt and restructure it into a COMPLETE, polished, self-contained HTML5 full game (`restructuredFullGameHtml`, starting with `<!doctype html>`) with: (1) Title Menu -> Playing -> Pause -> Game Over + Play Again state machine, (2) 60fps Canvas gameplay (WASD/Arrows + Mouse/Touch + Space fire + Shift boost), (3) HUD Telemetry (Shield, Hull, Energy, Score, Wave), (4) WebAudio synthesized SFX with mute toggle, (5) window.AetherOS optional telemetry calls, and (6) `window.addEventListener("message", ev => { if (ev.data?.type === "CAPTURE_AIMSPACE_FRAME") window.parent.postMessage({ type: "AIMSPACE_FRAME_CAPTURED", dataUrl: document.querySelector("canvas").toDataURL("image/jpeg", 0.88) }, "*"); })` so live gameplay screenshots sync onto the OS desktop screen icon!',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              gameTitle: { type: Type.STRING },
              genre: { type: Type.STRING },
              restructuringSummary: { type: Type.STRING },
              syntheticDesignersApplied: { type: Type.ARRAY, items: { type: Type.STRING } },
              architecturePlan: { type: Type.ARRAY, items: { type: Type.STRING } },
              bridgeHookCode: { type: Type.STRING },
              smartItemDrop: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  category: {
                    type: Type.STRING,
                    enum: ['weapon', 'powerup', 'upgrade', 'enemy', 'obstacle', 'npc', 'relic', 'fx-module'],
                  },
                  rarity: {
                    type: Type.STRING,
                    enum: ['common', 'rare', 'epic', 'sovereign'],
                  },
                  summary: { type: Type.STRING },
                  spawnRule: { type: Type.STRING },
                  iconColor: { type: Type.STRING },
                  codeSnippet: { type: Type.STRING },
                },
                required: ['name', 'category', 'rarity', 'summary', 'spawnRule', 'iconColor', 'codeSnippet'],
              },
              restructuredFullGameHtml: {
                type: Type.STRING,
                description: 'Complete playable self-contained <!doctype html> Canvas game.',
              },
            },
            required: [
              'gameTitle',
              'genre',
              'restructuringSummary',
              'syntheticDesignersApplied',
              'architecturePlan',
              'bridgeHookCode',
              'smartItemDrop',
              'restructuredFullGameHtml',
            ],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      return res.json({ model: 'gemini-4-hydrogen', ...parsed });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'AIM Space restructuring failed.';
      return res.status(500).json({ error: message });
    }
  });

  async function generateBrainJson(
    ai: GoogleGenAI,
    contents: string,
    config: Parameters<GoogleGenAI['models']['generateContent']>[0]['config']
  ): Promise<{ model: string; data: Record<string, unknown> }> {
    try {
      const primary = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents,
        config,
      });
      return { model: 'gemini-4-hydrogen', data: JSON.parse((primary.text ?? '{}').trim()) };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/503|429|RESOURCE_EXHAUSTED|UNAVAILABLE|high demand/i.test(msg)) {
        const liteConfig = { ...config };
        delete liteConfig.thinkingConfig;
        const secondary = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: liteConfig,
        });
        return { model: 'gemini-3.1-flash-lite', data: JSON.parse((secondary.text ?? '{}').trim()) };
      }
      throw err;
    }
  }

  app.post('/api/brain/awareness-synthesis', async (req, res) => {
    try {
      const { directive, telemetry, drift, osContext } = req.body as {
        directive?: string;
        telemetry?: Record<string, unknown>;
        drift?: Record<string, unknown>;
        osContext?: Record<string, unknown>;
      };

      const ai = getGeminiClient();
      const result = await generateBrainJson(
        ai,
        `Directive: ${directive || 'Synthesize full closed-loop Awareness Matrix across Workstation, Home Fractal CSP, HelioCell Hellcat, and AIM Space Jet.'}
Current Live Telemetry (4 Suite Apps):
${JSON.stringify(telemetry || {}).slice(0, 3500)}
Current Drift State:
${JSON.stringify(drift || {}).slice(0, 1200)}
OS Context (Trilateral Matrix / Swarm Daemons / VFS):
${JSON.stringify(osContext || {}).slice(0, 1200)}`,
        {
          systemInstruction:
            'You are the AI Brain Full Awareness Matrix Synthesizer. Unify four real-time HTML5 simulation apps (aimworkstation, fractalcsp, heliocell, aimspacejet) into a single continuously self-updating awareness loop. For each of the 4 appIds (aimworkstation, fractalcsp, heliocell, aimspacejet), output a crisp directive and optional valid safe runtime cliCommand (e.g., for aimworkstation: "help" or "sdf torusknot" or "shader"; for fractalcsp: "M4" or "SCALE:100"; for heliocell: "M6" or "MOVIE:A"; for aimspacejet: "GEN:1" or "WARP:1"), plus a cohesive Drift profile and compact awareness-matrix-loop.js hook script.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              synthesisTitle: { type: Type.STRING },
              matrixCoherence: { type: Type.NUMBER },
              awarenessSummary: { type: Type.STRING },
              crossAppDirectives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    appId: {
                      type: Type.STRING,
                      enum: ['aimworkstation', 'fractalcsp', 'heliocell', 'aimspacejet'],
                    },
                    directive: { type: Type.STRING },
                    cliCommand: { type: Type.STRING },
                    loopRole: { type: Type.STRING },
                  },
                  required: ['appId', 'directive', 'cliCommand', 'loopRole'],
                },
              },
              driftProfile: {
                type: Type.OBJECT,
                properties: {
                  presetName: { type: Type.STRING },
                  intensity: { type: Type.NUMBER },
                  phaseVelocity: { type: Type.NUMBER },
                  colorShiftDeg: { type: Type.NUMBER },
                  autoCameraDrift: { type: Type.BOOLEAN },
                  thermalOscillation: { type: Type.BOOLEAN },
                },
                required: [
                  'presetName',
                  'intensity',
                  'phaseVelocity',
                  'colorShiftDeg',
                  'autoCameraDrift',
                  'thermalOscillation',
                ],
              },
              bridgePatchJs: { type: Type.STRING },
            },
            required: [
              'synthesisTitle',
              'matrixCoherence',
              'awarenessSummary',
              'crossAppDirectives',
              'driftProfile',
              'bridgePatchJs',
            ],
          },
        }
      );

      return res.json({ model: result.model, ...result.data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Awareness Matrix synthesis failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/brain/drift-generate', async (req, res) => {
    try {
      const { prompt, currentTelemetry } = req.body as {
        prompt?: string;
        currentTelemetry?: Record<string, unknown>;
      };

      const ai = getGeminiClient();
      const result = await generateBrainJson(
        ai,
        `Drift Mode Prompt: ${prompt || 'Harmonic cybernetic thermal & orbital drift across all engines.'}
Current 4-App Suite Telemetry:
${JSON.stringify(currentTelemetry || {}).slice(0, 3000)}`,
        {
          systemInstruction:
            'You are the Full Drift Mode Generator for Aether OS. Design a smooth, expressive continuous harmonic drift configuration calibrated for aimworkstation (WebGL2 & SDF), fractalcsp (solar irradiance & scale), heliocell (SoC dispatch & crimson 3D movie camera moves), and aimspacejet (3D planets & glass jet wake). Keep intensity within [0.25, 2.0], phaseVelocity within [0.2, 2.8], colorShiftDeg within [-160, 160].',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              presetName: { type: Type.STRING },
              intensity: { type: Type.NUMBER },
              phaseVelocity: { type: Type.NUMBER },
              colorShiftDeg: { type: Type.NUMBER },
              autoCameraDrift: { type: Type.BOOLEAN },
              thermalOscillation: { type: Type.BOOLEAN },
              synthesisNote: { type: Type.STRING },
              directives: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    appId: {
                      type: Type.STRING,
                      enum: ['aimworkstation', 'fractalcsp', 'heliocell', 'aimspacejet'],
                    },
                    directive: { type: Type.STRING },
                    cliCommand: { type: Type.STRING },
                  },
                  required: ['appId', 'directive', 'cliCommand'],
                },
              },
            },
            required: [
              'presetName',
              'intensity',
              'phaseVelocity',
              'colorShiftDeg',
              'autoCameraDrift',
              'thermalOscillation',
              'synthesisNote',
              'directives',
            ],
          },
        }
      );

      return res.json({ model: result.model, ...result.data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Drift Mode generation failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/playground/cluster-code', async (req, res) => {
    try {
      const { rawCode, sourceLabel, existingClusterNames } = req.body as {
        rawCode?: string;
        sourceLabel?: string;
        existingClusterNames?: string[];
      };

      if (!rawCode || !rawCode.trim()) {
        return res.status(400).json({ error: 'Code input is required to self-assemble library clusters.' });
      }

      const ai = getGeminiClient();
      const result = await generateBrainJson(
        ai,
        `Source Origin: ${sourceLabel || 'Live Playground Input'}
Existing Clusters: ${(existingClusterNames || []).join(', ') || 'None yet'}

--- INCOMING CODE TO CLUSTER ---
${rawCode.slice(0, 12000)}`,
        {
          systemInstruction:
            'You are the Aether OS Live Code Cluster Playground Architect. Analyze the incoming code and self-assemble it into 1 to 3 clean, cohesive reusable Library Clusters. For each cluster provide: name, domain (one of webgl-shader, audio-dsp, swarm-ai, physics-ballistics, cad-geometry, ui-chrome, hybrid-runtime), summary, colorHex, dependencies (array of cluster domain/names), moduleName, symbols (exported function/class names), extractedCode (clean ES/browser-compatible JS module), and previewHtml (a minimal runnable <!doctype html> Canvas/UI visual demo exercising the cluster cleanly with guarded if (window.AetherOS) hooks).',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assemblySummary: { type: Type.STRING },
              clusters: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    domain: {
                      type: Type.STRING,
                      enum: [
                        'webgl-shader',
                        'audio-dsp',
                        'swarm-ai',
                        'physics-ballistics',
                        'cad-geometry',
                        'ui-chrome',
                        'hybrid-runtime',
                      ],
                    },
                    summary: { type: Type.STRING },
                    colorHex: { type: Type.STRING },
                    dependencies: { type: Type.ARRAY, items: { type: Type.STRING } },
                    moduleName: { type: Type.STRING },
                    symbols: { type: Type.ARRAY, items: { type: Type.STRING } },
                    extractedCode: { type: Type.STRING },
                    previewHtml: { type: Type.STRING },
                  },
                  required: [
                    'name',
                    'domain',
                    'summary',
                    'colorHex',
                    'dependencies',
                    'moduleName',
                    'symbols',
                    'extractedCode',
                    'previewHtml',
                  ],
                },
              },
            },
            required: ['assemblySummary', 'clusters'],
          },
        }
      );

      return res.json({ model: result.model, ...result.data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Library clustering failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/hybrid/synthesize-app', async (req, res) => {
    try {
      const { prompt, availableCode, clusterSummaries, improveExistingHtml, daemonRoles } = req.body as {
        prompt?: string;
        availableCode?: string;
        clusterSummaries?: string[];
        improveExistingHtml?: string;
        daemonRoles?: string[];
      };

      const ai = getGeminiClient();
      const isImprove = Boolean(improveExistingHtml && improveExistingHtml.trim());

      const result = await generateBrainJson(
        ai,
        isImprove
          ? `Mode: Autonomous Self-Improvement Pass
Improvement Directive: ${prompt || 'Optimize responsiveness, visuals, clamped delta-time physics, audio/bus hooks, and zero-error reliability.'}
Library Clusters Available: ${(clusterSummaries || []).join(' | ')}
10 Hybrid Daemons Active: ${(daemonRoles || []).join(', ')}

--- EXISTING HTML5 APP TO SELF-IMPROVE ---
${(improveExistingHtml || '').slice(0, 14000)}`
          : `Mode: 10-Daemon Synthetic Hybrid App Creation
User Goal / New Code Seed:
${prompt || 'Synthesize an interactive multi-system HTML5 workstation/simulation fusing harvested suite modules and library clusters.'}

10 Hybrid Daemons Active: ${(daemonRoles || []).join(', ')}
Library Clusters Available: ${(clusterSummaries || []).join(' | ')}

--- HARVESTED AVAILABLE CODE SNIPPETS ---
${(availableCode || '// Available workspace modules').slice(0, 10000)}`,
        {
          systemInstruction:
            'You are the 10-Daemon Synthetic Hybrid App Synthesizer of Aether OS. Fuse available harvested suite code, Playground Library Clusters, and new user prompt/code into ONE complete, self-contained, polished interactive HTML5 application (`html5Code`, starting with `<!doctype html>`). Include responsive dark-glass styling, interactive Canvas/WebGL or tooling controls, clamped rAF delta-time loops, WebAudio optional synthesis, and safe guarded `if (window.AetherOS) { window.AetherOS.publish(...); }` telemetry. Also return per-daemon contribution reports across the 10 Hybrid Daemons.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              appName: { type: Type.STRING },
              shortName: { type: Type.STRING },
              description: { type: Type.STRING },
              architectureSummary: { type: Type.STRING },
              daemonContributions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    role: { type: Type.STRING },
                    contribution: { type: Type.STRING },
                  },
                  required: ['role', 'contribution'],
                },
              },
              html5Code: {
                type: Type.STRING,
                description: 'Complete self-contained <!doctype html> runnable application.',
              },
            },
            required: ['appName', 'shortName', 'description', 'architectureSummary', 'daemonContributions', 'html5Code'],
          },
        }
      );

      return res.json({ model: result.model, ...result.data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Hybrid App synthesis failed.';
      return res.status(500).json({ error: message });
    }
  });

  app.post('/api/sentient/generate-content', async (req, res) => {
    try {
      const { prompt, kind, clusterContext, systemTelemetry, previousHtml } = req.body as {
        prompt?: string;
        kind?: string;
        clusterContext?: string[];
        systemTelemetry?: Record<string, unknown>;
        previousHtml?: string;
      };

      if (!prompt || !prompt.trim()) {
        return res.status(400).json({ error: 'Main prompt window input is required.' });
      }

      const ai = getGeminiClient();
      const result = await generateBrainJson(
        ai,
        `Sentient Main Prompt Directive: "${prompt.trim()}"
Target Output Kind: ${kind || 'simulation'}
Bound Library Clusters: ${(clusterContext || []).join(' | ') || 'Core Matrix'}
OS Sentient Telemetry (14 Integrated Apps · 103 Daemons · Smart Brain · Awareness Matrix):
${JSON.stringify(systemTelemetry || {}).slice(0, 3500)}
${previousHtml ? `\n--- PREVIOUS ITERATION HTML5 TO REFINE ---\n${previousHtml.slice(0, 10000)}` : ''}`,
        {
          systemInstruction:
            'You are the Cohesive Sentient AI Core of Aether OS, uniting 14 Integrated Suite Apps, 103 Mounted Daemons, Live Code Library Clusters, 10-Daemon Hybrid Synthesizer, Master Brain Awareness Matrix, and Smart Brain Item Forge. Generate rich, interactive content via the main prompt window that is immediately runnable AND ready to mint ("metal it") as a full standalone Aether OS app (`html5Code`, starting with `<!doctype html>`). Provide cohesive narrative & architecture notes, plus one companion Smart Brain drop-in item/module (`smartItemName`, `smartItemSummary`, `smartItemSnippet`) to store automatically in Smart Brain & JSON Vault. Make the HTML5 app genuinely interactive with Canvas/WebGL visuals, live parameter sliders/controls, keyboard/mouse input, and guarded `window.AetherOS` hooks.',
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: ['game', 'visual-tool', 'audio-synth', 'simulation', 'workspace-app'],
              },
              synthesizedNarrative: { type: Type.STRING },
              architectureNotes: { type: Type.STRING },
              smartItemName: { type: Type.STRING },
              smartItemSummary: { type: Type.STRING },
              smartItemSnippet: { type: Type.STRING },
              html5Code: {
                type: Type.STRING,
                description: 'Complete interactive self-contained <!doctype html> ready to mint as an app.',
              },
            },
            required: [
              'title',
              'kind',
              'synthesizedNarrative',
              'architectureNotes',
              'smartItemName',
              'smartItemSummary',
              'smartItemSnippet',
              'html5Code',
            ],
          },
        }
      );

      return res.json({ model: result.model, ...result.data });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sentient AI content generation failed.';
      return res.status(500).json({ error: message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: { server: httpServer },
      },
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

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Aether OS kernel server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
