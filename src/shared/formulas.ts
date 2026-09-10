import { Entity, Tile, Item } from './types';
import { BASE_HERO_ATTRIBUTES } from './constants';

export interface ShatterResult {
  triggered: boolean;
  epicenter: { x: number; y: number };
  damage: number;
  aoeRadius: number;
  affectedEntities: { id: string; damage: number }[];
}

export function calculateShatterExplosion(
  target: Entity,
  allEntitiesInZone: Entity[],
  isFireAttack: boolean
): ShatterResult {
  if (!isFireAttack || !target.statusEffects.frozen) {
    return {
      triggered: false,
      epicenter: { x: target.x, y: target.y },
      damage: 0,
      aoeRadius: 0,
      affectedEntities: []
    };
  }

  // Freeze shattered! Clear frozen status
  delete target.statusEffects.frozen;

  const aoeRadius = 3;
  const shatterDamage = 45;
  const affected: { id: string; damage: number }[] = [];

  for (const entity of allEntitiesInZone) {
    if (entity.id === target.id) continue;
    const dist = Math.hypot(entity.x - target.x, entity.y - target.y);
    if (dist <= aoeRadius) {
      // Falloff with distance
      const dmg = Math.round(shatterDamage * (1 - dist / (aoeRadius + 1)));
      affected.push({ id: entity.id, damage: Math.max(15, dmg) });
    }
  }

  return {
    triggered: true,
    epicenter: { x: target.x, y: target.y },
    damage: shatterDamage,
    aoeRadius,
    affectedEntities: affected
  };
}

export interface KnockbackResult {
  finalX: number;
  finalY: number;
  hitWall: boolean;
  wallImpactDamage: number;
}

export function calculateKnockback(
  originX: number,
  originY: number,
  targetX: number,
  targetY: number,
  force: number,
  tiles: Tile[][],
  width: number,
  height: number
): KnockbackResult {
  let dx = targetX - originX;
  let dy = targetY - originY;
  const len = Math.hypot(dx, dy);

  if (len === 0) {
    dx = 1;
    dy = 0;
  } else {
    dx = Math.round(dx / len);
    dy = Math.round(dy / len);
  }

  let curX = targetX;
  let curY = targetY;
  let hitWall = false;

  for (let step = 0; step < force; step++) {
    const nextX = curX + dx;
    const nextY = curY + dy;

    if (nextX < 1 || nextX >= width - 1 || nextY < 1 || nextY >= height - 1) {
      hitWall = true;
      break;
    }

    const tile = tiles[nextY][nextX];
    if (!tile.walkable) {
      hitWall = true;
      break;
    }

    curX = nextX;
    curY = nextY;
  }

  return {
    finalX: curX,
    finalY: curY,
    hitWall,
    wallImpactDamage: hitWall ? Math.round(force * 5) : 0
  };
}

/**
 * Determine if two items are like items that should combine into a stack.
 */
export function areLikeItems(a: Item, b: Item): boolean {
  return (
    a.name === b.name &&
    a.type === b.type &&
    (a.slot || '') === (b.slot || '') &&
    (a.rarity || 'common') === (b.rarity || 'common') &&
    (a.colorTag || '') === (b.colorTag || '') &&
    (a.runeStat || '') === (b.runeStat || '') &&
    (a.atkBonus || 0) === (b.atkBonus || 0) &&
    (a.defenseBonus || 0) === (b.defenseBonus || 0) &&
    (a.shieldBonus || 0) === (b.shieldBonus || 0) &&
    (a.hpBonus || 0) === (b.hpBonus || 0) &&
    (a.energyBonus || 0) === (b.energyBonus || 0)
  );
}

/**
 * Consolidate an array of items by combining all like items into stacks.
 */
export function combineLikeItems(inventory: Item[]): Item[] {
  const combined: Item[] = [];
  for (const item of inventory) {
    const existing = combined.find(it => areLikeItems(it, item));
    if (existing) {
      existing.count = (existing.count || 1) + (item.count || 1);
    } else {
      combined.push({ ...item, count: item.count || 1 });
    }
  }
  return combined;
}

export interface HeroDerivedStats {
  maxHp: number;
  hp: number;
  touHpBonus: number;
  levelHpBonus: number;
  maxEnergy: number;
  energy: number;
  intEnergyBonus: number;
  cooldownReductionPct: number;
  shieldCap: number;
  shieldHp: number;
  wilShieldBonus: number;
  meleeAtkBonus: number;
  rangedAtkBonus: number;
  dodgeChance: number;
  flatDamageReduction: number;
  armorPercent: number;
  maxCarryWeight: number;
  partyEgoBonus: number;
}

/**
 * Calculates Cooldown Reduction percentage based on Intelligence.
 * Standard baseline INT is 10 (0% CDR).
 * Each point above 10 grants 2.5% CDR (up to 50% max CDR).
 * Points below 10 increase cooldowns by 2.5% per point (up to +25%).
 */
export function calculateCooldownReductionPct(intelligence: number = 10): number {
  const intDiff = intelligence - 10;
  return Math.min(50, Math.max(-25, Math.round(intDiff * 2.5)));
}

/**
 * Calculates effective skill cooldown in turns/ticks, scaled by Intelligence.
 * Base cooldown for active skills is 30-40 turns.
 */
export function calculateSkillCooldown(baseCooldown: number, intelligence: number = 10): number {
  const cdr = calculateCooldownReductionPct(intelligence);
  const effective = Math.round(baseCooldown * (1 - cdr / 100));
  return Math.max(1, effective);
}

/**
 * Calculate all derived stats from attributes, level, runes, and equipment for a hero.
 */
export function calculateHeroDerivedStats(entity: Entity): HeroDerivedStats {
  const role = entity.role || 'barrett';
  const baseAttrs = BASE_HERO_ATTRIBUTES[role] || { str: 10, agi: 10, tou: 10, int: 10, wil: 10, ego: 10 };
  const attrs = entity.attributes || baseAttrs;

  const touHpBonus = Math.max(0, (attrs.tou - baseAttrs.tou) * 12);
  const intEnergyBonus = Math.max(0, (attrs.int - baseAttrs.int) * 10);
  const cooldownReductionPct = calculateCooldownReductionPct(attrs.int || 10);
  const wilShieldBonus = Math.max(0, (attrs.wil - baseAttrs.wil) * 15);
  const meleeAtkBonus = Math.max(0, (attrs.str - baseAttrs.str) * 2);
  const rangedAtkBonus = Math.max(0, Math.floor((attrs.agi - baseAttrs.agi) * 1.5));
  const dodgeChance = 5 + Math.max(0, (attrs.agi - baseAttrs.agi) * 2);
  const flatDamageReduction = Math.max(0, Math.floor((attrs.tou - baseAttrs.tou) * 0.5));
  const maxCarryWeight = 30 + (attrs.str || 14) * 8;
  const partyEgoBonus = Math.max(0, (attrs.ego - baseAttrs.ego) * 2);

  let equipHp = 0;
  let equipEnergy = 0;
  let equipShield = 0;
  let equipAtk = 0;
  let armorPercent = 0;

  if (entity.equipment) {
    for (const item of Object.values(entity.equipment)) {
      if (!item) continue;
      if (item.hpBonus) equipHp += item.hpBonus;
      if (item.energyBonus) equipEnergy += item.energyBonus;
      if (item.shieldBonus) equipShield += item.shieldBonus;
      if (item.atkBonus) equipAtk += item.atkBonus;
      if (item.defenseBonus) armorPercent += item.defenseBonus;
    }
  }

  const levelHpBonus = ((entity.level || 1) - 1) * 20;
  const runeHp = entity.runeBonuses?.maxHp || 0;
  const maxHp = 100 + levelHpBonus + touHpBonus + runeHp + equipHp;

  const runeEnergy = entity.runeBonuses?.maxEnergy || 0;
  const maxEnergy = 100 + intEnergyBonus + runeEnergy + equipEnergy;

  const runeShield = entity.runeBonuses?.shield || 0;
  const hasShieldWall = entity.skillsLearned?.includes('shield_wall');
  const shieldWallBonus = hasShieldWall ? 40 : 0;
  const shieldCap = wilShieldBonus + runeShield + shieldWallBonus + equipShield;

  const runeDmg = entity.runeBonuses?.damage || 0;

  return {
    maxHp,
    hp: entity.hp !== undefined ? entity.hp : maxHp,
    touHpBonus,
    levelHpBonus,
    maxEnergy,
    energy: entity.energy !== undefined ? entity.energy : maxEnergy,
    intEnergyBonus,
    cooldownReductionPct,
    shieldCap,
    shieldHp: entity.shieldHp || 0,
    wilShieldBonus,
    meleeAtkBonus: meleeAtkBonus + runeDmg + equipAtk,
    rangedAtkBonus: rangedAtkBonus + runeDmg + equipAtk,
    dodgeChance,
    flatDamageReduction,
    armorPercent,
    maxCarryWeight,
    partyEgoBonus
  };
}

