import { neuralBus } from './neuralBus';

export interface VideoHandoffPayload {
  id: string;
  title: string;
  objectUrl: string;
  duration: number;
  trimIn: number;
  trimOut: number;
  speed: number;
  brightness: number;
  contrast: number;
  saturation: number;
  opacity: number;
  overlayText: string;
  overlayPos: 'top' | 'center' | 'bottom';
  liquidUnderlay: boolean;
  liquidMode: 'bio-caustics' | 'ferro-pulse' | 'neural-phosphor' | 'mycelial-field';
}

export interface AudioTrackHandoff {
  id: string;
  title: string;
  objectUrl: string;
  duration: number;
}

type VideoHandoffListener = (payload: VideoHandoffPayload) => void;
type AudioHandoffListener = (payload: AudioTrackHandoff) => void;

class MediaBridgeService {
  private pendingVideo: VideoHandoffPayload | null = null;
  private pendingLiquidVideo: VideoHandoffPayload | null = null;
  private pendingAudio: AudioTrackHandoff | null = null;
  private videoListeners = new Set<VideoHandoffListener>();
  private liquidVideoListeners = new Set<VideoHandoffListener>();
  private audioListeners = new Set<AudioHandoffListener>();

  // WeakMap ensures a given HTMLMediaElement is only bound to MediaElementAudioSourceNode once
  private boundMediaSources = new WeakMap<
    HTMLMediaElement,
    { ctx: AudioContext; source: MediaElementAudioSourceNode }
  >();

  sendVideoToEditor(payload: VideoHandoffPayload): void {
    this.pendingVideo = payload;
    this.videoListeners.forEach((cb) => cb(payload));
    neuralBus.publish('FORGE', 'MEDIA_HANDOFF', `Transferred "${payload.title}" to Video Editor.`);
  }

  consumePendingVideo(): VideoHandoffPayload | null {
    const p = this.pendingVideo;
    this.pendingVideo = null;
    return p;
  }

  subscribeVideoHandoffs(cb: VideoHandoffListener): () => void {
    this.videoListeners.add(cb);
    return () => {
      this.videoListeners.delete(cb);
    };
  }

  sendVideoToLiquidVideo(payload: VideoHandoffPayload): void {
    this.pendingLiquidVideo = payload;
    this.liquidVideoListeners.forEach((cb) => cb(payload));
    neuralBus.publish('FORGE', 'LIQUID_VIDEO_HANDOFF', `Transferred "${payload.title}" into Liquid Video Pixel Matrix.`);
  }

  consumePendingLiquidVideo(): VideoHandoffPayload | null {
    const p = this.pendingLiquidVideo;
    this.pendingLiquidVideo = null;
    return p;
  }

  subscribeLiquidVideoHandoffs(cb: VideoHandoffListener): () => void {
    this.liquidVideoListeners.add(cb);
    return () => {
      this.liquidVideoListeners.delete(cb);
    };
  }

  sendAudioToEditor(payload: AudioTrackHandoff): void {
    this.pendingAudio = payload;
    this.audioListeners.forEach((cb) => cb(payload));
    neuralBus.publish('AUDIO', 'AUDIO_HANDOFF', `Sent audio track "${payload.title}" to Video Editor.`);
  }

  consumePendingAudio(): AudioTrackHandoff | null {
    const p = this.pendingAudio;
    this.pendingAudio = null;
    return p;
  }

  subscribeAudioHandoffs(cb: AudioHandoffListener): () => void {
    this.audioListeners.add(cb);
    return () => {
      this.audioListeners.delete(cb);
    };
  }

  getOrCreateMediaSource(
    ctx: AudioContext,
    el: HTMLMediaElement
  ): MediaElementAudioSourceNode | null {
    const existing = this.boundMediaSources.get(el);
    if (existing && existing.ctx === ctx) {
      return existing.source;
    }
    if (existing) {
      return null;
    }
    try {
      const source = ctx.createMediaElementSource(el);
      this.boundMediaSources.set(el, { ctx, source });
      return source;
    } catch {
      return null;
    }
  }
}

export const mediaBridge = new MediaBridgeService();
