import { Entity, ZoneData } from '../shared/types';
import { findAStarPath } from '../shared/pathfinding';

export function findBfsStep(
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  zone: ZoneData,
  allEntities: Entity[],
  stopAdjacent: boolean = false
): { dx: number; dy: number } | null {
  const result = findAStarPath(startX, startY, goalX, goalY, zone, allEntities, {
    stopAdjacent,
    maxExpansions: 600,
    allowDiagonals: true
  });
  if (!result || (result.dx === 0 && result.dy === 0)) {
    return null;
  }
  return { dx: result.dx, dy: result.dy };
}

export function stepCompanionBot(
  bot: Entity,
  allEntities: Entity[],
  zone: ZoneData
): { type: 'move' | 'action'; dx?: number; dy?: number; actionType?: string; targetX?: number; targetY?: number } {
  if (bot.isDowned) {
    return { type: 'action', actionType: 'wait' };
  }

  // Priority 1: Check for any downed companion player to revive (Luther has priority, but any bot can revive)
  const downedAlly = allEntities.find(e => e.isPlayer && e.isDowned && e.id !== bot.id);
  if (downedAlly) {
    const dist = Math.hypot(downedAlly.x - bot.x, downedAlly.y - bot.y);
    if (dist <= 1.5) {
      return { type: 'action', actionType: 'revive' };
    }
    // Pathfind directly to adjacent tile of the downed ally
    const step = findBfsStep(bot.x, bot.y, downedAlly.x, downedAlly.y, zone, allEntities, true);
    if (step) {
      return { type: 'move', dx: step.dx, dy: step.dy };
    }
  }

  // Priority 2: In combat, find nearest living enemy
  const enemies = allEntities.filter(e => !e.isPlayer && e.hp > 0);
  if (enemies.length > 0) {
    // Sort by distance
    enemies.sort((a, b) => Math.hypot(a.x - bot.x, a.y - bot.y) - Math.hypot(b.x - bot.x, b.y - bot.y));
    const target = enemies[0];
    const dist = Math.hypot(target.x - bot.x, target.y - bot.y);

    // Barrett: If target is frozen, shoot fireball to trigger SHATTER explosion!
    if (bot.role === 'barrett' && target.statusEffects.frozen && dist <= 6) {
      return { type: 'action', actionType: 'special', targetX: target.x, targetY: target.y };
    }

    // Beau: Freeze un-frozen enemies with ice blast!
    if (bot.role === 'beau' && !target.statusEffects.frozen && dist <= 6) {
      return { type: 'action', actionType: 'special', targetX: target.x, targetY: target.y };
    }

    // Default ranged/melee attack
    if (dist <= 5) {
      return { type: 'action', actionType: 'attack', targetX: target.x, targetY: target.y };
    } else {
      const step = findBfsStep(bot.x, bot.y, target.x, target.y, zone, allEntities, true);
      if (step) {
        return { type: 'move', dx: step.dx, dy: step.dy };
      }
      const dx = Math.sign(target.x - bot.x);
      const dy = Math.sign(target.y - bot.y);
      return { type: 'move', dx, dy };
    }
  }

  // Priority 3: Follow human players
  const humanLeader = allEntities.find(e => e.isPlayer && !e.isBot && !e.isDowned);
  if (humanLeader) {
    const dist = Math.hypot(humanLeader.x - bot.x, humanLeader.y - bot.y);
    if (dist > 3) {
      const step = findBfsStep(bot.x, bot.y, humanLeader.x, humanLeader.y, zone, allEntities, true);
      if (step) {
        return { type: 'move', dx: step.dx, dy: step.dy };
      }
      const dx = Math.sign(humanLeader.x - bot.x);
      const dy = Math.sign(humanLeader.y - bot.y);
      return { type: 'move', dx, dy };
    }
  }

  return { type: 'action', actionType: 'wait' };
}
