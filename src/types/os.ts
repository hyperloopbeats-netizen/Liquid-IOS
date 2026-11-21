export type BuiltInAppId =
  | 'aimspace'
  | 'aimworkstation'
  | 'fractalcsp'
  | 'heliocell'
  | 'aimspacejet'
  | 'companion'
  | 'drive'
  | 'terminal'
  | 'architect'
  | 'auditor'
  | 'sandbox'
  | 'swarm'
  | 'snapshots'
  | 'blocks'
  | 'musicstudio'
  | 'videoeditor'
  | 'doom3d'
  | 'liquidmp3'
  | 'organicmp4'
  | 'liquidvideo'
  | 'fractalcinema'
  | 'liquideq'
  | 'visualsynth'
  | 'microfractal'
  | 'modelforge'
  | 'synesthesia'
  | 'healer'
  | 'gamedev'
  | 'neuralbus'
  | 'thinkmatrix'
  | 'streamhub'
  | 'htmlprinter'
  | 'gameforge'
  | 'spritecomposer'
  | 'jsonvault'
  | 'masterbrain'
  | 'hyperface'
  | 'smartbrain'
  | 'kineticengine'
  | 'voxelengine'
  | 'codeunifier'
  | 'meshunifier'
  | 'modelforgesuite'
  | 'sovereignfps'
  | 'odonatamesh'
  | 'sentientsun'
  | 'cometicmatrix'
  | 'aimosnexus'
  | 'liquidquantum'
  | 'cometicballistic'
  | 'zerocrossingcad'
  | 'aimosv7'
  | 'synthhybrid'
  | 'liveplayground'
  | 'sentientai';

export type AppId = BuiltInAppId | `printed:${string}`;

export type TrilateralAxis = 'cognitive' | 'spatial' | 'persistence';

export interface OSAppDefinition {
  id: AppId;
  name: string;
  shortName: string;
  category: string;
  axis: TrilateralAxis;
  blockId: string;
  defaultWidth: number;
  defaultHeight: number;
  accentGradient: string;
  iconName: string;
}

export interface WindowState {
  id: AppId;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  minimized: boolean;
  maximized: boolean;
  miniMode?: boolean;
  snapMode?: 'left' | 'right' | 'full' | null;
  prevBounds?: { x: number; y: number; width: number; height: number };
  preMiniBounds?: { x: number; y: number; width: number; height: number };
}

export type VFSFileKind = 'js' | 'ts' | 'html' | 'css' | 'json' | 'md';

export interface VFSFile {
  id: string;
  name: string;
  path: string;
  kind: VFSFileKind;
  content: string;
  updatedAt: number;
  size: number;
  lastPatchedBy?: string;
}

export type AuditIssueCategory = 'syntax' | 'dependency' | 'performance' | 'security';

export interface AuditIssue {
  id: string;
  fileId: string;
  fileName: string;
  filePath: string;
  category: AuditIssueCategory;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  line: number;
  column?: number;
  fixLabel?: string;
  fixAction?: 'patch-file' | 'create-stub' | 'update-package-json';
  patchedContent?: string;
  stubTargetPath?: string;
  stubContent?: string;
  missingDependency?: string;
  applied?: boolean;
}

export interface AuditReport {
  scannedAt: number;
  fileCount: number;
  issues: AuditIssue[];
  counts: {
    critical: number;
    warning: number;
    info: number;
    syntax: number;
    dependency: number;
    performance: number;
    security: number;
  };
}

export interface VFSSnapshot {
  id: string;
  label: string;
  reason: string;
  createdAt: number;
  files: VFSFile[];
}

export type BusChannel =
  | 'VFS'
  | 'SWARM'
  | 'HEALER'
  | 'VOICE'
  | 'AUDIO'
  | 'FORGE'
  | 'SANDBOX'
  | 'TRILATERAL'
  | 'FRACTAL'
  | 'SYSTEM';

export interface NeuralBusEvent {
  id: string;
  timestamp: string;
  epochMs: number;
  channel: BusChannel;
  type: string;
  summary: string;
  payload?: Record<string, unknown>;
}

export type DaemonRole =
  | 'code-review'
  | 'security-guard'
  | 'data-parsing'
  | 'memory-gc'
  | 'fps-stabilizer'
  | 'schema-repair'
  | 'dom-sanitizer'
  | 'dependency-upgrader'
  | 'error-boundary'
  | 'webgl-recovery'
  | 'vfs-compactor'
  | 'bus-balancer'
  | 'binary-refract-agent'
  | 'style-curator'
  | 'logic-weaver'
  | 'physics-tuner'
  | 'sprite-optimizer'
  | 'narrator-scribe'
  | 'json-indexer'
  | 'asset-linker'
  | 'performance-watchdog'
  | 'safety-sanitizer'
  | 'knowledge-synthesizer'
  | 'code-intent-analyzer'
  | 'dep-resolver'
  | 'game-hook-injector'
  | 'state-bridge-weaver'
  | 'hud-auto-binder'
  | 'collision-mesh-sync'
  | 'input-mapper-daemon'
  | 'shader-unifier'
  | 'sprite-rig-binder'
  | 'audio-sfx-synthesizer'
  | 'entity-pool-optimizer'
  | 'kinetic-engine-sync'
  | 'voxel-engine-sync'
  | 'synthetic-patch-verifier'
  | 'smart-sort-classifier'
  | 'affinity-router'
  | 'cross-game-exporter'
  | 'brain-memory-linker'
  | 'rollback-guardian'
  | 'coherence-calibrator'
  // 50 Mounted AIM Space & Synthetic Designer Assist Daemons
  | 'aim-world-architect'
  | 'aim-sector-cartographer'
  | 'aim-skybox-nebula'
  | 'aim-station-rig'
  | 'aim-asteroid-belt'
  | 'aim-parallax-depth'
  | 'aim-portal-beacon'
  | 'aim-terrain-lattice'
  | 'aim-zone-transitions'
  | 'aim-ambient-dust'
  | 'aim-flight-kinematics'
  | 'aim-thrust-damper'
  | 'aim-plasma-ballistics'
  | 'aim-drone-ai-swarm'
  | 'aim-boss-choreographer'
  | 'aim-hitbox-precision'
  | 'aim-shield-harmonics'
  | 'aim-wave-director'
  | 'aim-combo-multiplier'
  | 'aim-recoil-camera'
  | 'aim-syntax-restructurer'
  | 'aim-designer-unifier'
  | 'aim-hyperface-bridge'
  | 'aim-mesh-promoter'
  | 'aim-kinetic-adapter'
  | 'aim-voxel-adapter'
  | 'aim-shader-caustics'
  | 'aim-hud-telemetry'
  | 'aim-input-normalizer'
  | 'aim-state-serializer'
  | 'aim-audio-pulse-sfx'
  | 'aim-music-tempo-sync'
  | 'aim-voice-narrator'
  | 'aim-subtitle-director'
  | 'aim-item-drop-forge'
  | 'aim-loot-balancer'
  | 'aim-sprite-synthesizer'
  | 'aim-frame-snapshot'
  | 'aim-thumbnail-sync'
  | 'aim-particle-culler'
  | 'aim-vfs-archiver'
  | 'aim-library-publisher'
  | 'aim-vault-indexer'
  | 'aim-bus-router'
  | 'aim-brain-diplomat'
  | 'aim-companion-uplink'
  | 'aim-delta-watchdog'
  | 'aim-memory-guard'
  | 'aim-sandbox-verifier'
  | 'aim-coherence-marshal'
  // 10 Dedicated Hybrid App-Builder Synthesis Daemons
  | 'hybrid-scanner'
  | 'hybrid-ast-fuser'
  | 'hybrid-cluster-binder'
  | 'hybrid-ui-weaver'
  | 'hybrid-physics-bridge'
  | 'hybrid-audio-bridge'
  | 'hybrid-self-improver'
  | 'hybrid-test-verifier'
  | 'hybrid-vfs-packager'
  | 'hybrid-sentient-publisher';

export type ModelBackend = 'gemini-cloud' | 'ollama-local' | 'edge-ast';

export interface DaemonConfig {
  role: DaemonRole;
  name: string;
  category: 'core' | 'upgrade' | 'brain-sorter' | 'unificator-support' | 'aimspace-assist' | 'hybrid-synth';
  description: string;
  backend: ModelBackend;
  ollamaUrl: string;
  ollamaModel: string;
  enabled: boolean;
  autoPatch: boolean;
  lastRunAt: number | null;
  status: 'idle' | 'scanning' | 'patching' | 'error';
  lastSummary: string;
}

export interface DaemonFinding {
  id: string;
  daemonRole: DaemonRole;
  backendUsed: ModelBackend;
  fileName: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  detail: string;
  lineHint?: number;
  patchedContent: string;
  applied: boolean;
  createdAt: number;
}

export type CircadianMode = 'auto' | 'dawn' | 'noon' | 'dusk' | 'midnight';

export interface SynesthesiaState {
  micActive: boolean;
  synthActive: boolean;
  liquidAudioActive: boolean;
  bass: number;
  mid: number;
  treble: number;
  rms: number;
  peakHz: number;
  systemLoad: number;
  circadianMode: CircadianMode;
  resolvedPhase: 'dawn' | 'noon' | 'dusk' | 'midnight';
  reactivity: number;
  activeHue: number;
}

export interface ForgeSpecimenSpec {
  id: string;
  prompt: string;
  skinType: 'hydrogel' | 'vascular' | 'thermo' | 'biolum';
  colorHex: string;
  emissiveHex: string;
  roughness: number;
  metalness: number;
  transmission: number;
  morphAmplitude: number;
  harmonicFreq: number;
  shellCount: number;
  tags: string[];
  architecturalNote: string;
  timestamp: string;
}

export interface VoiceIntentResult {
  rawText: string;
  action:
    | 'OPEN_APP'
    | 'TRIGGER_HEAL'
    | 'SWARM_SCAN'
    | 'TOGGLE_MIC'
    | 'TILE_WINDOWS'
    | 'CASCADE_WINDOWS'
    | 'MINIMIZE_ALL'
    | 'CREATE_SNAPSHOT'
    | 'RUN_FILE'
    | 'SET_THEME'
    | 'ACTIVATE_TRIAD'
    | 'TOGGLE_LIQUID_PLAY'
    | 'RUN_TRILATERAL_PIPELINE'
    | 'REFRACT_120FPS'
    | 'UNKNOWN';
  target?: string;
  confidence: number;
  message: string;
}

export interface EngineBlockDefinition {
  id: string;
  appId: AppId;
  name: string;
  axis: TrilateralAxis;
  role: string;
  capabilities: string[];
  version: string;
  invocations: number;
  lastLatencyMs: number;
  status: 'active' | 'standby';
}

export interface TrilateralRule {
  id: string;
  name: string;
  description: string;
  sourceAxis: TrilateralAxis;
  targetAxis: TrilateralAxis;
  enabled: boolean;
  triggersCount: number;
}

export interface TrilateralState {
  cognitiveEnergy: number;
  spatialEnergy: number;
  persistenceEnergy: number;
  coherence: number;
  activePreset: 'custom' | 'research' | 'flow' | 'resilience';
  rules: TrilateralRule[];
  lastPipelineLog: string[];
}

export interface LiquidTrack {
  id: string;
  title: string;
  artist: string;
  sourceType: 'procedural' | 'mp3-file';
  presetKey?: 'subsurface' | 'theta' | 'solaris';
  objectUrl?: string;
  durationSec: number;
}

export interface LiquidEqState {
  bands: number[];
  frequencies: number[];
  liquidCoupling: boolean;
  couplingStrength: number;
  autoDrift: boolean;
  presetName: string;
  bypass: boolean;
  preampDb: number;
  qFactor: number;
}

export interface LiquidAudioState {
  tracks: LiquidTrack[];
  currentTrackId: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  flowRate: number;
  viscosity: number;
  filterCutoffHz: number;
  freeFlowDrift: boolean;
  kernelLinked: boolean;
  eq: LiquidEqState;
  errorMessage?: string | null;
  statusMessage?: string | null;
}

export interface BinaryRefractionAgent {
  id: string;
  bitmask: string;
  name: string;
  subsystem: string;
  depth: 1 | 2 | 3;
  phase: 'continuous' | 'even-slice' | 'odd-slice' | 'quad-slice';
  budgetUs: number;
  actualUs: number;
  refractionRatio: number;
  enabled: boolean;
  throttledCount: number;
}

export interface MicroFractalState {
  targetFps: number;
  measuredFps: number;
  frameBudgetMs: number;
  lastFrameMs: number;
  jitterMs: number;
  fractalDepth: number;
  refractionIndex: number;
  autoRefractLock: boolean;
  stressBurstActive: boolean;
  binaryMask: number;
  frameTick: number;
  stabilityScore: number;
  frameHistoryMs: number[];
  agents: BinaryRefractionAgent[];
}

export interface PrintedAppDefinition {
  id: `printed:${string}`;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  html: string;
  version: number;
  accentGradient: string;
  createdAt: number;
  updatedAt: number;
  lastImprovementNote?: string;
  busMessagesSent: number;
}

export interface OrganicFolder {
  id: string;
  name: string;
  hue: 'cyan' | 'emerald' | 'fuchsia' | 'amber' | 'indigo';
  appIds: AppId[];
}

export type JsonEntryCategory =
  | 'game-spec'
  | 'sprite-pack'
  | 'physics-rig'
  | 'style-theme'
  | 'narration'
  | 'research'
  | 'system-sort';

export interface JsonLibraryEntry {
  id: string;
  slug: string;
  title: string;
  category: JsonEntryCategory;
  tags: string[];
  summary: string;
  sideNotes: string[];
  linkedEntryIds: string[];
  linkedAppIds: string[];
  data: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface SpriteAssetSpec {
  id: string;
  name: string;
  role: 'player' | 'enemy' | 'collectible' | 'tile' | 'fx';
  width: number;
  height: number;
  dataUrl: string;
  palette: string[];
}

export interface PhysicsPresetSpec {
  id: string;
  name: string;
  gravity: number;
  friction: number;
  restitution: number;
  maxSpeed: number;
  collisionShape: 'circle' | 'aabb';
}

export interface MasterBrainPlan {
  id: string;
  timestamp: number;
  coherenceScore: number;
  summary: string;
  dispatchedDaemons: DaemonRole[];
  folderActions: Array<{ folderName: string; appIds: string[]; reason: string }>;
  crossAppLinks: Array<{ sourceApp: string; targetApp: string; payloadSummary: string }>;
  researchRecommendations: string[];
}

export type SmartGameItemCategory =
  | 'weapon'
  | 'powerup'
  | 'upgrade'
  | 'enemy'
  | 'obstacle'
  | 'npc'
  | 'relic'
  | 'fx-module';

export type SmartGameItemRarity = 'common' | 'rare' | 'epic' | 'sovereign';

export interface SmartGameItem {
  id: string;
  name: string;
  category: SmartGameItemCategory;
  rarity: SmartGameItemRarity;
  targetGame: string;
  originMode: 'user-prompt' | 'auto-blank-fill';
  summary: string;
  upgradeReason: string;
  stats: Array<{ label: string; value: string }>;
  spawnRule: string;
  iconColor: string;
  codeSnippet: string;
  createdAt: number;
}

export interface ContentBlankGap {
  id: string;
  title: string;
  category: SmartGameItemCategory;
  severity: 'high' | 'medium';
  targetGame: string;
  description: string;
  suggestedPrompt: string;
}

export interface SyntheticIntegrationRecord {
  id: string;
  title: string;
  targetId: string;
  targetName: string;
  sourceCode: string;
  detectedRequirements: string[];
  synthesisSummary: string;
  bridgeCode: string;
  unifiedHtml: string;
  supportDaemonsUsed: string[];
  createdAt: number;
}

export type SmartSortGroupKey =
  | 'smart-auto'
  | 'game-engines'
  | 'unificators'
  | 'brain-daemons'
  | 'media-synth'
  | 'workspace';

export interface SmartSortedAppEntry {
  id: AppId;
  name: string;
  shortName: string;
  category: string;
  axis: TrilateralAxis;
  accentGradient: string;
  iconName: string;
  group: SmartSortGroupKey;
  score: number;
  isOpen: boolean;
  isFocused: boolean;
}

export interface StorageSubsystemStat {
  id: string;
  label: string;
  location: 'IndexedDB' | 'LocalStorage';
  bytes: number;
  itemCount: number;
  targetAppId: AppId;
  color: string;
}

export interface StorageGrowthPoint {
  timestamp: number;
  timeLabel: string;
  trackedBytes: number;
  vfsBytes: number;
  browserUsageBytes: number;
}

export interface StorageTelemetrySnapshot {
  quotaBytes: number;
  browserUsageBytes: number;
  freeBytes: number;
  percentAllocatedUsed: number;
  totalTrackedBytes: number;
  baselineBytes: number;
  netGrowthBytes: number;
  growthRateBytesPerMin: number;
  subsystems: StorageSubsystemStat[];
  growthHistory: StorageGrowthPoint[];
  lastSampledAt: number;
  estimateSupported: boolean;
}

export interface EnvironmentSynthesisResult {
  id: string;
  mode: 'synthesize-prompt' | 'build-environment';
  environmentName: string;
  userPrompt: string;
  synthesizedPrompt: string;
  architectureSummary: string;
  orchestratedApps: Array<{
    appId: AppId;
    appName: string;
    roleInEnvironment: string;
  }>;
  vfsFilesWritten: Array<{
    name: string;
    path: string;
    size: number;
  }>;
  hookCode: string;
  environmentHtml5: string;
  printedAppId?: AppId;
  createdAt: number;
}

export type LibraryClusterDomain =
  | 'webgl-shader'
  | 'audio-dsp'
  | 'swarm-ai'
  | 'physics-ballistics'
  | 'cad-geometry'
  | 'ui-chrome'
  | 'hybrid-runtime';

export interface CodeLibraryModule {
  id: string;
  name: string;
  sourceLabel: string;
  language: 'js' | 'html' | 'css' | 'glsl';
  symbols: string[];
  code: string;
  bytes: number;
}

export interface CodeLibraryCluster {
  id: string;
  name: string;
  domain: LibraryClusterDomain;
  summary: string;
  colorHex: string;
  dependencies: string[];
  modules: CodeLibraryModule[];
  previewHtml: string;
  generation: number;
  updatedAt: number;
}

export interface HybridDaemonStepReport {
  role: DaemonRole;
  name: string;
  contribution: string;
  status: 'complete' | 'active';
}

export interface HybridAppBuild {
  id: string;
  appName: string;
  shortName: string;
  description: string;
  architectureSummary: string;
  sourcesUsed: string[];
  clustersUsed: string[];
  daemonReports: HybridDaemonStepReport[];
  html5Code: string;
  improvementPass: number;
  printedAppId?: AppId;
  createdAt: number;
}

export interface SentientContentDraft {
  id: string;
  title: string;
  kind: 'game' | 'visual-tool' | 'audio-synth' | 'simulation' | 'workspace-app';
  userPrompt: string;
  synthesizedNarrative: string;
  architectureNotes: string;
  systemsUsed: string[];
  clustersBound: string[];
  daemonsEngaged: number;
  smartItemName?: string;
  smartItemSummary?: string;
  smartItemSnippet?: string;
  html5Code: string;
  revision: number;
  mintedAppId?: AppId;
  createdAt: number;
  updatedAt: number;
}



