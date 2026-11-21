import type {
  JsonEntryCategory,
  JsonLibraryEntry,
  PhysicsPresetSpec,
  SpriteAssetSpec,
} from '../types/os';
import { neuralBus } from './neuralBus';
import { vfs } from './vfs';

const STORAGE_KEY_LIBRARY = 'AetherOS_JsonResearchLibrary_v1';
const STORAGE_KEY_SPRITES = 'AetherOS_SpriteAssets_v1';
const STORAGE_KEY_PHYSICS = 'AetherOS_PhysicsPreset_v1';

const DEFAULT_PHYSICS: PhysicsPresetSpec = {
  id: 'phys-orbital-arcade',
  name: 'Orbital Arcade Balance',
  gravity: 480,
  friction: 0.985,
  restitution: 0.72,
  maxSpeed: 540,
  collisionShape: 'circle',
};

const SEED_ENTRIES: JsonLibraryEntry[] = [
  {
    id: 'json-seed-cyber-physics',
    slug: 'cyber-orbital-physics-spec',
    title: 'Orbital Arcade Physics & Style Schema',
    category: 'physics-rig',
    tags: ['physics', 'restitution', 'arcade', '2d-canvas'],
    summary: 'Clamped 16ms Euler physics parameters tuned for fluid arcade momentum and Synesthesia hue coupling.',
    sideNotes: [
      'Gravity 480 px/s² gives responsive jump arcs without floatiness.',
      'Pair restitution 0.72 with cyan particle trails on high-velocity collisions.',
    ],
    linkedEntryIds: [],
    linkedAppIds: ['gameforge', 'spritecomposer', 'synesthesia'],
    data: { ...DEFAULT_PHYSICS, frameClampMs: 16.67 },
    createdAt: Date.now() - 120_000,
    updatedAt: Date.now() - 120_000,
  },
  {
    id: 'json-seed-narrator-lore',
    slug: 'phobos-auto-narration-pack',
    title: 'Self-Narrated Sci-Fi Arcade Lore Matrix',
    category: 'narration',
    tags: ['narration', 'voice', 'lore', 'gemini'],
    summary: 'Dynamic announcer cues & boss wave voice lines for auto-narrated HTML5 games.',
    sideNotes: [
      'Speak opening prologue via speechSynthesis while fading in score HUD.',
      'Emit AetherOS.publish("GAME_EVENT", ...) on boss spawns so Neural Bus tracks milestones.',
    ],
    linkedEntryIds: ['json-seed-cyber-physics'],
    linkedAppIds: ['gameforge', 'streamhub', 'musicstudio'],
    data: {
      voiceStyle: 'Tactical Sci-Fi Announcer',
      prologue: 'Neural sector unlocked. Evade incoming plasma drones and harvest resonance cores.',
      waveCue: 'Harmonic surge detected — enemy velocity increasing.',
      victoryLine: 'Sector stabilized. Telemetry archived to JSON Vault.',
    },
    createdAt: Date.now() - 60_000,
    updatedAt: Date.now() - 60_000,
  },
];

type JsonStoreListener = (state: {
  entries: JsonLibraryEntry[];
  sprites: SpriteAssetSpec[];
  physics: PhysicsPresetSpec;
}) => void;

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 36) || `entry-${Date.now()}`
  );
}

class JsonKnowledgeStore {
  private entries: JsonLibraryEntry[] = [];
  private sprites: SpriteAssetSpec[] = [];
  private physics: PhysicsPresetSpec = { ...DEFAULT_PHYSICS };
  private listeners = new Set<JsonStoreListener>();

  constructor() {
    this.load();
  }

  private load(): void {
    try {
      const rawEntries = localStorage.getItem(STORAGE_KEY_LIBRARY);
      if (rawEntries) {
        const parsed = JSON.parse(rawEntries) as JsonLibraryEntry[];
        if (Array.isArray(parsed) && parsed.length > 0) this.entries = parsed;
      }
      if (this.entries.length === 0) {
        this.entries = SEED_ENTRIES.map((e) => ({ ...e }));
      }

      const rawSprites = localStorage.getItem(STORAGE_KEY_SPRITES);
      if (rawSprites) {
        const parsedSprites = JSON.parse(rawSprites) as SpriteAssetSpec[];
        if (Array.isArray(parsedSprites)) this.sprites = parsedSprites;
      }

      const rawPhys = localStorage.getItem(STORAGE_KEY_PHYSICS);
      if (rawPhys) {
        this.physics = { ...DEFAULT_PHYSICS, ...(JSON.parse(rawPhys) as PhysicsPresetSpec) };
      }
    } catch {
      this.entries = SEED_ENTRIES.map((e) => ({ ...e }));
      this.sprites = [];
      this.physics = { ...DEFAULT_PHYSICS };
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY_LIBRARY, JSON.stringify(this.entries));
      localStorage.setItem(STORAGE_KEY_SPRITES, JSON.stringify(this.sprites.slice(0, 24)));
      localStorage.setItem(STORAGE_KEY_PHYSICS, JSON.stringify(this.physics));
    } catch {
      // ignore storage quota overflow
    }
  }

  private emit(): void {
    const snap = {
      entries: this.entries,
      sprites: this.sprites,
      physics: this.physics,
    };
    this.listeners.forEach((cb) => cb(snap));
  }

  subscribe(listener: JsonStoreListener): () => void {
    this.listeners.add(listener);
    listener({
      entries: this.entries,
      sprites: this.sprites,
      physics: this.physics,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  getEntries(): JsonLibraryEntry[] {
    return this.entries;
  }

  getSprites(): SpriteAssetSpec[] {
    return this.sprites;
  }

  getPhysics(): PhysicsPresetSpec {
    return this.physics;
  }

  saveEntry(input: {
    id?: string;
    title: string;
    category: JsonEntryCategory;
    tags: string[];
    summary: string;
    sideNotes?: string[];
    linkedEntryIds?: string[];
    linkedAppIds?: string[];
    data: Record<string, unknown>;
  }): JsonLibraryEntry {
    const now = Date.now();
    const existing = input.id ? this.entries.find((e) => e.id === input.id) : undefined;
    const entry: JsonLibraryEntry = existing
      ? {
          ...existing,
          title: input.title.trim() || existing.title,
          category: input.category,
          tags: Array.from(new Set(input.tags)),
          summary: input.summary,
          sideNotes: input.sideNotes ?? existing.sideNotes,
          linkedEntryIds: input.linkedEntryIds ?? existing.linkedEntryIds,
          linkedAppIds: input.linkedAppIds ?? existing.linkedAppIds,
          data: input.data,
          updatedAt: now,
        }
      : {
          id: `json-${now}-${Math.random().toString(36).slice(2, 6)}`,
          slug: slugify(input.title),
          title: input.title.trim() || 'Untitled Research Entry',
          category: input.category,
          tags: Array.from(new Set(input.tags)),
          summary: input.summary,
          sideNotes: input.sideNotes ?? [],
          linkedEntryIds: input.linkedEntryIds ?? [],
          linkedAppIds: input.linkedAppIds ?? ['gameforge', 'jsonvault'],
          data: input.data,
          createdAt: now,
          updatedAt: now,
        };

    if (existing) {
      this.entries = this.entries.map((e) => (e.id === existing.id ? entry : e));
    } else {
      this.entries = [entry, ...this.entries];
    }

    this.persist();
    this.emit();

    void vfs.saveFile({
      name: `${entry.slug}.json`,
      path: `/workspace/json-library/${entry.slug}.json`,
      content: JSON.stringify(entry, null, 2),
      patchedBy: 'JSON Vault',
    });

    neuralBus.publish(
      'VFS',
      'JSON_LIBRARY_SAVED',
      `Stored JSON record "${entry.title}" (${entry.category}) with ${entry.sideNotes.length} side note(s).`
    );
    return entry;
  }

  deleteEntry(id: string): void {
    const target = this.entries.find((e) => e.id === id);
    this.entries = this.entries.filter((e) => e.id !== id);
    this.persist();
    this.emit();
    if (target) {
      neuralBus.publish('VFS', 'JSON_LIBRARY_DELETED', `Removed JSON entry "${target.title}".`);
    }
  }

  addSprite(sprite: SpriteAssetSpec): void {
    this.sprites = [sprite, ...this.sprites.filter((s) => s.id !== sprite.id)].slice(0, 24);
    this.persist();
    this.emit();
    this.saveEntry({
      title: `Sprite: ${sprite.name}`,
      category: 'sprite-pack',
      tags: ['sprite', sprite.role, ...sprite.palette.slice(0, 3)],
      summary: `${sprite.width}x${sprite.height} ${sprite.role} sprite synced to Game Forge & JSON Vault.`,
      sideNotes: [`Role: ${sprite.role}`, `Palette: ${sprite.palette.join(', ')}`],
      linkedAppIds: ['gameforge', 'spritecomposer', 'visualsynth', 'jsonvault'],
      data: sprite as unknown as Record<string, unknown>,
    });
    neuralBus.publish('FORGE', 'SPRITE_ASSET_READY', `Synced sprite "${sprite.name}" (${sprite.role}) across OS apps.`);
  }

  removeSprite(id: string): void {
    this.sprites = this.sprites.filter((s) => s.id !== id);
    this.persist();
    this.emit();
  }

  updatePhysics(preset: PhysicsPresetSpec): void {
    this.physics = preset;
    this.persist();
    this.emit();
    neuralBus.publish(
      'SYSTEM',
      'PHYSICS_RIG_SYNCED',
      `Physics rig "${preset.name}" updated (g=${preset.gravity}, bounce=${preset.restitution}).`
    );
  }
}

export const jsonKnowledgeStore = new JsonKnowledgeStore();
