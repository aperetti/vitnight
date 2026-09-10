export interface MusicTrack {
  id: string;
  title: string;
  url: string;
}

export const MUSIC_PLAYLIST: MusicTrack[] = [
  {
    id: 'subterranean-echoes-1',
    title: 'Subterranean Echoes - Part I',
    url: '/music/Subterranean%20Echoes.mp3'
  },
  {
    id: 'subterranean-echoes-2',
    title: 'Subterranean Echoes - Part II',
    url: '/music/Subterranean%20Echoes(1).mp3'
  }
];

export class BackgroundMusicPlayer {
  private audioElement: HTMLAudioElement | null = null;
  public tracks: MusicTrack[] = MUSIC_PLAYLIST;
  public currentTrackIndex: number = 0;
  public isPlaying: boolean = false;
  public volume: number = 0.35;
  public enabled: boolean = true;
  private hasUnlocked: boolean = false;

  public onTrackChange?: (track: MusicTrack, isPlaying: boolean) => void;
  public onStateChange?: (isPlaying: boolean, volume: number) => void;

  constructor() {
    this.loadSettings();
    this.initAudio();
    this.setupUnlockListeners();
  }

  private loadSettings() {
    try {
      const savedEnabled = localStorage.getItem('vitnight_music_enabled');
      if (savedEnabled !== null) {
        this.enabled = savedEnabled === 'true';
      }
      const savedVol = localStorage.getItem('vitnight_music_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) {
          this.volume = Math.max(0, Math.min(1, parsed));
        }
      }
      const savedTrack = localStorage.getItem('vitnight_music_track_index');
      if (savedTrack !== null) {
        const parsed = parseInt(savedTrack, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < this.tracks.length) {
          this.currentTrackIndex = parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load music settings from localStorage', e);
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('vitnight_music_enabled', String(this.enabled));
      localStorage.setItem('vitnight_music_volume', String(this.volume));
      localStorage.setItem('vitnight_music_track_index', String(this.currentTrackIndex));
    } catch (e) {
      console.warn('Could not save music settings to localStorage', e);
    }
  }

  private initAudio() {
    if (typeof window === 'undefined') return;
    this.audioElement = new Audio();
    this.audioElement.preload = 'auto';
    this.audioElement.volume = this.volume;

    const curTrack = this.tracks[this.currentTrackIndex];
    if (curTrack) {
      this.audioElement.src = encodeURI(curTrack.url);
    }

    this.audioElement.addEventListener('ended', () => {
      this.nextTrack();
    });

    this.audioElement.addEventListener('play', () => {
      this.isPlaying = true;
      this.onStateChange?.(true, this.volume);
      this.onTrackChange?.(this.getCurrentTrack(), true);
    });

    this.audioElement.addEventListener('pause', () => {
      this.isPlaying = false;
      this.onStateChange?.(false, this.volume);
      this.onTrackChange?.(this.getCurrentTrack(), false);
    });

    this.audioElement.addEventListener('error', (e) => {
      console.warn('Background music playback error, advancing track:', e);
      window.setTimeout(() => {
        if (this.enabled) {
          this.nextTrack();
        }
      }, 1500);
    });
  }

  private setupUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlockHandler = () => {
      if (this.hasUnlocked) return;
      this.hasUnlocked = true;

      if (this.enabled && !this.isPlaying) {
        this.play().catch(() => {});
      }

      window.removeEventListener('pointerdown', unlockHandler);
      window.removeEventListener('keydown', unlockHandler);
      window.removeEventListener('click', unlockHandler);
    };

    window.addEventListener('pointerdown', unlockHandler, { once: true });
    window.addEventListener('keydown', unlockHandler, { once: true });
    window.addEventListener('click', unlockHandler, { once: true });
  }

  public getCurrentTrack(): MusicTrack {
    return this.tracks[this.currentTrackIndex] || this.tracks[0];
  }

  public async play(): Promise<void> {
    if (!this.enabled || !this.audioElement) return;
    try {
      const curTrack = this.getCurrentTrack();
      const currentSrc = this.audioElement.src;

      if (!currentSrc || !currentSrc.includes(encodeURIComponent('Subterranean'))) {
        this.audioElement.src = encodeURI(curTrack.url);
      }

      this.audioElement.volume = this.volume;
      await this.audioElement.play();
      this.isPlaying = true;
      this.onTrackChange?.(curTrack, true);
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.name !== 'NotAllowedError') {
        console.warn('Music play failed:', err);
      }
      this.isPlaying = false;
    }
  }

  public pause(): void {
    if (!this.audioElement) return;
    this.audioElement.pause();
    this.isPlaying = false;
    this.onTrackChange?.(this.getCurrentTrack(), false);
  }

  public togglePlayPause(): boolean {
    if (this.isPlaying) {
      this.pause();
      this.setEnabled(false);
      return false;
    } else {
      this.setEnabled(true);
      this.play();
      return true;
    }
  }

  public setEnabled(val: boolean): void {
    this.enabled = val;
    this.saveSettings();
    if (!val) {
      this.pause();
    } else if (!this.isPlaying) {
      this.play();
    }
    this.onStateChange?.(this.isPlaying, this.volume);
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
    this.saveSettings();
    this.onStateChange?.(this.isPlaying, this.volume);
  }

  public nextTrack(): void {
    this.currentTrackIndex = (this.currentTrackIndex + 1) % this.tracks.length;
    this.saveSettings();
    if (this.audioElement) {
      const curTrack = this.getCurrentTrack();
      this.audioElement.src = encodeURI(curTrack.url);
      if (this.enabled) {
        this.play();
      } else {
        this.onTrackChange?.(curTrack, false);
      }
    }
  }

  public prevTrack(): void {
    this.currentTrackIndex = (this.currentTrackIndex - 1 + this.tracks.length) % this.tracks.length;
    this.saveSettings();
    if (this.audioElement) {
      const curTrack = this.getCurrentTrack();
      this.audioElement.src = encodeURI(curTrack.url);
      if (this.enabled) {
        this.play();
      } else {
        this.onTrackChange?.(curTrack, false);
      }
    }
  }
}

/**
 * SoundSynthesizer - Organic, ambient procedural sound effects.
 *
 * NOTE ON USER REQUIREMENT:
 * "also i don't like the 8-bit sounds"
 * 1. Default `enabled` is set to `false` so no 8-bit or buzzy sound effects play by default.
 * 2. If the user opts to enable SFX in settings, all waveforms use warm, filtered sine/noise
 *    harmonics and resonant lowpass biquad filters rather than harsh 8-bit square/sawtooth chiptune buzzing.
 */
export class SoundSynthesizer {
  private ctx: AudioContext | null = null;
  // Disabled by default per user request: "also i don't like the 8-bit sounds"
  public enabled: boolean = false;
  public volume: number = 0.25;

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('vitnight_sfx_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
      const savedVol = localStorage.getItem('vitnight_sfx_volume');
      if (savedVol !== null) {
        const parsed = parseFloat(savedVol);
        if (!isNaN(parsed)) {
          this.volume = Math.max(0, Math.min(1, parsed));
        }
      }
    } catch (e) {}
  }

  public saveSettings() {
    try {
      localStorage.setItem('vitnight_sfx_enabled', String(this.enabled));
      localStorage.setItem('vitnight_sfx_volume', String(this.volume));
    } catch (e) {}
  }

  public setEnabled(val: boolean) {
    this.enabled = val;
    this.saveSettings();
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    this.saveSettings();
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Soft atmospheric beam (smooth sine with subtle resonant filter, not harsh 8-bit sawtooth)
  public playLaser() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.18);

      osc.frequency.setValueAtTime(520, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.18);

      gain.gain.setValueAtTime(0.18 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
  }

  // Soft glacial chime
  public playFreeze() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1100, ctx.currentTime + 0.22);

      gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.22);
    } catch (e) {}
  }

  // Low resonant cave rumble
  public playShatterExplosion() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(350, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.35);

      osc.frequency.setValueAtTime(140, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(35, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {}
  }

  public playCreeperBlast() {
    if (!this.enabled) return;
    this.playShatterExplosion();
  }

  public playRockKingSlap() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(95, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.35 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {}
  }

  public playRevive() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [330, 392, 494, 587]; // E minor chord
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.09);

        gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime + i * 0.09);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.09 + 0.22);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.09);
        osc.stop(ctx.currentTime + i * 0.09 + 0.22);
      });
    } catch (e) {}
  }

  public playPickup() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.12 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }

  public playVictoryFanfare() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const notes = [440, 554, 659, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.15);

        gain.gain.setValueAtTime(0.18 * this.volume, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.35);
      });
    } catch (e) {}
  }

  public playMiningHit() {
    if (!this.enabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sine';
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, ctx.currentTime);

      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(60, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.2 * this.volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {}
  }

  public playWallCollapse() {
    if (!this.enabled) return;
    this.playShatterExplosion();
  }
}

/**
 * Unified AudioManager combining background music playlist and organic sound effects
 */
export class AudioManager {
  public music: BackgroundMusicPlayer;
  public sfx: SoundSynthesizer;

  constructor() {
    this.music = new BackgroundMusicPlayer();
    this.sfx = new SoundSynthesizer();
  }

  // Delegated SFX calls for backwards compatibility with existing call sites
  public playLaser() { this.sfx.playLaser(); }
  public playFreeze() { this.sfx.playFreeze(); }
  public playShatterExplosion() { this.sfx.playShatterExplosion(); }
  public playCreeperBlast() { this.sfx.playCreeperBlast(); }
  public playRockKingSlap() { this.sfx.playRockKingSlap(); }
  public playRevive() { this.sfx.playRevive(); }
  public playPickup() { this.sfx.playPickup(); }
  public playVictoryFanfare() { this.sfx.playVictoryFanfare(); }
  public playMiningHit() { this.sfx.playMiningHit(); }
  public playWallCollapse() { this.sfx.playWallCollapse(); }
}
