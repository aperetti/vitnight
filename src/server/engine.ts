import {
  Entity,
  HeroRole,
  Item,
  ItemSlot,
  EquipmentSlots,
  ZoneCoord,
  ZoneData,
  PacingMode,
  Projectile,
  FloatingText,
  CombatLogEntry,
  Attributes,
  SkillDefinition,
  WaveInfo,
  Tile
} from '../shared/types';
import {
  SYMBOLS,
  COLORS,
  DEFAULT_TICK_RATE,
  RAINBOW_ORDER,
  ZONE_WIDTH,
  ZONE_HEIGHT,
  BASE_HERO_ATTRIBUTES,
  SKILL_DEFINITIONS,
  MINING_TIERS,
  getToolTierName
} from '../shared/constants';
import { generateZone, isRuinsParsec, isCaveParsec } from './mapGen';
import { StoryManager } from './story';
import { calculateShatterExplosion, calculateKnockback, areLikeItems, combineLikeItems, calculateHeroDerivedStats } from '../shared/formulas';
import { stepCompanionBot } from './bots';
import { getStartingEquipment, createItem, generateRandomLoot, calculateCarryWeight, calculateMaxCarryWeight, ITEM_TEMPLATES } from './items';
import { findAStarPath, getHeroAggroRange, calculateHeroThreat } from '../shared/pathfinding';
import type { RoomSaveData } from './storage';

export class GameEngine {
  public zones: Map<string, ZoneData> = new Map();
  public entities: Map<string, Entity> = new Map();
  public projectiles: Projectile[] = [];
  public floatingTexts: FloatingText[] = [];
  public combatLogs: CombatLogEntry[] = [];
  public story: StoryManager = new StoryManager();
  public zoneWaves: Map<string, { currentWave: number; totalWaves: number; zoneLevel: number; waveCleared: boolean; allCleared: boolean }> = new Map();

  public tickRate: number = DEFAULT_TICK_RATE;
  public onStateChanged?: (zoneCoord: ZoneCoord) => void;
  public onLogMessage?: (entry: CombatLogEntry) => void;
  public onStoryEvent?: (stage: string, questTitle: string, questDesc: string, dialogue?: any) => void;
  public onPlayerZoneChanged?: (playerId: string, newZone: ZoneData, pacingMode: PacingMode) => void;
  public onLevelUp?: (hero: HeroRole, level: number, attributePoints: number, skillPoints: number) => void;
  public onWorldTravelResult?: (eventType: 'normal' | 'lost' | 'found_ruins' | 'found_cave', message: string, coord: ZoneCoord) => void;

  private zoneRealTimeIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Pre-populate Level 1 starting zones at couple parsecs in (2, 2)
    this.getOrCreateZone({ parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 0 }); // House & Spawn
    this.getOrCreateZone({ parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 1 }); // Whitehill Mines
    this.getOrCreateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 }); // Legacy test fallback
    this.getOrCreateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 1 }); // Legacy mines fallback
    this.getOrCreateZone({ parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 0, depth: 0 }); // Zombie Creek
    this.getOrCreateZone({ parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 }); // Water Mountain

    this.initHeroParty();
    this.spawnEnemiesForZone({ parasangX: 2, parasangY: 2, zoneX: 1, zoneY: 1, depth: 1 }); // Mines mobs
    this.spawnEnemiesForZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 1 }); // Legacy mines mobs
    this.spawnEnemiesForZone({ parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 0, depth: 0 }); // Zombie creek mobs
  }

  public getZoneKey(coord: ZoneCoord): string {
    return `${coord.parasangX},${coord.parasangY},${coord.zoneX},${coord.zoneY},${coord.depth}`;
  }

  public getOrCreateZone(coord: ZoneCoord): ZoneData {
    const key = this.getZoneKey(coord);
    let zone = this.zones.get(key);
    if (!zone) {
      zone = generateZone(coord);
      this.zones.set(key, zone);
    }
    return zone;
  }

  private initHeroParty() {
    const spawnZone: ZoneCoord = { parasangX: 2, parasangY: 2, zoneX: 0, zoneY: 0, depth: 0 };

    const heroes: { id: string; role: HeroRole; name: string; x: number; y: number; color: string }[] = [
      { id: 'hero-barrett', role: 'barrett', name: 'Barrett the Miner', x: 14, y: 12, color: COLORS.amberBright },
      { id: 'hero-luther', role: 'luther', name: 'Luther the Fighter', x: 15, y: 12, color: COLORS.green },
      { id: 'hero-beau', role: 'beau', name: 'Beau the Ice-Blaster', x: 16, y: 12, color: COLORS.cyan }
    ];

    for (const h of heroes) {
      const startGear = getStartingEquipment(h.role);
      const entity: Entity = {
        id: h.id,
        name: h.name,
        role: h.role,
        x: h.x,
        y: h.y,
        zone: spawnZone,
        symbol: SYMBOLS.player,
        color: h.color,
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        isPlayer: true,
        isBot: true, // Default to companion bot until claimed by human
        isDowned: false,
        statusEffects: {},
        inventory: combineLikeItems(startGear.inventory),
        equipment: startGear.equipment,
        skillCooldowns: {},
        equippedSkills: [],
        facing: { dx: 1, dy: 0 },
        level: 1,
        xp: 0,
        nextLevelXp: 100,
        attributePoints: 0,
        skillPoints: 0,
        attributes: { ...BASE_HERO_ATTRIBUTES[h.role] },
        skillsLearned: [],
        runesCollected: [],
        runeBonuses: { damage: 0, maxHp: 0, maxEnergy: 0, shield: 0 }
      };
      this.recalculateEntityStats(entity);
      this.entities.set(h.id, entity);
    }

    this.log('The trio prepares at the spawn outpost. Barrett begins gathering materials.', 'story');
  }

  public assignHumanPlayer(role: HeroRole, playerName?: string): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.isPlayer && entity.role === role) {
        entity.isBot = false;
        if (playerName) entity.name = playerName;
        this.updateZonePacing(entity.zone);
        return entity;
      }
    }
    return undefined;
  }

  public releaseHumanPlayer(role: HeroRole) {
    for (const entity of this.entities.values()) {
      if (entity.isPlayer && entity.role === role) {
        entity.isBot = true;
        this.updateZonePacing(entity.zone);
      }
    }
  }

  public getPacingModeForZone(coord: ZoneCoord): PacingMode {
    const key = this.getZoneKey(coord);
    let humanCount = Array.from(this.entities.values()).filter(
      e => e.isPlayer && !e.isBot && this.getZoneKey(e.zone) === key
    ).length;

    // Check alias between legacy (0, 0, 0, 0) and current (2, 2, 0, 0)
    if (humanCount === 0 && (key === '0,0,0,0,0' || key === '2,2,0,0,0')) {
      const altKey = key === '0,0,0,0,0' ? '2,2,0,0,0' : '0,0,0,0,0';
      humanCount = Array.from(this.entities.values()).filter(
        e => e.isPlayer && !e.isBot && this.getZoneKey(e.zone) === altKey
      ).length;
    }

    // Turn-based if <= 1 human player in the zone, crisp real-time if >= 2 players together on the same page
    return humanCount >= 2 ? 'real_time' : 'turn_based';
  }

  public updateZonePacing(coord: ZoneCoord) {
    const key = this.getZoneKey(coord);
    const mode = this.getPacingModeForZone(coord);

    if (mode === 'real_time') {
      if (!this.zoneRealTimeIntervals.has(key)) {
        const intervalMs = Math.round(1000 / this.tickRate);
        const timer = setInterval(() => {
          this.stepZoneSimulation(coord);
        }, intervalMs);
        this.zoneRealTimeIntervals.set(key, timer);
        this.log(`Heroes assembled in ${coord.zoneX},${coord.zoneY}! Activated Real-Time Mode (${this.tickRate} Hz).`, 'system');
      }
    } else {
      if (this.zoneRealTimeIntervals.has(key)) {
        clearInterval(this.zoneRealTimeIntervals.get(key)!);
        this.zoneRealTimeIntervals.delete(key);
        this.log(`Solo adventurer in zone. Switched to Turn-Based Mode.`, 'system');
      }
    }
  }

  public setTickRate(rate: number) {
    this.tickRate = Math.max(2, Math.min(10, rate));
    // Restart active intervals with new rate
    for (const [key, timer] of this.zoneRealTimeIntervals.entries()) {
      clearInterval(timer);
      const [px, py, zx, zy, d] = key.split(',').map(Number);
      const coord: ZoneCoord = { parasangX: px, parasangY: py, zoneX: zx, zoneY: zy, depth: d };
      const intervalMs = Math.round(1000 / this.tickRate);
      const newTimer = setInterval(() => {
        this.stepZoneSimulation(coord);
      }, intervalMs);
      this.zoneRealTimeIntervals.set(key, newTimer);
    }
  }

  public handlePlayerMove(playerId: string, dx: number, dy: number) {
    const player = this.entities.get(playerId);
    if (!player) return;

    if (player.isDowned) {
      this.log(`${player.name} is downed and cannot move! Press [Wait / Space] to hold on.`, 'system');
      return;
    }

    player.facing = { dx, dy };
    const zone = this.getOrCreateZone(player.zone);
    const targetX = player.x + dx;
    const targetY = player.y + dy;

    // Check bounds / Screen edge transition
    if (targetX < 0 || targetX >= zone.width || targetY < 0 || targetY >= zone.height) {
      this.handleZoneTransition(player, dx, dy);
      return;
    }

    const tile = zone.tiles[targetY][targetX];

    // Check stairs down / up
    if (tile.type === 'stairs_down') {
      const oldZone = { ...player.zone };
      player.zone = { ...player.zone, depth: player.zone.depth + 1 };
      player.x = 8;
      player.y = 8;
      this.log(`${player.name} descends into ${player.zone.depth === 1 ? 'Whitehill Mines' : 'the depths'}.`, 'system');
      for (const ent of this.entities.values()) {
        if (ent.isPlayer && ent.isBot && this.getZoneKey(ent.zone) === this.getZoneKey(oldZone)) {
          ent.zone = { ...player.zone };
          ent.x = player.x + (ent.role === 'beau' ? 1 : -1);
          ent.y = player.y;
        }
      }
      if (player.zone.depth === 1 && this.story.stage === 'SPAWN') {
        const ev = this.story.advanceStage('WHITEHILL_MINES');
        this.onStoryEvent?.('WHITEHILL_MINES', ev.questTitle, ev.questDesc, ev.dialogue);
      }
      const newZone = this.getOrCreateZone(player.zone);
      this.spawnEnemiesForZone(player.zone);
      this.updateZonePacing(oldZone);
      this.updateZonePacing(player.zone);
      this.onPlayerZoneChanged?.(player.id, newZone, this.getPacingModeForZone(player.zone));
      this.notifyZone(oldZone);
      this.notifyZone(player.zone);
      return;
    }

    if (tile.type === 'stairs_up') {
      const oldZone = { ...player.zone };
      player.zone = { ...player.zone, depth: Math.max(0, player.zone.depth - 1) };
      player.x = 15;
      player.y = 12;
      this.log(`${player.name} ascends to the surface.`, 'system');
      for (const ent of this.entities.values()) {
        if (ent.isPlayer && ent.isBot && this.getZoneKey(ent.zone) === this.getZoneKey(oldZone)) {
          ent.zone = { ...player.zone };
          ent.x = player.x + (ent.role === 'beau' ? 1 : -1);
          ent.y = player.y;
        }
      }
      const newZone = this.getOrCreateZone(player.zone);
      this.spawnEnemiesForZone(player.zone);
      this.updateZonePacing(oldZone);
      this.updateZonePacing(player.zone);
      this.onPlayerZoneChanged?.(player.id, newZone, this.getPacingModeForZone(player.zone));
      this.notifyZone(oldZone);
      this.notifyZone(player.zone);
      return;
    }

    // Check bump attack against hostile entity
    const targetEntity = Array.from(this.entities.values()).find(
      e => e.zone.parasangX === player.zone.parasangX &&
           e.zone.parasangY === player.zone.parasangY &&
           e.zone.zoneX === player.zone.zoneX &&
           e.zone.zoneY === player.zone.zoneY &&
           e.zone.depth === player.zone.depth &&
           e.x === targetX && e.y === targetY && !e.isPlayer
    );

    if (targetEntity) {
      this.executeAttack(player, targetEntity);
    } else if (tile.walkable) {
      // If moving onto an ally, swap positions (classic roguelike friendly step)
      const ally = Array.from(this.entities.values()).find(
        e => e.id !== player.id &&
             e.isPlayer &&
             this.getZoneKey(e.zone) === this.getZoneKey(player.zone) &&
             e.x === targetX && e.y === targetY
      );

      if (ally) {
        ally.x = player.x;
        ally.y = player.y;
        player.x = targetX;
        player.y = targetY;
        this.log(`${player.name} steps past ${ally.name}.`, 'system');
      } else {
        player.x = targetX;
        player.y = targetY;
      }

      // Check item pickup (pick up EVERYTHING on this tile)
      const groundEntries = zone.items
        .map((it, idx) => ({ it, idx }))
        .filter(entry => entry.it.x === targetX && entry.it.y === targetY);

      if (groundEntries.length > 0) {
        for (let i = groundEntries.length - 1; i >= 0; i--) {
          const { idx } = groundEntries[i];
          const picked = zone.items.splice(idx, 1)[0];
          if (picked.item.type === 'rune') {
            this.absorbRune(player, picked.item);
          } else {
            this.addItemToInventory(player, picked.item);
            this.log(`${player.name} picked up ${picked.item.name}!`, 'system');
          }
        }
        if (groundEntries.length === 1) {
          this.addFloatingText(player.x, player.y, `+${groundEntries[0].it.item.name}`, COLORS.amberBright);
        } else {
          this.addFloatingText(player.x, player.y, `+${groundEntries.length} items`, COLORS.amberBright);
        }
        this.recalculateEntityStats(player);
      }

      // Check victory switch on Water Mountain
      if (tile.type === 'victory_switch') {
        this.handleVictorySwitch(player);
      }

      // Check altar pedestal on Water Mountain
      if (tile.type === 'altar') {
        this.handleAltarStep(player, tile);
      }
    } else {
      // Unwalkable tile: player bumps into wall/obstacle to mine it!
      this.executeBumpMine(player, zone, targetX, targetY, tile);
    }

    // If zone is turn-based, step simulation once
    if (this.getPacingModeForZone(player.zone) === 'turn_based') {
      this.stepZoneSimulation(player.zone);
    } else {
      this.notifyZone(player.zone);
    }
  }

  public handlePlayerAction(playerId: string, actionType: string, targetX?: number, targetY?: number) {
    const player = this.entities.get(playerId);
    if (!player) return;

    if (player.isDowned) {
      if (actionType === 'wait') {
        this.log(`${player.name} is downed and holds on, waiting for revival...`, 'combat');
        if (this.getPacingModeForZone(player.zone) === 'turn_based') {
          this.stepZoneSimulation(player.zone);
        } else {
          this.notifyZone(player.zone);
        }
      } else {
        this.log(`${player.name} is incapacitated! Press [Space / Wait] to let your party revive you!`, 'system');
      }
      return;
    }

    if (player.isBot) {
      this.executeBotAction(player, actionType, targetX, targetY);
      return;
    }

    const zone = this.getOrCreateZone(player.zone);

    switch (actionType) {
      case 'attack': {
        const tx = targetX ?? player.x + player.facing.dx;
        const ty = targetY ?? player.y + player.facing.dy;
        const dist = Math.hypot(tx - player.x, ty - player.y);
        const enemy = Array.from(this.entities.values()).find(
          e => !e.isPlayer && this.getZoneKey(e.zone) === this.getZoneKey(player.zone) && e.x === tx && e.y === ty
        );
        if (enemy && dist <= 1.5) {
          this.executeAttack(player, enemy);
        } else {
          // Fire ranged laser
          this.fireProjectile(player, tx, ty, 'laser');
        }
        break;
      }
      case 'special': {
        const tx = targetX ?? player.x + player.facing.dx * 3;
        const ty = targetY ?? player.y + player.facing.dy * 3;
        if (player.role === 'beau') {
          // Ice blast that freezes target in an ice block
          this.fireProjectile(player, tx, ty, 'ice');
          this.log(`Beau unleashes a crystalline ice blast!`, 'combat');
        } else if (player.role === 'barrett') {
          // Blazing fireball that triggers SHATTER explosion on frozen targets
          this.fireProjectile(player, tx, ty, 'fireball');
          this.log(`Barrett launches a crackling fireball!`, 'combat');
        } else if (player.role === 'luther') {
          // Luther's Healing Radiance / Revive
          this.executeLutherRevive(player);
        }
        break;
      }
      case 'mine': {
        // Mines breakable or solid rock walls to carve out passages and discover mineral veins
        let tx = targetX ?? (player.x + (player.facing?.dx || 0));
        let ty = targetY ?? (player.y + (player.facing?.dy || 0));

        let targetTile = zone.tiles[ty]?.[tx];
        // If facing tile is not unwalkable, check 4 cardinal adjacent tiles
        if (!targetTile || targetTile.walkable) {
          for (const [adx, ady] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nx = player.x + adx;
            const ny = player.y + ady;
            const t = zone.tiles[ny]?.[nx];
            if (t && !t.walkable) {
              tx = nx;
              ty = ny;
              targetTile = t;
              break;
            }
          }
        }

        if (targetTile && !targetTile.walkable) {
          this.executeBumpMine(player, zone, tx, ty, targetTile);
        } else {
          this.log(`No rock wall to mine here. Face a rock wall and press [3] or bump into it!`, 'system');
        }
        break;
      }
      case 'craft': {
        this.handleCraftingOrAltar(player);
        break;
      }
      case 'revive': {
        this.executeLutherRevive(player);
        break;
      }
      case 'wait': {
        this.log(`${player.name} waits a moment...`, 'system');
        break;
      }
    }

    if (this.getPacingModeForZone(player.zone) === 'turn_based') {
      this.stepZoneSimulation(player.zone);
    } else {
      this.notifyZone(player.zone);
    }
  }

  public handleInteractAt(playerId: string, targetX: number, targetY: number, itemId?: string) {
    const player = this.entities.get(playerId);
    if (!player || player.isDowned) return;

    const zone = this.getOrCreateZone(player.zone);
    const dist = Math.hypot(targetX - player.x, targetY - player.y);

    // 1. Check if there are items at targetX, targetY
    const groundEntries = zone.items
      .map((it, idx) => ({ it, idx }))
      .filter(entry => entry.it.x === targetX && entry.it.y === targetY && (!itemId || entry.it.item.id === itemId));

    if (groundEntries.length > 0) {
      if (dist <= 1.5) {
        for (let i = groundEntries.length - 1; i >= 0; i--) {
          const { idx } = groundEntries[i];
          const picked = zone.items.splice(idx, 1)[0];
          if (picked.item.type === 'rune') {
            this.absorbRune(player, picked.item);
          } else {
            this.addItemToInventory(player, picked.item);
            this.log(`${player.name} picked up ${picked.item.name}!`, 'system');
          }
        }
        if (groundEntries.length === 1) {
          this.addFloatingText(player.x, player.y, `+${groundEntries[0].it.item.name}`, COLORS.amberBright);
        } else {
          this.addFloatingText(player.x, player.y, `+${groundEntries.length} items`, COLORS.amberBright);
        }
        this.recalculateEntityStats(player);

        if (this.getPacingModeForZone(player.zone) === 'turn_based') {
          this.stepZoneSimulation(player.zone);
        } else {
          this.notifyZone(player.zone);
        }
        return;
      } else {
        const itemLabel = groundEntries.length === 1 ? groundEntries[0].it.item.name : `${groundEntries.length} items`;
        this.log(`${player.name} cannot reach ${itemLabel} from here. Move closer!`, 'system');
        return;
      }
    }

    // 2. Check door toggle
    const tile = zone.tiles[targetY]?.[targetX];
    if (tile && tile.type === 'door') {
      if (dist <= 1.5) {
        tile.walkable = !tile.walkable;
        tile.transparent = tile.walkable;
        tile.char = tile.walkable ? '/' : '+';
        this.log(`${player.name} ${tile.walkable ? 'opens' : 'closes'} the door.`, 'system');
        if (this.getPacingModeForZone(player.zone) === 'turn_based') {
          this.stepZoneSimulation(player.zone);
        } else {
          this.notifyZone(player.zone);
        }
        return;
      } else {
        this.log(`${player.name} is too far to reach the door.`, 'system');
        return;
      }
    }

    // 3. Check crafting workbench, altar pedestal, or victory switch
    if (tile && (tile.type === 'workbench' || tile.type === 'victory_switch' || tile.type === 'altar')) {
      if (dist <= 1.5) {
        if (tile.type === 'workbench') this.handleCraftingOrAltar(player, tile);
        else if (tile.type === 'altar') this.handleCraftingOrAltar(player, tile);
        else this.handleVictorySwitch(player);
        if (this.getPacingModeForZone(player.zone) === 'turn_based') {
          this.stepZoneSimulation(player.zone);
        } else {
          this.notifyZone(player.zone);
        }
        return;
      } else {
        this.log(`${player.name} must stand adjacent to interact with that.`, 'system');
        return;
      }
    }

    // 4. Check downed ally to revive
    const downedAlly = Array.from(this.entities.values()).find(
      e => e.isPlayer && e.isDowned && e.x === targetX && e.y === targetY && this.getZoneKey(e.zone) === this.getZoneKey(player.zone)
    );
    if (downedAlly) {
      if (dist <= 1.5) {
        this.executeLutherRevive(player);
        if (this.getPacingModeForZone(player.zone) === 'turn_based') {
          this.stepZoneSimulation(player.zone);
        } else {
          this.notifyZone(player.zone);
        }
        return;
      } else {
        this.log(`${player.name} must get closer to revive ${downedAlly.name}!`, 'system');
        return;
      }
    }

    // 5. Check wall mining
    if (tile && (!tile.walkable || tile.type === 'wall' || tile.type === 'breakable_wall')) {
      if (dist <= 1.5) {
        this.executeBumpMine(player, zone, targetX, targetY, tile);
        if (this.getPacingModeForZone(player.zone) === 'turn_based') {
          this.stepZoneSimulation(player.zone);
        } else {
          this.notifyZone(player.zone);
        }
        return;
      }
    }

    // 6. Check enemy attack
    const enemy = this.findEntityAt(player.zone, targetX, targetY);
    if (enemy && !enemy.isPlayer) {
      if (dist <= 1.5) {
        this.executeAttack(player, enemy);
      } else {
        this.fireProjectile(player, targetX, targetY, 'laser');
      }
      if (this.getPacingModeForZone(player.zone) === 'turn_based') {
        this.stepZoneSimulation(player.zone);
      } else {
        this.notifyZone(player.zone);
      }
      return;
    }
  }

  private executeBotAction(bot: Entity, actionType: string, targetX?: number, targetY?: number) {
    if (actionType === 'wait') {
      // Bots wait quietly: no combat log spam and no recursion
      return;
    }
    if (actionType === 'revive') {
      this.executeLutherRevive(bot);
      return;
    }
    if (actionType === 'special') {
      const tx = targetX ?? bot.x + bot.facing.dx * 3;
      const ty = targetY ?? bot.y + bot.facing.dy * 3;
      if (bot.role === 'beau') {
        this.fireProjectile(bot, tx, ty, 'ice');
        this.log(`Beau unleashes a crystalline ice blast!`, 'combat');
      } else if (bot.role === 'barrett') {
        this.fireProjectile(bot, tx, ty, 'fireball');
        this.log(`Barrett launches a crackling fireball!`, 'combat');
      } else if (bot.role === 'luther') {
        this.executeLutherRevive(bot);
      }
      return;
    }
    if (actionType === 'attack') {
      const tx = targetX ?? bot.x + bot.facing.dx;
      const ty = targetY ?? bot.y + bot.facing.dy;
      const enemy = this.findEntityAt(bot.zone, tx, ty);
      if (enemy && !enemy.isPlayer) {
        this.executeAttack(bot, enemy);
      } else {
        this.fireProjectile(bot, tx, ty, 'laser');
      }
      return;
    }
  }

  private handleZoneTransition(player: Entity, dx: number, dy: number) {
    let { parasangX, parasangY, zoneX, zoneY, depth } = player.zone;

    // Check if player is attempting to step beyond the outer boundary of the known realm
    const atWestEdge = parasangX === 0 && zoneX === 0 && dx < 0;
    const atEastEdge = parasangX >= 15 && zoneX >= 2 && dx > 0;
    const atNorthEdge = parasangY === 0 && zoneY === 0 && dy < 0;
    const atSouthEdge = parasangY >= 6 && zoneY >= 2 && dy > 0;

    if (atWestEdge || atEastEdge || atNorthEdge || atSouthEdge) {
      this.log(`${player.name} reaches the impassable outer frontier of the realm.`, 'system');
      if (dx > 0) player.x = ZONE_WIDTH - 2;
      if (dx < 0) player.x = 1;
      if (dy > 0) player.y = ZONE_HEIGHT - 2;
      if (dy < 0) player.y = 1;
      return;
    }

    // Moving horizontally across 3x3 screens and parsecs
    if (dx > 0) {
      if (zoneX < 2) {
        zoneX++;
      } else if (parasangX < 15) {
        parasangX++;
        zoneX = 0;
      }
      player.x = 1;
    } else if (dx < 0) {
      if (zoneX > 0) {
        zoneX--;
      } else if (parasangX > 0) {
        parasangX--;
        zoneX = 2;
      }
      player.x = ZONE_WIDTH - 2;
    }

    // Moving vertically across 3x3 screens and parsecs
    if (dy > 0) {
      if (zoneY < 2) {
        zoneY++;
      } else if (parasangY < 6) {
        parasangY++;
        zoneY = 0;
      }
      player.y = 1;
    } else if (dy < 0) {
      if (zoneY > 0) {
        zoneY--;
      } else if (parasangY > 0) {
        parasangY--;
        zoneY = 2;
      }
      player.y = ZONE_HEIGHT - 2;
    }

    const oldZone = { ...player.zone };
    player.zone = { parasangX, parasangY, zoneX, zoneY, depth };

    // Bring companion bots along with player to maintain the adventuring party
    for (const ent of this.entities.values()) {
      if (ent.isPlayer && ent.isBot && this.getZoneKey(ent.zone) === this.getZoneKey(oldZone)) {
        ent.zone = { ...player.zone };
        ent.x = Math.max(1, Math.min(ZONE_WIDTH - 2, player.x + (ent.role === 'beau' ? 1 : -1)));
        ent.y = Math.max(1, Math.min(ZONE_HEIGHT - 2, player.y));
      }
    }

    const newZone = this.getOrCreateZone(player.zone);

    // Guarantee player arrival tile is walkable
    if (newZone.tiles[player.y] && newZone.tiles[player.y][player.x] && !newZone.tiles[player.y][player.x].walkable) {
      newZone.tiles[player.y][player.x] = {
        type: 'floor',
        char: '░',
        color: COLORS.dirtPath,
        walkable: true,
        transparent: true
      };
    }

    // Open border entry tile behind player so backtracking is always clear
    const borderX = dx > 0 ? 0 : (dx < 0 ? ZONE_WIDTH - 1 : player.x);
    const borderY = dy > 0 ? 0 : (dy < 0 ? ZONE_HEIGHT - 1 : player.y);
    if (newZone.tiles[borderY]?.[borderX] && !newZone.tiles[borderY][borderX].walkable) {
      newZone.tiles[borderY][borderX] = {
        type: 'floor',
        char: '░',
        color: COLORS.dirtPath,
        walkable: true,
        transparent: true
      };
    }

    // Guarantee companions arrival tiles are walkable
    for (const ent of this.entities.values()) {
      if (ent.isPlayer && ent.isBot && this.getZoneKey(ent.zone) === this.getZoneKey(player.zone)) {
        if (newZone.tiles[ent.y]?.[ent.x] && !newZone.tiles[ent.y][ent.x].walkable) {
          newZone.tiles[ent.y][ent.x] = {
            type: 'floor',
            char: '░',
            color: COLORS.dirtPath,
            walkable: true,
            transparent: true
          };
        }
      }
    }

    this.log(`${player.name} travels to ${newZone.name} [Parsec (${parasangX}, ${parasangY}) Screen (${zoneX}, ${zoneY})].`, 'system');

    // Check story milestones progression
    this.checkMilestoneStoryTrigger(player.zone);

    this.spawnEnemiesForZone(player.zone);
    this.updateZonePacing(oldZone);
    this.updateZonePacing(player.zone);
    this.onPlayerZoneChanged?.(player.id, newZone, this.getPacingModeForZone(player.zone));
    this.notifyZone(oldZone);
    this.notifyZone(player.zone);
  }

  private checkMilestoneStoryTrigger(coord: ZoneCoord) {
    const { parasangX, parasangY, zoneX, zoneY, depth } = coord;
    if (depth !== 0) return;

    // Zombie Creek
    if ((parasangX === 3 && parasangY === 0 && zoneX === 1 && zoneY === 1) || (parasangX === 0 && parasangY === 0 && zoneX === 1 && zoneY === 0)) {
      if (this.story.stage === 'SPAWN' || this.story.stage === 'WHITEHILL_MINES') {
        const ev = this.story.advanceStage('ZOMBIE_CREEK');
        this.onStoryEvent?.('ZOMBIE_CREEK', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }

    // Water Mountain
    if ((parasangX === 3 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 0 && parasangY === 0 && zoneX === 1 && zoneY === 1)) {
      if (this.story.stage === 'ZOMBIE_CREEK') {
        const ev = this.story.advanceStage('WATER_MOUNTAIN_PUZZLE');
        this.onStoryEvent?.('WATER_MOUNTAIN_PUZZLE', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }

    // Skeleton Homestead
    if ((parasangX === 6 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 0 && zoneY === 0)) {
      if (this.story.stage === 'WATER_MOUNTAIN_PUZZLE') {
        const ev = this.story.advanceStage('SKELETON_HOMESTEAD');
        this.onStoryEvent?.('SKELETON_HOMESTEAD', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }

    // Creeper Homestead
    if ((parasangX === 9 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 1 && zoneY === 0)) {
      if (this.story.stage === 'MUTANT_SKELETON' || this.story.stage === 'SKELETON_HOMESTEAD') {
        const ev = this.story.advanceStage('CREEPER_HOMESTEAD');
        this.onStoryEvent?.('CREEPER_HOMESTEAD', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }

    // Power Down
    if ((parasangX === 9 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 2 && zoneY === 0)) {
      if (this.story.stage === 'MUTANT_CREEPER' || this.story.stage === 'CREEPER_HOMESTEAD') {
        const ev = this.story.advanceStage('POWER_DOWN');
        this.onStoryEvent?.('POWER_DOWN', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }

    // Rocky Doom
    if ((parasangX === 12 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 0 && zoneX === 2 && zoneY === 1)) {
      if (this.story.stage === 'POWER_DOWN') {
        const ev = this.story.advanceStage('ROCKY_DOOM_SWARM');
        this.onStoryEvent?.('ROCKY_DOOM_SWARM', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }

    // Final Stand
    if ((parasangX === 15 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 1 && zoneX === 0 && zoneY === 0)) {
      if (this.story.stage === 'ROCKY_DOOM_DUAL_BOSS' || this.story.stage === 'ROCKY_DOOM_SLAP') {
        const ev = this.story.advanceStage('SOLO_FINAL_STAND');
        this.onStoryEvent?.('SOLO_FINAL_STAND', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }
  }

  private absorbRune(player: Entity, rune: Item) {
    player.runesCollected = player.runesCollected || [];
    player.runesCollected.push(rune.id);
    player.runeBonuses = player.runeBonuses || { damage: 0, maxHp: 0, maxEnergy: 0, shield: 0 };

    const bonus = rune.runeBonus || 5;
    let boostText = '';

    switch (rune.runeStat) {
      case 'might':
      case 'flame':
      case 'cryo':
        player.runeBonuses.damage += bonus;
        boostText = `+${bonus} ATK Damage`;
        break;
      case 'vitality':
      case 'shepherd':
        player.runeBonuses.maxHp += bonus;
        player.maxHp += bonus;
        player.hp = player.maxHp;
        boostText = `+${bonus} Max HP`;
        break;
      case 'zephyr':
        player.runeBonuses.maxEnergy += bonus;
        player.maxEnergy += bonus;
        player.energy = player.maxEnergy;
        boostText = `+${bonus} Max Energy`;
        break;
      case 'aegis':
        player.runeBonuses.shield += bonus;
        player.hasShield = true;
        player.shieldHp = (player.shieldHp || 0) + bonus;
        boostText = `+${bonus} Energy Shield`;
        break;
      case 'baetyl':
        player.runeBonuses.damage += 2;
        player.runeBonuses.maxHp += 20;
        player.runeBonuses.maxEnergy += 20;
        player.runeBonuses.shield += 20;
        player.maxHp += 20;
        player.hp = player.maxHp;
        player.maxEnergy += 20;
        player.energy = player.maxEnergy;
        player.hasShield = true;
        player.shieldHp = (player.shieldHp || 0) + 20;
        boostText = `+Omni-Matrix (+2 ATK, +20 HP/NRG/Shield)`;
        break;
      default:
        player.runeBonuses.damage += 3;
        player.runeBonuses.maxHp += 15;
        player.maxHp += 15;
        player.hp = player.maxHp;
        boostText = `+Ancient Power`;
        break;
    }

    // Party benefit: companions also gain a resonance boost
    for (const ent of this.entities.values()) {
      if (ent.isPlayer && ent.id !== player.id) {
        ent.runeBonuses = ent.runeBonuses || { damage: 0, maxHp: 0, maxEnergy: 0, shield: 0 };
        ent.runeBonuses.damage += Math.max(1, Math.floor((player.runeBonuses.damage - (ent.runeBonuses.damage || 0)) / 2));
        ent.hp = Math.min(ent.maxHp, ent.hp + 15);
      }
    }

    this.log(`✨ ${player.name} absorbs the ${rune.name}! [${boostText}] — ${rune.description}`, 'story');
    this.addFloatingText(player.x, player.y, `RUNE: ${boostText}`, COLORS.bossGold);
    this.addExperience(player, 40);
  }

  public addExperience(entity: Entity, amount: number) {
    if (!entity.isPlayer) return;
    entity.xp = (entity.xp || 0) + amount;
    entity.nextLevelXp = entity.nextLevelXp || 100;
    entity.level = entity.level || 1;

    this.addFloatingText(entity.x, entity.y, `+${amount} XP`, COLORS.bossGold);

    while (entity.xp >= entity.nextLevelXp) {
      entity.xp -= entity.nextLevelXp;
      entity.level++;
      entity.nextLevelXp = entity.level * 100;

      // Level up bonuses
      entity.maxHp += 15;
      entity.hp = entity.maxHp;
      entity.maxEnergy += 10;
      entity.energy = entity.maxEnergy;

      entity.attributePoints = (entity.attributePoints || 0) + 1;
      const bonusSp = (entity.attributes?.int && entity.attributes.int >= 16) ? 3 : 2;
      entity.skillPoints = (entity.skillPoints || 0) + bonusSp;

      this.log(`★ LEVEL UP! ${entity.name} reached Level ${entity.level}! (+1 Attribute Point, +${bonusSp} Skill Points)`, 'story');
      this.addFloatingText(entity.x, entity.y, `★ LEVEL UP! (LVL ${entity.level}) ★`, COLORS.bossGold);

      if (entity.role) {
        this.onLevelUp?.(entity.role, entity.level, entity.attributePoints, entity.skillPoints);
      }
    }
  }

  public awardPartyExperience(amount: number) {
    for (const ent of this.entities.values()) {
      if (ent.isPlayer && !ent.isDowned) {
        this.addExperience(ent, amount);
      }
    }
  }

  public handleAllocateAttribute(playerId: string, attribute: keyof Attributes) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer || !player.attributes) return;
    if (!player.attributePoints || player.attributePoints <= 0) {
      this.log('No Attribute Points available to allocate.', 'system');
      return;
    }

    player.attributePoints--;
    player.attributes[attribute]++;

    this.recalculateEntityStats(player);

    this.log(`${player.name} allocated +1 to ${attribute.toUpperCase()} (Now: ${player.attributes[attribute]})!`, 'story');
    this.addFloatingText(player.x, player.y, `+1 ${attribute.toUpperCase()}`, COLORS.bossGold);
  }

  public addItemToInventory(player: Entity, item: Item) {
    player.inventory = player.inventory || [];
    const existing = player.inventory.find(it => areLikeItems(it, item));
    if (existing) {
      existing.count = (existing.count || 1) + (item.count || 1);
    } else {
      player.inventory.push({ ...item, count: item.count || 1 });
    }
  }

  public handleUnlockSkill(playerId: string, skillId: string) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer) return;
    player.skillsLearned = player.skillsLearned || [];
    if (player.skillsLearned.includes(skillId)) {
      this.log('Skill already learned.', 'system');
      return;
    }

    const skill = SKILL_DEFINITIONS.find(s => s.id === skillId);
    if (!skill) return;

    player.skillPoints = player.skillPoints || 0;
    if (player.skillPoints < skill.spCost) {
      this.log(`Not enough Skill Points (requires ${skill.spCost} SP).`, 'system');
      return;
    }

    player.skillPoints -= skill.spCost;
    player.skillsLearned.push(skillId);

    if (skillId === 'shield_wall') {
      player.hasShield = true;
      player.shieldHp = (player.shieldHp || 0) + 40;
    }

    this.recalculateEntityStats(player);
    this.log(`🎓 ${player.name} learned skill: ${skill.name}! [${skill.description}]`, 'story');
    this.addFloatingText(player.x, player.y, `SKILL: ${skill.name}`, COLORS.cyan);
  }

  public recalculateEntityStats(entity: Entity) {
    if (!entity.isPlayer) return;
    const stats = calculateHeroDerivedStats(entity);

    const prevMaxHp = entity.maxHp || 100;
    entity.maxHp = stats.maxHp;
    if (entity.hp === undefined) {
      entity.hp = stats.maxHp;
    } else if (stats.maxHp > prevMaxHp) {
      // Heal by the expanded health pool
      entity.hp = Math.min(entity.maxHp, entity.hp + (stats.maxHp - prevMaxHp));
    } else if (entity.hp > entity.maxHp) {
      entity.hp = entity.maxHp;
    }

    const prevMaxEnergy = entity.maxEnergy || 100;
    entity.maxEnergy = stats.maxEnergy;
    if (entity.energy === undefined) {
      entity.energy = stats.maxEnergy;
    } else if (stats.maxEnergy > prevMaxEnergy) {
      entity.energy = Math.min(entity.maxEnergy, entity.energy + (stats.maxEnergy - prevMaxEnergy));
    } else if (entity.energy > entity.maxEnergy) {
      entity.energy = entity.maxEnergy;
    }

    if (stats.shieldCap > 0) {
      entity.hasShield = true;
      if (entity.shieldHp === undefined || entity.shieldHp <= 0) {
        entity.shieldHp = stats.shieldCap;
      } else if (entity.shieldHp > stats.shieldCap) {
        entity.shieldHp = stats.shieldCap;
      }
    }
  }

  public handleEquipItem(playerId: string, itemId: string, slot: ItemSlot) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer) return;
    player.equipment = player.equipment || {};

    const itemIdx = player.inventory.findIndex(it => it.id === itemId);
    if (itemIdx === -1) {
      this.log('Item not found in inventory.', 'system');
      return;
    }
    const item = player.inventory[itemIdx];
    if (item.slot && item.slot !== slot) {
      this.log(`Cannot equip ${item.name} into ${slot} slot!`, 'system');
      return;
    }

    // If slot has an existing item, unequip it first
    const existing = player.equipment[slot];
    if (existing) {
      this.addItemToInventory(player, existing);
      delete player.equipment[slot];
    }

    // Remove 1 count from inventory
    if (item.count && item.count > 1) {
      item.count--;
      const equippedClone = { ...item, count: 1 };
      player.equipment[slot] = equippedClone;
    } else {
      player.inventory.splice(itemIdx, 1);
      player.equipment[slot] = item;
    }

    this.recalculateEntityStats(player);
    this.log(`⚔️ ${player.name} equipped ${item.name} in ${slot.toUpperCase()} slot!`, 'story');
    this.addFloatingText(player.x, player.y, `[Equipped: ${item.name}]`, COLORS.cyan);
  }

  public handleUnequipItem(playerId: string, slot: ItemSlot) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer || !player.equipment) return;

    const existing = player.equipment[slot];
    if (!existing) return;

    delete player.equipment[slot];
    this.addItemToInventory(player, existing);
    this.recalculateEntityStats(player);
    this.log(`${player.name} unequipped ${existing.name}.`, 'system');
    this.addFloatingText(player.x, player.y, `[Unequipped]`, COLORS.stoneGray);
  }

  public handleUseItem(playerId: string, itemId: string) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer || player.isDowned) return;

    const itemIdx = player.inventory.findIndex(it => it.id === itemId);
    if (itemIdx === -1) {
      this.log('Item not found in inventory.', 'system');
      return;
    }
    const item = player.inventory[itemIdx];
    const isTinkerer = player.skillsLearned?.includes('tinkering');
    const mult = isTinkerer ? 1.5 : 1;

    let used = false;

    if (item.healHp) {
      const healAmount = Math.floor(item.healHp * mult);
      player.hp = Math.min(player.maxHp, player.hp + healAmount);
      this.log(`💚 ${player.name} used ${item.name}, restoring ${healAmount} HP!`, 'combat');
      this.addFloatingText(player.x, player.y, `+${healAmount} HP`, COLORS.green);
      used = true;
    }

    if (item.restoreEnergy) {
      const energyAmount = Math.floor(item.restoreEnergy * mult);
      player.energy = Math.min(player.maxEnergy, player.energy + energyAmount);
      this.log(`⚡ ${player.name} used ${item.name}, restoring ${energyAmount} Energy!`, 'combat');
      this.addFloatingText(player.x, player.y, `+${energyAmount} EN`, COLORS.cyan);
      used = true;
    }

    if (item.rechargeShield) {
      const shieldAmount = Math.floor(item.rechargeShield * mult);
      player.hasShield = true;
      const maxShield = (player.runeBonuses?.shield || 0) + (player.equipment?.shield?.shieldBonus || 0) + (player.equipment?.body?.shieldBonus || 0) + 50;
      player.shieldHp = Math.min(maxShield, (player.shieldHp || 0) + shieldAmount);
      this.log(`🛡️ ${player.name} activated ${item.name}, surging +${shieldAmount} Shield!`, 'combat');
      this.addFloatingText(player.x, player.y, `+${shieldAmount} SHIELD`, COLORS.bossGold);
      used = true;
    }

    if (item.cureStatus) {
      delete player.statusEffects.frozen;
      delete player.statusEffects.burning;
      used = true;
    }

    if (item.phaseTicks) {
      player.statusEffects.climbing = item.phaseTicks;
      player.statusEffects.phase = item.phaseTicks;
      this.log(`✨ ${player.name} quaffs ${item.name} and begins phasing through solid walls!`, 'story');
      this.addFloatingText(player.x, player.y, `✧ PHASING (${item.phaseTicks} ticks) ✧`, COLORS.purpleEnder);
      used = true;
    }

    if (item.aoeDamage || item.aoeFreeze) {
      const tx = Math.max(1, Math.min(ZONE_WIDTH - 2, player.x + player.facing.dx * 2));
      const ty = Math.max(1, Math.min(ZONE_HEIGHT - 2, player.y + player.facing.dy * 2));
      const dmg = Math.floor((item.aoeDamage || 30) * mult);
      const freeze = item.aoeFreeze || 0;

      this.log(`💣 ${player.name} hurls a ${item.name} at (${tx}, ${ty})!`, 'combat');
      this.addFloatingText(tx, ty, `💥 BOOM!`, COLORS.fireRed);

      const zoneEntities = Array.from(this.entities.values()).filter(
        e => this.getZoneKey(e.zone) === this.getZoneKey(player.zone)
      );

      for (const ent of zoneEntities) {
        if (!ent.isPlayer && Math.hypot(ent.x - tx, ent.y - ty) <= 2) {
          if (dmg > 0) {
            this.applyDamage(ent, dmg, player);
            this.addFloatingText(ent.x, ent.y, `-${dmg}`, COLORS.fireRed);
          }
          if (freeze > 0) {
            ent.statusEffects.frozen = freeze;
            this.addFloatingText(ent.x, ent.y, `FROZEN!`, COLORS.cyan);
          }
          if (ent.hp <= 0) this.handleEntityDeath(ent, player);
        }
      }
      used = true;
    }

    if (used) {
      if (item.count && item.count > 1) {
        item.count--;
      } else {
        player.inventory.splice(itemIdx, 1);
      }
      if (this.getPacingModeForZone(player.zone) === 'turn_based') {
        this.stepZoneSimulation(player.zone);
      } else {
        this.notifyZone(player.zone);
      }
    }
  }

  public handleDropItem(playerId: string, itemId: string) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer) return;

    const itemIdx = player.inventory.findIndex(it => it.id === itemId);
    if (itemIdx === -1) return;

    const item = player.inventory[itemIdx];
    let droppedItem = item;
    if (item.count && item.count > 1) {
      item.count--;
      droppedItem = { ...item, count: 1 };
    } else {
      player.inventory.splice(itemIdx, 1);
    }

    const zone = this.getOrCreateZone(player.zone);
    zone.items.push({ x: player.x, y: player.y, item: droppedItem });

    this.log(`${player.name} dropped ${droppedItem.name} onto the ground.`, 'system');
    this.addFloatingText(player.x, player.y, `Dropped ${droppedItem.name}`, COLORS.wallGray);
    this.notifyZone(player.zone);
  }

  public handlePickupItem(playerId: string, itemId?: string) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer || player.isDowned) return;

    const zone = this.getOrCreateZone(player.zone);
    const groundIndices = zone.items
      .map((it, idx) => ({ it, idx }))
      .filter(entry => entry.it.x === player.x && entry.it.y === player.y && (!itemId || entry.it.item.id === itemId));

    if (groundIndices.length === 0) {
      this.log('Nothing on the ground here to pick up.', 'system');
      return;
    }

    for (let i = groundIndices.length - 1; i >= 0; i--) {
      const { idx } = groundIndices[i];
      const picked = zone.items.splice(idx, 1)[0];
      if (picked.item.type === 'rune') {
        this.absorbRune(player, picked.item);
      } else {
        this.addItemToInventory(player, picked.item);
        this.log(`${player.name} picked up ${picked.item.name}!`, 'system');
        this.addFloatingText(player.x, player.y, `+${picked.item.name}`, COLORS.amberBright);
      }
    }
    this.recalculateEntityStats(player);
    this.notifyZone(player.zone);
  }

  public handleActivateSkill(playerId: string, skillId: string, targetX?: number, targetY?: number) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer || player.isDowned) return;

    if (!player.skillsLearned?.includes(skillId)) {
      this.log(`You haven't learned this skill yet!`, 'system');
      return;
    }

    player.skillCooldowns = player.skillCooldowns || {};
    if ((player.skillCooldowns[skillId] || 0) > 0) {
      this.log(`Skill is on cooldown! (${player.skillCooldowns[skillId]} ticks remaining)`, 'system');
      return;
    }

    const skillDef = SKILL_DEFINITIONS.find(s => s.id === skillId);
    if (!skillDef) return;

    const energyCost = skillDef.energyCost || 0;
    if (player.energy < energyCost) {
      this.log(`Not enough Energy! (Requires ${energyCost} EN, you have ${player.energy})`, 'system');
      return;
    }

    player.energy -= energyCost;
    player.skillCooldowns[skillId] = skillDef.cooldownTicks || 4;

    const zoneKey = this.getZoneKey(player.zone);
    const zoneEntities = Array.from(this.entities.values()).filter(
      e => this.getZoneKey(e.zone) === zoneKey
    );

    switch (skillId) {
      case 'whirlwind': {
        const bonusDmg = (player.runeBonuses?.damage || 0) + (player.equipment?.weapon?.atkBonus || 0);
        const strBonus = player.attributes ? Math.max(0, player.attributes.str - 10) : 0;
        const damage = Math.floor((30 + bonusDmg + strBonus) * 1.5);

        this.log(`🌪️ WHIRLWIND TEMPEST! ${player.name} executes a spinning blade cyclone!`, 'combat');
        this.addFloatingText(player.x, player.y, `★ WHIRLWIND! ★`, COLORS.amberBright);

        for (const ent of zoneEntities) {
          if (!ent.isPlayer && Math.hypot(ent.x - player.x, ent.y - player.y) <= 1.8) {
            this.applyDamage(ent, damage, player);
            this.addFloatingText(ent.x, ent.y, `-${damage} SLICE`, COLORS.fireRed);
            const kx = ent.x + Math.sign(ent.x - player.x);
            const ky = ent.y + Math.sign(ent.y - player.y);
            const zone = this.getOrCreateZone(ent.zone);
            if (zone.tiles[ky]?.[kx]?.walkable) {
              ent.x = kx;
              ent.y = ky;
            }
            if (ent.hp <= 0) this.handleEntityDeath(ent, player);
          }
        }
        break;
      }

      case 'phase_shift': {
        let tx = targetX ?? (player.x + player.facing.dx * 3);
        let ty = targetY ?? (player.y + player.facing.dy * 3);
        tx = Math.max(1, Math.min(ZONE_WIDTH - 2, tx));
        ty = Math.max(1, Math.min(ZONE_HEIGHT - 2, ty));

        player.x = tx;
        player.y = ty;
        player.statusEffects.phase = 3;
        this.log(`✧ PHASE SHIFT! ${player.name} bends quantum space and blinks across the zone!`, 'story');
        this.addFloatingText(player.x, player.y, `✧ PHASE BLINK ✧`, COLORS.purpleEnder);
        break;
      }

      case 'shield_slam': {
        const tx = targetX ?? (player.x + player.facing.dx);
        const ty = targetY ?? (player.y + player.facing.dy);
        const target = this.findEntityAt(player.zone, tx, ty);
        if (target && !target.isPlayer) {
          const slamDmg = 35 + (player.equipment?.shield?.shieldBonus ? 15 : 0);
          this.applyDamage(target, slamDmg, player);
          target.statusEffects.frozen = 3; // Stunned
          this.log(`💥 SHIELD SLAM! ${player.name} bashes ${target.name} for ${slamDmg} damage and stuns them!`, 'combat');
          this.addFloatingText(target.x, target.y, `STUNNED! -${slamDmg}`, COLORS.bossGold);
          if (target.hp <= 0) this.handleEntityDeath(target, player);
        } else {
          this.log(`Shield Slam bashes empty air.`, 'system');
        }
        break;
      }

      case 'concussive_blast': {
        const tx = targetX ?? (player.x + player.facing.dx * 3);
        const ty = targetY ?? (player.y + player.facing.dy * 3);
        this.fireProjectile(player, tx, ty, 'fireball');
        this.log(`☄️ CONCUSSIVE BLAST! ${player.name} launches an explosive concussive wave!`, 'combat');
        break;
      }

      case 'nano_sentry': {
        const sx = Math.max(1, Math.min(ZONE_WIDTH - 2, player.x + (player.facing.dx || 1)));
        const sy = Math.max(1, Math.min(ZONE_HEIGHT - 2, player.y + (player.facing.dy || 0)));
        const sentry: Entity = {
          id: `sentry-${Date.now()}`,
          name: 'Allied Nano-Sentry',
          x: sx,
          y: sy,
          zone: player.zone,
          symbol: '∏',
          color: COLORS.cyan,
          hp: 40,
          maxHp: 40,
          energy: 100,
          maxEnergy: 100,
          isPlayer: false,
          statusEffects: {},
          inventory: [],
          facing: { dx: player.facing.dx, dy: player.facing.dy }
        };
        this.entities.set(sentry.id, sentry);
        this.log(`🤖 NANO-SENTRY DEPLOYED! Autonomous turret online for 10 ticks.`, 'combat');
        this.addFloatingText(sx, sy, `[SENTRY DEPLOYED]`, COLORS.cyan);
        break;
      }

      case 'cryo_nova': {
        this.log(`❄ CRYO NOVA! ${player.name} detonates a blizzard flash-freezing all surrounding hostiles!`, 'combat');
        this.addFloatingText(player.x, player.y, `❄ CRYO NOVA! ❄`, COLORS.cyan);

        for (const ent of zoneEntities) {
          if (!ent.isPlayer && Math.hypot(ent.x - player.x, ent.y - player.y) <= 2.5) {
            ent.statusEffects.frozen = 7;
            this.applyDamage(ent, 30, player);
            this.addFloatingText(ent.x, ent.y, `FROZEN! -30`, COLORS.cyan);
            if (ent.hp <= 0) this.handleEntityDeath(ent, player);
          }
        }
        break;
      }

      case 'restorative_mist': {
        player.hp = Math.min(player.maxHp, player.hp + 45);
        delete player.statusEffects.burning;
        delete player.statusEffects.frozen;
        this.log(`🧪 RESTORATIVE MIST! ${player.name} disperses aerosol nanites, healing allies and clearing debuffs!`, 'combat');
        this.addFloatingText(player.x, player.y, `+45 HP MIST`, COLORS.green);

        for (const ent of zoneEntities) {
          if (ent.isPlayer && ent.id !== player.id && Math.hypot(ent.x - player.x, ent.y - player.y) <= 2.5) {
            ent.hp = Math.min(ent.maxHp, ent.hp + 45);
            delete ent.statusEffects.burning;
            delete ent.statusEffects.frozen;
            this.addFloatingText(ent.x, ent.y, `+45 HP`, COLORS.green);
          }
        }
        break;
      }
    }

    if (this.getPacingModeForZone(player.zone) === 'turn_based') {
      this.stepZoneSimulation(player.zone);
    } else {
      this.notifyZone(player.zone);
    }
  }

  public handleWorldMapTravel(
    playerId: string,
    targetPx: number,
    targetPy: number,
    targetZx: number = 1,
    targetZy: number = 1
  ) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer || player.isDowned) return;

    const curCoord = player.zone;
    let destPx = Math.max(0, Math.min(15, targetPx));
    let destPy = Math.max(0, Math.min(6, targetPy));
    let destZx = Math.max(0, Math.min(2, targetZx));
    let destZy = Math.max(0, Math.min(2, targetZy));

    const dist = Math.abs(destPx - curCoord.parasangX) + Math.abs(destPy - curCoord.parasangY);
    if (dist === 0 && destZx === curCoord.zoneX && destZy === curCoord.zoneY && curCoord.depth === 0) {
      return;
    }

    let isLost = false;
    if (dist > 0) {
      const hasLore = player.skillsLearned?.includes('wilderness_lore');
      const lostChance = hasLore ? 0.05 : 0.25;
      if (Math.random() < lostChance) {
        isLost = true;
        destPx = Math.max(0, Math.min(15, destPx + (Math.random() < 0.5 ? -1 : 1)));
        destPy = Math.max(0, Math.min(6, destPy + (Math.random() < 0.5 ? -1 : 1)));
        destZx = Math.floor(Math.random() * 3);
        destZy = Math.floor(Math.random() * 3);
      }
    }

    const newCoord: ZoneCoord = {
      parasangX: destPx,
      parasangY: destPy,
      zoneX: destZx,
      zoneY: destZy,
      depth: 0
    };

    const destZone = this.getOrCreateZone(newCoord);

    let eventType: 'normal' | 'lost' | 'found_ruins' | 'found_cave' = 'normal';
    let message = `Traveled across the sands to Parsec (${destPx}, ${destPy}).`;

    if (isLost) {
      eventType = 'lost';
      player.statusEffects.lost = 40;
      message = 'LOST IN THE WILDS! Howling winds and treacherous dunes threw your party off-course!';
      this.log(`🧭 YOU ARE LOST! The party drifted into unfamiliar wilderness at Parsec (${destPx}, ${destPy}).`, 'combat');
      this.addFloatingText(player.x, player.y, 'LOST IN THE WILDS!', COLORS.fireRed);
    } else if (destZone.hasRuins) {
      eventType = 'found_ruins';
      message = 'You discovered the Forgotten Ancient Ruins of Qud!';
      this.log(`🏛️ DISCOVERY! Your party stumbled upon Forgotten Ancient Ruins in Parsec (${destPx}, ${destPy})!`, 'story');
      this.addFloatingText(player.x, player.y, 'ANCIENT RUINS!', COLORS.bossGold);
      this.awardPartyExperience(100);
    } else if (destZone.hasCaveEntrance) {
      eventType = 'found_cave';
      message = 'You discovered a deep subterranean fissure descending into cavern strata!';
      this.log(`▼ DISCOVERY! Your party found an underground cave entrance in Parsec (${destPx}, ${destPy})!`, 'story');
      this.addFloatingText(player.x, player.y, 'UNDERGROUND CAVE!', COLORS.fireRed);
      this.awardPartyExperience(100);
    } else {
      this.log(`🗺️ Overland Travel: Party arrived at Parsec (${destPx}, ${destPy}), Screen (${destZx}, ${destZy}).`, 'story');
      this.awardPartyExperience(35);
    }

    // Move player and companion bots
    const partyMembers = Array.from(this.entities.values()).filter(
      e => e.isPlayer && this.getZoneKey(e.zone) === this.getZoneKey(curCoord)
    );

    for (const member of partyMembers) {
      member.zone = { ...newCoord };
      member.x = 24;
      member.y = 13;
    }

    if (destZone.tiles[13] && destZone.tiles[13][24]) {
      destZone.tiles[13][24].walkable = true;
      destZone.tiles[13][24].type = 'floor';
    }

    this.spawnEnemiesForZone(newCoord);
    this.updateZonePacing(newCoord);
    this.onPlayerZoneChanged?.(player.id, destZone, this.getPacingModeForZone(newCoord));
    this.onWorldTravelResult?.(eventType, message, newCoord);
  }

  public handleDescendStairs(playerId: string) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer) return;
    const zone = this.getOrCreateZone(player.zone);
    const tile = zone.tiles[player.y]?.[player.x];
    if (tile && (tile.type === 'stairs_down' || tile.char === '>' || tile.char === '▼')) {
      const newCoord: ZoneCoord = { ...player.zone, depth: player.zone.depth + 1 };
      this.transitionPartyToCoord(player, newCoord, 'descend');
    } else {
      this.log('No downward stairs or cavern fissure beneath your feet.', 'system');
    }
  }

  public handleAscendStairs(playerId: string) {
    const player = this.entities.get(playerId);
    if (!player || !player.isPlayer) return;
    const zone = this.getOrCreateZone(player.zone);
    const tile = zone.tiles[player.y]?.[player.x];
    if (tile && (tile.type === 'stairs_up' || tile.char === '<' || tile.char === '▲')) {
      const newCoord: ZoneCoord = { ...player.zone, depth: Math.max(0, player.zone.depth - 1) };
      this.transitionPartyToCoord(player, newCoord, 'ascend');
    } else {
      this.log('No upward stairs or passage beneath your feet.', 'system');
    }
  }

  private transitionPartyToCoord(leader: Entity, newCoord: ZoneCoord, action: 'descend' | 'ascend') {
    const oldZoneKey = this.getZoneKey(leader.zone);
    const newZone = this.getOrCreateZone(newCoord);

    const partyMembers = Array.from(this.entities.values()).filter(
      e => e.isPlayer && this.getZoneKey(e.zone) === oldZoneKey
    );

    let entryX = 24;
    let entryY = 13;
    const targetStairType = action === 'descend' ? 'stairs_up' : 'stairs_down';
    for (let y = 0; y < ZONE_HEIGHT; y++) {
      for (let x = 0; x < ZONE_WIDTH; x++) {
        if (newZone.tiles[y]?.[x]?.type === targetStairType) {
          entryX = x;
          entryY = y;
          break;
        }
      }
    }

    for (const member of partyMembers) {
      member.zone = { ...newCoord };
      member.x = entryX;
      member.y = entryY;
    }

    if (newZone.tiles[entryY]?.[entryX]) {
      newZone.tiles[entryY][entryX].walkable = true;
    }

    const actionText = action === 'descend'
      ? `descends the dark fissure into subterranean cavern strata (Depth ${newCoord.depth})!`
      : `ascends the winding stone passage to Depth ${newCoord.depth}.`;
    this.log(`${leader.name} ${actionText}`, 'story');
    this.addFloatingText(leader.x, leader.y, action === 'descend' ? 'DESCENDED!' : 'ASCENDED!', COLORS.cyan);
    this.awardPartyExperience(action === 'descend' ? 50 : 20);

    this.spawnEnemiesForZone(newCoord);
    this.updateZonePacing(newCoord);
    this.onPlayerZoneChanged?.(leader.id, newZone, this.getPacingModeForZone(newCoord));
  }

  private applyDamage(target: Entity, amount: number, attacker?: Entity) {
    if (target.isPlayer) {
      // 1. Dodge Check: Agility above baseline + Swift Strider skill
      const baseAgi = target.role ? (BASE_HERO_ATTRIBUTES[target.role]?.agi || 10) : 10;
      const agiBonus = Math.max(0, (target.attributes?.agi || baseAgi) - baseAgi) * 0.02;
      const striderBonus = target.skillsLearned?.includes('swift_strider') ? 0.15 : 0;
      const totalDodge = agiBonus + striderBonus;
      if (Math.random() < totalDodge) {
        this.log(`${target.name} swiftly dodges the attack!`, 'combat');
        this.addFloatingText(target.x, target.y, 'DODGED!', COLORS.cyan);
        return;
      }
    }

    // 2. Shield absorbs damage first
    if (target.hasShield && target.shieldHp && target.shieldHp > 0) {
      if (target.shieldHp >= amount) {
        target.shieldHp -= amount;
        this.addFloatingText(target.x, target.y, `SHIELD -${amount}`, COLORS.cyan);
        return;
      } else {
        const remaining = amount - target.shieldHp;
        this.addFloatingText(target.x, target.y, `SHIELD BROKE!`, COLORS.cyan);
        target.shieldHp = 0;
        target.hasShield = false;
        amount = remaining;
      }
    }

    // 3. Toughness, Cave Delver & Equipped Armor Damage Reduction applied to flesh/HP damage
    if (target.isPlayer) {
      const baseTou = target.role ? (BASE_HERO_ATTRIBUTES[target.role]?.tou || 10) : 10;
      const touReduction = Math.max(0, Math.floor(((target.attributes?.tou || baseTou) - baseTou) * 0.5));
      if (target.zone.depth > 0 && target.skillsLearned?.includes('cave_delver')) {
        amount = Math.floor(amount * 0.8);
      }
      if (target.equipment) {
        let defensePct = 0;
        for (const it of Object.values(target.equipment)) {
          if (it?.defenseBonus) defensePct += it.defenseBonus;
        }
        if (defensePct > 0) {
          amount = Math.max(1, Math.floor(amount * (1 - Math.min(0.70, defensePct / 100))));
        }
      }
      amount = Math.max(1, amount - touReduction);
    } else if (target.eliteAffix?.includes('Armored')) {
      amount = Math.max(1, Math.floor(amount * 0.65));
    }

    target.hp -= amount;
    if (!target.isPlayer && attacker?.isPlayer) {
      target.isAlerted = true;
      target.aggroTargetId = attacker.id;
    }
  }

  private handleCraftingOrAltar(player: Entity, targetTile?: ZoneTile) {
    const zone = this.getOrCreateZone(player.zone);
    let tile = targetTile;

    // If no direct tile passed, check facing tile then adjacent tiles
    if (!tile || (tile.type !== 'workbench' && tile.type !== 'altar')) {
      const facingX = player.x + (player.facing?.dx || 0);
      const facingY = player.y + (player.facing?.dy || 0);
      if (zone.tiles[facingY]?.[facingX]?.type === 'workbench' || zone.tiles[facingY]?.[facingX]?.type === 'altar') {
        tile = zone.tiles[facingY][facingX];
      } else {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const t = zone.tiles[player.y + dy]?.[player.x + dx];
            if (t?.type === 'workbench' || t?.type === 'altar') {
              tile = t;
              break;
            }
          }
          if (tile?.type === 'workbench' || tile?.type === 'altar') break;
        }
      }
    }

    if (!tile) {
      this.log(`No workbench or altar nearby to interact with. Stand adjacent to one!`, 'system');
      return;
    }

    // 1. Workbench Crafting Mechanic
    if (tile.type === 'workbench') {
      const countMatching = (matcher: (it: Item) => boolean) => {
        return player.inventory
          .filter(matcher)
          .reduce((sum, it) => sum + (it.count || 1), 0);
      };

      const consumeMatching = (matcher: (it: Item) => boolean, needed: number) => {
        let left = needed;
        for (let i = player.inventory.length - 1; i >= 0 && left > 0; i--) {
          const it = player.inventory[i];
          if (matcher(it)) {
            const count = it.count || 1;
            const take = Math.min(left, count);
            left -= take;
            if (count <= take) {
              player.inventory.splice(i, 1);
            } else {
              it.count = count - take;
            }
          }
        }
      };

      const isScrap = (it: Item) => it.id.startsWith('scrap') || it.id.includes('scrap_metal');
      const isCrystal = (it: Item) => it.id.startsWith('crystal') || it.id.includes('diode_crystal');
      const isIron = (it: Item) => it.id.startsWith('iron') || it.id.includes('iron_ore');
      const isCopper = (it: Item) => it.id.startsWith('copper') || it.id.includes('copper_ore');
      const isObsidian = (it: Item) => it.id.startsWith('obsidian') || it.id.includes('obsidian_shard');
      const isRelic = (it: Item) => it.id.startsWith('relic') || it.id.includes('relic_superalloy');
      const isCell = (it: Item) => it.id.startsWith('cell') || it.id.includes('energy_cell');

      const scrapCount = countMatching(isScrap);
      const crystalCount = countMatching(isCrystal);
      const ironCount = countMatching(isIron);
      const copperCount = countMatching(isCopper);
      const obsidianCount = countMatching(isObsidian);
      const relicCount = countMatching(isRelic);
      const cellCount = countMatching(isCell);

      // Recipe 1: Luther's Laser Weapon (Scrap Metal + Laser Diode Crystal) - Always prioritized if not crafted or if Luther lacks weapon
      if (scrapCount >= 1 && crystalCount >= 1 && (!this.story.laserCrafted || player.role === 'luther' || !player.inventory.some(it => it.id.includes('laser_rifle')))) {
        consumeMatching(isScrap, 1);
        consumeMatching(isCrystal, 1);

        const laserRifle = createItem('laser_rifle');
        const luther = this.entities.get('hero-luther');
        if (luther) {
          this.addItemToInventory(luther, laserRifle);
          luther.equipment = luther.equipment || {};
          luther.equipment.weapon = laserRifle;
          this.recalculateEntityStats(luther);
        }
        this.addItemToInventory(player, createItem('laser_rifle'));
        this.story.laserCrafted = true;
        this.awardPartyExperience(75);
        this.log(`⚙️ WORKBENCH CRAFTING SUCCESS! Barrett expertly crafts the High-Energy Laser Weapon! Luther equips the laser rifle.`, 'story');
        this.addFloatingText(player.x, player.y, '★ CRAFTED LASER RIFLE! ★', COLORS.cyan);
        return;
      }

      // Recipe 2: Tier 4 Quantum Laser Excavator (5 Scrap + 1 Relic Superalloy OR 5 Scrap + 3 Crystal + 2 Cells)
      if ((scrapCount >= 3 && relicCount >= 1) || (scrapCount >= 5 && crystalCount >= 3 && cellCount >= 2)) {
        if (relicCount >= 1) {
          consumeMatching(isScrap, 3);
          consumeMatching(isRelic, 1);
        } else {
          consumeMatching(isScrap, 5);
          consumeMatching(isCrystal, 3);
          consumeMatching(isCell, 2);
        }
        const bore = createItem('quantum_bore');
        this.addItemToInventory(player, bore);
        this.awardPartyExperience(120);
        this.log(`⚙️ WORKBENCH CRAFTING SUCCESS! Assembled Tier 4 Quantum Laser Excavator! Dig Power: 120 (Obliterates ancient superalloy).`, 'story');
        this.addFloatingText(player.x, player.y, '★ TIER 4 QUANTUM BORE! ★', COLORS.bossGold);
        return;
      }

      // Recipe 3: Tier 3 Cryo-Plasma Mining Drill (4 Scrap + 1 Obsidian Shard OR 4 Scrap + 2 Crystal + 1 Cell)
      if ((scrapCount >= 3 && obsidianCount >= 1) || (scrapCount >= 4 && crystalCount >= 2 && cellCount >= 1)) {
        if (obsidianCount >= 1) {
          consumeMatching(isScrap, 3);
          consumeMatching(isObsidian, 1);
        } else {
          consumeMatching(isScrap, 4);
          consumeMatching(isCrystal, 2);
          consumeMatching(isCell, 1);
        }
        const drill = createItem('plasma_drill');
        this.addItemToInventory(player, drill);
        this.awardPartyExperience(75);
        this.log(`⚙️ WORKBENCH CRAFTING SUCCESS! Forged Tier 3 Cryo-Plasma Mining Drill! Dig Power: 75 (Vaporizes obsidian & basalt).`, 'story');
        this.addFloatingText(player.x, player.y, '+Plasma Drill (Tier 3)!', COLORS.cyan);
        return;
      }

      // Recipe 4: Tier 2 High-Carbon Steel Pickaxe (3 Scrap + 1 Iron Chunk OR 3 Scrap + 1 Copper Nugget / Crystal)
      if (scrapCount >= 3 && (ironCount >= 1 || copperCount >= 1 || crystalCount >= 1)) {
        consumeMatching(isScrap, 3);
        if (ironCount >= 1) consumeMatching(isIron, 1);
        else if (copperCount >= 1) consumeMatching(isCopper, 1);
        else consumeMatching(isCrystal, 1);

        const steelPick = createItem('hardened_pick');
        this.addItemToInventory(player, steelPick);
        this.awardPartyExperience(50);
        this.log(`⚙️ WORKBENCH CRAFTING SUCCESS! Smelted Tier 2 High-Carbon Steel Pickaxe! Dig Power: 45 (Excavates dense iron ore & deep granite).`, 'story');
        this.addFloatingText(player.x, player.y, '+Steel Pickaxe (Tier 2)!', COLORS.hudText);
        return;
      }

      // Recipe 5: Tier 1 Heavy Carbide Pickaxe (2 Scrap Metal)
      if (scrapCount >= 2) {
        consumeMatching(isScrap, 2);
        const pick = createItem('mining_pick');
        this.addItemToInventory(player, pick);
        this.awardPartyExperience(35);
        this.log(`⚙️ WORKBENCH: Crafted Heavy Carbide Pickaxe from metal scrap! Dig Power: 25 (Excavates solid rock walls & copper veins).`, 'story');
        this.addFloatingText(player.x, player.y, '+Carbide Pickaxe (Tier 1)!', COLORS.amberBright);
        return;
      }

      // Recipe 6: Quantum Energy Cell (1 Scrap Metal)
      if (scrapCount >= 1) {
        consumeMatching(isScrap, 1);
        const cell = createItem('energy_cell');
        this.addItemToInventory(player, cell);
        this.awardPartyExperience(20);
        this.log(`⚙️ WORKBENCH: Crafted Quantum Energy Cell from scrap components!`, 'story');
        this.addFloatingText(player.x, player.y, '+Energy Cell!', COLORS.cyan);
        return;
      }

      // Recipe 1 Fallback if both items present but not matching initial check
      if (scrapCount >= 1 && crystalCount >= 1) {
        consumeMatching(isScrap, 1);
        consumeMatching(isCrystal, 1);
        this.addItemToInventory(player, createItem('laser_rifle'));
        this.awardPartyExperience(50);
        this.log(`⚙️ WORKBENCH: Crafted backup Laser Rifle!`, 'story');
        this.addFloatingText(player.x, player.y, '+Laser Rifle!', COLORS.cyan);
        return;
      }

      // No materials in inventory
      this.log(`Homestead Workbench Active: Bring Scrap Metal (%), Ores, and Laser Diode Crystal (♦) found outside to craft Luther's Laser Weapon, Mining Picks (Tiers 1-4), and Energy Cells!`, 'system');
      this.addFloatingText(player.x, player.y, 'NEED MATERIALS (%)', COLORS.amber);
      return;
    }

    // 2. Water Mountain Broken Rainbow Puzzle: Place Pom-Poms
    if (tile.type === 'altar' && tile.pedestalColor) {
      const neededColor = tile.pedestalColor;
      const isAlreadyPlaced = tile.pedestalItem || this.story.rainbowPiecesPlaced.includes(neededColor);
      if (isAlreadyPlaced) {
        this.log(`The ${neededColor.toUpperCase()} Altar Pedestal is already active and humming with rainbow energy.`, 'system');
        return;
      }

      const pomIndex = player.inventory.findIndex(it => it.colorTag === neededColor);

      if (pomIndex !== -1) {
        const placed = player.inventory.splice(pomIndex, 1)[0];
        tile.pedestalItem = placed;
        this.story.rainbowPiecesPlaced.push(neededColor);
        this.log(`${player.name} places the ${placed.name} into the ${neededColor.toUpperCase()} pedestal!`, 'story');
        this.addFloatingText(player.x, player.y, `★ ${placed.name}`, COLORS.rainbow[neededColor as keyof typeof COLORS.rainbow]);

        if (this.story.rainbowPiecesPlaced.length === RAINBOW_ORDER.length) {
          this.log(`The Rainbow line is complete! The Victory Switch glows brightly above the altar!`, 'story');
        }
      } else {
        this.log(`This altar pedestal requires the ${neededColor.toUpperCase()} Pom-Pom. Find it in the surrounding valley!`, 'system');
      }
    }
  }

  private handleAltarStep(player: Entity, tile: ZoneTile) {
    const colorName = (tile.pedestalColor || 'Rainbow').toUpperCase();
    const isPlaced = tile.pedestalItem || this.story.rainbowPiecesPlaced.includes(tile.pedestalColor || '');

    if (isPlaced) {
      this.log(`${player.name} stands upon the ${colorName} Altar Pedestal (Active: Pom-Pom placed).`, 'system');
      return;
    }

    const pomIndex = player.inventory.findIndex(it => it.colorTag === tile.pedestalColor);
    if (pomIndex !== -1) {
      this.handleCraftingOrAltar(player, tile);
    } else {
      this.log(`${player.name} stands at the ${colorName} Altar Pedestal (Ω). Requires the ${colorName} Pom-Pom.`, 'system');
      this.addFloatingText(player.x, player.y, `[${colorName} Altar]`, COLORS.rainbow[tile.pedestalColor as keyof typeof COLORS.rainbow] || COLORS.bossGold);
    }
  }

  private handleVictorySwitch(player: Entity) {
    if (this.story.rainbowPiecesPlaced.length >= RAINBOW_ORDER.length) {
      this.log(`The Victory Switch is pushed! Level 1 complete! The way to Level 2 (The Homesteads) is open!`, 'story');
      this.addFloatingText(player.x, player.y, 'LEVEL 1 CLEAR!', COLORS.bossGold);
      const ev = this.story.advanceStage('SKELETON_HOMESTEAD');
      this.onStoryEvent?.('SKELETON_HOMESTEAD', ev.questTitle, ev.questDesc, ev.dialogue);
    } else {
      this.log(`The Victory Switch is locked. Complete the rainbow line of pom-poms first!`, 'system');
    }
  }

  public initWallDurabilityAndTier(tile: Tile, tx: number, ty: number, zone: ZoneData): void {
    if (tile.hp !== undefined && tile.requiredTier !== undefined) return;

    tile.minable = true;

    if (tile.char === '%' || tile.oreDrop === 'copper_ore' || tile.oreName?.toLowerCase().includes('copper')) {
      tile.maxHp = 60;
      tile.hp = 60;
      tile.requiredTier = 1;
      tile.oreDrop = 'copper_ore';
      tile.oreName = 'Copper Vein';
    } else if (tile.char === '■' || tile.oreDrop === 'iron_ore' || tile.oreName?.toLowerCase().includes('iron')) {
      tile.maxHp = 80;
      tile.hp = 80;
      tile.requiredTier = 2;
      tile.oreDrop = 'iron_ore';
      tile.oreName = 'Dense Iron Ore Vein';
    } else if (tile.char === '▲' || tile.oreDrop === 'obsidian_shard' || tile.oreName?.toLowerCase().includes('obsidian')) {
      tile.maxHp = 120;
      tile.hp = 120;
      tile.requiredTier = 3;
      tile.oreDrop = 'obsidian_shard';
      tile.oreName = 'Obsidian Spire';
    } else if (tile.char === 'Ω' || tile.oreDrop === 'relic_superalloy' || tile.oreName?.toLowerCase().includes('relic')) {
      tile.maxHp = 180;
      tile.hp = 180;
      tile.requiredTier = 4;
      tile.oreDrop = 'relic_superalloy';
      tile.oreName = 'Ancient Relic Superalloy Strata';
    } else if (tile.type === 'breakable_wall' || tile.char === SYMBOLS.breakableWall) {
      tile.maxHp = 30;
      tile.hp = 30;
      tile.requiredTier = 0;
      tile.oreDrop = 'scrap_metal';
      tile.oreName = 'Fractured Stone Wall';
    } else if (tx === 0 || tx === zone.width - 1 || ty === 0 || ty === zone.height - 1) {
      tile.maxHp = 40;
      tile.hp = 40;
      tile.requiredTier = 1;
      tile.oreDrop = 'scrap_metal';
      tile.oreName = 'Perimeter Barrier Wall';
    } else {
      tile.maxHp = 40;
      tile.hp = 40;
      tile.requiredTier = 1;
      tile.oreDrop = Math.random() < 0.35 ? 'scrap_metal' : undefined;
      tile.oreName = 'Solid Rock Wall';
    }
  }

  public getPlayerBestMiningTool(player: Entity): {
    tool: Item | null;
    tier: number;
    power: number;
    name: string;
  } {
    let bestTier = 0;
    let bestPower = 10;
    let bestName = 'Makeshift Hands';
    let bestTool: Item | null = null;

    // Check equipped weapon
    const eqWeapon = player.equipment?.weapon || player.equippedWeapon;
    if (eqWeapon) {
      const t = eqWeapon.miningTier ?? (eqWeapon.name.toLowerCase().includes('pick') ? 1 : undefined);
      const p = eqWeapon.miningPower ?? eqWeapon.atkBonus ?? 10;
      if (t !== undefined && t >= bestTier) {
        bestTier = t;
        bestPower = Math.max(bestPower, p);
        bestName = eqWeapon.name;
        bestTool = eqWeapon;
      }
    }

    // Check inventory for mining tools
    for (const it of player.inventory) {
      if (it.miningTier !== undefined || it.miningPower !== undefined) {
        const t = it.miningTier ?? 1;
        const p = it.miningPower ?? 20;
        if (t > bestTier || (t === bestTier && p > bestPower)) {
          bestTier = t;
          bestPower = p;
          bestName = it.name;
          bestTool = it;
        }
      }
    }

    // Barrett the Miner innate bonus: +15 dig power and +1 mining tier
    if (player.role === 'barrett' || player.id === 'hero-barrett') {
      bestPower += 15;
      bestTier = Math.max(1, bestTier + 1);
      if (bestTool === null) {
        bestName = "Barrett's Veteran Hands";
      }
    }

    // Strength attribute bonus
    const str = player.attributes?.str ?? 10;
    const strBonus = Math.max(0, Math.floor((str - 10) / 2));
    bestPower += strBonus;

    return {
      tool: bestTool,
      tier: bestTier,
      power: bestPower,
      name: bestName
    };
  }

  public setZoneTile(zone: ZoneData, x: number, y: number, newTile: Tile) {
    if (zone.tiles[y]) {
      zone.tiles[y][x] = newTile;
      if (!zone.tileUpdates) {
        zone.tileUpdates = [];
      }
      zone.tileUpdates.push({ x, y, tile: newTile });
    }
  }

  public executeBumpMine(player: Entity, zone: ZoneData, tx: number, ty: number, tile: Tile): boolean {
    if (tile.walkable) return false;
    // Don't mine interactables
    if (tile.type === 'workbench' || tile.type === 'altar' || tile.type === 'victory_switch' || tile.type === 'shield') {
      return false;
    }

    this.initWallDurabilityAndTier(tile, tx, ty, zone);
    const tool = this.getPlayerBestMiningTool(player);
    const reqTier = tile.requiredTier ?? 1;

    // Check tier
    if (tool.tier < reqTier) {
      const chipDmg = 1;
      tile.hp = Math.max(0, (tile.hp ?? 40) - chipDmg);
      const reqName = getToolTierName(reqTier);

      // Show minus damage directly on wall tile
      this.addFloatingText(tx, ty, `-${chipDmg} HP`, COLORS.wallGray);
      this.addFloatingText(player.x, player.y, `NEED TIER ${reqTier}!`, COLORS.fireRed);
      this.log(`${player.name}'s ${tool.name} is too weak to penetrate this ${tile.oreName || 'rock'}! Requires Tier ${reqTier} (${reqName}). Chipped for 1 HP (${tile.hp}/${tile.maxHp}).`, 'combat');
      return true;
    }

    // Tool tier is sufficient: calculate dig damage
    const variance = Math.floor((Math.random() * 0.2 - 0.1) * tool.power);
    const digDmg = Math.max(5, tool.power + variance);
    tile.hp = (tile.hp ?? 40) - digDmg;

    // CRITICAL USER REQUIREMENT:
    // "when a user tries to walk into a wall it hsould show minus damage like they're mining"
    this.addFloatingText(tx, ty, `-${digDmg} HP`, COLORS.amberBright);

    if ((tile.hp ?? 0) <= 0) {
      const isBorder = (tx === 0 || tx === zone.width - 1 || ty === 0 || ty === zone.height - 1);
      const newFloorTile: Tile = isBorder ? {
        type: 'floor',
        char: '░',
        color: COLORS.dirtPath,
        walkable: true,
        transparent: true
      } : {
        type: 'floor',
        char: '.',
        color: COLORS.darkGray,
        walkable: true,
        transparent: true
      };
      this.setZoneTile(zone, tx, ty, newFloorTile);

      if (isBorder) {
        this.log(`💥 ${player.name} breaks through the perimeter wall, opening an exit to the neighboring screen!`, 'story');
      } else {
        this.log(`${player.name} swings their ${tool.name} and mines through the solid rock wall!`, 'combat');
      }
      this.addFloatingText(tx, ty, '*EXCAVATED!*', COLORS.greenBright);

      // Drop dislodged ore or scrap
      const oreKey = tile.oreDrop || (Math.random() < 0.35 ? 'scrap_metal' : undefined);
      if (oreKey && ITEM_TEMPLATES[oreKey]) {
        const droppedItem = createItem(oreKey);
        zone.items.push({ x: tx, y: ty, item: droppedItem });
        this.addFloatingText(tx, ty, `+${droppedItem.name}!`, COLORS.cyan);
        this.log(`💎 Dislodged ${droppedItem.name} from the shattered strata!`, 'story');
      }

      // Bonus scrap drop for deep rock
      if (tile.requiredTier && tile.requiredTier >= 2 && Math.random() < 0.5) {
        const bonusScrap = createItem('scrap_metal');
        zone.items.push({ x: tx, y: ty, item: bonusScrap });
      }

      // Award mining XP
      const xpAward = 15 * ((tile.requiredTier || 1) + 1);
      this.awardPartyExperience(xpAward);
    } else {
      this.log(`${player.name} strikes the ${tile.oreName || 'rock wall'} with ${tool.name} for ${digDmg} dig damage! (${tile.hp}/${tile.maxHp} HP)`, 'combat');
    }

    return true;
  }

  private executeAttack(attacker: Entity, target: Entity) {
    const bonusDmg = attacker.runeBonuses?.damage || 0;
    const baseStr = attacker.role ? (BASE_HERO_ATTRIBUTES[attacker.role]?.str || 10) : 10;
    const strBonus = attacker.attributes ? Math.max(0, attacker.attributes.str - baseStr) : 0;
    const weaponAtk = attacker.equipment?.weapon?.atkBonus || 0;
    const relicAtk = attacker.equipment?.relic?.atkBonus || 0;
    const headAtk = attacker.equipment?.head?.atkBonus || 0;
    let damage = 25 + bonusDmg + strBonus + weaponAtk + relicAtk + headAtk;
    const isFire = attacker.role === 'barrett';

    // Elemental Shatter Check: Target frozen + fire attack
    const zoneEntities = Array.from(this.entities.values()).filter(
      e => this.getZoneKey(e.zone) === this.getZoneKey(target.zone)
    );
    const shatter = calculateShatterExplosion(target, zoneEntities, isFire);

    if (shatter.triggered) {
      const shatterDmg = 70 + bonusDmg * 2 + strBonus * 2 + weaponAtk;
      this.log(`SHATTER EXPLOSION! ${attacker.name}'s fire detonates ${target.name}'s ice block in a dazzling blast!`, 'combat');
      this.addFloatingText(target.x, target.y, `SHATTER! ${shatterDmg}`, COLORS.fireRed);
      this.applyDamage(target, shatterDmg, attacker);

      for (const aff of shatter.affectedEntities) {
        const ent = this.entities.get(aff.id);
        if (ent) {
          this.applyDamage(ent, aff.damage + bonusDmg, attacker);
          this.addFloatingText(ent.x, ent.y, `SHRAPNEL -${aff.damage + bonusDmg}`, COLORS.cyan);
          if (ent.hp <= 0) this.handleEntityDeath(ent, attacker);
        }
      }
    } else {
      this.applyDamage(target, damage, attacker);
      this.log(`${attacker.name} strikes ${target.name} for ${damage} damage.`, 'combat');
      this.addFloatingText(target.x, target.y, `-${damage}`, COLORS.amberBright);

      // Cleave Skill: Hit adjacent foes
      if (attacker.skillsLearned?.includes('cleave')) {
        for (const ent of zoneEntities) {
          if (!ent.isPlayer && ent.id !== target.id && Math.hypot(ent.x - target.x, ent.y - target.y) <= 1.5) {
            const cleaveDmg = Math.floor(damage * 0.5);
            this.applyDamage(ent, cleaveDmg, attacker);
            this.addFloatingText(ent.x, ent.y, `CLEAVE -${cleaveDmg}`, COLORS.fireRed);
            if (ent.hp <= 0) this.handleEntityDeath(ent, attacker);
          }
        }
      }
    }

    if (target.hp <= 0) {
      this.handleEntityDeath(target, attacker);
    }
  }

  private fireProjectile(attacker: Entity, targetX: number, targetY: number, type: 'laser' | 'ice' | 'fireball' | 'rock') {
    const proj: Projectile = {
      id: `proj-${Date.now()}-${Math.random()}`,
      startX: attacker.x,
      startY: attacker.y,
      targetX,
      targetY,
      currentX: attacker.x,
      currentY: attacker.y,
      symbol: type === 'ice' ? SYMBOLS.iceProjectile : (type === 'fireball' ? SYMBOLS.fireballProjectile : SYMBOLS.laserProjectile),
      color: type === 'ice' ? COLORS.cyan : (type === 'fireball' ? COLORS.fireRed : COLORS.amberBright),
      type,
      sourceId: attacker.id
    };
    this.projectiles.push(proj);

    const bonusDmg = attacker.runeBonuses?.damage || 0;
    const baseAgi = attacker.role ? (BASE_HERO_ATTRIBUTES[attacker.role]?.agi || 10) : 10;
    const agiBonus = attacker.attributes ? Math.floor(Math.max(0, attacker.attributes.agi - baseAgi) / 2) : 0;
    const weaponAtk = attacker.equipment?.weapon?.atkBonus || 0;
    const relicAtk = attacker.equipment?.relic?.atkBonus || 0;

    // Resolve projectile hit (players hit enemies, enemies hit players, no self or friendly fire)
    const target = Array.from(this.entities.values()).find(
      e => e.id !== attacker.id && (!attacker.isPlayer || !e.isPlayer) && this.getZoneKey(e.zone) === this.getZoneKey(attacker.zone) && e.x === targetX && e.y === targetY
    );
    if (target) {
      if (type === 'ice') {
        const extraFreeze = attacker.skillsLearned?.includes('deep_freeze') ? 3 : 0;
        const freezeDuration = 8 + (attacker.runeBonuses ? 3 : 0) + extraFreeze;
        target.statusEffects.frozen = freezeDuration; // Freeze in ice block
        const iceDamage = 18 + bonusDmg + agiBonus + weaponAtk + relicAtk;
        this.applyDamage(target, iceDamage, attacker);
        this.log(`${attacker.name}'s ice projectile freezes ${target.name} solid for ${freezeDuration} ticks!`, 'combat');
        this.addFloatingText(target.x, target.y, 'FROZEN!', COLORS.cyan);
      } else if (type === 'fireball') {
        this.executeAttack(attacker, target);
      } else {
        let laserDmg = 30 + bonusDmg + agiBonus + weaponAtk + relicAtk;
        if (attacker.skillsLearned?.includes('overcharge')) {
          laserDmg = Math.floor(laserDmg * 1.35);
          this.addFloatingText(target.x, target.y, 'CRIT!', COLORS.cyan);
        }
        this.applyDamage(target, laserDmg, attacker);
        this.log(`${attacker.name}'s laser blasts ${target.name} for ${laserDmg} damage.`, 'combat');
        this.addFloatingText(target.x, target.y, `-${laserDmg}`, COLORS.cyan);
      }

      // Concussive blast knockback
      if (attacker.skillsLearned?.includes('concussive_blast')) {
        const kx = target.x + Math.sign(targetX - attacker.x);
        const ky = target.y + Math.sign(targetY - attacker.y);
        const zone = this.getOrCreateZone(target.zone);
        if (zone.tiles[ky]?.[kx]?.walkable) {
          target.x = kx;
          target.y = ky;
        }
      }

      if (target.hp <= 0) this.handleEntityDeath(target, attacker);
    }
  }

  private executeLutherRevive(healer: Entity) {
    const downedAllies = Array.from(this.entities.values()).filter(
      e => e.isPlayer && e.isDowned && this.getZoneKey(e.zone) === this.getZoneKey(healer.zone)
    );

    if (downedAllies.length > 0) {
      for (const ally of downedAllies) {
        ally.isDowned = false;
        ally.hp = 60;
        this.log(`${healer.name} applies a magical restorative draught, reviving ${ally.name}!`, 'story');
        this.addFloatingText(ally.x, ally.y, 'REVIVED!', COLORS.green);

        // Field Surgeon skill: grants 3 ticks invulnerability
        if (healer.skillsLearned?.includes('field_surgeon')) {
          ally.statusEffects.invulnerable = 3 as any;
          this.addFloatingText(ally.x, ally.y, 'SURGEON SHIELD!', COLORS.bossGold);
        }
      }
    } else {
      // Heal self / aura
      healer.hp = Math.min(healer.maxHp, healer.hp + 35);
      this.addFloatingText(healer.x, healer.y, '+35 HP', COLORS.green);
    }
  }

  private handleEntityDeath(entity: Entity, killer?: Entity) {
    if (entity.isPlayer) {
      entity.isDowned = true;
      entity.hp = 0;
      this.log(`HERO DOWN! ${entity.name} collapsed! Luther must revive them with a healing potion!`, 'story');
      this.addFloatingText(entity.x, entity.y, 'DOWNED!', COLORS.fireRed);
      return;
    }

    this.log(`${entity.name} was defeated!`, 'combat');
    this.entities.delete(entity.id);

    // 1. Award Experience
    const xpReward = Math.floor((entity.maxHp || 50) * 0.75) * (entity.isElite ? 2.5 : 1);
    this.awardPartyExperience(Math.max(25, Math.floor(xpReward)));

    // 2. Bloodlust Skill
    if (killer && killer.skillsLearned?.includes('bloodlust')) {
      killer.hp = Math.min(killer.maxHp, killer.hp + 20);
      killer.energy = Math.min(killer.maxEnergy, killer.energy + 15);
      this.addFloatingText(killer.x, killer.y, '🩸 BLOODLUST +20 HP', COLORS.fireRed);
    }

    // 3. Loot Drops
    const zone = this.getOrCreateZone(entity.zone);
    const wState = this.zoneWaves.get(this.getZoneKey(entity.zone));
    const zLevel = wState ? wState.zoneLevel : this.getZoneLevel(entity.zone);
    const loot = generateRandomLoot(zLevel, entity.isElite, entity.name.includes('King') || entity.name.includes('Arch'));
    for (const drop of loot) {
      zone.items.push({
        x: entity.x,
        y: entity.y,
        item: drop
      });
      if (drop.rarity === 'rare' || drop.rarity === 'quantum') {
        this.log(`✨ ${entity.name} dropped [${drop.rarity.toUpperCase()}] ${drop.name}!`, 'story');
      }
    }

    // Elite Drops
    if (entity.isElite) {
      zone.items.push({
        x: entity.x,
        y: entity.y,
        item: {
          id: `elite-salve-${Date.now()}`,
          name: 'Champion Restorative Draught',
          type: 'consumable',
          symbol: SYMBOLS.potion,
          color: COLORS.green,
          description: 'A glowing restorative draught dropped by an elite champion. Restores 50 HP.'
        }
      });
      this.log(`💎 ${entity.name} dropped Champion Restorative Draught!`, 'combat');
    }

    // Elite Volatile death explosion
    if (entity.eliteAffix?.includes('Volatile')) {
      this.log(`💥 VOLATILE BURST! ${entity.name} explodes violently!`, 'combat');
      this.addFloatingText(entity.x, entity.y, '💥 NOVA!', COLORS.fireRed);
      const zoneEnts = Array.from(this.entities.values()).filter(
        e => this.getZoneKey(e.zone) === this.getZoneKey(entity.zone) && e.id !== entity.id
      );
      for (const ent of zoneEnts) {
        if (Math.hypot(ent.x - entity.x, ent.y - entity.y) <= 2) {
          this.applyDamage(ent, 35, entity);
          this.addFloatingText(ent.x, ent.y, '-35 BLAST', COLORS.fireRed);
          if (ent.hp <= 0) this.handleEntityDeath(ent, entity);
        }
      }
    }

    // 4. Wave progression & conquest check
    const zoneKey = this.getZoneKey(entity.zone);
    const livingEnemies = Array.from(this.entities.values()).filter(
      e => !e.isPlayer && e.hp > 0 && e.id !== entity.id && this.getZoneKey(e.zone) === zoneKey
    );

    const wStateRef = this.zoneWaves.get(zoneKey);
    if (wStateRef && livingEnemies.length === 0) {
      if (wStateRef.currentWave < wStateRef.totalWaves) {
        wStateRef.currentWave++;
        this.log(`⚔ WAVE CLEARED! Ground rumbles... WAVE ${wStateRef.currentWave} OF ${wStateRef.totalWaves} HAS ARRIVED! ⚔`, 'combat');
        this.addFloatingText(entity.x, entity.y, `⚔ WAVE ${wStateRef.currentWave}! ⚔`, COLORS.fireRed);
        this.spawnWaveForZone(entity.zone, wStateRef.currentWave, wStateRef.zoneLevel);
        this.notifyZone(entity.zone);
      } else if (!wStateRef.allCleared) {
        wStateRef.allCleared = true;
        wStateRef.waveCleared = true;
        const xpReward = wStateRef.zoneLevel * 80;
        this.log(`★ ALL WAVES DEFEATED! Zone conquered! (+${xpReward} XP) An Ancient Cache materializes! ★`, 'story');
        this.addFloatingText(entity.x, entity.y, `★ ZONE CONQUERED! ★`, COLORS.bossGold);
        this.awardPartyExperience(xpReward);

        const zone = this.getOrCreateZone(entity.zone);
        zone.items.push({
          x: entity.x,
          y: entity.y,
          item: this.createConquestRuneReward(wStateRef.zoneLevel)
        });
        this.notifyZone(entity.zone);
      }
    }

    // Check boss deaths for story progression
    if (entity.name === 'Mutant Skeleton') {
      this.story.mutantSkeletonKilled = true;
      const ev = this.story.advanceStage('CREEPER_HOMESTEAD');
      this.onStoryEvent?.('CREEPER_HOMESTEAD', ev.questTitle, ev.questDesc, ev.dialogue);
    } else if (entity.name === 'Mutant Creeper') {
      this.story.mutantCreeperKilled = true;
      const ev = this.story.advanceStage('POWER_DOWN');
      this.onStoryEvent?.('POWER_DOWN', ev.questTitle, ev.questDesc, ev.dialogue);
    } else if (entity.name === 'Arch-Villager' || entity.name === 'Heart of Ender') {
      const bossesRemaining = Array.from(this.entities.values()).some(
        e => e.name === 'Arch-Villager' || e.name === 'Heart of Ender'
      );
      if (!bossesRemaining) {
        this.story.rockyDoomDualBossKilled = true;
        this.handleCooperBirthdayPartyEnding();
      }
    } else if (entity.name === 'Void Overlord' || entity.name === 'Nether Titan') {
      const finalBossesRemaining = Array.from(this.entities.values()).some(
        e => e.name === 'Void Overlord' || e.name === 'Nether Titan'
      );
      if (!finalBossesRemaining) {
        this.log(`★ THE BIRTHDAY CLIMAX IS WON! VICTORY FOR COOPER! ★`, 'story');
        this.addFloatingText(entity.x, entity.y, 'VICTORY!', COLORS.bossGold);
        const ev = this.story.advanceStage('VICTORY');
        this.onStoryEvent?.('VICTORY', ev.questTitle, ev.questDesc, ev.dialogue);
      }
    }
  }

  public handleCooperBirthdayPartyEnding() {
    this.log(`THE SLAP DUO HAS FALLEN! The path to Cooper's Birthday Cake at the Solo Final Stand is open!`, 'story');
    const ev = this.story.advanceStage('SOLO_FINAL_STAND');
    this.onStoryEvent?.('SOLO_FINAL_STAND', ev.questTitle, ev.questDesc, ev.dialogue);

    setTimeout(() => {
      const barrett = this.entities.get('hero-barrett');
      if (barrett) {
        this.log(`Cooper steps forward alone to claim the birthday throne...`, 'story');
        this.onStoryEvent?.('SOLO_FINAL_STAND', ev.questTitle, ev.questDesc, ev.dialogue);
        this.notifyZone(barrett.zone);
      }
    }, 2000);
  }

  public stepZoneSimulation(coord: ZoneCoord) {
    const key = this.getZoneKey(coord);
    const zone = this.getOrCreateZone(coord);
    const zoneEntities = Array.from(this.entities.values()).filter(
      e => this.getZoneKey(e.zone) === key
    );

    // 1. Tick status effects, cooldowns, and autonomous sentries
    for (const ent of zoneEntities) {
      if (ent.statusEffects.frozen) {
        ent.statusEffects.frozen--;
        if (ent.statusEffects.frozen <= 0) delete ent.statusEffects.frozen;
      }
      if (ent.statusEffects.climbing) {
        ent.statusEffects.climbing--;
        if (ent.statusEffects.climbing <= 0) delete ent.statusEffects.climbing;
      }
      if (ent.statusEffects.phase) {
        ent.statusEffects.phase--;
        if (ent.statusEffects.phase <= 0) delete ent.statusEffects.phase;
      }
      if ((ent.statusEffects as any).invulnerable) {
        (ent.statusEffects as any).invulnerable--;
        if ((ent.statusEffects as any).invulnerable <= 0) delete (ent.statusEffects as any).invulnerable;
      }
      if (ent.skillCooldowns) {
        for (const [sId, cd] of Object.entries(ent.skillCooldowns)) {
          if (cd > 0) {
            ent.skillCooldowns[sId] = cd - 1;
          }
        }
      }

      // Autonomous Nano-Sentry firing
      if (ent.id.startsWith('sentry-')) {
        ent.hp -= 4; // Loses 4 HP per tick (lasts 10 ticks)
        if (ent.hp <= 0) {
          this.log(`Nano-sentry battery depleted.`, 'combat');
          this.entities.delete(ent.id);
        } else {
          const hostiles = zoneEntities.filter(e => !e.isPlayer && !e.id.startsWith('sentry-') && e.hp > 0);
          if (hostiles.length > 0) {
            hostiles.sort((a, b) => Math.hypot(a.x - ent.x, a.y - ent.y) - Math.hypot(b.x - ent.x, b.y - ent.y));
            const nearest = hostiles[0];
            if (Math.hypot(nearest.x - ent.x, nearest.y - ent.y) <= 5) {
              this.fireProjectile(ent, nearest.x, nearest.y, 'laser');
            }
          }
        }
      }
    }

    // 2. Step companion AI bots (Luther, Beau, Barrett when unpiloted)
    for (const ent of zoneEntities) {
      if (ent.isPlayer && ent.isBot) {
        const step = stepCompanionBot(ent, zoneEntities, zone);
        if (step.type === 'move' && step.dx !== undefined && step.dy !== undefined) {
          const nx = ent.x + step.dx;
          const ny = ent.y + step.dy;
          const occupied = zoneEntities.some(e => e.hp > 0 && e.x === nx && e.y === ny);
          if (!occupied && zone.tiles[ny] && zone.tiles[ny][nx]?.walkable) {
            ent.x = nx;
            ent.y = ny;
          }
        } else if (step.type === 'action') {
          this.executeBotAction(ent, step.actionType || 'wait', step.targetX, step.targetY);
        }
      }
    }

    // 3. Step Monster AI
    for (const mob of zoneEntities) {
      if (mob.isPlayer || mob.hp <= 0 || mob.statusEffects.frozen) continue;

      if (!mob.patrolHome) {
        mob.patrolHome = { x: mob.x, y: mob.y };
      }

      // Find living non-downed players in zone
      const livingPlayers = zoneEntities.filter(e => e.isPlayer && !e.isDowned);
      if (livingPlayers.length === 0) continue;

      // Filter players within hero-dependent aggro range or alerted leash
      const detectedPlayers = livingPlayers.filter(player => {
        const dist = Math.hypot(player.x - mob.x, player.y - mob.y);
        // If mob was directly attacked by this player and is alerted, leash distance is up to 22 tiles
        if (mob.isAlerted && mob.aggroTargetId === player.id && dist <= 22) {
          return true;
        }
        const range = getHeroAggroRange(player, mob);
        return dist <= range;
      });

      if (detectedPlayers.length === 0) {
        // Un-aggroed: clear alert target if lost or out of range
        mob.isAlerted = false;
        mob.aggroTargetId = undefined;

        // Passive patrol / wander near patrolHome
        if (Math.random() < 0.3) {
          const wanderDirs = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: -1, dy: -1 }, { dx: 1, dy: -1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }
          ];
          const dir = wanderDirs[Math.floor(Math.random() * wanderDirs.length)];
          const nx = mob.x + dir.dx;
          const ny = mob.y + dir.dy;
          const distFromHome = Math.hypot(nx - mob.patrolHome.x, ny - mob.patrolHome.y);

          if (distFromHome <= 3.5 && nx >= 0 && nx < zone.width && ny >= 0 && ny < zone.height) {
            const tileWalkable = !!mob.isGhost || (zone.tiles[ny] && zone.tiles[ny][nx]?.walkable);
            const occupied = zoneEntities.some(e => e.hp > 0 && e.id !== mob.id && e.x === nx && e.y === ny);
            if (tileWalkable && !occupied) {
              mob.x = nx;
              mob.y = ny;
            }
          }
        }
        continue;
      }

      // Sort detected players by calculated threat descending
      detectedPlayers.sort((a, b) => {
        const distA = Math.hypot(a.x - mob.x, a.y - mob.y);
        const distB = Math.hypot(b.x - mob.x, b.y - mob.y);
        return calculateHeroThreat(b, mob, distB) - calculateHeroThreat(a, mob, distA);
      });

      const target = detectedPlayers[0];
      mob.aggroTargetId = target.id;
      const dist = Math.hypot(target.x - mob.x, target.y - mob.y);

      // Creeper explosive attack
      if (mob.name.includes('Creeper') && dist <= 2) {
        this.executeCreeperExplosion(mob, zoneEntities, zone);
        continue;
      }

      // Rock King Earth-Shaking Slap
      if (mob.name === 'Rock King' && !this.story.rockKingSlapWiped) {
        this.executeRockKingSlap(mob, zoneEntities);
        continue;
      }

      // Melee attack if adjacent
      if (dist <= 1.5) {
        let dmg = 18 + (mob.level || 1) * 3;
        if (mob.name.includes('Mutant')) dmg = Math.floor(dmg * 1.3);
        else if (mob.name.includes('Titan') || mob.name.includes('King')) dmg = Math.floor(dmg * 1.5);
        else if (mob.name.includes('Gladiator') || mob.name.includes('Stalker')) dmg = Math.floor(dmg * 1.25);
        if (mob.isElite) dmg = Math.floor(dmg * 1.35);

        this.log(`${mob.name} strikes ${target.name} for ${dmg} damage!`, 'combat');
        this.applyDamage(target, dmg, mob);
        this.addFloatingText(target.x, target.y, `-${dmg}`, COLORS.fireRed);

        // Elite Affix effects
        if (mob.eliteAffix?.includes('Vampiric')) {
          const heal = Math.floor(dmg * 0.5);
          mob.hp = Math.min(mob.maxHp, mob.hp + heal);
          this.addFloatingText(mob.x, mob.y, `+${heal} VAMP`, COLORS.green);
        }
        if (mob.eliteAffix?.includes('Glacial')) {
          target.statusEffects.frozen = 2;
          this.addFloatingText(target.x, target.y, 'CHILLED!', COLORS.cyan);
        }
        if (mob.eliteAffix?.includes('Frenzied') && Math.random() < 0.4) {
          const extraDmg = Math.floor(dmg * 0.6);
          this.log(`FRENZIED STRIKE! ${mob.name} strikes ${target.name} again for ${extraDmg} damage!`, 'combat');
          this.applyDamage(target, extraDmg, mob);
          this.addFloatingText(target.x, target.y, `-${extraDmg} FRENZY`, COLORS.fireRed);
        }

        if (target.hp <= 0) this.handleEntityDeath(target, mob);
      } else if (dist >= 2 && dist <= 5 && (mob.name.includes('Beetle') || mob.name.includes('Automaton') || mob.name.includes('Archer') || mob.name.includes('Stalker') || (mob.isElite && Math.random() < 0.35))) {
        // Ranged mob projectile attack
        let pType: 'laser' | 'fireball' | 'rock' | 'ice' = 'fireball';
        if (mob.name.includes('Automaton')) pType = 'laser';
        else if (mob.name.includes('Archer')) pType = 'rock';
        else if (mob.name.includes('Stalker')) pType = 'ice';

        let pDmg = 16 + (mob.level || 1) * 3;
        if (mob.isElite) pDmg = Math.floor(pDmg * 1.3);
        this.fireEnemyProjectile(mob, target, pType, pDmg);
      } else {
        // Move toward target using A* pathfinding (with stopAdjacent: true)
        const step = findAStarPath(
          mob.x,
          mob.y,
          target.x,
          target.y,
          zone,
          zoneEntities,
          {
            stopAdjacent: true,
            isGhost: !!mob.isGhost,
            ignoreEntityId: mob.id,
            targetEntityId: target.id,
            maxExpansions: 350,
            allowDiagonals: true
          }
        );

        if (step && (step.dx !== 0 || step.dy !== 0)) {
          mob.x += step.dx;
          mob.y += step.dy;
        }
      }
    }

    this.notifyZone(coord);
  }

  private executeCreeperExplosion(creeper: Entity, zoneEntities: Entity[], zone: ZoneData) {
    this.log(`SSSSS... BOOM! Giant creeper explosion rocks the fortress!`, 'combat');
    this.addFloatingText(creeper.x, creeper.y, 'KABOOM!!', COLORS.green);

    // Inflict knockback and blast damage on all entities in radius
    for (const ent of zoneEntities) {
      if (ent.id === creeper.id) continue;
      const dist = Math.hypot(ent.x - creeper.x, ent.y - creeper.y);
      if (dist <= 4) {
        ent.hp -= 40;
        const kb = calculateKnockback(creeper.x, creeper.y, ent.x, ent.y, 6, zone.tiles, zone.width, zone.height);
        ent.x = kb.finalX;
        ent.y = kb.finalY;

        if (ent.role === 'luther') {
          this.log(`Luther was blasted across the room into the wall!`, 'story');
          this.addFloatingText(ent.x, ent.y, 'BLASTED BACK!', COLORS.fireRed);
        }
        if (ent.hp <= 0) this.handleEntityDeath(ent);
      }
    }

    this.handleEntityDeath(creeper);
  }

  private executeRockKingSlap(rockKing: Entity, zoneEntities: Entity[]) {
    this.story.rockKingSlapWiped = true;
    this.log(`THE ROCK KING RAISES HIS COLOSSAL STONE ARM... EARTH-SHAKING SLAP!`, 'story');

    for (const ent of zoneEntities) {
      if (ent.isPlayer) {
        ent.hp = 0;
        ent.isDowned = true;
        this.addFloatingText(ent.x, ent.y, 'SLAPPED! 999', COLORS.bossGold);
      }
    }

    // Roguelike Reset
    setTimeout(() => {
      this.log(`The entire level resets. The three friends have one final chance—fight smarter!`, 'story');
      for (const ent of zoneEntities) {
        if (ent.isPlayer) {
          ent.isDowned = false;
          ent.hp = ent.maxHp;
          ent.x = 24;
          ent.y = 24;
        }
      }
      // Advance to dual boss stage
      this.story.advanceStage('ROCKY_DOOM_DUAL_BOSS');
      this.spawnEnemiesForZone(rockKing.zone);
    }, 1500);
  }

  public getZoneLevel(coord: ZoneCoord): number {
    const { parasangX, parasangY, depth } = coord;
    let lvl = 1 + Math.floor(Math.hypot(parasangX, parasangY) * 0.75);
    if (isRuinsParsec(parasangX, parasangY)) lvl += 2;
    if (isCaveParsec(parasangX, parasangY)) lvl += 1;
    if (depth > 0) lvl += depth * 2;
    return Math.max(1, lvl);
  }

  public getTotalWavesForLevel(level: number): number {
    if (level <= 1) return 2;
    if (level <= 3) return 3;
    if (level <= 6) return 4;
    return 5;
  }

  public getWaveInfo(coord: ZoneCoord): WaveInfo | undefined {
    const key = this.getZoneKey(coord);
    const wState = this.zoneWaves.get(key);
    if (!wState) return undefined;

    const remaining = Array.from(this.entities.values()).filter(
      e => !e.isPlayer && e.hp > 0 && this.getZoneKey(e.zone) === key
    ).length;

    return {
      currentWave: wState.currentWave,
      totalWaves: wState.totalWaves,
      enemiesRemaining: remaining,
      waveCleared: remaining === 0,
      zoneLevel: wState.zoneLevel
    };
  }

  public createConquestRuneReward(level: number): Item {
    const stats: ('might' | 'vitality' | 'zephyr' | 'aegis' | 'baetyl')[] = ['might', 'vitality', 'zephyr', 'aegis', 'baetyl'];
    const stat = stats[Math.floor(Math.random() * stats.length)];
    const bonus = 5 + level * 3;
    return {
      id: `conquest-rune-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: stat === 'baetyl' ? 'Baetyl Cybernetic Matrix' : `Ancient Rune of ${stat.toUpperCase()}`,
      type: 'rune',
      symbol: stat === 'baetyl' ? 'ᛟ' : 'ᚱ',
      color: stat === 'might' ? '#ff4444' : (stat === 'vitality' ? '#44ff88' : (stat === 'aegis' ? '#88ccff' : '#ffd700')),
      description: `Conquest reward for clearing all enemy waves! Permanently grants +${bonus} ${stat.toUpperCase()}.`,
      runeStat: stat,
      runeBonus: bonus
    };
  }

  public fireEnemyProjectile(attacker: Entity, target: Entity, type: 'laser' | 'fireball' | 'rock' | 'ice', damage: number) {
    const proj: Projectile = {
      id: `proj-${Date.now()}-${Math.random()}`,
      startX: attacker.x,
      startY: attacker.y,
      targetX: target.x,
      targetY: target.y,
      currentX: attacker.x,
      currentY: attacker.y,
      symbol: type === 'ice' ? SYMBOLS.iceProjectile : (type === 'fireball' ? SYMBOLS.fireballProjectile : (type === 'laser' ? SYMBOLS.laserProjectile : '•')),
      color: type === 'ice' ? COLORS.cyan : (type === 'fireball' ? COLORS.fireRed : (type === 'laser' ? COLORS.amberBright : COLORS.stoneGray)),
      type,
      sourceId: attacker.id
    };
    this.projectiles.push(proj);

    this.log(`${attacker.name} fires a ${type} at ${target.name} for ${damage} damage!`, 'combat');
    this.applyDamage(target, damage, attacker);
    this.addFloatingText(target.x, target.y, `-${damage}`, COLORS.fireRed);
    if (target.hp <= 0) this.handleEntityDeath(target, attacker);
  }

  public spawnEnemiesForZone(coord: ZoneCoord) {
    const { parasangX, parasangY, zoneX, zoneY, depth } = coord;
    // Safe spawn house
    if (parasangX === 0 && parasangY === 0 && zoneX === 0 && zoneY === 0 && depth === 0) {
      return;
    }

    const key = this.getZoneKey(coord);
    let wState = this.zoneWaves.get(key);
    if (!wState) {
      const level = this.getZoneLevel(coord);
      const totalWaves = this.getTotalWavesForLevel(level);
      wState = {
        currentWave: 1,
        totalWaves,
        zoneLevel: level,
        waveCleared: false,
        allCleared: false
      };
      this.zoneWaves.set(key, wState);
    }

    // Don't double spawn if enemies already alive
    const existing = Array.from(this.entities.values()).filter(
      e => !e.isPlayer && e.hp > 0 && this.getZoneKey(e.zone) === key
    );
    if (existing.length > 0 || wState.allCleared) return;

    this.spawnWaveForZone(coord, wState.currentWave, wState.zoneLevel);
  }

  public spawnWaveForZone(coord: ZoneCoord, waveNum: number, level: number) {
    const { parasangX, parasangY, zoneX, zoneY, depth } = coord;
    const key = this.getZoneKey(coord);
    const zone = this.getOrCreateZone(coord);
    const totalWaves = this.getTotalWavesForLevel(level);

    // Announce Wave arrival
    this.log(`⚔ WAVE ${waveNum} OF ${totalWaves} HAS ARRIVED! (Threat Level ${level})`, 'combat');
    this.addFloatingText(24, 13, `⚔ WAVE ${waveNum}/${totalWaves}! ⚔`, COLORS.fireRed);

    // Check if this is a Story Milestone Zone
    const isMines = (parasangX === 0 && zoneX === 0 && depth === 1);
    const isCreek = ((parasangX === 3 && parasangY === 0 && zoneX === 1 && zoneY === 1) || (parasangX === 0 && zoneX === 1 && zoneY === 0));
    const isSkeleton = ((parasangX === 6 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && zoneX === 0 && zoneY === 0));
    const isCreeper = ((parasangX === 9 && parasangY === 3 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && zoneX === 1 && zoneY === 0));
    const isRocky = ((parasangX === 12 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && zoneX === 2 && zoneY === 1));
    const isFinal = ((parasangX === 15 && parasangY === 6 && zoneX === 1 && zoneY === 1) || (parasangX === 1 && parasangY === 1 && zoneX === 0 && zoneY === 0));

    // A. Story Milestone Waves
    if (isMines) {
      if (waveNum === 1) {
        // Wave 1: Cave Crawlers
        for (let i = 1; i <= 3; i++) {
          const id = `mine-crawler-${i}`;
          this.entities.set(id, {
            id, name: 'Cave Crawler', x: 18 + i * 4, y: 10, zone: coord,
            symbol: 'c', color: COLORS.green, hp: 55, maxHp: 55, energy: 60, maxEnergy: 60,
            isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: 0, dy: 1 }
          });
        }
      } else {
        // Wave 2 (Final): Cave Creeper Boss + 2 Magma Beetles
        this.entities.set('mine-mob-1', {
          id: 'mine-mob-1', name: '★ Giant Cave Creeper', x: 20, y: 10, zone: coord,
          symbol: SYMBOLS.creeper, color: COLORS.green, hp: 120, maxHp: 120, energy: 80, maxEnergy: 80,
          isPlayer: false, isElite: true, eliteAffix: '★ Frenzied', level, statusEffects: {}, inventory: [], facing: { dx: 0, dy: 1 }
        });
        this.entities.set('mine-beetle-1', {
          id: 'mine-beetle-1', name: 'Magma Beetle', x: 26, y: 8, zone: coord,
          symbol: 'b', color: COLORS.fireRed, hp: 70, maxHp: 70, energy: 60, maxEnergy: 60,
          isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
        });
        this.entities.set('mine-beetle-2', {
          id: 'mine-beetle-2', name: 'Magma Beetle', x: 14, y: 12, zone: coord,
          symbol: 'b', color: COLORS.fireRed, hp: 70, maxHp: 70, energy: 60, maxEnergy: 60,
          isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: 1, dy: 0 }
        });
      }
      return;
    }

    if (isCreek) {
      if (waveNum === 1) {
        for (let i = 1; i <= 4; i++) {
          const id = `creek-zombie-${i}`;
          this.entities.set(id, {
            id, name: 'Murk Zombie', x: 14 + i * 5, y: 10 + (i % 3), zone: coord,
            symbol: SYMBOLS.zombie, color: COLORS.greenDark, hp: 70, maxHp: 70, energy: 60, maxEnergy: 60,
            isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
          });
        }
      } else if (waveNum === 2) {
        for (let i = 1; i <= 3; i++) {
          const id = `creek-ghost-${i}`;
          this.entities.set(id, {
            id, name: 'Phasing Ghost', x: 12 + i * 8, y: 7 + (i % 2) * 5, zone: coord,
            symbol: SYMBOLS.ghost, color: COLORS.mistCyan, hp: 75, maxHp: 75, energy: 100, maxEnergy: 100,
            isPlayer: false, isGhost: true, level, statusEffects: {}, inventory: [], facing: { dx: 1, dy: 0 }
          });
        }
      } else {
        // Wave 3: Ghost Lord + 3 Armored Zombies
        this.entities.set('ghost-1', {
          id: 'ghost-1', name: '★ Phasing Ghost Lord', x: 12, y: 7, zone: coord,
          symbol: SYMBOLS.ghost, color: COLORS.mistCyan, hp: 140, maxHp: 140, energy: 100, maxEnergy: 100,
          isPlayer: false, isGhost: true, isElite: true, eliteAffix: '★ Glacial', hasShield: true, shieldHp: 50, level,
          statusEffects: {}, inventory: [], facing: { dx: 1, dy: 0 }
        });
        for (let i = 1; i <= 3; i++) {
          const id = `creek-elite-zombie-${i}`;
          this.entities.set(id, {
            id, name: '★ Armored Murk Zombie', x: 20 + i * 5, y: 12, zone: coord,
            symbol: SYMBOLS.zombie, color: COLORS.greenDark, hp: 90, maxHp: 90, energy: 60, maxEnergy: 60,
            isPlayer: false, isElite: true, eliteAffix: '★ Armored', hasShield: true, shieldHp: 40, level,
            statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
          });
        }
      }
      return;
    }

    if (isSkeleton) {
      if (waveNum < totalWaves) {
        for (let i = 1; i <= 4 + waveNum; i++) {
          const id = `skel-wave-${waveNum}-${i}`;
          const isArcher = (i % 2 === 0);
          this.entities.set(id, {
            id, name: isArcher ? 'Skeleton Archer' : 'Bone Legionnaire',
            x: 10 + i * 4, y: 8 + (i % 4) * 3, zone: coord,
            symbol: isArcher ? 's' : 'k', color: COLORS.boneWhite,
            hp: 80 + level * 10, maxHp: 80 + level * 10, energy: 70, maxEnergy: 70,
            isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: 0, dy: 1 }
          });
        }
      } else {
        // Final Wave: Mutant Skeleton Boss + Vanguard
        this.entities.set('skel-mutant', {
          id: 'skel-mutant', name: '★ Mutant Skeleton King', x: 24, y: 10, zone: coord,
          symbol: SYMBOLS.mutantSkeleton, color: COLORS.boneWhite, hp: 220, maxHp: 220, energy: 100, maxEnergy: 100,
          isPlayer: false, isElite: true, eliteAffix: '★ Frenzied', hasShield: true, shieldHp: 60, level,
          statusEffects: {}, inventory: [], facing: { dx: 0, dy: 1 }
        });
        for (let i = 1; i <= 3; i++) {
          const id = `skel-guard-${i}`;
          this.entities.set(id, {
            id, name: 'Bone Vanguard', x: 20 + i * 4, y: 14, zone: coord,
            symbol: 'k', color: COLORS.boneWhite, hp: 95, maxHp: 95, energy: 70, maxEnergy: 70,
            isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: 0, dy: -1 }
          });
        }
      }
      return;
    }

    if (isCreeper) {
      if (waveNum < totalWaves) {
        for (let i = 1; i <= 4 + waveNum; i++) {
          const id = `creep-wave-${waveNum}-${i}`;
          this.entities.set(id, {
            id, name: (i % 2 === 0) ? '★ Volatile Creeper' : 'Sulfur Creeper',
            x: 12 + i * 4, y: 9 + (i % 3) * 4, zone: coord,
            symbol: SYMBOLS.creeper, color: (i % 2 === 0) ? COLORS.fireRed : COLORS.amberBright,
            hp: 85 + level * 10, maxHp: 85 + level * 10, energy: 80, maxEnergy: 80,
            isPlayer: false, isElite: (i % 2 === 0), eliteAffix: (i % 2 === 0) ? '★ Volatile' : undefined,
            level, statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
          });
        }
      } else {
        // Final Wave: Shielded Mutant Creeper Boss
        this.entities.set('mutant-creeper', {
          id: 'mutant-creeper', name: '★ Shielded Mutant Creeper', x: 35, y: 14, zone: coord,
          symbol: SYMBOLS.mutantCreeper, color: COLORS.green, hp: 250, maxHp: 250, energy: 100, maxEnergy: 100,
          isPlayer: false, hasShield: true, shieldHp: 120, isElite: true, eliteAffix: '★ Volatile', level,
          statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
        });
        for (let i = 1; i <= 3; i++) {
          const id = `creep-final-add-${i}`;
          this.entities.set(id, {
            id, name: 'Sulfur Creeper', x: 26 + i * 4, y: 11, zone: coord,
            symbol: SYMBOLS.creeper, color: COLORS.amberBright, hp: 90, maxHp: 90, energy: 80, maxEnergy: 80,
            isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
          });
        }
      }
      return;
    }

    if (isRocky) {
      if (waveNum === 1) {
        for (let i = 1; i <= 6; i++) {
          const id = `rock-mini-${i}`;
          this.entities.set(id, {
            id, name: 'Rock Mini-Boss', x: 12 + i * 4, y: 8 + (i % 3) * 4, zone: coord,
            symbol: SYMBOLS.rockMiniBoss, color: COLORS.stoneGray, hp: 95, maxHp: 95, energy: 80, maxEnergy: 80,
            isPlayer: false, level, statusEffects: {}, inventory: [], facing: { dx: 0, dy: 1 }
          });
        }
      } else if (waveNum === 2) {
        for (let i = 1; i <= 6; i++) {
          const id = `colosseum-glad-${i}`;
          this.entities.set(id, {
            id, name: (i % 2 === 0) ? '★ Frenzied Gladiator' : 'Colosseum Gladiator',
            x: 14 + i * 4, y: 10 + (i % 2) * 5, zone: coord,
            symbol: 'K', color: COLORS.bossGold, hp: 110, maxHp: 110, energy: 80, maxEnergy: 80,
            isPlayer: false, isElite: (i % 2 === 0), eliteAffix: (i % 2 === 0) ? '★ Frenzied' : undefined,
            level, statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
          });
        }
      } else {
        // Dual Bosses: Arch-Villager & Heart of Ender
        this.entities.set('boss-arch-villager', {
          id: 'boss-arch-villager', name: '★ Arch-Villager Overlord', x: 18, y: 10, zone: coord,
          symbol: SYMBOLS.archVillager, color: COLORS.amberBright, hp: 220, maxHp: 220, energy: 100, maxEnergy: 100,
          isPlayer: false, isElite: true, eliteAffix: '★ Armored', hasShield: true, shieldHp: 80, level,
          statusEffects: {}, inventory: [], facing: { dx: 1, dy: 0 }
        });
        this.entities.set('boss-heart-ender', {
          id: 'boss-heart-ender', name: '★ Heart of Ender', x: 30, y: 10, zone: coord,
          symbol: SYMBOLS.heartOfEnder, color: COLORS.purpleEnder, hp: 260, maxHp: 260, energy: 100, maxEnergy: 100,
          isPlayer: false, isElite: true, eliteAffix: '★ Glacial', hasShield: true, shieldHp: 80, level,
          statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
        });
      }
      return;
    }

    if (isFinal) {
      if (waveNum < totalWaves) {
        for (let i = 1; i <= 5 + waveNum; i++) {
          const id = `final-wave-${waveNum}-${i}`;
          this.entities.set(id, {
            id, name: (i % 2 === 0) ? '★ Nether Fiend' : 'Void Stalker',
            x: 12 + i * 4, y: 9 + (i % 3) * 4, zone: coord,
            symbol: (i % 2 === 0) ? 'Ψ' : 'V', color: (i % 2 === 0) ? COLORS.fireRed : COLORS.purpleEnder,
            hp: 120 + level * 10, maxHp: 120 + level * 10, energy: 90, maxEnergy: 90,
            isPlayer: false, isElite: (i % 2 === 0), eliteAffix: (i % 2 === 0) ? '★ Vampiric' : undefined,
            level, statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
          });
        }
      } else {
        // Solo Climax Bosses
        this.entities.set('boss-void-overlord', {
          id: 'boss-void-overlord', name: '★ Void Overlord', x: 18, y: 10, zone: coord,
          symbol: 'Ω', color: COLORS.purpleEnder, hp: 300, maxHp: 300, energy: 100, maxEnergy: 100,
          isPlayer: false, isElite: true, eliteAffix: '★ Glacial', hasShield: true, shieldHp: 100, level,
          statusEffects: {}, inventory: [], facing: { dx: 1, dy: 0 }
        });
        this.entities.set('boss-nether-titan', {
          id: 'boss-nether-titan', name: '★ Nether Titan', x: 30, y: 10, zone: coord,
          symbol: 'Ψ', color: COLORS.fireRed, hp: 320, maxHp: 320, energy: 100, maxEnergy: 100,
          isPlayer: false, isElite: true, eliteAffix: '★ Frenzied', hasShield: true, shieldHp: 100, level,
          statusEffects: {}, inventory: [], facing: { dx: -1, dy: 0 }
        });
      }
      return;
    }

    // B. Procedural Wilderness and Subterranean Caverns Waves
    const mobCount = Math.min(8, 3 + Math.floor(level / 2) + (waveNum - 1));
    const spawnPositions = [
      { x: 4, y: 6 }, { x: ZONE_WIDTH - 5, y: 6 },
      { x: 6, y: ZONE_HEIGHT - 6 }, { x: ZONE_WIDTH - 6, y: ZONE_HEIGHT - 6 },
      { x: 12, y: 4 }, { x: ZONE_WIDTH - 12, y: 4 },
      { x: 16, y: ZONE_HEIGHT - 5 }, { x: ZONE_WIDTH - 16, y: ZONE_HEIGHT - 5 }
    ];

    for (let i = 1; i <= mobCount; i++) {
      const mobId = `wave-mob-${parasangX}-${parasangY}-${zoneX}-${zoneY}-${depth}-${waveNum}-${i}`;
      if (this.entities.has(mobId)) continue;

      let mobHp = Math.floor(45 + level * 20 + (waveNum - 1) * 25);
      let mobName = 'Wilderness Beast';
      let mobSymbol = 'm';
      let mobColor = COLORS.green;
      let hasRanged = false;

      if (depth >= 1) {
        // Caverns
        if (i % 4 === 0) {
          mobName = 'Cave Skeleton Titan';
          mobSymbol = SYMBOLS.mutantSkeleton;
          mobColor = COLORS.purpleEnder;
          mobHp = Math.floor(mobHp * 1.5);
        } else if (i % 3 === 0) {
          mobName = 'Magma Creeper';
          mobSymbol = SYMBOLS.creeper;
          mobColor = COLORS.fireRed;
          hasRanged = true;
        } else if (i % 2 === 0) {
          mobName = 'Chrome Skeleton Automaton';
          mobSymbol = SYMBOLS.skeleton;
          mobColor = COLORS.cyan;
          hasRanged = true;
        } else {
          mobName = 'Cavern Zombie Crawler';
          mobSymbol = SYMBOLS.zombie;
          mobColor = COLORS.green;
        }
      } else {
        // Wilderness
        if (parasangX <= 1) {
          mobName = (i % 2 === 0) ? 'Wasteland Zombie' : 'Wasteland Skeleton';
          mobSymbol = (i % 2 === 0) ? SYMBOLS.zombie : SYMBOLS.skeleton;
          mobColor = (i % 2 === 0) ? COLORS.green : COLORS.boneWhite;
        } else if (parasangX >= 2 && parasangX <= 4 && parasangY <= 2) {
          mobName = (i % 2 === 0) ? 'Phasing Ghost' : 'Murk Zombie';
          mobSymbol = (i % 2 === 0) ? SYMBOLS.ghost : SYMBOLS.zombie;
          mobColor = COLORS.mistCyan;
        } else if (parasangX >= 2 && parasangX <= 5 && parasangY >= 3) {
          mobName = (i % 2 === 0) ? 'Crag Creeper' : 'Crag Zombie';
          mobSymbol = (i % 2 === 0) ? SYMBOLS.creeper : SYMBOLS.zombie;
          mobColor = COLORS.greenDark;
        } else if (parasangX >= 5 && parasangX <= 7) {
          mobName = (i % 2 === 0) ? 'Skeleton Legionnaire' : 'Bone Skeleton Archer';
          mobSymbol = SYMBOLS.skeleton;
          mobColor = COLORS.boneWhite;
          if (i % 2 === 0) hasRanged = true;
        } else if (parasangX >= 8 && parasangX <= 10 && parasangY <= 4) {
          mobName = 'Sulfur Creeper';
          mobSymbol = SYMBOLS.creeper;
          mobColor = COLORS.amberBright;
        } else if (parasangX >= 8 && parasangX <= 10 && parasangY >= 5) {
          mobName = (i % 2 === 0) ? 'Ancient Skeleton Guardian' : 'Clockwork Creeper';
          mobSymbol = (i % 2 === 0) ? SYMBOLS.skeleton : SYMBOLS.creeper;
          mobColor = COLORS.cyan;
          hasRanged = true;
        } else if (parasangX >= 11 && parasangX <= 13) {
          mobName = (i % 2 === 0) ? 'Champion Skeleton Gladiator' : 'Mutant Creeper Vanguard';
          mobSymbol = (i % 2 === 0) ? SYMBOLS.mutantSkeleton : SYMBOLS.mutantCreeper;
          mobColor = COLORS.bossGold;
          mobHp = Math.floor(mobHp * 1.25);
        } else {
          mobName = (i % 3 === 0) ? 'Void Zombie' : (i % 3 === 1 ? 'Void Skeleton' : 'Void Creeper');
          mobSymbol = (i % 3 === 0) ? SYMBOLS.zombie : (i % 3 === 1 ? SYMBOLS.skeleton : SYMBOLS.creeper);
          mobColor = COLORS.purpleEnder;
          hasRanged = true;
        }
      }

      // Determine Elite Affix
      const isBossWave = (waveNum === totalWaves);
      const isElite = (i === 1 && (waveNum >= 2 || level >= 3)) || (isBossWave && i <= 2);
      let eliteAffix: string | undefined;

      if (isElite) {
        const affixes = ['★ Frenzied', '★ Armored', '★ Glacial', '★ Vampiric', '★ Volatile'];
        eliteAffix = affixes[(i + waveNum + level) % affixes.length];
        mobName = isBossWave && i === 1 ? `${eliteAffix} Champion ${mobName}` : `${eliteAffix} ${mobName}`;
        mobHp = Math.floor(mobHp * 1.4);
      }

      const pos = spawnPositions[(i - 1) % spawnPositions.length];
      let mx = pos.x;
      let my = pos.y;
      if (zone.tiles[my] && !zone.tiles[my][mx]?.walkable) {
        mx = 20 + (i % 6);
        my = 12 + (i % 4);
      }

      const hasShield = isElite || (level >= 3 && i % 2 === 0);
      const shieldHp = hasShield ? (30 + level * 10 + (isElite ? 25 : 0)) : 0;

      this.entities.set(mobId, {
        id: mobId,
        name: mobName,
        x: mx,
        y: my,
        zone: coord,
        symbol: mobSymbol,
        color: isElite ? COLORS.bossGold : mobColor,
        hp: mobHp,
        maxHp: mobHp,
        energy: 80,
        maxEnergy: 80,
        isPlayer: false,
        isGhost: mobName.includes('Ghost') || mobName.includes('Wraith'),
        isElite,
        eliteAffix,
        hasShield,
        shieldHp,
        level,
        statusEffects: {},
        inventory: [],
        facing: { dx: -1, dy: 0 }
      });
    }
  }

  private findEntityAt(zone: ZoneCoord, x: number, y: number): Entity | undefined {
    return Array.from(this.entities.values()).find(
      e => this.getZoneKey(e.zone) === this.getZoneKey(zone) && e.x === x && e.y === y
    );
  }

  public log(text: string, category: 'combat' | 'story' | 'system' | 'dialogue') {
    const entry: CombatLogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      text,
      color: category === 'story' ? COLORS.amber : (category === 'combat' ? COLORS.fireRed : COLORS.hudText),
      category
    };
    this.combatLogs.push(entry);
    this.onLogMessage?.(entry);
  }

  public addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({
      id: `float-${Date.now()}-${Math.random()}`,
      x,
      y,
      text,
      color,
      durationMs: 1200
    });
  }

  public notifyZone(coord: ZoneCoord) {
    this.onStateChanged?.(coord);
  }

  public serializeState(roomId: string): RoomSaveData {
    return {
      version: 1,
      roomId,
      savedAt: Date.now(),
      story: this.story.serialize(),
      entities: Array.from(this.entities.entries()),
      zones: Array.from(this.zones.entries()),
      combatLogs: this.combatLogs.slice(-50),
      tickRate: this.tickRate,
      turnCount: this.turnCount
    };
  }

  public loadState(data: RoomSaveData): boolean {
    if (!data) return false;
    try {
      if (data.story) {
        this.story.deserialize(data.story);
      }
      if (data.entities && Array.isArray(data.entities)) {
        this.entities.clear();
        for (const [id, entity] of data.entities) {
          if (entity.isPlayer) {
            entity.isBot = true;
          }
          this.entities.set(id, entity);
        }
      }
      if (data.zones && Array.isArray(data.zones)) {
        this.zones.clear();
        for (const [key, zone] of data.zones) {
          this.zones.set(key, zone);
        }
      }
      if (data.combatLogs && Array.isArray(data.combatLogs)) {
        this.combatLogs = [...data.combatLogs];
      }
      if (typeof data.tickRate === 'number') {
        this.tickRate = data.tickRate;
      }
      if (typeof data.turnCount === 'number') {
        this.turnCount = data.turnCount;
      }
      return true;
    } catch (err) {
      console.error('[GameEngine] Error in loadState:', err);
      return false;
    }
  }
}
