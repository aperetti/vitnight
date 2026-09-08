import { Entity, ZoneData } from './types';
import { BASE_HERO_ATTRIBUTES } from './constants';

export interface PathNode {
  x: number;
  y: number;
}

export interface PathResult {
  dx: number;
  dy: number;
  path: PathNode[];
  reachedGoal: boolean;
}

export interface AStarOptions {
  stopAdjacent?: boolean;
  isGhost?: boolean;
  ignoreEntityId?: string;
  targetEntityId?: string;
  maxExpansions?: number;
  allowDiagonals?: boolean;
}

class MinHeap<T> {
  private data: T[] = [];
  private compare: (a: T, b: T) => number;

  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }

  get size(): number {
    return this.data.length;
  }

  push(item: T): void {
    this.data.push(item);
    this.bubbleUp(this.data.length - 1);
  }

  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(idx: number): void {
    const item = this.data[idx];
    while (idx > 0) {
      const parentIdx = (idx - 1) >> 1;
      const parent = this.data[parentIdx];
      if (this.compare(item, parent) >= 0) break;
      this.data[idx] = parent;
      idx = parentIdx;
    }
    this.data[idx] = item;
  }

  private sinkDown(idx: number): void {
    const length = this.data.length;
    const item = this.data[idx];
    while (true) {
      const leftIdx = (idx << 1) + 1;
      const rightIdx = leftIdx + 1;
      let swapIdx = -1;

      if (leftIdx < length) {
        if (this.compare(this.data[leftIdx], item) < 0) {
          swapIdx = leftIdx;
        }
      }

      if (rightIdx < length) {
        const compareTarget = swapIdx === -1 ? item : this.data[leftIdx];
        if (this.compare(this.data[rightIdx], compareTarget) < 0) {
          swapIdx = rightIdx;
        }
      }

      if (swapIdx === -1) break;
      this.data[idx] = this.data[swapIdx];
      idx = swapIdx;
    }
    this.data[idx] = item;
  }
}

/**
 * Admissible octile distance heuristic for 8-directional grids.
 */
function octileDistance(x1: number, y1: number, x2: number, y2: number): number {
  const dx = Math.abs(x1 - x2);
  const dy = Math.abs(y1 - y2);
  return (dx + dy) + (Math.SQRT2 - 2) * Math.min(dx, dy);
}

/**
 * A* Pathfinding for 2D roguelike grid with 8-directional movement,
 * obstacle avoidance, corner cutting protection, and ghost wall-phasing.
 */
export function findAStarPath(
  startX: number,
  startY: number,
  goalX: number,
  goalY: number,
  zone: ZoneData,
  allEntities: Entity[] = [],
  options: AStarOptions = {}
): PathResult | null {
  const {
    stopAdjacent = false,
    isGhost = false,
    ignoreEntityId,
    targetEntityId,
    maxExpansions = 500,
    allowDiagonals = true
  } = options;

  const width = zone.width;
  const height = zone.height;

  // Check out of bounds
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return null;
  if (goalX < 0 || goalX >= width || goalY < 0 || goalY >= height) return null;

  // Already at goal or adjacent if stopAdjacent
  const startDistX = Math.abs(startX - goalX);
  const startDistY = Math.abs(startY - goalY);
  if (startX === goalX && startY === goalY) {
    return { dx: 0, dy: 0, path: [{ x: startX, y: startY }], reachedGoal: true };
  }
  if (stopAdjacent && startDistX <= 1 && startDistY <= 1) {
    return { dx: 0, dy: 0, path: [{ x: startX, y: startY }], reachedGoal: true };
  }

  // Directions
  const directions: { dx: number; dy: number; cost: number }[] = [
    // 4 cardinal directions (cost 1.0)
    { dx: 0, dy: -1, cost: 1.0 },
    { dx: 0, dy: 1, cost: 1.0 },
    { dx: -1, dy: 0, cost: 1.0 },
    { dx: 1, dy: 0, cost: 1.0 }
  ];

  if (allowDiagonals) {
    // 4 diagonal directions (cost sqrt(2) ≈ 1.414)
    directions.push(
      { dx: -1, dy: -1, cost: Math.SQRT2 },
      { dx: 1, dy: -1, cost: Math.SQRT2 },
      { dx: -1, dy: 1, cost: Math.SQRT2 },
      { dx: 1, dy: 1, cost: Math.SQRT2 }
    );
  }

  // Occupied tile lookup
  const isOccupied = (x: number, y: number): boolean => {
    for (const e of allEntities) {
      if (e.hp <= 0 || e.isDowned) continue;
      if (e.id === ignoreEntityId) continue;
      if (e.id === targetEntityId) continue;
      if (e.x === x && e.y === y) return true;
    }
    return false;
  };

  const totalNodes = width * height;
  const gScore = new Float32Array(totalNodes).fill(Infinity);
  const fScore = new Float32Array(totalNodes).fill(Infinity);
  const parent = new Int32Array(totalNodes).fill(-1);
  const inClosedSet = new Uint8Array(totalNodes);

  interface OpenNode {
    x: number;
    y: number;
    idx: number;
    f: number;
  }

  const openHeap = new MinHeap<OpenNode>((a, b) => a.f - b.f);

  const startIdx = startY * width + startX;
  gScore[startIdx] = 0;
  const startH = octileDistance(startX, startY, goalX, goalY);
  fScore[startIdx] = startH;
  openHeap.push({ x: startX, y: startY, idx: startIdx, f: startH });

  let closestNodeIdx = startIdx;
  let closestH = startH;
  let expansions = 0;
  let foundEndIdx = -1;

  while (openHeap.size > 0 && expansions < maxExpansions) {
    const current = openHeap.pop()!;
    const curIdx = current.idx;

    if (inClosedSet[curIdx]) continue;
    inClosedSet[curIdx] = 1;
    expansions++;

    const curX = current.x;
    const curY = current.y;

    // Track closest node in case full path is unreachable
    const curH = octileDistance(curX, curY, goalX, goalY);
    if (curH < closestH && curIdx !== startIdx) {
      closestH = curH;
      closestNodeIdx = curIdx;
    }

    // Check goal condition
    const isAtGoal = curX === goalX && curY === goalY;
    const isAdjacentToGoal = stopAdjacent && Math.abs(curX - goalX) <= 1 && Math.abs(curY - goalY) <= 1;

    if (isAtGoal || isAdjacentToGoal) {
      foundEndIdx = curIdx;
      break;
    }

    // Expand neighbors
    for (const dir of directions) {
      const nx = curX + dir.dx;
      const ny = curY + dir.dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const nIdx = ny * width + nx;
      if (inClosedSet[nIdx]) continue;

      // Check walkability
      if (!isGhost) {
        const tile = zone.tiles[ny]?.[nx];
        if (!tile || !tile.walkable) continue;

        // Diagonal corner cutting check: don't slip between two touching wall corners
        if (dir.dx !== 0 && dir.dy !== 0) {
          const adjTile1 = zone.tiles[curY]?.[nx];
          const adjTile2 = zone.tiles[ny]?.[curX];
          if (adjTile1 && !adjTile1.walkable && adjTile2 && !adjTile2.walkable) {
            continue;
          }
        }

        // Check occupied by another unit (except if it's the target entity at goal)
        if (isOccupied(nx, ny) && !(nx === goalX && ny === goalY)) {
          continue;
        }
      }

      const tentativeG = gScore[curIdx] + dir.cost;
      if (tentativeG < gScore[nIdx]) {
        parent[nIdx] = curIdx;
        gScore[nIdx] = tentativeG;
        const h = octileDistance(nx, ny, goalX, goalY);
        const f = tentativeG + h;
        fScore[nIdx] = f;
        openHeap.push({ x: nx, y: ny, idx: nIdx, f });
      }
    }
  }

  const endIdx = foundEndIdx !== -1 ? foundEndIdx : closestNodeIdx;
  if (endIdx === startIdx) {
    // No movement possible
    return null;
  }

  // Reconstruct path
  const path: PathNode[] = [];
  let curr = endIdx;
  while (curr !== -1) {
    const py = Math.floor(curr / width);
    const px = curr % width;
    path.push({ x: px, y: py });
    curr = parent[curr];
  }
  path.reverse();

  if (path.length <= 1) return null;

  const nextStep = path[1];
  const dx = nextStep.x - startX;
  const dy = nextStep.y - startY;

  return {
    dx,
    dy,
    path,
    reachedGoal: foundEndIdx !== -1
  };
}

/**
 * Calculates the hero-dependent detection / aggro radius for a hostile mob.
 * Different heroes project different threat and stealth profiles.
 */
export function getHeroAggroRange(hero: Entity, mob?: Entity): number {
  // If hero is phased or in phase walk, they are in an ethereal sub-dimension: 0 aggro!
  if (hero.statusEffects?.phase && hero.statusEffects.phase > 0) {
    return 0;
  }

  // If hero is downed, mobs prioritize living active threats
  if (hero.isDowned) {
    return 3;
  }

  const role = hero.role || 'barrett';
  const baseAttrs = BASE_HERO_ATTRIBUTES[role] || { str: 10, agi: 10, tou: 10, int: 10, wil: 10, ego: 10 };
  const attrs = hero.attributes || baseAttrs;

  // 1. Role Base Detection Profile
  let baseRange = 10;
  if (role === 'luther') {
    // Luther: Heavy frontline warrior, loud metallic clanking, high threat presence
    baseRange = 14;
  } else if (role === 'beau') {
    // Beau: Psionic phase mystic, silent quantum presence, stealthy footprint
    baseRange = 7;
  } else {
    // Barrett: Standard miner/scout with headlamp
    baseRange = 10;
  }

  // 2. Attribute Modifiers
  // Agility reduces detection radius (moving lightly and utilizing cover)
  const agiDiff = (attrs.agi || 10) - baseAttrs.agi;
  const agiModifier = -0.4 * Math.max(0, agiDiff);

  // Ego radiates commanding psychic presence (draws mob curiosity and threat)
  const egoDiff = (attrs.ego || 10) - baseAttrs.ego;
  const egoModifier = 0.3 * Math.max(0, egoDiff);

  // 3. Equipment Modifiers
  let equipModifier = 0;
  if (hero.equipment) {
    // Heavy plate armors increase detection distance
    if (hero.equipment.body?.name.includes('Titan') || hero.equipment.body?.name.includes('Carapace')) {
      equipModifier += 2;
    }
    // High-tech stealth suits or psionic cowls dampen sound and signatures
    if (hero.equipment.body?.name.includes('Nano') || hero.equipment.head?.name.includes('Psionic')) {
      equipModifier -= 2;
    }
  }

  // 4. Skills
  let skillModifier = 0;
  if (hero.skillsLearned?.includes('wilderness_lore')) {
    skillModifier -= 2; // Camouflage in wilderness
  }

  // 5. Mob Characteristics
  let mobModifier = 0;
  if (mob) {
    if (mob.isElite || mob.name.includes('King') || mob.name.includes('Titan') || mob.name.includes('Lord')) {
      mobModifier += 3; // Keener senses
    }
    // If mob took damage from this hero recently, alert radius is wide
    if (mob.aggroTargetId === hero.id || (mob.hp < mob.maxHp && mob.isAlerted)) {
      mobModifier += 8;
    }
  }

  const finalRange = Math.round(baseRange + agiModifier + egoModifier + equipModifier + skillModifier + mobModifier);
  return Math.max(2, Math.min(25, finalRange));
}

/**
 * Calculates threat score of a hero to determine mob targeting priority when multiple heroes are detected.
 */
export function calculateHeroThreat(hero: Entity, mob: Entity, dist: number): number {
  const aggroRange = getHeroAggroRange(hero, mob);
  // Base threat is proximity relative to detection threshold
  let threat = (aggroRange - dist) * 2;

  // Tank bonus: Luther generates extra threat to draw attacks from allies
  if (hero.role === 'luther') {
    threat += 10;
  } else if (hero.role === 'beau') {
    threat -= 4; // Mystic naturally sheds threat
  }

  // Priority bonus if mob was attacked by this hero
  if (mob.aggroTargetId === hero.id) {
    threat += 15;
  }

  // Downed heroes have very low priority
  if (hero.isDowned) {
    threat -= 100;
  }

  return threat;
}
