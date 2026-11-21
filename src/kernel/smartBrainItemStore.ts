import type {
  ContentBlankGap,
  SmartGameItem,
  SmartGameItemCategory,
  SmartGameItemRarity,
} from '../types/os';
import { jsonKnowledgeStore } from './jsonKnowledgeStore';
import { neuralBus } from './neuralBus';
import { printedAppsStore } from './printedAppsStore';
import { vfs } from './vfs';

const STORAGE_KEY = 'AetherOS_SmartBrainItems_v1';

const SEED_ITEMS: SmartGameItem[] = [
  {
    id: 'sb-item-phase-shield',
    name: 'Aegis Resonance Capacitor',
    category: 'upgrade',
    rarity: 'epic',
    targetGame: 'Nebula Bounce Core',
    originMode: 'auto-blank-fill',
    summary: 'Auto-regenerates +1 hull shield every 45 points and emits a deflective shock ring.',
    upgradeReason: 'Filled missing mid-game survivability upgrade gap detected in arcade loop.',
    stats: [
      { label: 'Shield Regen', value: '+1 / 45pts' },
      { label: 'Repulse Radius', value: '110 px' },
      { label: 'Cooldown', value: '8.0 s' },
    ],
    spawnRule: 'Spawns when player shield <= 1 or wave >= 2.',
    iconColor: '#22d3ee',
    codeSnippet: `// Drop-in Aegis Resonance Capacitor\nfunction applyAegisShield(player) {\n  player.shield = Math.min(player.maxShield || 4, (player.shield || 1) + 1);\n  player.invulnTimer = 1.4;\n  if (window.AetherOS) AetherOS.publish('ITEM_EQUIP', 'Aegis Capacitor activated');\n}`,
    createdAt: Date.now() - 90_000,
  },
  {
    id: 'sb-item-chrono-orb',
    name: 'Chrono-Dampener Core',
    category: 'powerup',
    rarity: 'rare',
    targetGame: 'All Action / Arcade Games',
    originMode: 'auto-blank-fill',
    summary: 'Temporarily slows enemy projectiles by 45% for 5 seconds while preserving player speed.',
    upgradeReason: 'Prevents unfair late-wave difficulty spikes by giving player tactical slow-time recovery.',
    stats: [
      { label: 'Time Dilation', value: '0.55x Enemy' },
      { label: 'Duration', value: '5.0 s' },
      { label: 'Drop Rate', value: '12%' },
    ],
    spawnRule: 'Drops from elite shards after 3 consecutive dodges.',
    iconColor: '#a855f7',
    codeSnippet: `// Chrono-Dampener Powerup\nlet timeScaleEnemy = 1.0;\nfunction triggerChronoOrb(ms = 5000) {\n  timeScaleEnemy = 0.55;\n  setTimeout(() => { timeScaleEnemy = 1.0; }, ms);\n}`,
    createdAt: Date.now() - 45_000,
  },
];

type SmartBrainListener = (state: {
  items: SmartGameItem[];
  blanks: ContentBlankGap[];
  autoFillEnabled: boolean;
  busy: boolean;
  lastError: string | null;
}) => void;

function renderItemBadgeDataUrl(item: { name: string; category: string; iconColor: string }): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = '#070d1b';
  ctx.fillRect(0, 0, 64, 64);

  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 28);
  grad.addColorStop(0, item.iconColor || '#22d3ee');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 28, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = item.iconColor || '#22d3ee';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (item.category === 'weapon' || item.category === 'enemy') {
    ctx.moveTo(32, 10);
    ctx.lineTo(52, 32);
    ctx.lineTo(32, 54);
    ctx.lineTo(12, 32);
    ctx.closePath();
  } else if (item.category === 'upgrade' || item.category === 'relic') {
    ctx.moveTo(32, 10);
    ctx.lineTo(50, 22);
    ctx.lineTo(44, 50);
    ctx.lineTo(20, 50);
    ctx.lineTo(14, 22);
    ctx.closePath();
  } else {
    ctx.arc(32, 32, 17, 0, Math.PI * 2);
  }
  ctx.stroke();

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(32, 32, 6, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL('image/png');
}

class SmartBrainItemStore {
  private items: SmartGameItem[] = [];
  private autoFillEnabled = true;
  private busy = false;
  private lastError: string | null = null;
  private listeners = new Set<SmartBrainListener>();
  private autoTimer: number | null = null;

  constructor() {
    this.load();
    this.startAutoBlankDaemon();
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SmartGameItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.items = parsed;
          return;
        }
      }
    } catch {
      // fall back
    }
    this.items = SEED_ITEMS.map((i) => ({ ...i }));
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.items.slice(0, 60)));
    } catch {
      // ignore quota
    }
  }

  private computeDetectedBlanks(): ContentBlankGap[] {
    const games = jsonKnowledgeStore.getEntries().filter((e) => e.category === 'game-spec');
    const primaryGameTitle = games[0]?.title || printedAppsStore.getApps()[0]?.name || 'Nebula Bounce Core';
    const existingCats = new Set(this.items.map((i) => i.category));
    const blanks: ContentBlankGap[] = [];

    const requiredRoles: Array<{
      cat: SmartGameItemCategory;
      title: string;
      severity: 'high' | 'medium';
      desc: string;
      prompt: string;
    }> = [
      {
        cat: 'weapon',
        title: 'Missing Active Weapon / Defense Module',
        severity: 'high',
        desc: `No custom active weapon or counter-fire module exists yet for "${primaryGameTitle}".`,
        prompt: `Create a balanced active pulse weapon upgrade for "${primaryGameTitle}" with heat/cooldown balance.`,
      },
      {
        cat: 'enemy',
        title: 'Missing Mid-Wave Elite Enemy / Hazard',
        severity: 'high',
        desc: `Enemy roster needs a patterned mid-wave threat to keep escalation dynamic in "${primaryGameTitle}".`,
        prompt: `Design an intelligent orbital flanking enemy with clear telegraphing and weak-point drops for "${primaryGameTitle}".`,
      },
      {
        cat: 'relic',
        title: 'Missing Score Multiplier / Audio Relic',
        severity: 'medium',
        desc: 'No collectible lore relic or audio-reactive combo multiplier object detected in item vault.',
        prompt: `Generate a collectible harmonic relic that boosts score combo multipliers when synced to beat energy.`,
      },
      {
        cat: 'obstacle',
        title: 'Missing Environmental Arena Obstacle',
        severity: 'medium',
        desc: 'Arena navigation lacks interactive gravity bumpers or destructible cover barriers.',
        prompt: `Create an interactive plasma bumper barrier obstacle with bounce restitution physics.`,
      },
      {
        cat: 'npc',
        title: 'Missing Companion / Narrator Drone NPC',
        severity: 'medium',
        desc: 'No allied support NPC or autonomous wingman unit exists in current game item catalog.',
        prompt: `Design an autonomous wingman scout NPC that tags nearby pickups and speaks tactical alerts.`,
      },
      {
        cat: 'fx-module',
        title: 'Missing Boss Telegraph & Impact FX Module',
        severity: 'medium',
        desc: 'No dedicated shockwave/hit-stop visual feedback module linked to item pickups.',
        prompt: `Build a lightweight canvas hit-stop + radial particle burst FX module for critical item activations.`,
      },
    ];

    for (const r of requiredRoles) {
      if (!existingCats.has(r.cat)) {
        blanks.push({
          id: `blank-${r.cat}`,
          title: r.title,
          category: r.cat,
          severity: r.severity,
          targetGame: primaryGameTitle,
          description: r.desc,
          suggestedPrompt: r.prompt,
        });
      }
    }

    // Even if all core categories are populated, detect per-game expansion gap
    if (blanks.length === 0 && games.length > 0) {
      const target = games[0].title;
      const gameCount = this.items.filter((i) => i.targetGame.toLowerCase().includes(target.toLowerCase())).length;
      if (gameCount < 3) {
        blanks.push({
          id: `blank-depth-${games[0].id}`,
          title: `Expand "${target}" Endgame Tier`,
          category: 'upgrade',
          severity: 'medium',
          targetGame: target,
          description: `"${target}" currently has ${gameCount} Smart Brain items; synthesize a boss-phase progression relic.`,
          suggestedPrompt: `Generate a boss-tier progression upgrade and combo hazard for "${target}" to enrich late-game replayability.`,
        });
      }
    }

    return blanks;
  }

  private emit(): void {
    const snap = this.getState();
    this.listeners.forEach((cb) => cb(snap));
  }

  getState() {
    return {
      items: this.items,
      blanks: this.computeDetectedBlanks(),
      autoFillEnabled: this.autoFillEnabled,
      busy: this.busy,
      lastError: this.lastError,
    };
  }

  subscribe(listener: SmartBrainListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setAutoFillEnabled(enabled: boolean): void {
    this.autoFillEnabled = enabled;
    this.emit();
    neuralBus.publish(
      'SYSTEM',
      'SMART_BRAIN_AUTOFILL_MODE',
      `Smart Brain Autonomous Blank-Filler ${enabled ? 'activated' : 'paused'}.`
    );
  }

  private startAutoBlankDaemon(): void {
    if (this.autoTimer !== null) return;
    this.autoTimer = window.setInterval(() => {
      if (!this.autoFillEnabled || this.busy) return;
      const blanks = this.computeDetectedBlanks();
      if (blanks.length > 0 && this.items.length < 14) {
        void this.generateItems({
          mode: 'auto-blank-fill',
          prompt: blanks[0].suggestedPrompt,
          targetGame: blanks[0].targetGame,
          blankTitle: blanks[0].title,
        });
      }
    }, 65_000);
  }

  async generateItems(input: {
    mode: 'user-prompt' | 'auto-blank-fill';
    prompt?: string;
    targetGame?: string;
    blankTitle?: string;
  }): Promise<SmartGameItem[]> {
    if (this.busy) return [];
    this.busy = true;
    this.lastError = null;
    this.emit();

    const blanks = this.computeDetectedBlanks();
    const gameSpecs = jsonKnowledgeStore
      .getEntries()
      .filter((e) => e.category === 'game-spec')
      .slice(0, 4)
      .map((g) => `${g.title}: ${g.summary}`);

    const effectivePrompt =
      input.prompt?.trim() ||
      blanks[0]?.suggestedPrompt ||
      'Automatically invent 2 complementary game upgrade items & content gap fixes to enrich combat, healing, and progression.';

    neuralBus.publish(
      'FORGE',
      'SMART_BRAIN_GENERATE_START',
      input.mode === 'auto-blank-fill'
        ? `Smart Brain auto-filling blank: ${input.blankTitle || effectivePrompt}`
        : `Smart Brain generating upgrade/content items for: "${effectivePrompt}"`
    );

    try {
      const res = await fetch('/api/smartbrain/generate-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: input.mode,
          prompt: effectivePrompt,
          targetGame: input.targetGame || blanks[0]?.targetGame || 'All Aether Games',
          existingItems: this.items.slice(0, 12).map((i) => `${i.name} (${i.category})`),
          gameContext: gameSpecs,
        }),
      });

      const data = (await res.json()) as {
        items?: Array<{
          name?: string;
          category?: SmartGameItemCategory;
          rarity?: SmartGameItemRarity;
          targetGame?: string;
          summary?: string;
          upgradeReason?: string;
          stats?: Array<{ label: string; value: string }>;
          spawnRule?: string;
          iconColor?: string;
          codeSnippet?: string;
        }>;
        error?: string;
      };

      if (!res.ok || !Array.isArray(data.items) || data.items.length === 0) {
        throw new Error(data.error || 'Smart Brain failed to generate items.');
      }

      const now = Date.now();
      const created: SmartGameItem[] = data.items.map((raw, idx) => ({
        id: `sb-item-${now}-${idx}-${Math.random().toString(36).slice(2, 5)}`,
        name: raw.name || `Smart Item #${this.items.length + idx + 1}`,
        category: raw.category || 'upgrade',
        rarity: raw.rarity || 'rare',
        targetGame: raw.targetGame || input.targetGame || 'Nebula Bounce Core',
        originMode: input.mode,
        summary: raw.summary || 'Auto-generated game enhancement module.',
        upgradeReason: raw.upgradeReason || 'Addresses content balance / gameplay progression gap.',
        stats: Array.isArray(raw.stats) ? raw.stats.slice(0, 4) : [{ label: 'Power', value: '+25%' }],
        spawnRule: raw.spawnRule || 'Spawns dynamically during wave escalation.',
        iconColor: raw.iconColor || '#22d3ee',
        codeSnippet: raw.codeSnippet || `// ${raw.name || 'SmartItem'}\nconsole.log('Activated item');`,
        createdAt: now + idx,
      }));

      this.items = [...created, ...this.items].slice(0, 60);
      this.persist();

      // Store each item into JSON Knowledge Vault + VFS so Game Forge, Master Brain & Printer stay synchronized
      for (const item of created) {
        jsonKnowledgeStore.saveEntry({
          title: `Game Item: ${item.name}`,
          category: 'research',
          tags: ['smart-brain-item', item.category, item.rarity, item.originMode],
          summary: `${item.name} (${item.category} · ${item.rarity}) — ${item.summary}`,
          sideNotes: [
            `Target Game: ${item.targetGame}`,
            `Upgrade Reason: ${item.upgradeReason}`,
            `Spawn Rule: ${item.spawnRule}`,
          ],
          linkedAppIds: ['smartbrain', 'gameforge', 'spritecomposer', 'jsonvault', 'masterbrain'],
          data: item as unknown as Record<string, unknown>,
        });

        const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'item';
        void vfs.saveFile({
          name: `${slug}.json`,
          path: `/workspace/smart-brain-items/${slug}.json`,
          content: JSON.stringify(item, null, 2),
          patchedBy: 'Smart Brain Item Forge',
        });
      }

      neuralBus.publish(
        'FORGE',
        'SMART_BRAIN_ITEM_STORED',
        `Smart Brain generated & stored ${created.length} item(s): ${created.map((c) => c.name).join(', ')}`
      );

      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Smart Brain generation error.';
      this.lastError = msg;
      neuralBus.publish('FORGE', 'SMART_BRAIN_ERROR', msg);
      return [];
    } finally {
      this.busy = false;
      this.emit();
    }
  }

  syncItemAsSprite(item: SmartGameItem): void {
    const dataUrl = renderItemBadgeDataUrl(item);
    const roleMap: Record<SmartGameItemCategory, 'player' | 'enemy' | 'collectible' | 'tile' | 'fx'> = {
      weapon: 'fx',
      powerup: 'collectible',
      upgrade: 'collectible',
      enemy: 'enemy',
      obstacle: 'tile',
      npc: 'player',
      relic: 'collectible',
      'fx-module': 'fx',
    };
    jsonKnowledgeStore.addSprite({
      id: `sprite-sb-${item.id}`,
      name: item.name,
      role: roleMap[item.category] || 'collectible',
      width: 64,
      height: 64,
      dataUrl,
      palette: [item.iconColor || '#22d3ee', '#070d1b'],
    });
  }

  importExternalItem(input: Omit<SmartGameItem, 'id' | 'createdAt'>): SmartGameItem {
    const item: SmartGameItem = {
      ...input,
      id: `sb-item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
    };
    this.items = [item, ...this.items].slice(0, 60);
    this.persist();
    this.emit();

    jsonKnowledgeStore.saveEntry({
      title: `Game Item: ${item.name}`,
      category: 'research',
      tags: ['smart-brain-item', item.category, item.rarity, 'aimspace'],
      summary: `${item.name} (${item.category} · ${item.rarity}) — ${item.summary}`,
      sideNotes: [
        `Target Game: ${item.targetGame}`,
        `Upgrade Reason: ${item.upgradeReason}`,
        `Spawn Rule: ${item.spawnRule}`,
      ],
      linkedAppIds: ['smartbrain', 'aimspace', 'gameforge', 'jsonvault', 'masterbrain'],
      data: item as unknown as Record<string, unknown>,
    });

    const slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 28) || 'item';
    void vfs.saveFile({
      name: `${slug}.json`,
      path: `/workspace/smart-brain-items/${slug}.json`,
      content: JSON.stringify(item, null, 2),
      patchedBy: 'AIM Space × Smart Brain',
    });

    neuralBus.publish(
      'FORGE',
      'SMART_BRAIN_ITEM_STORED',
      `Imported item "${item.name}" for ${item.targetGame}.`
    );

    return item;
  }

  deleteItem(id: string): void {
    this.items = this.items.filter((i) => i.id !== id);
    this.persist();
    this.emit();
  }
}

export const smartBrainItemStore = new SmartBrainItemStore();
