export type AppId =
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
  | 'liquideq'
  | 'visualsynth'
  | 'microfractal'
  | 'modelforge'
  | 'synesthesia'
  | 'healer'
  | 'gamedev'
  | 'neuralbus';

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
  snapMode?: 'left' | 'right' | 'full' | null;
  prevBounds?: { x: number; y: number; width: number; height: number };
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
  | 'binary-refract-agent';

export type ModelBackend = 'gemini-cloud' | 'ollama-local' | 'edge-ast';

export interface DaemonConfig {
  role: DaemonRole;
  name: string;
  category: 'core' | 'upgrade';
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
