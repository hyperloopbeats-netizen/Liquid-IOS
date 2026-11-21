import {
  Activity,
  Aperture,
  Atom,
  AudioWaveform,
  BatteryCharging,
  Blocks,
  Bot,
  Box,
  Boxes,
  Brain,
  BrainCircuit,
  Clapperboard,
  Compass,
  Cpu,
  Crosshair,
  Database,
  Disc3,
  DraftingCompass,
  Droplets,
  Film,
  Flame,
  Gamepad,
  Gamepad2,
  HardDrive,
  History,
  Layers,
  Merge,
  Music2,
  Network,
  Orbit,
  Palette,
  Play,
  Printer,
  Radio,
  Rocket,
  ScanSearch,
  Shapes,
  ShieldCheck,
  Sliders,
  Sparkles,
  Sun,
  Terminal,
  Wand2,
  Zap,
} from 'lucide-react';

export function AppIcon({ name, className = 'w-5 h-5 text-white' }: { name: string; className?: string }) {
  switch (name) {
    case 'layers':
      return <Layers className={className} />;
    case 'atom':
      return <Atom className={className} />;
    case 'compass':
      return <Compass className={className} />;
    case 'drafting-compass':
      return <DraftingCompass className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'brain':
      return <Brain className={className} />;
    case 'bot':
      return <Bot className={className} />;
    case 'boxes':
      return <Boxes className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'merge':
      return <Merge className={className} />;
    case 'network':
      return <Network className={className} />;
    case 'shapes':
      return <Shapes className={className} />;
    case 'database':
      return <Database className={className} />;
    case 'gamepad':
      return <Gamepad className={className} />;
    case 'palette':
      return <Palette className={className} />;
    case 'brain-circuit':
      return <BrainCircuit className={className} />;
    case 'radio':
      return <Radio className={className} />;
    case 'printer':
      return <Printer className={className} />;
    case 'aperture':
      return <Aperture className={className} />;
    case 'blocks':
      return <Blocks className={className} />;
    case 'disc-3':
      return <Disc3 className={className} />;
    case 'droplets':
      return <Droplets className={className} />;
    case 'film':
      return <Film className={className} />;
    case 'wand-2':
      return <Wand2 className={className} />;
    case 'music-2':
      return <Music2 className={className} />;
    case 'clapperboard':
      return <Clapperboard className={className} />;
    case 'crosshair':
      return <Crosshair className={className} />;
    case 'sliders':
      return <Sliders className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'orbit':
      return <Orbit className={className} />;
    case 'cpu':
      return <Cpu className={className} />;
    case 'hard-drive':
      return <HardDrive className={className} />;
    case 'play':
      return <Play className={className} />;
    case 'scan-search':
      return <ScanSearch className={className} />;
    case 'box':
      return <Box className={className} />;
    case 'audio-waveform':
      return <AudioWaveform className={className} />;
    case 'shield-check':
      return <ShieldCheck className={className} />;
    case 'terminal':
      return <Terminal className={className} />;
    case 'history':
      return <History className={className} />;
    case 'gamepad-2':
      return <Gamepad2 className={className} />;
    case 'sun':
      return <Sun className={className} />;
    case 'battery-charging':
      return <BatteryCharging className={className} />;
    case 'rocket':
      return <Rocket className={className} />;
    case 'activity':
    default:
      return <Activity className={className} />;
  }
}
