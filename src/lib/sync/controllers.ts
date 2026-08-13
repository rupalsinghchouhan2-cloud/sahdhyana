/**
 * Playback controllers — one uniform interface over very different backends.
 * Direct audio uses an <audio> element; YouTube uses the official IFrame Player
 * API (no downloading, no circumvention — embedding rules are respected).
 */

export interface PlaybackController {
  load(urlOrId: string): Promise<void>;
  play(): void;
  pause(): void;
  seekTo(seconds: number): void;
  getPosition(): number;
  getDuration(): number | null;
  setRate(rate: number): void;
  onEnded(cb: () => void): void;
  onReady?(cb: () => void): void;
  destroy(): void;
}

// ---------------------------------------------------------------- direct audio
export class DirectAudioController implements PlaybackController {
  private el: HTMLAudioElement;
  private endedCb: (() => void) | null = null;
  private readyCb: (() => void) | null = null;

  constructor() {
    this.el = new Audio();
    this.el.preload = 'auto';
    this.el.addEventListener('ended', () => this.endedCb?.());
    this.el.addEventListener('canplay', () => this.readyCb?.());
  }

  async load(url: string): Promise<void> {
    this.el.src = url;
    this.el.load();
  }
  play(): void {
    void this.el.play().catch(() => {
      /* browser autoplay guard — UI will surface a tap-to-resume */
    });
  }
  pause(): void {
    this.el.pause();
  }
  seekTo(seconds: number): void {
    if (Number.isFinite(this.el.duration)) {
      this.el.currentTime = Math.min(Math.max(0, seconds), this.el.duration);
    } else {
      this.el.currentTime = Math.max(0, seconds);
    }
  }
  getPosition(): number {
    return this.el.currentTime;
  }
  getDuration(): number | null {
    return Number.isFinite(this.el.duration) ? this.el.duration : null;
  }
  setRate(rate: number): void {
    this.el.playbackRate = rate;
  }
  onEnded(cb: () => void): void {
    this.endedCb = cb;
  }
  onReady(cb: () => void): void {
    this.readyCb = cb;
  }
  destroy(): void {
    this.el.pause();
    this.el.removeAttribute('src');
    this.el.load();
  }
}

// ---------------------------------------------------------------- YouTube
declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytApiPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve) => {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = () => resolve();
    });
  }
  return ytApiPromise;
}

export class YouTubeController implements PlaybackController {
  private player: any = null;
  private endedCb: (() => void) | null = null;
  private readyCb: (() => void) | null = null;
  private host: HTMLElement;

  constructor(hostElement: HTMLElement) {
    this.host = hostElement;
  }

  async load(videoId: string): Promise<void> {
    await loadYouTubeApi();
    if (this.player) {
      this.player.loadVideoById(videoId);
      this.player.pauseVideo();
      return;
    }
    this.player = new window.YT.Player(this.host, {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: () => this.readyCb?.(),
        onStateChange: (e: any) => {
          if (e.data === window.YT.PlayerState.ENDED) this.endedCb?.();
        },
      },
    });
  }
  play(): void {
    this.player?.playVideo?.();
  }
  pause(): void {
    this.player?.pauseVideo?.();
  }
  seekTo(seconds: number): void {
    this.player?.seekTo?.(Math.max(0, seconds), true);
  }
  getPosition(): number {
    return this.player?.getCurrentTime?.() ?? 0;
  }
  getDuration(): number | null {
    const d = this.player?.getDuration?.();
    return typeof d === 'number' && d > 0 ? d : null;
  }
  setRate(rate: number): void {
    // The official API only accepts discrete rates; 1 is always available.
    this.player?.setPlaybackRate?.(rate === 1 ? 1 : 1);
  }
  onEnded(cb: () => void): void {
    this.endedCb = cb;
  }
  onReady(cb: () => void): void {
    this.readyCb = cb;
  }
  destroy(): void {
    this.player?.destroy?.();
    this.player = null;
  }
}
