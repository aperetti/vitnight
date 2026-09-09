import { WebSocket } from 'ws';
import { GameEngine } from './engine';
import { HeroRole, ClientMessage, ServerMessage, ZoneCoord } from '../shared/types';
import { loadRoom, saveRoom } from './storage';
import { sanitizeRoomName } from '../shared/roomGenerator';

export class GameRoom {
  public id: string;
  public engine: GameEngine;
  public clients: Map<WebSocket, { hero?: HeroRole; playerName?: string }> = new Map();
  private saveDebounceTimer: NodeJS.Timeout | null = null;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private isDirty: boolean = false;

  constructor(id: string) {
    this.id = sanitizeRoomName(id);
    this.engine = new GameEngine();

    // Restore saved progress if it exists
    const saved = loadRoom(this.id);
    if (saved) {
      this.engine.loadState(saved);
      console.log(`[GameRoom] Restored saved progress for [${this.id}] (Story: ${this.engine.story.stage})`);
    }

    // Periodic auto-save every 20 seconds
    this.autoSaveInterval = setInterval(() => {
      if (this.isDirty) {
        this.saveNow();
      }
    }, 20000);

    // Hook engine events to broadcast and trigger saves
    this.engine.onStateChanged = (coord: ZoneCoord) => {
      this.broadcastZoneState(coord);
      this.scheduleSave();
    };

    this.engine.onPlayerZoneChanged = (playerId: string, newZone, pacingMode) => {
      this.scheduleSave();
      const player = this.engine.entities.get(playerId);
      if (!player) return;
      for (const [ws, data] of this.clients.entries()) {
        if (data.hero === player.role) {
          this.send(ws, {
            type: 'ZONE_CHANGED',
            zone: newZone,
            pacingMode,
            waveInfo: this.engine.getWaveInfo(newZone.coord)
          });
        }
      }
    };

    this.engine.onLogMessage = (entry) => {
      this.broadcast({ type: 'COMBAT_LOG', entry });
    };

    this.engine.onStoryEvent = (stage, questTitle, questDesc, dialogue) => {
      this.saveNow(); // Immediate save on story progression milestones
      this.broadcast({
        type: 'STORY_EVENT',
        stage: stage as any,
        questTitle,
        questDesc,
        dialogue
      });
    };

    this.engine.onLevelUp = (hero, level, attributePoints, skillPoints) => {
      this.saveNow(); // Immediate save on level up
      this.broadcast({
        type: 'LEVEL_UP_EVENT',
        hero,
        level,
        attributePoints,
        skillPoints
      });
      this.broadcastPartyUpdate();
    };

    this.engine.onWorldTravelResult = (eventType, message, coord) => {
      this.scheduleSave();
      this.broadcast({
        type: 'WORLD_TRAVEL_RESULT',
        eventType,
        message,
        coord
      });
      this.broadcastPartyUpdate();
    };
  }

  public handleClientMessage(ws: WebSocket, msg: ClientMessage) {
    switch (msg.type) {
      case 'JOIN_ROOM': {
        const clientData = this.clients.get(ws) || {};
        clientData.hero = msg.hero;
        clientData.playerName = msg.playerName;
        this.clients.set(ws, clientData);

        const playerEntity = this.engine.assignHumanPlayer(msg.hero, msg.playerName);
        if (playerEntity) {
          const zone = this.engine.getOrCreateZone(playerEntity.zone);
          const pacingMode = this.engine.getPacingModeForZone(playerEntity.zone);
          zone.waveInfo = this.engine.getWaveInfo(playerEntity.zone);

          this.send(ws, {
            type: 'INIT_STATE',
            hero: msg.hero,
            entityId: playerEntity.id,
            zone,
            pacingMode,
            tickRate: this.engine.tickRate,
            storyStage: this.engine.story.stage
          });

          // Send current story dialogue if present
          const dialogue = this.engine.story.getDialogueForStage(this.engine.story.stage);
          this.send(ws, {
            type: 'STORY_EVENT',
            stage: this.engine.story.stage,
            questTitle: this.engine.story.questTitle,
            questDesc: this.engine.story.questDesc,
            dialogue
          });

          this.broadcastPartyUpdate();
          this.broadcastZoneState(playerEntity.zone);
        }
        break;
      }

      case 'PLAYER_MOVE': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handlePlayerMove(player.id, msg.dx, msg.dy);
        }
        break;
      }

      case 'PLAYER_ACTION': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handlePlayerAction(player.id, msg.actionType, msg.targetX, msg.targetY);
        }
        break;
      }

      case 'INTERACT': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleInteractAt(player.id, msg.x, msg.y, msg.itemId);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'SET_TICK_RATE': {
        this.engine.setTickRate(msg.tickRate);
        this.engine.log(`Tick rate adjusted to ${this.engine.tickRate} Hz.`, 'system');
        break;
      }

      case 'WORLD_MAP_TRAVEL': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleWorldMapTravel(player.id, msg.targetParsecX, msg.targetParsecY, msg.targetZoneX, msg.targetZoneY);
          this.broadcastPartyUpdate();
        }
        break;
      }

      case 'ALLOCATE_ATTRIBUTE': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleAllocateAttribute(player.id, msg.attribute);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'UNLOCK_SKILL': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleUnlockSkill(player.id, msg.skillId);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'ACTIVATE_SKILL': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleActivateSkill(player.id, msg.skillId, msg.targetX, msg.targetY);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'EQUIP_ITEM': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleEquipItem(player.id, msg.itemId, msg.slot);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'UNEQUIP_ITEM': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleUnequipItem(player.id, msg.slot);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'USE_ITEM': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleUseItem(player.id, msg.itemId);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'DROP_ITEM': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleDropItem(player.id, msg.itemId);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'PICKUP_ITEM': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handlePickupItem(player.id, msg.itemId);
          this.broadcastPartyUpdate();
          this.broadcastZoneState(player.zone);
        }
        break;
      }

      case 'DESCEND_STAIRS': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleDescendStairs(player.id);
          this.broadcastPartyUpdate();
        }
        break;
      }

      case 'ASCEND_STAIRS': {
        const clientData = this.clients.get(ws);
        if (!clientData || !clientData.hero) return;
        const player = Array.from(this.engine.entities.values()).find(
          e => e.isPlayer && e.role === clientData.hero
        );
        if (player) {
          this.engine.handleAscendStairs(player.id);
          this.broadcastPartyUpdate();
        }
        break;
      }
    }
  }

  public handleClientDisconnect(ws: WebSocket) {
    const clientData = this.clients.get(ws);
    if (clientData && clientData.hero) {
      this.engine.releaseHumanPlayer(clientData.hero);
      this.engine.log(`${clientData.playerName || clientData.hero} disconnected (switched to AI companion).`, 'system');
    }
    this.clients.delete(ws);
    this.broadcastPartyUpdate();
    this.saveNow();
  }

  public broadcastZoneState(coord: ZoneCoord) {
    const key = this.engine.getZoneKey(coord);
    const zone = this.engine.getOrCreateZone(coord);
    const entities = Array.from(this.engine.entities.values()).filter(
      e => this.engine.getZoneKey(e.zone) === key
    );
    const pacingMode = this.engine.getPacingModeForZone(coord);

    const updateMsg: ServerMessage = {
      type: 'WORLD_UPDATE',
      zoneCoord: coord,
      entities,
      items: zone.items,
      projectiles: this.engine.projectiles,
      floatingTexts: this.engine.floatingTexts,
      pacingMode,
      waveInfo: this.engine.getWaveInfo(coord)
    };

    // Clean consumed projectiles/floating text after broadcast
    this.engine.projectiles = [];
    this.engine.floatingTexts = [];

    const payload = JSON.stringify(updateMsg);
    for (const [ws, data] of this.clients.entries()) {
      if (ws.readyState === WebSocket.OPEN) {
        if (!data.hero) {
          ws.send(payload);
        } else {
          const clientHero = Array.from(this.engine.entities.values()).find(
            e => e.role === data.hero && e.isPlayer
          );
          if (clientHero && this.engine.getZoneKey(clientHero.zone) === key) {
            ws.send(payload);
          }
        }
      }
    }
  }

  public broadcastPartyUpdate() {
    const heroes = Array.from(this.engine.entities.values()).filter(e => e.isPlayer && e.role);
    const updateMsg: ServerMessage = {
      type: 'PARTY_UPDATE',
      members: heroes.map(h => ({
        role: h.role!,
        name: h.name,
        hp: h.hp,
        maxHp: h.maxHp,
        isDowned: !!h.isDowned,
        zone: h.zone,
        isBot: !!h.isBot,
        level: h.level || 1,
        xp: h.xp || 0,
        nextLevelXp: h.nextLevelXp || 100
      }))
    };
    this.broadcast(updateMsg);
  }

  public broadcast(msg: ServerMessage) {
    const payload = JSON.stringify(msg);
    for (const ws of this.clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  public send(ws: WebSocket, msg: ServerMessage) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }

  public scheduleSave(delayMs: number = 1500) {
    this.isDirty = true;
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      this.saveNow();
    }, delayMs);
  }

  public saveNow() {
    try {
      const state = this.engine.serializeState(this.id);
      saveRoom(this.id, state);
      this.isDirty = false;
    } catch (err) {
      console.error(`[GameRoom] Error saving room [${this.id}]:`, err);
    }
  }

  public destroy() {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
    this.saveNow();
  }
}
