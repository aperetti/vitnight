import { GameRenderer } from './renderer';
import { SettingsManager } from './settings';
import { InputManager } from './input';
import { AudioManager } from './audio';
import { UIManager } from './ui';
import { WorldMapManager } from './worldMap';
import { CharacterSheetManager } from './charSheet';
import { InventoryManager } from './inventory';
import { HeroRole, ClientMessage, ServerMessage, ZoneData, Entity, ZoneCoord, StoryStage, WaveInfo, SkillDefinition } from '../shared/types';
import { ZONE_WIDTH, ZONE_HEIGHT, SKILL_DEFINITIONS } from '../shared/constants';
import { generateRandomRoomName, sanitizeRoomName } from '../shared/roomGenerator';

class ClientApp {
  public renderer: GameRenderer;
  public settings: SettingsManager;
  public input: InputManager;
  public audio: AudioManager;
  public ui: UIManager;
  public worldMap: WorldMapManager;
  public charSheet: CharacterSheetManager;
  public inventory: InventoryManager;

  private ws: WebSocket | null = null;
  private currentZone: ZoneData | null = null;
  private myHeroRole: HeroRole | null = null;
  private myEntityId: string | null = null;
  private roomId: string = 'coopers-party';
  private currentStoryStage: StoryStage = 'SPAWN';

  // Look Mode state
  private isLooking: boolean = false;
  private lookCursor: { x: number; y: number } = { x: 0, y: 0 };
  private lastEntities: Entity[] = [];

  // Tactical Aiming Mode state
  public isAiming: boolean = false;
  public aimingAction: {
    type: 'action' | 'skill';
    actionType?: 'attack' | 'special';
    skillId?: string;
    name: string;
    range: number;
    projectileType: 'laser' | 'ice' | 'fireball' | 'concussive' | 'target';
  } | null = null;
  public aimTarget: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.renderer = new GameRenderer();
    this.settings = new SettingsManager();
    this.input = new InputManager(this.settings);
    this.audio = new AudioManager();
    this.ui = new UIManager(this.settings);
    this.worldMap = new WorldMapManager();
    this.charSheet = new CharacterSheetManager();
    this.inventory = new InventoryManager();
  }

  public async start() {
    const viewportEl = document.getElementById('game-viewport')!;
    await this.renderer.init(viewportEl);

    this.setupInputRouting();
    this.setupMusicUI();
    this.setupMouseRouting();
    this.setupHeroSelectModal();
  }

  private setupHeroSelectModal() {
    // 1. Resolve room from URL query param, path (/room/:id or /r/:id), or hash
    let resolvedRoom: string | null = null;
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    if (roomParam) {
      resolvedRoom = roomParam;
    } else {
      const pathMatch = window.location.pathname.match(/^\/(?:room|r)\/([^\/]+)/);
      if (pathMatch) {
        resolvedRoom = pathMatch[1];
      } else if (window.location.hash) {
        const hashMatch = window.location.hash.replace(/^#/, '');
        if (hashMatch.startsWith('room=')) {
          resolvedRoom = hashMatch.replace('room=', '');
        } else if (hashMatch) {
          resolvedRoom = hashMatch;
        }
      }
    }

    // 2. Generate a random 5-word hyphenated room string if none provided
    if (resolvedRoom) {
      this.roomId = sanitizeRoomName(resolvedRoom);
    } else {
      this.roomId = generateRandomRoomName();
    }

    this.syncRoomUrl();

    // Hook room input and buttons
    const roomInput = document.getElementById('room-input') as HTMLInputElement | null;
    roomInput?.addEventListener('input', () => {
      this.roomId = sanitizeRoomName(roomInput.value);
      this.syncRoomUrl();
    });

    document.getElementById('btn-randomize-room')?.addEventListener('click', () => {
      this.roomId = generateRandomRoomName();
      this.syncRoomUrl();
    });

    document.getElementById('btn-copy-room-link')?.addEventListener('click', () => {
      this.copyRoomUrl();
    });

    document.getElementById('hud-room-badge')?.addEventListener('click', () => {
      this.copyRoomUrl();
    });

    const heroParam = params.get('hero') as HeroRole | null;
    const modal = document.getElementById('hero-select-modal')!;

    if (heroParam && ['barrett', 'luther', 'beau'].includes(heroParam)) {
      modal.classList.add('hidden');
      this.audio.music.play().catch(() => {});
      this.joinGame(heroParam);
    } else {
      modal.classList.remove('hidden');

      document.getElementById('select-barrett')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.audio.music.play().catch(() => {});
        this.joinGame('barrett');
      });
      document.getElementById('select-luther')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.audio.music.play().catch(() => {});
        this.joinGame('luther');
      });
      document.getElementById('select-beau')?.addEventListener('click', () => {
        modal.classList.add('hidden');
        this.audio.music.play().catch(() => {});
        this.joinGame('beau');
      });
    }
  }

  private syncRoomUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomId);
    window.history.replaceState({}, '', url.toString());

    const previewEl = document.getElementById('room-url-preview');
    if (previewEl) {
      previewEl.textContent = url.toString();
    }

    const roomInput = document.getElementById('room-input') as HTMLInputElement | null;
    if (roomInput && roomInput.value !== this.roomId) {
      roomInput.value = this.roomId;
    }

    const hudRoomId = document.getElementById('hud-room-id');
    if (hudRoomId) {
      hudRoomId.textContent = this.roomId;
    }
  }

  private async copyRoomUrl() {
    const url = new URL(window.location.href);
    url.searchParams.set('room', this.roomId);
    const fullUrl = url.toString();

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }

      const hudRoomId = document.getElementById('hud-room-id');
      if (hudRoomId) {
        const orig = hudRoomId.textContent;
        hudRoomId.textContent = 'COPIED! ✓';
        setTimeout(() => {
          if (hudRoomId) hudRoomId.textContent = orig;
        }, 1500);
      }

      const copyBtn = document.getElementById('btn-copy-room-link');
      if (copyBtn) {
        const orig = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
          if (copyBtn) copyBtn.textContent = orig;
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to copy room url:', err);
    }
  }

  private joinGame(hero: HeroRole) {
    this.myHeroRole = hero;
    const roomInput = (document.getElementById('room-input') as HTMLInputElement)?.value;
    if (roomInput) this.roomId = sanitizeRoomName(roomInput);
    this.syncRoomUrl();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // In dev mode with separate Vite server on :3000, connect to backend on :3001. In production, use current host.
    const wsHost = import.meta.env.DEV && window.location.port === '3000'
      ? `${window.location.hostname}:3001`
      : window.location.host;
    const wsUrl = `${protocol}//${wsHost}/ws?room=${encodeURIComponent(this.roomId)}`;

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('Connected to server! Joining as', hero);
      this.sendMessage({
        type: 'JOIN_ROOM',
        roomId: this.roomId,
        hero,
        playerName: hero.toUpperCase()
      });
    };

    this.ws.onmessage = (event) => {
      try {
        const msg: ServerMessage = JSON.parse(event.data);
        this.handleServerMessage(msg);
      } catch (e) {
        console.error('Failed to parse server message', e);
      }
    };

    this.ws.onclose = () => {
      console.log('Disconnected from server. Attempting reconnect in 3s...');
      setTimeout(() => this.joinGame(hero), 3000);
    };
  }

  private sendMessage(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  private setupInputRouting() {
    this.input.onMove = (dx, dy) => {
      const myPlayer = this.getMyPlayer();
      if (myPlayer?.isDowned) {
        this.addCombatLog('⚠️ You are DOWNED and cannot move! Press [Space / Wait] to hold on until companions revive you.', 'system');
        return;
      }
      this.sendMessage({ type: 'PLAYER_MOVE', dx, dy });
    };

    this.input.onAimMove = (dx, dy) => {
      this.moveAimTarget(dx, dy);
    };

    this.input.onAimConfirm = () => {
      this.confirmAimFire();
    };

    this.input.onAimCancel = () => {
      this.cancelAiming();
    };

    this.input.onAction = (actionType) => {
      const myPlayer = this.getMyPlayer();
      if (myPlayer?.isDowned && actionType !== 'wait') {
        this.addCombatLog('⚠️ You are DOWNED and incapacitated! Press [Space / Wait] to hold on.', 'system');
        return;
      }
      if (actionType === 'attack' || actionType === 'special') {
        this.startAimingAction(actionType);
      } else {
        if (this.isAiming) this.cancelAiming();
        this.sendMessage({ type: 'PLAYER_ACTION', actionType });
      }
    };

    this.input.onToggleSettings = () => {
      this.ui.toggleSettingsModal();
    };

    // Look Mode bindings
    this.input.onToggleLook = () => {
      this.toggleLookMode();
    };

    this.input.onLookMove = (dx, dy) => {
      this.moveLookCursor(dx, dy);
    };

    this.input.onLookInteract = () => {
      this.openInteractionMenu();
    };

    this.input.onExitLook = () => {
      this.exitLookMode();
    };

    // World Map Overview bindings
    this.input.onToggleMap = () => {
      this.toggleWorldMap();
    };

    document.getElementById('btn-map')?.addEventListener('click', () => {
      this.toggleWorldMap();
    });

    document.getElementById('hud-location')?.addEventListener('click', () => {
      this.toggleWorldMap();
    });

    this.charSheet.onAllocateAttribute = (attribute) => {
      this.sendMessage({ type: 'ALLOCATE_ATTRIBUTE', attribute });
    };

    this.charSheet.onUnlockSkill = (skillId) => {
      this.sendMessage({ type: 'UNLOCK_SKILL', skillId });
    };

    this.charSheet.onActivateSkill = (skillId) => {
      const skillDef = SKILL_DEFINITIONS.find(s => s.id === skillId);
      if (skillDef) {
        this.charSheet.hide();
        this.startAimingSkill(skillDef);
      } else {
        this.sendMessage({ type: 'ACTIVATE_SKILL', skillId });
      }
    };

    this.inventory.onEquipItem = (itemId, slot) => {
      this.sendMessage({ type: 'EQUIP_ITEM', itemId, slot });
    };

    this.inventory.onUnequipItem = (slot) => {
      this.sendMessage({ type: 'UNEQUIP_ITEM', slot });
    };

    this.inventory.onUseItem = (itemId) => {
      this.sendMessage({ type: 'USE_ITEM', itemId });
    };

    this.inventory.onDropItem = (itemId) => {
      this.sendMessage({ type: 'DROP_ITEM', itemId });
    };

    this.inventory.onPickupItem = (itemId) => {
      this.sendMessage({ type: 'PICKUP_ITEM', itemId });
    };

    this.input.onToggleInventory = () => {
      this.inventory.toggle();
    };

    this.input.onPickupItem = () => {
      const myPlayer = this.getMyPlayer();
      if (myPlayer?.isDowned) {
        this.addCombatLog('⚠️ You are DOWNED and cannot pick up items.', 'system');
        return;
      }
      this.sendMessage({ type: 'PICKUP_ITEM' });
    };

    this.input.onCastHotbarSkill = (slotIndex) => {
      const player = this.getMyPlayer();
      if (!player) return;
      if (player.isDowned) {
        this.addCombatLog('⚠️ You are DOWNED and cannot cast skills! Press [Space / Wait] to hold on.', 'system');
        return;
      }
      const activeSkills = (player.skillsLearned || [])
        .map(id => SKILL_DEFINITIONS.find(s => s.id === id))
        .filter((s): s is SkillDefinition => !!s && s.type === 'active');
      const skill = activeSkills[slotIndex];
      if (skill) {
        this.startAimingSkill(skill);
      }
    };

    this.worldMap.onTravelRequested = (targetParsecX, targetParsecY, targetZoneX, targetZoneY) => {
      const myPlayer = this.getMyPlayer();
      if (myPlayer?.isDowned) {
        this.addCombatLog('⚠️ You are DOWNED and cannot travel! Wait for companions to revive you.', 'system');
        return;
      }
      this.sendMessage({ type: 'WORLD_MAP_TRAVEL', targetParsecX, targetParsecY, targetZoneX, targetZoneY });
    };

    this.input.onTogglePartySheet = () => {
      this.charSheet.toggle();
    };

    document.getElementById('btn-char-sheet')?.addEventListener('click', () => {
      this.charSheet.toggle();
    });

    document.getElementById('btn-char')?.addEventListener('click', () => {
      this.charSheet.toggle();
    });

    document.getElementById('btn-inventory-hud')?.addEventListener('click', () => {
      this.inventory.toggle();
    });

    document.getElementById('btn-inv')?.addEventListener('click', () => {
      this.inventory.toggle();
    });

    // Hotbar click buttons
    for (let i = 0; i < 3; i++) {
      document.getElementById(`btn-hotbar-${i + 1}`)?.addEventListener('click', () => {
        this.input.onCastHotbarSkill?.(i);
      });
    }

    document.getElementById('travel-event-dismiss-btn')?.addEventListener('click', () => {
      document.getElementById('travel-event-modal')?.classList.add('hidden');
    });

    this.ui.onToggleLookRequested = () => {
      this.toggleLookMode();
    };

    this.ui.onCancelInteractionRequested = () => {
      this.exitLookMode();
    };

    this.ui.onActionTriggered = (actionType: any) => {
      const myPlayer = this.getMyPlayer();
      if (myPlayer?.isDowned && actionType !== 'wait') {
        this.addCombatLog('⚠️ You are DOWNED and incapacitated! Press [Space / Wait] to hold on.', 'system');
        return;
      }
      if (actionType === 'attack' || actionType === 'special') {
        this.startAimingAction(actionType);
      } else {
        if (this.isAiming) this.cancelAiming();
        this.sendMessage({ type: 'PLAYER_ACTION', actionType });
      }
    };

    this.ui.onTickRateChanged = (tickRate) => {
      this.sendMessage({ type: 'SET_TICK_RATE', tickRate });
    };

    this.ui.onRebindRequested = (action) => {
      this.input.startRebinding(action);
    };

    this.input.onRebindComplete = () => {
      this.ui.renderKeybindingList();
    };
  }

  private setupMouseRouting() {
    const canvas = this.renderer.app.canvas;
    if (!canvas) return;

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isAiming) {
        const coord = this.renderer.getTileCoord(e.clientX, e.clientY);
        if (coord && (coord.x !== this.aimTarget.x || coord.y !== this.aimTarget.y)) {
          this.setAimTarget(coord.x, coord.y);
        }
        return;
      }
      if (!this.isLooking) return;
      const coord = this.renderer.getTileCoord(e.clientX, e.clientY);
      if (coord && (coord.x !== this.lookCursor.x || coord.y !== this.lookCursor.y)) {
        this.lookCursor = coord;
        this.renderer.setLookCursor(this.lookCursor);
        this.updateLookInspect();
      }
    });

    canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.isAiming) {
        e.preventDefault();
        this.confirmAimFire();
        return;
      }
      const coord = this.renderer.getTileCoord(e.clientX, e.clientY);
      if (!coord) return;
      this.enterLookMode(coord);
      this.openInteractionMenu();
    });

    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      if (this.isAiming) {
        e.preventDefault();
        this.cancelAiming();
      }
    });
  }

  private isSameZone(a: ZoneCoord, b: ZoneCoord): boolean {
    return (
      a.parasangX === b.parasangX &&
      a.parasangY === b.parasangY &&
      a.zoneX === b.zoneX &&
      a.zoneY === b.zoneY &&
      a.depth === b.depth
    );
  }

  private getMyPlayer(): Entity | undefined {
    return this.lastEntities.find(e => e.id === this.myEntityId);
  }

  public toggleLookMode() {
    if (this.isLooking) {
      this.exitLookMode();
    } else {
      this.enterLookMode();
    }
  }

  public enterLookMode(initialPos?: { x: number; y: number }) {
    if (this.isAiming) this.cancelAiming();
    this.isLooking = true;
    this.input.isLookMode = true;

    if (initialPos) {
      this.lookCursor = { ...initialPos };
    } else {
      const player = this.getMyPlayer();
      this.lookCursor = {
        x: player ? player.x : Math.floor(ZONE_WIDTH / 2),
        y: player ? player.y : Math.floor(ZONE_HEIGHT / 2)
      };
    }

    this.renderer.setLookCursor(this.lookCursor);
    this.updateLookInspect();
  }

  public exitLookMode() {
    this.isLooking = false;
    this.input.isLookMode = false;
    this.renderer.setLookCursor(null);
    this.ui.hideLookCard();
    this.ui.hideInteractionModal();
  }

  public toggleWorldMap() {
    if (this.isAiming) this.cancelAiming();
    if (this.worldMap.isOpen()) {
      this.worldMap.close();
    } else {
      if (this.currentZone) {
        this.worldMap.updateState(this.currentZone.coord, this.currentStoryStage, this.myHeroRole || 'barrett');
      }
      this.worldMap.open();
    }
  }

  public moveLookCursor(dx: number, dy: number) {
    if (!this.isLooking) return;
    this.lookCursor.x = Math.max(0, Math.min(ZONE_WIDTH - 1, this.lookCursor.x + dx));
    this.lookCursor.y = Math.max(0, Math.min(ZONE_HEIGHT - 1, this.lookCursor.y + dy));
    this.renderer.setLookCursor(this.lookCursor);
    this.updateLookInspect();
  }

  // --- Tactical Aiming Mode ---

  public startAimingAction(actionType: 'attack' | 'special') {
    const player = this.getMyPlayer();
    if (!player || player.isDowned) return;

    // If already aiming the exact same action, confirm fire!
    if (this.isAiming && this.aimingAction?.type === 'action' && this.aimingAction.actionType === actionType) {
      this.confirmAimFire();
      return;
    }

    if (actionType === 'special' && player.role === 'luther') {
      // Luther's special is immediate Healing Radiance / Revive
      if (this.isAiming) this.cancelAiming();
      this.sendMessage({ type: 'PLAYER_ACTION', actionType: 'special' });
      this.audio.playLaser();
      return;
    }

    let name = "Luther's Laser Rifle";
    let projectileType: 'laser' | 'ice' | 'fireball' | 'concussive' | 'target' = 'laser';
    let range = 12;

    if (actionType === 'attack') {
      if (player.role === 'beau') {
        name = 'Cryo Ray';
        projectileType = 'ice';
      } else if (player.role === 'barrett') {
        name = 'Laser Blaster';
        projectileType = 'laser';
      } else {
        name = "Luther's Laser Rifle";
        projectileType = 'laser';
      }
    } else if (actionType === 'special') {
      if (player.role === 'beau') {
        name = 'Cryo Freezing Blast';
        projectileType = 'ice';
        range = 10;
      } else if (player.role === 'barrett') {
        name = 'Blazing Fireball';
        projectileType = 'fireball';
        range = 10;
      }
    }

    this.startAiming({
      type: 'action',
      actionType,
      name,
      range,
      projectileType
    });
  }

  public startAimingSkill(skillDef: SkillDefinition) {
    const player = this.getMyPlayer();
    if (!player || player.isDowned) return;

    // Instant / self-centered skills activate directly
    if (['whirlwind', 'cryo_nova', 'restorative_mist'].includes(skillDef.id)) {
      if (this.isAiming) this.cancelAiming();
      this.sendMessage({ type: 'ACTIVATE_SKILL', skillId: skillDef.id });
      return;
    }

    // If already aiming this exact skill, confirm fire!
    if (this.isAiming && this.aimingAction?.type === 'skill' && this.aimingAction.skillId === skillDef.id) {
      this.confirmAimFire();
      return;
    }

    let projectileType: 'laser' | 'ice' | 'fireball' | 'concussive' | 'target' = 'target';
    let range = 8;
    if (skillDef.id === 'concussive_blast') {
      projectileType = 'fireball';
      range = 8;
    } else if (skillDef.id === 'phase_shift') {
      projectileType = 'target';
      range = 5;
    } else if (skillDef.id === 'shield_slam') {
      projectileType = 'target';
      range = 2;
    } else if (skillDef.id === 'nano_sentry') {
      projectileType = 'target';
      range = 3;
    }

    this.startAiming({
      type: 'skill',
      skillId: skillDef.id,
      name: skillDef.name,
      range,
      projectileType
    });
  }

  public startAiming(config: {
    type: 'action' | 'skill';
    actionType?: 'attack' | 'special';
    skillId?: string;
    name: string;
    range: number;
    projectileType: 'laser' | 'ice' | 'fireball' | 'concussive' | 'target';
  }) {
    if (this.isLooking) this.exitLookMode();
    if (this.worldMap.isOpen()) this.worldMap.close();
    if (this.charSheet.isOpen()) this.charSheet.hide();
    if (this.inventory.isOpen()) this.inventory.hide();

    const player = this.getMyPlayer();
    if (!player) return;

    this.isAiming = true;
    this.aimingAction = config;
    this.input.isAiming = true;

    // Find nearest living hostile enemy within range
    const livingEnemies = this.lastEntities
      .filter(e => !e.isPlayer && e.hp > 0)
      .map(e => ({
        entity: e,
        dist: Math.hypot(e.x - player.x, e.y - player.y)
      }))
      .filter(item => item.dist <= config.range)
      .sort((a, b) => a.dist - b.dist);

    if (livingEnemies.length > 0) {
      this.aimTarget = { x: livingEnemies[0].entity.x, y: livingEnemies[0].entity.y };
    } else {
      const fdx = player.facing?.dx ?? 1;
      const fdy = player.facing?.dy ?? 0;
      this.aimTarget = {
        x: Math.max(0, Math.min(ZONE_WIDTH - 1, player.x + fdx * 3)),
        y: Math.max(0, Math.min(ZONE_HEIGHT - 1, player.y + fdy * 3))
      };
    }

    this.showAimingBanner(config.name);
    this.updateAimingVisuals();
  }

  public moveAimTarget(dx: number, dy: number) {
    if (!this.isAiming) return;
    this.aimTarget.x = Math.max(0, Math.min(ZONE_WIDTH - 1, this.aimTarget.x + dx));
    this.aimTarget.y = Math.max(0, Math.min(ZONE_HEIGHT - 1, this.aimTarget.y + dy));
    this.updateAimingVisuals();
  }

  public setAimTarget(x: number, y: number) {
    if (!this.isAiming) return;
    this.aimTarget.x = Math.max(0, Math.min(ZONE_WIDTH - 1, x));
    this.aimTarget.y = Math.max(0, Math.min(ZONE_HEIGHT - 1, y));
    this.updateAimingVisuals();
  }

  public updateAimingVisuals() {
    if (!this.isAiming || !this.aimingAction) {
      this.renderer.setAimingVisuals(null, null);
      return;
    }
    const player = this.getMyPlayer();
    if (!player) return;

    const targetEntity = this.lastEntities.find(
      e => !e.isPlayer && e.x === this.aimTarget.x && e.y === this.aimTarget.y && e.hp > 0
    );

    this.renderer.setAimingVisuals(
      { x: player.x, y: player.y },
      this.aimTarget,
      this.aimingAction.projectileType,
      targetEntity ? { name: targetEntity.name, hp: targetEntity.hp, maxHp: targetEntity.maxHp } : null
    );
  }

  public confirmAimFire() {
    if (!this.isAiming || !this.aimingAction) return;

    const action = this.aimingAction;
    const target = { ...this.aimTarget };

    if (action.type === 'action' && action.actionType) {
      this.sendMessage({
        type: 'PLAYER_ACTION',
        actionType: action.actionType,
        targetX: target.x,
        targetY: target.y
      });
      if (action.projectileType === 'ice') {
        this.audio.playFreeze();
      } else if (action.projectileType === 'fireball') {
        this.audio.playCreeperBlast();
      } else {
        this.audio.playLaser();
      }
    } else if (action.type === 'skill' && action.skillId) {
      this.sendMessage({
        type: 'ACTIVATE_SKILL',
        skillId: action.skillId,
        targetX: target.x,
        targetY: target.y
      });
      if (action.projectileType === 'ice') {
        this.audio.playFreeze();
      } else if (action.projectileType === 'fireball') {
        this.audio.playCreeperBlast();
      } else {
        this.audio.playLaser();
      }
    }

    this.cancelAiming();
  }

  public cancelAiming() {
    this.isAiming = false;
    this.aimingAction = null;
    this.input.isAiming = false;
    this.renderer.setAimingVisuals(null, null);
    this.hideAimingBanner();
  }

  private showAimingBanner(skillName: string) {
    const banner = document.getElementById('aiming-banner');
    const nameEl = document.getElementById('aiming-skill-name');
    if (nameEl) nameEl.textContent = skillName;
    if (banner) banner.classList.remove('hidden');
  }

  private hideAimingBanner() {
    const banner = document.getElementById('aiming-banner');
    if (banner) banner.classList.add('hidden');
  }

  private updateLookInspect() {
    if (!this.currentZone) return;
    const { x, y } = this.lookCursor;

    // 1. Check for entity
    const entity = this.lastEntities.find(e => e.x === x && e.y === y && e.hp > 0);
    if (entity) {
      if (entity.id === this.myEntityId) {
        this.ui.showLookCard(
          `${entity.name} (You)`,
          `[X: ${x}, Y: ${y}]`,
          `Player Hero [${entity.role?.toUpperCase()}]`,
          `Level 1 Hero of the Homesteads. HP: ${entity.hp}/${entity.maxHp}, Energy: ${entity.energy}/${entity.maxEnergy}`,
          entity.isDowned ? `⚠️ DOWNED! Hold on with [Wait] until allies resurrect you!` : `Standing ready for action.`
        );
        return;
      }

      if (entity.isPlayer) {
        this.ui.showLookCard(
          `${entity.name} ${entity.isBot ? '(AI Ally)' : '(Party Ally)'}`,
          `[X: ${x}, Y: ${y}]`,
          `Companion [${entity.role?.toUpperCase()}]`,
          `Faithful companion fighting beside you. HP: ${entity.hp}/${entity.maxHp}`,
          entity.isDowned ? `⚠️ DOWNED! Move adjacent and press [Enter] or [R] to revive!` : `Status: Ready.`
        );
        return;
      }

      // Hostile monster
      let statusDetail = 'Press [Enter] or Click to attack with laser or ability.';
      if (entity.statusEffects.frozen) {
        statusDetail = `❄️ FROZEN IN ICE! Explodes into fragments if hit by Barrett's fireball!`;
      }
      this.ui.showLookCard(
        entity.name,
        `[X: ${x}, Y: ${y}]`,
        `Hostile Entity [HP: ${entity.hp}/${entity.maxHp}]`,
        entity.isGhost ? `Phasing ethereal ghost that passes through solid stone walls.` : `Hostile creature roaming the homesteads.`,
        statusDetail
      );
      return;
    }

    // 2. Check for ground items
    const itemsAtTile = this.currentZone.items.filter(it => it.x === x && it.y === y);
    if (itemsAtTile.length === 1) {
      const itemEntry = itemsAtTile[0];
      const isRune = itemEntry.item.type === 'rune';
      const countStr = itemEntry.item.count && itemEntry.item.count > 1 ? ` (x${itemEntry.item.count})` : '';
      this.ui.showLookCard(
        isRune ? `✨ ${itemEntry.item.name}` : `${itemEntry.item.name}${countStr}`,
        `[X: ${x}, Y: ${y}]`,
        isRune ? `Ancient Power Rune [${itemEntry.item.runeStat?.toUpperCase() || 'RUNE'}]` : `Ground Item [${itemEntry.item.type.toUpperCase()}]`,
        itemEntry.item.description || 'An item lying on the ground.',
        isRune ? 'Press [Enter] or walk onto tile to permanently absorb rune power!' : 'Press [Enter] or step onto tile to pick up this item.'
      );
      return;
    } else if (itemsAtTile.length > 1) {
      const totalWeight = itemsAtTile.reduce((sum, it) => sum + (it.item.weight || 0.5) * (it.item.count || 1), 0).toFixed(1);
      const itemListHtml = itemsAtTile.map(it => {
        const item = it.item;
        const countText = item.count && item.count > 1 ? ` <span style="color: var(--amber-bright); font-weight: bold;">(x${item.count})</span>` : '';
        const rarityCol = item.rarity === 'quantum' ? 'var(--boss-gold)' : item.rarity === 'rare' ? 'var(--cyan)' : item.rarity === 'uncommon' ? 'var(--green)' : '#ccddee';
        return `<div style="display: flex; align-items: center; justify-content: space-between; margin: 3px 0; padding: 3px 6px; background: rgba(255,255,255,0.05); border-radius: 3px; border-left: 2px solid ${item.color || '#fff'};">
          <span style="display: inline-flex; align-items: center; gap: 6px;">
            <span style="color: ${item.color}; font-weight: bold; font-family: monospace;">${item.symbol}</span>
            <span style="color: ${rarityCol}; font-weight: 600;">${item.name}${countText}</span>
          </span>
          <span style="color: #778899; font-size: 10px;">${((item.weight || 0.5) * (item.count || 1)).toFixed(1)} lbs</span>
        </div>`;
      }).join('');

      this.ui.showLookCard(
        `📦 Pile of Items (${itemsAtTile.length} items)`,
        `[X: ${x}, Y: ${y}]`,
        `Ground Item Pile [${itemsAtTile.length} Items Underfoot]`,
        itemListHtml,
        `Total Weight: ${totalWeight} lbs • Walk over or press [Enter] to pick up everything!`,
        true
      );
      return;
    }

    // 3. Inspect tile/terrain
    const tile = this.currentZone.tiles[y]?.[x];
    if (!tile) return;

    if (tile.type === 'door') {
      this.ui.showLookCard(
        tile.walkable ? 'Open Doorway' : 'Closed Wooden Door',
        `[X: ${x}, Y: ${y}]`,
        'Interactable Door',
        'A sturdy wooden door protecting the homestead.',
        `Press [Enter] to ${tile.walkable ? 'close' : 'open'} the door.`
      );
    } else if (tile.type === 'workbench') {
      this.ui.showLookCard(
        'Homestead Workbench',
        `[X: ${x}, Y: ${y}]`,
        'Crafting Station',
        "Barrett's crafting table. Bring Scrap Metal and Laser Diode Crystal here to craft Luther's Heavy Laser Weapon!",
        'Stand adjacent and press [Enter] to craft.'
      );
    } else if (tile.type === 'stairs_down') {
      this.ui.showLookCard(
        'Stairs Down to Whitehill Mines',
        `[X: ${x}, Y: ${y}]`,
        'Subterranean Passage',
        'A dark shaft leading down into the ore-rich depths of Whitehill Mines.',
        'Step onto this tile to descend.'
      );
    } else if (tile.type === 'stairs_up') {
      this.ui.showLookCard(
        'Stairs Up',
        `[X: ${x}, Y: ${y}]`,
        'Surface Ascent',
        'Stone stairs leading back up to the surface homesteads.',
        'Step onto this tile to ascend.'
      );
    } else if (tile.type === 'wall' || tile.type === 'breakable_wall') {
      const isBarrett = this.getMyPlayer()?.role === 'barrett';
      this.ui.showLookCard(
        tile.minable || tile.type === 'breakable_wall' ? 'Ore-Bearing Breakable Wall' : 'Solid Granite Wall',
        `[X: ${x}, Y: ${y}]`,
        'Terrain Obstacle',
        'Ancient stone barrier. Barrett the clever Miner can excavate through rock with his pickaxe.',
        isBarrett ? 'Stand adjacent and press [3] or [Enter] to mine!' : 'Requires Barrett the Miner to dig.'
      );
    } else if (tile.type === 'water') {
      this.ui.showLookCard(
        'Murky Water',
        `[X: ${x}, Y: ${y}]`,
        'Liquid Hazard',
        'Shallow murky creek water.',
        'Walkable with reduced speed.'
      );
    } else if (tile.type === 'altar') {
      const colorName = (tile.pedestalColor || 'Rainbow').toUpperCase();
      const isPlaced = tile.pedestalItem ? true : false;
      this.ui.showLookCard(
        `${colorName} Altar Pedestal (Ω)`,
        `[X: ${x}, Y: ${y}]`,
        'Rainbow Shrine Altar',
        `One of six ancient sacred pedestals of the Water Mountain Rainbow Altar. Requires the ${colorName} Pom-Pom to unlock the mountain pass.`,
        isPlaced
          ? '★ Complete: The pom-pom resonates with pure rainbow energy!'
          : `Stand on or adjacent and press [4] or [Enter] to place the ${colorName} Pom-Pom.`
      );
    } else if (tile.type === 'victory_switch') {
      this.ui.showLookCard(
        'Victory Switch',
        `[X: ${x}, Y: ${y}]`,
        'Ancient Mechanism',
        "The master control switch that shuts down the robot swarm and saves Cooper's birthday party!",
        'Stand adjacent and press [Enter] to activate.'
      );
    } else {
      this.ui.showLookCard(
        'Open Ground',
        `[X: ${x}, Y: ${y}]`,
        `Terrain [${this.currentZone.name}]`,
        'Open terrain in the realm of the homesteads.',
        'Walkable path.'
      );
    }
  }

  public openInteractionMenu() {
    if (!this.currentZone) return;
    const { x, y } = this.lookCursor;
    const myPlayer = this.getMyPlayer();
    const dist = myPlayer ? Math.hypot(x - myPlayer.x, y - myPlayer.y) : 999;

    const options: { id: string; label: string; shortcut?: string }[] = [];

    // 1. Check Downed Ally
    const downedAlly = this.lastEntities.find(
      e => e.isPlayer && e.isDowned && e.x === x && e.y === y
    );
    if (downedAlly) {
      options.push({
        id: 'interact_here',
        label: `Revive ${downedAlly.name} ${dist <= 1.5 ? '(Adjacent)' : '(Too far - move closer)'}`,
        shortcut: 'R'
      });
    }

    // 2. Check Ground Items
    const itemsAtTile = this.currentZone.items.filter(it => it.x === x && it.y === y);
    if (itemsAtTile.length === 1) {
      const itemEntry = itemsAtTile[0];
      const isRune = itemEntry.item.type === 'rune';
      const countStr = itemEntry.item.count && itemEntry.item.count > 1 ? ` (x${itemEntry.item.count})` : '';
      options.push({
        id: 'interact_here',
        label: isRune
          ? `✨ Absorb Ancient Rune: ${itemEntry.item.name} ${dist <= 1.5 ? '(Adjacent)' : '(Too far - move closer)'}`
          : `Pick Up: ${itemEntry.item.name}${countStr} ${dist <= 1.5 ? '(Adjacent)' : '(Too far - move closer)'}`,
        shortcut: '1'
      });
    } else if (itemsAtTile.length > 1) {
      options.push({
        id: 'interact_pickup_all',
        label: `📦 Pick Up All Items (${itemsAtTile.length} Items) ${dist <= 1.5 ? '(Adjacent)' : '(Too far - move closer)'}`,
        shortcut: '1'
      });
      itemsAtTile.forEach((entry, idx) => {
        const it = entry.item;
        const countStr = it.count && it.count > 1 ? ` x${it.count}` : '';
        const isRune = it.type === 'rune';
        options.push({
          id: `pickup_single_${it.id}`,
          label: isRune
            ? `✨ Absorb Rune: ${it.name} ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`
            : `• Pick Up: ${it.name}${countStr} (${((it.weight || 0.5) * (it.count || 1)).toFixed(1)} lbs) ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`,
          shortcut: idx < 8 ? `${idx + 2}` : undefined
        });
      });
    }

    // 3. Check Tile
    const tile = this.currentZone.tiles[y]?.[x];
    if (tile) {
      if (tile.type === 'door') {
        options.push({
          id: 'interact_here',
          label: `${tile.walkable ? 'Close' : 'Open'} Door ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`,
          shortcut: '1'
        });
      } else if (tile.type === 'workbench') {
        options.push({
          id: 'interact_here',
          label: `Craft at Workbench ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`,
          shortcut: '4'
        });
      } else if (tile.type === 'altar') {
        const colorName = (tile.pedestalColor || 'Rainbow').toUpperCase();
        const isPlaced = tile.pedestalItem ? true : false;
        options.push({
          id: 'interact_here',
          label: isPlaced
            ? `${colorName} Altar Pedestal (Active) ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`
            : `Place ${colorName} Pom-Pom on Altar ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`,
          shortcut: '4'
        });
      } else if (tile.type === 'victory_switch') {
        options.push({
          id: 'interact_here',
          label: `Activate Victory Switch ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`,
          shortcut: '4'
        });
      } else if (tile.type === 'wall' || tile.type === 'breakable_wall') {
        if (myPlayer?.role === 'barrett') {
          options.push({
            id: 'interact_here',
            label: `Mine Rock Wall with Pickaxe ${dist <= 1.5 ? '(Adjacent)' : '(Too far)'}`,
            shortcut: '3'
          });
        }
      }
    }

    // 4. Check Monster
    const mob = this.lastEntities.find(e => !e.isPlayer && e.hp > 0 && e.x === x && e.y === y);
    if (mob) {
      options.push({
        id: 'interact_here',
        label: `Attack ${mob.name} with Laser / Strike`,
        shortcut: '1'
      });
      options.push({
        id: 'special_attack',
        label: `Cast Special Ability at ${mob.name}`,
        shortcut: '2'
      });
    }

    // Always option to cancel
    options.push({
      id: 'cancel',
      label: 'Cancel & Exit Look Mode',
      shortcut: 'Esc'
    });

    const targetTitle = mob?.name || (itemsAtTile.length > 1 ? `PILE OF ${itemsAtTile.length} ITEMS` : itemsAtTile[0]?.item.name) || tile?.type.toUpperCase() || 'TARGET TILE';
    const targetDesc = `Actions for tile [X: ${x}, Y: ${y}]. Choose an interaction:`;

    this.ui.showInteractionModal(targetTitle, targetDesc, options, (selectedId) => {
      if (selectedId === 'interact_here' || selectedId === 'interact_pickup_all') {
        this.sendMessage({ type: 'INTERACT', x, y });
      } else if (selectedId.startsWith('pickup_single_')) {
        const itemId = selectedId.replace('pickup_single_', '');
        this.sendMessage({ type: 'INTERACT', x, y, itemId });
      } else if (selectedId === 'special_attack') {
        this.sendMessage({ type: 'PLAYER_ACTION', actionType: 'special', targetX: x, targetY: y });
      }
      this.exitLookMode();
    });
  }

  private updateWaveHUD(waveInfo?: WaveInfo) {
    const waveEl = document.getElementById('hud-wave');
    if (!waveEl) return;
    if (!waveInfo) {
      waveEl.textContent = '';
      waveEl.style.display = 'none';
      return;
    }
    waveEl.style.display = 'inline-block';
    if (waveInfo.waveCleared && waveInfo.currentWave >= waveInfo.totalWaves) {
      waveEl.textContent = '★ ALL WAVES CLEARED! ★';
      waveEl.style.borderColor = 'var(--boss-gold)';
      waveEl.style.color = 'var(--boss-gold)';
      waveEl.style.background = 'rgba(255, 215, 0, 0.15)';
    } else if (waveInfo.waveCleared) {
      waveEl.textContent = `⚔ WAVE ${waveInfo.currentWave}/${waveInfo.totalWaves} CLEARED! ⚔`;
      waveEl.style.borderColor = 'var(--green)';
      waveEl.style.color = 'var(--green)';
      waveEl.style.background = 'rgba(68, 255, 136, 0.15)';
    } else {
      waveEl.textContent = `[LVL ${waveInfo.zoneLevel}] ⚔ WAVE ${waveInfo.currentWave}/${waveInfo.totalWaves} (${waveInfo.enemiesRemaining} FOES)`;
      waveEl.style.borderColor = 'var(--fire-red)';
      waveEl.style.color = 'var(--fire-red)';
      waveEl.style.background = 'rgba(255, 68, 68, 0.15)';
    }
  }

  private updateHotbar(player: Entity) {
    const activeSkills = (player.skillsLearned || [])
      .map(id => SKILL_DEFINITIONS.find(s => s.id === id))
      .filter((s): s is SkillDefinition => !!s && s.type === 'active');

    for (let i = 0; i < 3; i++) {
      const btn = document.getElementById(`btn-hotbar-${i + 1}`);
      if (!btn) continue;
      const skill = activeSkills[i];
      if (skill) {
        btn.classList.remove('hidden');
        const cd = player.skillCooldowns?.[skill.id] || 0;
        const hasEnergy = player.energy >= (skill.energyCost || 0);
        btn.textContent = `[${i + 5}] ${skill.icon} ${skill.name}${cd > 0 ? ` (${cd})` : ''}`;
        (btn as HTMLButtonElement).disabled = cd > 0 || !hasEnergy;
      } else {
        btn.classList.add('hidden');
      }
    }
  }

  private handleServerMessage(msg: ServerMessage) {
    switch (msg.type) {
      case 'INIT_STATE': {
        this.currentZone = msg.zone;
        this.myEntityId = msg.entityId;
        this.currentStoryStage = msg.storyStage;
        this.renderer.setZone(msg.zone);
        this.ui.updateHeader(msg.zone.name, msg.pacingMode, msg.tickRate);
        this.updateWaveHUD(msg.zone.waveInfo);
        this.worldMap.updateState(msg.zone.coord, msg.storyStage, msg.hero);
        break;
      }

      case 'ZONE_CHANGED': {
        console.log('Transitioned to new zone:', msg.zone.name, msg.zone.coord);
        this.currentZone = msg.zone;
        this.renderer.setZone(msg.zone);
        this.ui.updateHeader(msg.zone.name, msg.pacingMode, this.settings.tickRate);
        this.updateWaveHUD(msg.waveInfo || msg.zone.waveInfo);
        this.worldMap.updateState(msg.zone.coord, this.currentStoryStage, this.myHeroRole || 'barrett');
        if (this.isLooking) {
          this.exitLookMode();
        }
        if (this.isAiming) {
          this.cancelAiming();
        }
        if (this.worldMap.isOpen()) {
          this.worldMap.render();
        }
        break;
      }

      case 'WORLD_UPDATE': {
        if (this.currentZone) {
          // If this update is for another zone, ignore to prevent ghost drawing
          if (!this.isSameZone(this.currentZone.coord, msg.zoneCoord)) {
            return;
          }

          // Update zone items
          this.currentZone.items = msg.items;
          this.lastEntities = msg.entities;

          if (msg.tileUpdates) {
            for (const upd of msg.tileUpdates) {
              if (this.currentZone.tiles[upd.y] && this.currentZone.tiles[upd.y][upd.x]) {
                this.currentZone.tiles[upd.y][upd.x] = upd.tile;
                this.renderer.updateTile(upd.x, upd.y, upd.tile, this.currentZone);
              }
            }
          }
          if (msg.tiles) {
            this.currentZone.tiles = msg.tiles;
          }

          const myPlayer = msg.entities.find(e => e.id === this.myEntityId);
          if (myPlayer) {
            if (myPlayer.isDowned && this.isAiming) {
              this.cancelAiming();
            }
            this.ui.setDownedBanner(!!myPlayer.isDowned);
            this.worldMap.updatePlayerBonuses(myPlayer.runeBonuses, myPlayer.runesCollected);
            this.charSheet.updateEntity(myPlayer);
            this.inventory.update(myPlayer, msg.items);
            this.updateHotbar(myPlayer);
          }
          this.renderer.renderFrame(
            this.currentZone,
            msg.entities,
            msg.projectiles,
            msg.floatingTexts,
            myPlayer
          );
          this.ui.updateHeader(this.currentZone.name, msg.pacingMode, this.settings.tickRate);
          this.updateWaveHUD(msg.waveInfo);

          if (this.isLooking) {
            this.updateLookInspect();
          }
          if (this.isAiming) {
            this.updateAimingVisuals();
          }
        }
        break;
      }

      case 'PARTY_UPDATE': {
        this.ui.updateParty(msg.members);
        break;
      }

      case 'LEVEL_UP_EVENT': {
        this.audio.playVictoryFanfare();
        this.ui.addLogEntry({
          id: `lvl-${Date.now()}`,
          timestamp: Date.now(),
          text: `★ LEVEL UP! ${msg.hero.toUpperCase()} reached Level ${msg.level}! (+${msg.attributePoints} AP, +${msg.skillPoints} SP) Press [C] to allocate points!`,
          color: 'var(--boss-gold)',
          category: 'story'
        });
        break;
      }

      case 'WORLD_TRAVEL_RESULT': {
        const modal = document.getElementById('travel-event-modal');
        const titleEl = document.getElementById('travel-event-title');
        const iconEl = document.getElementById('travel-event-icon');
        const msgEl = document.getElementById('travel-event-message');

        if (modal && titleEl && iconEl && msgEl) {
          if (msg.eventType === 'lost') {
            titleEl.textContent = '⚠️ LOST IN THE WILDS!';
            titleEl.style.color = 'var(--fire-red)';
            iconEl.textContent = '🧭';
            msgEl.textContent = msg.message;
            modal.classList.remove('hidden');
          } else if (msg.eventType === 'found_ruins') {
            titleEl.textContent = '🏛️ DISCOVERED FORGOTTEN RUINS!';
            titleEl.style.color = 'var(--boss-gold)';
            iconEl.textContent = 'Ω';
            msgEl.textContent = msg.message;
            modal.classList.remove('hidden');
          } else if (msg.eventType === 'found_cave') {
            titleEl.textContent = '⛏️ DISCOVERED SUBTERRANEAN CAVE!';
            titleEl.style.color = 'var(--cyan)';
            iconEl.textContent = '▼';
            msgEl.textContent = msg.message;
            modal.classList.remove('hidden');
          }
        }
        break;
      }

      case 'STORY_EVENT': {
        this.currentStoryStage = msg.stage;
        this.ui.updateQuest(msg.questTitle, msg.questDesc);
        if (this.currentZone) {
          this.worldMap.updateState(this.currentZone.coord, msg.stage, this.myHeroRole || 'barrett');
          if (this.worldMap.isOpen()) {
            this.worldMap.render();
          }
        }
        if (msg.dialogue) {
          this.ui.showDialogue(msg.dialogue);
        }
        break;
      }

      case 'COMBAT_LOG': {
        this.ui.addLogEntry(msg.entry);
        // Sound effects (only play if enabled)
        if (msg.entry.text.includes('SHATTER EXPLOSION')) {
          this.audio.playShatterExplosion();
          this.renderer.triggerScreenShake(8, 300);
        } else if (msg.entry.text.includes('EXCAVATED') || msg.entry.text.includes('shatters the perimeter') || msg.entry.text.includes('mines through')) {
          this.audio.playWallCollapse();
          this.renderer.triggerScreenShake(4, 200);
        } else if (msg.entry.text.includes('strikes the') || msg.entry.text.includes('dig damage')) {
          this.audio.playMiningHit();
        } else if (msg.entry.text.includes('freezes')) {
          this.audio.playFreeze();
        } else if (msg.entry.text.includes('EARTH-SHAKING SLAP')) {
          this.audio.playRockKingSlap();
          this.renderer.triggerScreenShake(16, 800);
        } else if (msg.entry.text.includes('BOOM')) {
          this.audio.playCreeperBlast();
          this.renderer.triggerScreenShake(10, 400);
        } else if (msg.entry.text.includes('reviv')) {
          this.audio.playRevive();
        } else if (msg.entry.text.includes('VICTORY')) {
          this.audio.playVictoryFanfare();
        }
        break;
      }
    }
  }

  private setupMusicUI() {
    const music = this.audio.music;
    const toggleBtn = document.getElementById('btn-music-toggle');
    const statusTxt = document.getElementById('hud-music-status');
    const titleTxt = document.getElementById('hud-music-title');
    const nextBtn = document.getElementById('btn-music-next');
    const volSlider = document.getElementById('hud-music-vol') as HTMLInputElement | null;

    const settingsMusicCheck = document.getElementById('settings-music-enabled') as HTMLInputElement | null;
    const settingsMusicVol = document.getElementById('settings-music-vol') as HTMLInputElement | null;
    const settingsMusicVolVal = document.getElementById('settings-music-vol-val');
    const settingsSfxCheck = document.getElementById('settings-sfx-enabled') as HTMLInputElement | null;
    const settingsSfxVol = document.getElementById('settings-sfx-vol') as HTMLInputElement | null;
    const settingsSfxVolVal = document.getElementById('settings-sfx-vol-val');

    // Sync initial controls from loaded state
    if (volSlider) volSlider.value = String(Math.round(music.volume * 100));
    if (settingsMusicVol) settingsMusicVol.value = String(Math.round(music.volume * 100));
    if (settingsMusicVolVal) settingsMusicVolVal.textContent = `${Math.round(music.volume * 100)}%`;
    if (settingsMusicCheck) settingsMusicCheck.checked = music.enabled;
    if (settingsSfxCheck) settingsSfxCheck.checked = this.audio.sfx.enabled;
    if (settingsSfxVol) settingsSfxVol.value = String(Math.round(this.audio.sfx.volume * 100));
    if (settingsSfxVolVal) settingsSfxVolVal.textContent = `${Math.round(this.audio.sfx.volume * 100)}%`;

    const updateDisplay = (track = music.getCurrentTrack(), isPlaying = music.isPlaying) => {
      if (titleTxt) titleTxt.textContent = track.title;
      if (statusTxt) statusTxt.textContent = isPlaying ? 'Pause' : 'Play';
      if (toggleBtn) toggleBtn.title = isPlaying ? 'Pause Background Music' : 'Play Background Music';
      if (settingsMusicCheck) settingsMusicCheck.checked = music.enabled;
    };

    updateDisplay();

    music.onTrackChange = (track, isPlaying) => {
      updateDisplay(track, isPlaying);
    };

    music.onStateChange = (isPlaying, volume) => {
      updateDisplay(music.getCurrentTrack(), isPlaying);
      if (volSlider) volSlider.value = String(Math.round(volume * 100));
      if (settingsMusicVol) settingsMusicVol.value = String(Math.round(volume * 100));
      if (settingsMusicVolVal) settingsMusicVolVal.textContent = `${Math.round(volume * 100)}%`;
    };

    toggleBtn?.addEventListener('click', () => {
      music.togglePlayPause();
    });

    nextBtn?.addEventListener('click', () => {
      music.nextTrack();
    });

    volSlider?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value) / 100;
      music.setVolume(val);
    });

    settingsMusicCheck?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      music.setEnabled(checked);
    });

    settingsMusicVol?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value) / 100;
      music.setVolume(val);
      if (settingsMusicVolVal) settingsMusicVolVal.textContent = `${Math.round(val * 100)}%`;
    });

    settingsSfxCheck?.addEventListener('change', (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      this.audio.sfx.setEnabled(checked);
    });

    settingsSfxVol?.addEventListener('input', (e) => {
      const val = Number((e.target as HTMLInputElement).value) / 100;
      this.audio.sfx.setVolume(val);
      if (settingsSfxVolVal) settingsSfxVolVal.textContent = `${Math.round(val * 100)}%`;
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new ClientApp();
  app.start();
});

