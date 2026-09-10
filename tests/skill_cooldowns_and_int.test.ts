import { describe, it, expect } from 'vitest';
import { SKILL_DEFINITIONS } from '../src/shared/constants';
import {
  calculateCooldownReductionPct,
  calculateSkillCooldown,
  calculateHeroDerivedStats
} from '../src/shared/formulas';
import { GameEngine } from '../src/server/engine';
import { stepCompanionBot } from '../src/server/bots';
import { Entity } from '../src/shared/types';

describe('Skill Cooldowns (30-40 Turns Base)', () => {
  it('all active skills have a base cooldown between 30 and 40 turns', () => {
    const activeSkills = SKILL_DEFINITIONS.filter(s => s.type === 'active');
    expect(activeSkills.length).toBeGreaterThanOrEqual(8);

    for (const skill of activeSkills) {
      expect(skill.cooldownTicks).toBeDefined();
      expect(skill.cooldownTicks).toBeGreaterThanOrEqual(30);
      expect(skill.cooldownTicks).toBeLessThanOrEqual(40);
    }
  });

  it('verifies specific active skill base cooldowns match design specs', () => {
    const skillMap = new Map(SKILL_DEFINITIONS.map(s => [s.id, s]));

    expect(skillMap.get('phase_shift')?.cooldownTicks).toBe(35);
    expect(skillMap.get('whirlwind')?.cooldownTicks).toBe(30);
    expect(skillMap.get('shield_slam')?.cooldownTicks).toBe(30);
    expect(skillMap.get('concussive_blast')?.cooldownTicks).toBe(35);
    expect(skillMap.get('nano_sentry')?.cooldownTicks).toBe(40);
    expect(skillMap.get('cryo_nova')?.cooldownTicks).toBe(40);
    expect(skillMap.get('restorative_mist')?.cooldownTicks).toBe(38);
    expect(skillMap.get('kinetic_slam')?.cooldownTicks).toBe(32);
  });
});

describe('Intelligence Impacts Cooldown Reduction (CDR)', () => {
  it('calculateCooldownReductionPct yields correct percentages', () => {
    expect(calculateCooldownReductionPct(10)).toBe(0); // Baseline 10 INT = 0% CDR
    expect(calculateCooldownReductionPct(12)).toBe(5); // +2 INT = 5% CDR
    expect(calculateCooldownReductionPct(14)).toBe(10); // +4 INT = 10% CDR
    expect(calculateCooldownReductionPct(16)).toBe(15); // +6 INT = 15% CDR
    expect(calculateCooldownReductionPct(18)).toBe(20); // +8 INT = 20% CDR
    expect(calculateCooldownReductionPct(30)).toBe(50); // Hard cap at 50% CDR
    expect(calculateCooldownReductionPct(40)).toBe(50); // Hard cap remains 50% CDR
    expect(calculateCooldownReductionPct(8)).toBe(-5); // Sub-10 INT penalizes cooldown
  });

  it('calculateSkillCooldown correctly scales base cooldowns by intelligence', () => {
    // 40 turns base (Cryo Nova, Nano Sentry)
    expect(calculateSkillCooldown(40, 10)).toBe(40); // 0% CDR
    expect(calculateSkillCooldown(40, 14)).toBe(36); // 10% CDR -> 40 * 0.90 = 36
    expect(calculateSkillCooldown(40, 18)).toBe(32); // 20% CDR -> 40 * 0.80 = 32
    expect(calculateSkillCooldown(40, 30)).toBe(20); // 50% CDR -> 40 * 0.50 = 20

    // 35 turns base (Phase Shift, Concussive Blast)
    expect(calculateSkillCooldown(35, 10)).toBe(35);
    expect(calculateSkillCooldown(35, 16)).toBe(30); // 15% CDR -> 35 * 0.85 = 29.75 -> 30

    // 32 turns base (Kinetic Slam)
    expect(calculateSkillCooldown(32, 10)).toBe(32);
    expect(calculateSkillCooldown(32, 16)).toBe(27); // 15% CDR -> 32 * 0.85 = 27.2 -> 27

    // 30 turns base (Whirlwind, Shield Slam)
    expect(calculateSkillCooldown(30, 10)).toBe(30);
    expect(calculateSkillCooldown(30, 14)).toBe(27); // 10% CDR -> 30 * 0.90 = 27
  });

  it('calculateHeroDerivedStats provides cooldownReductionPct matching hero INT', () => {
    const dummyHero: Entity = {
      id: 'hero-test',
      name: 'Luca',
      x: 5,
      y: 5,
      zone: { parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 },
      symbol: '@',
      color: '#c084fc',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      role: 'luca',
      isPlayer: true,
      statusEffects: {},
      inventory: [],
      facing: { dx: 1, dy: 0 },
      attributes: {
        str: 10,
        agi: 14,
        tou: 12,
        int: 16, // 15% CDR
        wil: 18,
        ego: 16
      }
    };

    const derived = calculateHeroDerivedStats(dummyHero);
    expect(derived.cooldownReductionPct).toBe(15);
  });
});

describe('GameEngine Cooldown Execution and Turn Tickdown', () => {
  it('sets intelligence-scaled cooldown when player activates skill, and blocks reactivation until elapsed', () => {
    const engine = new GameEngine();
    const player = engine.assignHumanPlayer('barrett', 'Barrett')!;
    player.attributes = {
      str: 14,
      agi: 18,
      tou: 14,
      int: 18, // 20% CDR
      wil: 12,
      ego: 14
    };
    player.energy = 100;
    player.skillsLearned = ['whirlwind'];

    // Whirlwind base cooldown is 30 turns. With 18 INT (20% CDR): 30 * 0.80 = 24 turns
    engine.handleActivateSkill(player.id, 'whirlwind');

    expect(player.skillCooldowns).toBeDefined();
    // Casting consumes the current turn step, leaving 23 turns remaining
    expect(player.skillCooldowns?.['whirlwind']).toBe(23);

    // Immediate reactivation should fail and remain on cooldown
    engine.handleActivateSkill(player.id, 'whirlwind');
    expect(player.skillCooldowns?.['whirlwind']).toBe(23);

    // Simulate remaining 23 turns of movement/ticks
    for (let i = 0; i < 23; i++) {
      engine.handlePlayerMove(player.id, 0, 0); // Wait/step turn
    }

    expect(player.skillCooldowns?.['whirlwind']).toBe(0);

    // Can cast whirlwind again once cooldown has fully elapsed
    player.energy = 100;
    engine.handleActivateSkill(player.id, 'whirlwind');
    expect(player.skillCooldowns?.['whirlwind']).toBe(23);
  });

  it('companion bots respect cooldowns and do not spam skills', () => {
    const engine = new GameEngine();
    const zone = engine.getOrCreateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 });

    const luca: Entity = {
      id: 'hero-luca',
      name: 'Luca',
      x: 5,
      y: 5,
      zone: zone.coord,
      symbol: '@',
      color: '#c084fc',
      hp: 100,
      maxHp: 100,
      energy: 100,
      maxEnergy: 100,
      role: 'luca',
      isPlayer: true,
      isBot: true,
      statusEffects: {},
      inventory: [],
      facing: { dx: 1, dy: 0 },
      attributes: {
        str: 10,
        agi: 14,
        tou: 12,
        int: 16,
        wil: 18,
        ego: 16
      },
      skillCooldowns: {
        kinetic_slam: 20 // on cooldown
      }
    };

    const enemy: Entity = {
      id: 'enemy-1',
      name: 'Zombie Crawler',
      x: 7,
      y: 5,
      zone: zone.coord,
      symbol: 'Z',
      color: '#ff4444',
      hp: 50,
      maxHp: 50,
      energy: 0,
      maxEnergy: 0,
      role: 'zombie',
      isPlayer: false,
      statusEffects: {},
      inventory: [],
      facing: { dx: -1, dy: 0 }
    };

    const decision = stepCompanionBot(luca, [luca, enemy], zone);
    // Since kinetic_slam is on cooldown (20), bot cannot use kinetic_slam
    expect(decision.actionType).not.toBe('kinetic_slam');
  });
});
