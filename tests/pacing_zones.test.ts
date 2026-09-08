import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/server/engine';

describe('Zone-Aware Hybrid Pacing Simulation', () => {
  it('defaults to turn-based mode when only one human player is in the zone', () => {
    const engine = new GameEngine();
    const spawnZone = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 };

    // Claim Barrett as human player
    engine.assignHumanPlayer('barrett', 'BarrettPlayer');

    const mode = engine.getPacingModeForZone(spawnZone);
    expect(mode).toBe('turn_based');
  });

  it('shifts to crisp real-time mode when two or more human players are in the same zone', () => {
    const engine = new GameEngine();
    const spawnZone = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 };

    // Claim Barrett and Luther as human players in the same spawn zone
    engine.assignHumanPlayer('barrett', 'BarrettPlayer');
    engine.assignHumanPlayer('luther', 'LutherPlayer');

    const mode = engine.getPacingModeForZone(spawnZone);
    expect(mode).toBe('real_time');
  });

  it('reverts to turn-based mode if one player moves to another zone/parasang', () => {
    const engine = new GameEngine();
    const spawnZone = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 };
    const minesZone = { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 1 };

    const barrett = engine.assignHumanPlayer('barrett', 'BarrettPlayer')!;
    const luther = engine.assignHumanPlayer('luther', 'LutherPlayer')!;

    // Move Barrett into Whitehill Mines (depth 1)
    barrett.zone = minesZone;

    expect(engine.getPacingModeForZone(spawnZone)).toBe('turn_based');
    expect(engine.getPacingModeForZone(minesZone)).toBe('turn_based');
  });

  it('allows adjusting real-time tick rate within 2 to 10 Hz', () => {
    const engine = new GameEngine();
    engine.setTickRate(8);
    expect(engine.tickRate).toBe(8);

    engine.setTickRate(15); // Clamped to 10
    expect(engine.tickRate).toBe(10);

    engine.setTickRate(1); // Clamped to 2
    expect(engine.tickRate).toBe(2);
  });
});
