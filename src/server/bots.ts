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

    // Luca: AI that can teleport and uses a wand to kinetically move the mobs and slam them into walls!
    if (bot.role === 'luca') {
      // 1. If enemy is dangerously close (dist <= 2) or Luca is wounded: TELEPORT to tactical position!
      if (dist <= 2 || (bot.hp < bot.maxHp * 0.45 && dist <= 4)) {
        const candidateTiles: { x: number; y: number; score: number }[] = [];
        for (let dy = -4; dy <= 4; dy++) {
          for (let dx = -4; dx <= 4; dx++) {
            const tx = bot.x + dx;
            const ty = bot.y + dy;
            const d = Math.hypot(dx, dy);
            if (d >= 2.5 && d <= 4.5 && tx >= 1 && tx < zone.width - 1 && ty >= 1 && ty < zone.height - 1) {
              const tile = zone.tiles[ty]?.[tx];
              const occupied = allEntities.some(e => e.hp > 0 && e.x === tx && e.y === ty);
              if (tile && tile.walkable && !occupied) {
                const distToEnemy = Math.hypot(tx - target.x, ty - target.y);
                if (distToEnemy >= 3 && distToEnemy <= 5) {
                  candidateTiles.push({ x: tx, y: ty, score: distToEnemy });
                }
              }
            }
          }
        }
        if (candidateTiles.length > 0) {
          candidateTiles.sort((a, b) => b.score - a.score);
          const chosen = candidateTiles[0];
          return { type: 'action', actionType: 'teleport', targetX: chosen.x, targetY: chosen.y };
        }
      }

      // 2. Kinetic Wand Slam: within range 5, fire kinetic wave to thrust mob and slam against walls!
      if (dist <= 5) {
        return { type: 'action', actionType: 'kinetic_slam', targetX: target.x, targetY: target.y };
      }
    }

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
    if (bot.role === 'luca' && dist > 6) {
      const blinkX = Math.max(1, Math.min(zone.width - 2, humanLeader.x + (Math.random() > 0.5 ? 2 : -2)));
      const blinkY = Math.max(1, Math.min(zone.height - 2, humanLeader.y + (Math.random() > 0.5 ? 2 : -2)));
      if (zone.tiles[blinkY]?.[blinkX]?.walkable && !allEntities.some(e => e.hp > 0 && e.x === blinkX && e.y === blinkY)) {
        return { type: 'action', actionType: 'teleport', targetX: blinkX, targetY: blinkY };
      }
    }
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
