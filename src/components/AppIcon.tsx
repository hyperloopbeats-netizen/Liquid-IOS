import {
  Activity,
  AudioWaveform,
  Blocks,
  Box,
  Clapperboard,
  Cpu,
  Crosshair,
  Disc3,
  Droplets,
  Film,
  Gamepad2,
  HardDrive,
  History,
  Music2,
  Orbit,
  Play,
  ScanSearch,
  ShieldCheck,
  Sliders,
  Sparkles,
  Terminal,
  Wand2,
} from 'lucide-react';

export function AppIcon({ name, className = 'w-5 h-5 text-white' }: { name: string; className?: string }) {
  switch (name) {
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
    case 'activity':
    default:
      return <Activity className={className} />;
  }
}
