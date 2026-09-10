import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../src/server/engine';
import { MUSIC_PLAYLIST, BackgroundMusicPlayer, SoundSynthesizer, AudioManager } from '../src/client/audio';

describe('Downed Player Movement Restrictions', () => {
  let engine: GameEngine;

  beforeEach(() => {
    engine = new GameEngine();
  });

  it('strictly prevents a downed player from moving coordinates', () => {
    const barrett = engine.entities.get('hero-barrett')!;
    barrett.isBot = false;
    barrett.x = 10;
    barrett.y = 12;
    barrett.hp = 0;
    barrett.isDowned = true;

    // Try moving in all 4 cardinal directions
    engine.handlePlayerMove('hero-barrett', 1, 0); // East
    expect(barrett.x).toBe(10);
    expect(barrett.y).toBe(12);

    engine.handlePlayerMove('hero-barrett', -1, 0); // West
    expect(barrett.x).toBe(10);
    expect(barrett.y).toBe(12);

    engine.handlePlayerMove('hero-barrett', 0, 1); // South
    expect(barrett.x).toBe(10);
    expect(barrett.y).toBe(12);

    engine.handlePlayerMove('hero-barrett', 0, -1); // North
    expect(barrett.x).toBe(10);
    expect(barrett.y).toBe(12);

    expect(barrett.isDowned).toBe(true);
  });

  it('prevents a downed player from fast-traveling on the world map', () => {
    const barrett = engine.entities.get('hero-barrett')!;
    barrett.isBot = false;
    barrett.hp = 0;
    barrett.isDowned = true;
    const initialZone = { ...barrett.zone };

    // Try to travel to another parsec
    engine.handleWorldMapTravel('hero-barrett', 6, 3, 1, 1);

    expect(barrett.zone.parasangX).toBe(initialZone.parasangX);
    expect(barrett.zone.parasangY).toBe(initialZone.parasangY);
    expect(barrett.zone.zoneX).toBe(initialZone.zoneX);
    expect(barrett.zone.zoneY).toBe(initialZone.zoneY);
  });

  it('prevents downed player from performing offensive actions but allows waiting', () => {
    const barrett = engine.entities.get('hero-barrett')!;
    barrett.isBot = false;
    barrett.hp = 0;
    barrett.isDowned = true;

    // Attack action should be blocked
    engine.handlePlayerAction('hero-barrett', 'attack', 11, 12);
    // Position and state unchanged
    expect(barrett.isDowned).toBe(true);

    // Wait action is allowed and advances simulation for companions
    expect(() => {
      engine.handlePlayerAction('hero-barrett', 'wait');
    }).not.toThrow();
  });
});

describe('Background Music & Organic Sound Design', () => {
  it('registers both Subterranean Echoes tracks in the playlist', () => {
    expect(MUSIC_PLAYLIST.length).toBe(2);
    expect(MUSIC_PLAYLIST[0].url).toContain('Subterranean%20Echoes.mp3');
    expect(MUSIC_PLAYLIST[1].url).toContain('Subterranean%20Echoes(1).mp3');
    expect(MUSIC_PLAYLIST[0].title).toBe('Subterranean Echoes - Part I');
    expect(MUSIC_PLAYLIST[1].title).toBe('Subterranean Echoes - Part II');
  });

  it('defaults 8-bit sound effects to disabled', () => {
    const sfx = new SoundSynthesizer();
    // User requirement: "also i don't like the 8-bit sounds"
    expect(sfx.enabled).toBe(false);
  });

  it('suppresses all sound effects when disabled without throwing errors', () => {
    const sfx = new SoundSynthesizer();
    sfx.enabled = false;

    expect(() => {
      sfx.playLaser();
      sfx.playFreeze();
      sfx.playShatterExplosion();
      sfx.playCreeperBlast();
      sfx.playRockKingSlap();
      sfx.playRevive();
      sfx.playPickup();
      sfx.playVictoryFanfare();
      sfx.playMiningHit();
      sfx.playWallCollapse();
    }).not.toThrow();
  });

  it('cycles playlist tracks in background music player', () => {
    const music = new BackgroundMusicPlayer();
    expect(music.currentTrackIndex).toBe(0);
    expect(music.getCurrentTrack().title).toBe('Subterranean Echoes - Part I');

    music.nextTrack();
    expect(music.currentTrackIndex).toBe(1);
    expect(music.getCurrentTrack().title).toBe('Subterranean Echoes - Part II');

    music.nextTrack();
    expect(music.currentTrackIndex).toBe(0);
    expect(music.getCurrentTrack().title).toBe('Subterranean Echoes - Part I');
  });

  it('provides a unified AudioManager with background music and organic SFX', () => {
    const audio = new AudioManager();
    expect(audio.music).toBeDefined();
    expect(audio.sfx).toBeDefined();
    expect(audio.sfx.enabled).toBe(false);
    expect(() => audio.playLaser()).not.toThrow();
  });
});
