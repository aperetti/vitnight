import { Application, Container, Graphics, Text, TextStyle, Sprite, Texture, Assets } from 'pixi.js';
import { ZoneData, Entity, Projectile, FloatingText, Tile, Item } from '../shared/types';
import { computeFOV } from '../shared/fov';
import { COLORS, ZONE_WIDTH, ZONE_HEIGHT } from '../shared/constants';

const CELL_SIZE = 22; // Pixels per grid tile

export class GameRenderer {
  public app: Application;
  public rootContainer: Container;
  public mapContainer: Container;
  public itemContainer: Container;
  public entityContainer: Container;
  public projectileContainer: Container;
  public fovContainer: Graphics;
  public textContainer: Container;
  public particleContainer: Container;
  public lookContainer: Container;
  public lookGfx: Graphics;
  public aimContainer: Container;
  public aimGfx: Graphics;
  public aimTooltipContainer: Container;

  private tileSprites: (Sprite | Text | Graphics | Container)[][] = [];
  private currentZone: ZoneData | null = null;
  private screenShakeTime = 0;
  private screenShakeMagnitude = 0;
  private textureCache = new Map<string, Texture>();

  constructor() {
    this.app = new Application();
    this.rootContainer = new Container();
    this.mapContainer = new Container();
    this.itemContainer = new Container();
    this.entityContainer = new Container();
    this.projectileContainer = new Container();
    this.fovContainer = new Graphics();
    this.textContainer = new Container();
    this.particleContainer = new Container();
    this.lookContainer = new Container();
    this.lookGfx = new Graphics();
    this.aimContainer = new Container();
    this.aimGfx = new Graphics();
    this.aimTooltipContainer = new Container();
  }

  private getTexture(url: string): Texture | null {
    if (this.textureCache.has(url)) {
      return this.textureCache.get(url)!;
    }
    try {
      let tex = Assets.get(url);
      if (!tex) {
        tex = Texture.from(url);
      }
      if (tex) {
        if (tex.source) {
          tex.source.scaleMode = 'nearest';
        }
        this.textureCache.set(url, tex);
        return tex;
      }
    } catch {
      // Ignored: fallback to text glyph
    }
    return null;
  }

  public getSpriteUrlForEntity(entity: Entity): string | null {
    const name = (entity.name || '').toLowerCase();
    const id = (entity.id || '').toLowerCase();
    const sym = entity.symbol || '';

    if (entity.isPlayer || entity.role) {
      if (entity.role === 'barrett') return '/sprites/hero_barrett.png';
      if (entity.role === 'luther') return '/sprites/hero_luther.png';
      if (entity.role === 'beau') return '/sprites/hero_beau.png';
      if (entity.role === 'luca' || name.includes('luca')) return '/sprites/hero_luca.png';
      if (entity.role === 'cooper' || entity.name === 'Cooper') return '/sprites/hero_cooper.png';
      return '/sprites/hero_barrett.png';
    }

    if (name.includes('luca') || id.includes('luca')) {
      return '/sprites/hero_luca.png';
    }

    // 1. Skeletons (Skeleton Archer, Vanguard, Legionnaire, Hound, Gladiator, Titan)
    if (
      name.includes('skeleton') ||
      name.includes('bone') ||
      name.includes('legionnaire') ||
      name.includes('gladiator') ||
      sym === 's' ||
      sym === 'S' ||
      sym === 'k' ||
      sym === 'K' ||
      sym === 'd' ||
      id.includes('skel')
    ) {
      return '/sprites/monster_skeleton.png';
    }

    // 2. Creepers (Mutant Creeper & Sulfur Creeper)
    if (name.includes('mutant creeper') || sym === 'C' || id.includes('mutant-creeper')) {
      return '/sprites/monster_mutant_creeper.png';
    }
    if (name.includes('creeper') || sym === 'c' || sym === 'b' || id.includes('creep')) {
      return '/sprites/monster_creeper.png';
    }

    // 3. Zombies (Zombie, Murk Zombie, Ghoul, Prowler, Scavenger, Crawler, Wolf)
    if (
      name.includes('zombie') ||
      name.includes('ghoul') ||
      name.includes('prowler') ||
      name.includes('scavenger') ||
      name.includes('crawler') ||
      sym === 'z' ||
      sym === 'g' ||
      id.includes('zombie')
    ) {
      return '/sprites/monster_zombie.png';
    }

    // 4. Bosses & Titans
    if (name.includes('arch-villager') || name.includes('villager') || sym === 'V' || id.includes('villager')) {
      return '/sprites/monster_boss_arch_villager.png';
    }
    if (name.includes('ender') || name.includes('overlord') || name.includes('nether titan') || sym === 'E' || id.includes('ender')) {
      return '/sprites/monster_boss_heart_of_ender.png';
    }
    if (name.includes('rocky doom') || name.includes('rock king') || sym === 'r' || sym === 'R' || id.includes('rocky')) {
      return '/sprites/monster_rocky_doom.png';
    }

    // 5. Ghosts
    if (name.includes('ghost') || name.includes('wraith') || sym === 'G' || id.includes('ghost')) {
      return '/sprites/monster_ghost.png';
    }

    // 6. Golems & Automatons
    if (name.includes('golem') || name.includes('automaton') || sym === 'O' || id.includes('golem')) {
      return '/sprites/monster_golem.png';
    }

    // 7. Guaranteed fallback for all hostile mobs: cycle through zombie, creeper, skeleton
    // This ensures no hostile mob is ever rendered as a raw letter with a circle!
    const mobCycle = [
      '/sprites/monster_zombie.png',
      '/sprites/monster_creeper.png',
      '/sprites/monster_skeleton.png'
    ];
    let hash = 0;
    const key = entity.id || entity.name || 'mob';
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
    }
    return mobCycle[hash % mobCycle.length];
  }

  public getSpriteUrlForItem(item: Item): string | null {
    const name = item.name.toLowerCase();
    if (name.includes('laser')) return '/sprites/item_laser.png';
    if (name.includes('lightsaber')) return '/sprites/item_lightsaber.png';
    if (name.includes('draught') || name.includes('potion') || name.includes('salve')) return '/sprites/item_healing_draught.png';
    if (name.includes('scrap')) return '/sprites/item_scrap.png';
    if (name.includes('crystal')) return '/sprites/item_crystal.png';
    if (name.includes('key')) return '/sprites/item_key.png';
    if (name.includes('pom-pom')) return '/sprites/item_starapple.png';
    if (name.includes('baetyl') || name.includes('rune')) return '/sprites/item_baetyl.png';
    return null;
  }

  public getSpriteUrlForTile(tile: Tile, _zone: ZoneData): string | null {
    if (tile.type === 'door') return '/sprites/tile_door.png';
    if (tile.type === 'water') return '/sprites/tile_water.png';
    return null;
  }

  public async init(containerElement: HTMLElement) {
    const width = ZONE_WIDTH * CELL_SIZE;
    const height = ZONE_HEIGHT * CELL_SIZE;

    await this.app.init({
      width,
      height,
      backgroundColor: 0x05070a,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    });

    containerElement.appendChild(this.app.canvas);

    this.rootContainer.addChild(this.mapContainer);
    this.rootContainer.addChild(this.itemContainer);
    this.rootContainer.addChild(this.entityContainer);
    this.rootContainer.addChild(this.projectileContainer);
    this.rootContainer.addChild(this.fovContainer);
    this.rootContainer.addChild(this.particleContainer);
    this.lookContainer.addChild(this.lookGfx);
    this.rootContainer.addChild(this.lookContainer);
    this.aimContainer.addChild(this.aimGfx);
    this.aimContainer.addChild(this.aimTooltipContainer);
    this.rootContainer.addChild(this.aimContainer);
    this.rootContainer.addChild(this.textContainer);

    this.app.stage.addChild(this.rootContainer);

    // Preload sprite textures asynchronously
    await this.preloadSprites();

    // Render loop for animations, screen shake, and floating text
    this.app.ticker.add((ticker) => {
      this.update(ticker.deltaTime);
    });
  }

  private async preloadSprites() {
    const spriteUrls = [
      '/sprites/hero_barrett.png',
      '/sprites/hero_luther.png',
      '/sprites/hero_beau.png',
      '/sprites/hero_luca.png',
      '/sprites/hero_cooper.png',
      '/sprites/monster_ghost.png',
      '/sprites/monster_zombie.png',
      '/sprites/monster_skeleton.png',
      '/sprites/monster_creeper.png',
      '/sprites/monster_rocky_doom.png',
      '/sprites/monster_golem.png',
      '/sprites/monster_boss_arch_villager.png',
      '/sprites/monster_boss_heart_of_ender.png',
      '/sprites/monster_mutant_creeper.png',
      '/sprites/item_laser.png',
      '/sprites/item_lightsaber.png',
      '/sprites/item_healing_draught.png',
      '/sprites/item_scrap.png',
      '/sprites/item_crystal.png',
      '/sprites/item_key.png',
      '/sprites/item_baetyl.png',
      '/sprites/item_starapple.png',
      '/sprites/tile_wall.png',
      '/sprites/tile_wall_cave.png',
      '/sprites/tile_wall_shale.png',
      '/sprites/tile_door.png',
      '/sprites/tile_water.png',
      '/sprites/tile_dirt.png',
      '/sprites/tile_watervine.png',
      '/sprites/tile_boulder.png',
    ];

    try {
      const loaded = await Assets.load(spriteUrls);
      for (const url of spriteUrls) {
        const tex = (loaded && loaded[url]) || Assets.get(url) || Texture.from(url);
        if (tex) {
          if (tex.source) {
            tex.source.scaleMode = 'nearest';
          }
          this.textureCache.set(url, tex);
        }
      }
      console.log('Preloaded Caves of Qud sprite textures into PixiJS Assets cache.');
    } catch (err) {
      console.warn('Note on preloading sprites, falling back to on-demand Texture.from:', err);
      for (const url of spriteUrls) {
        try {
          const tex = Texture.from(url);
          this.textureCache.set(url, tex);
        } catch {
          // ignore
        }
      }
    }
  }

  public setLookCursor(pos: { x: number; y: number } | null) {
    this.lookGfx.clear();
    if (!pos) return;

    const x = pos.x * CELL_SIZE;
    const y = pos.y * CELL_SIZE;

    // Semi-transparent amber fill
    this.lookGfx.rect(x, y, CELL_SIZE, CELL_SIZE);
    this.lookGfx.fill({ color: 0xffb733, alpha: 0.25 });

    // Targeting box corners (classic Caves of Qud look brackets)
    const cornerLen = 5;
    this.lookGfx.stroke({ color: 0xffb733, width: 2, alpha: 0.95 });

    // Top-left
    this.lookGfx.moveTo(x, y + cornerLen).lineTo(x, y).lineTo(x + cornerLen, y);
    // Top-right
    this.lookGfx.moveTo(x + CELL_SIZE - cornerLen, y).lineTo(x + CELL_SIZE, y).lineTo(x + CELL_SIZE, y + cornerLen);
    // Bottom-left
    this.lookGfx.moveTo(x, y + CELL_SIZE - cornerLen).lineTo(x, y + CELL_SIZE).lineTo(x + cornerLen, y + CELL_SIZE);
    // Bottom-right
    this.lookGfx.moveTo(x + CELL_SIZE - cornerLen, y + CELL_SIZE).lineTo(x + CELL_SIZE, y + CELL_SIZE).lineTo(x + CELL_SIZE, y + CELL_SIZE - cornerLen);
    this.lookGfx.stroke();
  }

  public setAimingVisuals(
    playerPos: { x: number; y: number } | null,
    targetPos: { x: number; y: number } | null,
    projectileType: 'laser' | 'ice' | 'fireball' | 'concussive' | 'target' = 'laser',
    targetEntity?: { name: string; hp: number; maxHp: number } | null
  ) {
    this.aimGfx.clear();
    this.aimTooltipContainer.removeChildren();
    if (!playerPos || !targetPos) return;

    const px = playerPos.x * CELL_SIZE + CELL_SIZE / 2;
    const py = playerPos.y * CELL_SIZE + CELL_SIZE / 2;
    const tx = targetPos.x * CELL_SIZE + CELL_SIZE / 2;
    const ty = targetPos.y * CELL_SIZE + CELL_SIZE / 2;

    // Beam and glow colors
    let beamColor = 0x00ffff;
    let glowColor = 0x0088cc;
    if (projectileType === 'ice') {
      beamColor = 0x38bdf8;
      glowColor = 0x0284c7;
    } else if (projectileType === 'fireball') {
      beamColor = 0xff4422;
      glowColor = 0xb91c1c;
    } else if (projectileType === 'target') {
      beamColor = 0xfbbf24;
      glowColor = 0xd97706;
    }

    // 1. Draw glowing trajectory beam from hero to target tile
    this.aimGfx.moveTo(px, py);
    this.aimGfx.lineTo(tx, ty);
    this.aimGfx.stroke({ color: glowColor, width: 6, alpha: 0.35 });

    this.aimGfx.moveTo(px, py);
    this.aimGfx.lineTo(tx, ty);
    this.aimGfx.stroke({ color: beamColor, width: 2, alpha: 0.95 });

    // 2. Draw target reticle at target tile
    const cellX = targetPos.x * CELL_SIZE;
    const cellY = targetPos.y * CELL_SIZE;

    // Subtle highlight on target cell
    this.aimGfx.rect(cellX, cellY, CELL_SIZE, CELL_SIZE);
    this.aimGfx.fill({ color: beamColor, alpha: 0.18 });

    // Targeting brackets
    const cLen = 6;
    this.aimGfx.stroke({ color: beamColor, width: 2, alpha: 1.0 });

    // Top-left
    this.aimGfx.moveTo(cellX, cellY + cLen).lineTo(cellX, cellY).lineTo(cellX + cLen, cellY);
    // Top-right
    this.aimGfx.moveTo(cellX + CELL_SIZE - cLen, cellY).lineTo(cellX + CELL_SIZE, cellY).lineTo(cellX + CELL_SIZE, cellY + cLen);
    // Bottom-left
    this.aimGfx.moveTo(cellX, cellY + CELL_SIZE - cLen).lineTo(cellX, cellY + CELL_SIZE).lineTo(cellX + cLen, cellY + CELL_SIZE);
    // Bottom-right
    this.aimGfx.moveTo(cellX + CELL_SIZE - cLen, cellY + CELL_SIZE).lineTo(cellX + CELL_SIZE, cellY + CELL_SIZE).lineTo(cellX + CELL_SIZE, cellY + CELL_SIZE - cLen);
    this.aimGfx.stroke();

    // Center crosshair "+"
    const midX = cellX + CELL_SIZE / 2;
    const midY = cellY + CELL_SIZE / 2;
    this.aimGfx.moveTo(midX - 4, midY).lineTo(midX + 4, midY);
    this.aimGfx.moveTo(midX, midY - 4).lineTo(midX, midY + 4);
    this.aimGfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.9 });

    // 3. Enemy target badge with HP bar if aiming at a hostile
    if (targetEntity) {
      const badgeBg = new Graphics();
      const badgeTxt = new Text({
        text: `🎯 ${targetEntity.name} [${targetEntity.hp}/${targetEntity.maxHp} HP]`,
        style: {
          fontFamily: 'Courier New, monospace',
          fontSize: 11,
          fontWeight: 'bold',
          fill: 0xffffff
        }
      });
      const badgeW = Math.max(120, badgeTxt.width + 12);
      const badgeH = 20;
      const bx = Math.max(0, Math.min(ZONE_WIDTH * CELL_SIZE - badgeW, midX - badgeW / 2));
      const by = Math.max(0, cellY - badgeH - 4);

      badgeBg.rect(bx, by, badgeW, badgeH);
      badgeBg.fill({ color: 0x050b14, alpha: 0.92 });
      badgeBg.stroke({ color: beamColor, width: 1.5, alpha: 0.95 });

      // Mini HP bar inside badge
      const hpPct = Math.max(0, Math.min(1, targetEntity.hp / targetEntity.maxHp));
      const hpBarW = badgeW - 8;
      badgeBg.rect(bx + 4, by + badgeH - 4, hpBarW * hpPct, 2);
      badgeBg.fill({ color: 0xff3333, alpha: 0.9 });

      badgeTxt.x = bx + 6;
      badgeTxt.y = by + 2;

      this.aimTooltipContainer.addChild(badgeBg);
      this.aimTooltipContainer.addChild(badgeTxt);
    }
  }

  public getTileCoord(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvas = this.app.canvas;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    if (px < 0 || px >= rect.width || py < 0 || py >= rect.height) return null;

    const scaleX = (ZONE_WIDTH * CELL_SIZE) / rect.width;
    const scaleY = (ZONE_HEIGHT * CELL_SIZE) / rect.height;

    const x = Math.floor((px * scaleX) / CELL_SIZE);
    const y = Math.floor((py * scaleY) / CELL_SIZE);
    if (x >= 0 && x < ZONE_WIDTH && y >= 0 && y < ZONE_HEIGHT) {
      return { x, y };
    }
    return null;
  }

  public triggerScreenShake(magnitude: number, durationMs: number) {
    this.screenShakeMagnitude = magnitude;
    this.screenShakeTime = durationMs / 16.6; // frames
  }

  private update(delta: number) {
    // Screen shake calculation
    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= delta;
      const offsetX = (Math.random() - 0.5) * this.screenShakeMagnitude * 2;
      const offsetY = (Math.random() - 0.5) * this.screenShakeMagnitude * 2;
      this.rootContainer.position.set(offsetX, offsetY);
    } else {
      this.rootContainer.position.set(0, 0);
    }

    // Float floating texts upward
    for (let i = this.textContainer.children.length - 1; i >= 0; i--) {
      const txt = this.textContainer.children[i] as any;
      if (txt) {
        txt.y -= 0.5 * delta;
        txt.alpha -= 0.015 * delta;
        if (txt.alpha <= 0) {
          this.textContainer.removeChild(txt);
        }
      }
    }
  }

  private createWallTile(x: number, y: number, tile: Tile, zone: ZoneData): Graphics {
    const gfx = new Graphics();
    gfx.x = x * CELL_SIZE;
    gfx.y = y * CELL_SIZE;

    const isWallOrDoor = (tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= zone.width || ty < 0 || ty >= zone.height) return true;
      const t = zone.tiles[ty]?.[tx];
      return t ? (t.type === 'wall' || t.type === 'breakable_wall' || t.type === 'door') : false;
    };

    const isWall = (tx: number, ty: number): boolean => {
      if (tx < 0 || tx >= zone.width || ty < 0 || ty >= zone.height) return true;
      const t = zone.tiles[ty]?.[tx];
      return t ? (t.type === 'wall' || t.type === 'breakable_wall') : false;
    };

    const n = isWallOrDoor(x, y - 1);
    const s = isWallOrDoor(x, y + 1);
    const w = isWallOrDoor(x - 1, y);
    const e = isWallOrDoor(x + 1, y);

    const nw = isWall(x - 1, y - 1);
    const ne = isWall(x + 1, y - 1);
    const sw = isWall(x - 1, y + 1);
    const se = isWall(x + 1, y + 1);

    // Biome-tailored colors
    let baseColor = 0x12262a; // default Qud slate teal
    let rimHighlight = 0x3f7a7d;
    let shadow = 0x081316;
    let mortar = 0x1a363b;

    if (zone.coord.depth > 0) {
      // Subterranean mines / cavern
      baseColor = 0x161c22;
      rimHighlight = 0x637d94;
      shadow = 0x0b0e12;
      mortar = 0x242e38;
    } else if (zone.coord.parasangX === 1) {
      // Eastern outskirts shale / mountain
      baseColor = 0x2c1d18;
      rimHighlight = 0x9e6047;
      shadow = 0x140d0a;
      mortar = 0x422c24;
    }

    if (tile.color === COLORS.boneWhite) {
      baseColor = 0x32302a;
      rimHighlight = 0xd8d0bc;
      shadow = 0x181714;
      mortar = 0x4a473e;
    } else if (tile.color === COLORS.bossGold) {
      baseColor = 0x383010;
      rimHighlight = 0xffd700;
      shadow = 0x1a1607;
      mortar = 0x524617;
    } else if (tile.color === COLORS.greenDark) {
      baseColor = 0x122416;
      rimHighlight = 0x38904a;
      shadow = 0x09140b;
      mortar = 0x1e3e25;
    }

    if (tile.type === 'breakable_wall') {
      baseColor = 0x28231c;
      rimHighlight = 0x8a7860;
      shadow = 0x12100c;
    }

    // 1. Solid continuous background (fills cell edge-to-edge)
    gfx.rect(0, 0, CELL_SIZE, CELL_SIZE);
    gfx.fill({ color: baseColor });

    // 2. Continuous interior stone masonry connecting horizontally or vertically
    if (w || e) {
      // Continuous horizontal mortar lines spanning across neighboring tiles
      gfx.rect(0, 7, CELL_SIZE, 1);
      gfx.fill({ color: mortar, alpha: 0.5 });
      gfx.rect(0, 14, CELL_SIZE, 1);
      gfx.fill({ color: mortar, alpha: 0.5 });

      // Staggered vertical stone joints
      if (x % 2 === 0) {
        gfx.rect(10, 0, 1, 7);
        gfx.fill({ color: mortar, alpha: 0.35 });
        gfx.rect(10, 14, 1, CELL_SIZE - 14);
        gfx.fill({ color: mortar, alpha: 0.35 });
      } else {
        gfx.rect(10, 7, 1, 7);
        gfx.fill({ color: mortar, alpha: 0.35 });
      }
    } else if (n || s) {
      // Vertical stone column lines
      gfx.rect(6, 0, 1, CELL_SIZE);
      gfx.fill({ color: mortar, alpha: 0.4 });
      gfx.rect(14, 0, 1, CELL_SIZE);
      gfx.fill({ color: mortar, alpha: 0.4 });
    }

    // 3. Breakable wall ore sparkles / Gold arena posts
    if (tile.type === 'breakable_wall') {
      gfx.rect(4, 5, 2, 2); gfx.fill({ color: 0xffb733 });
      gfx.rect(14, 9, 2, 2); gfx.fill({ color: 0x00ffff });
      gfx.rect(8, 15, 2, 2); gfx.fill({ color: 0xffea00 });
    } else if (tile.char === '║') {
      gfx.rect(7, 0, 3, CELL_SIZE); gfx.fill({ color: rimHighlight });
      gfx.rect(12, 0, 3, CELL_SIZE); gfx.fill({ color: rimHighlight });
    }

    // 4. Outer perimeter rims (drawn ONLY where face borders open terrain)
    if (!n) {
      gfx.rect(0, 0, CELL_SIZE, 2);
      gfx.fill({ color: rimHighlight, alpha: 0.95 });
    }
    if (!s) {
      gfx.rect(0, CELL_SIZE - 2, CELL_SIZE, 2);
      gfx.fill({ color: shadow, alpha: 0.95 });
    }
    if (!w) {
      gfx.rect(0, 0, 2, CELL_SIZE);
      gfx.fill({ color: rimHighlight, alpha: 0.85 });
    }
    if (!e) {
      gfx.rect(CELL_SIZE - 2, 0, 2, CELL_SIZE);
      gfx.fill({ color: shadow, alpha: 0.85 });
    }

    // 5. Concave inner corner notches
    if (n && w && !nw) {
      gfx.rect(0, 0, 2, 2); gfx.fill({ color: rimHighlight, alpha: 0.8 });
    }
    if (n && e && !ne) {
      gfx.rect(CELL_SIZE - 2, 0, 2, 2); gfx.fill({ color: rimHighlight, alpha: 0.8 });
    }
    if (s && w && !sw) {
      gfx.rect(0, CELL_SIZE - 2, 2, 2); gfx.fill({ color: shadow, alpha: 0.8 });
    }
    if (s && e && !se) {
      gfx.rect(CELL_SIZE - 2, CELL_SIZE - 2, 2, 2); gfx.fill({ color: shadow, alpha: 0.8 });
    }

    return gfx;
  }

  private createAltarTile(x: number, y: number, tile: Tile, _zone: ZoneData): Container {
    const container = new Container();
    container.x = x * CELL_SIZE;
    container.y = y * CELL_SIZE;

    const gfx = new Graphics();
    // Dais platform
    gfx.rect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
    gfx.fill({ color: 0x141a22 });

    let borderColor = 0xffd700;
    if (tile.color) {
      const hex = tile.color.replace('#', '');
      borderColor = parseInt(hex, 16) || 0xffd700;
    }

    gfx.rect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
    gfx.stroke({ color: borderColor, width: 2, alpha: 0.9 });

    // Inner sacred circle
    gfx.circle(CELL_SIZE / 2, CELL_SIZE / 2, 6);
    gfx.fill({ color: borderColor, alpha: 0.25 });
    gfx.stroke({ color: borderColor, width: 1, alpha: 0.6 });

    container.addChild(gfx);

    // Centered bold Ω glyph
    const txt = new Text({
      text: 'Ω',
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: 15,
        fontWeight: 'bold',
        fill: tile.color || '#ffd700',
        align: 'center'
      }
    });
    txt.anchor.set(0.5, 0.5);
    txt.x = CELL_SIZE / 2;
    txt.y = CELL_SIZE / 2;
    container.addChild(txt);

    return container;
  }

  private createPathTile(x: number, y: number, tile: Tile, _zone: ZoneData): Container {
    const container = new Container();
    container.x = x * CELL_SIZE;
    container.y = y * CELL_SIZE;

    const gfx = new Graphics();
    // Flat earthy base floor (rich dark loam)
    gfx.rect(0, 0, CELL_SIZE, CELL_SIZE);
    gfx.fill({ color: 0x16110b });

    // Inner beaten path dirt fill
    gfx.rect(1, 1, CELL_SIZE - 2, CELL_SIZE - 2);
    gfx.fill({ color: 0x221a10, alpha: 0.8 });

    // Subtle organic dirt / pebble grain speckles
    const hash = ((x * 49287) ^ (y * 71523)) + 0x27d4eb2d;
    const px1 = (Math.abs(hash) % (CELL_SIZE - 4)) + 2;
    const py1 = (Math.abs(hash >> 3) % (CELL_SIZE - 4)) + 2;
    const px2 = (Math.abs(hash >> 7) % (CELL_SIZE - 4)) + 2;
    const py2 = (Math.abs(hash >> 11) % (CELL_SIZE - 4)) + 2;

    gfx.rect(px1, py1, 2, 2);
    gfx.fill({ color: 0x3d2b1f, alpha: 0.75 });
    gfx.rect(px2, py2, 1, 1);
    gfx.fill({ color: 0x4e3828, alpha: 0.85 });

    container.addChild(gfx);

    // Soft CP437 light shade glyph '░' or stipple centered on the tile
    const txt = new Text({
      text: tile.char === '░' ? '░' : (tile.char || '░'),
      style: {
        fontFamily: 'Courier New, monospace',
        fontSize: CELL_SIZE - 4,
        fontWeight: 'normal',
        fill: 0x9a7852,
        align: 'center'
      }
    });
    txt.alpha = 0.6;
    txt.x = 2;
    txt.y = 2;
    container.addChild(txt);

    return container;
  }

  private createTileDisplay(x: number, y: number, tile: Tile, zone: ZoneData): Sprite | Text | Graphics | Container {
    // 1. Continuous Wall autotiling
    if (tile.type === 'wall' || tile.type === 'breakable_wall') {
      return this.createWallTile(x, y, tile, zone);
    }

    // 2. Sacred Altar Pedestals
    if (tile.type === 'altar') {
      return this.createAltarTile(x, y, tile, zone);
    }

    // 3. Flat Walkable Dirt Trails / Paths
    if (tile.type === 'floor' && (tile.char === '░' || tile.color === COLORS.dirtPath || tile.color === '#9a7852')) {
      return this.createPathTile(x, y, tile, zone);
    }

    // 4. Preloaded sprite or font glyph fallback
    const spriteUrl = this.getSpriteUrlForTile(tile, zone);
    const tex = spriteUrl ? this.getTexture(spriteUrl) : null;
    if (tex) {
      const spr = new Sprite(tex);
      spr.width = CELL_SIZE;
      spr.height = CELL_SIZE;
      spr.x = x * CELL_SIZE;
      spr.y = y * CELL_SIZE;
      return spr;
    } else {
      const txt = new Text({
        text: tile.char,
        style: {
          fontFamily: 'Courier New, monospace',
          fontSize: CELL_SIZE - 2,
          fontWeight: 'bold',
          align: 'center',
          fill: tile.color
        }
      });
      txt.x = x * CELL_SIZE + 2;
      txt.y = y * CELL_SIZE + 2;
      return txt;
    }
  }

  public updateTile(x: number, y: number, tile: Tile, zone: ZoneData) {
    if (!this.tileSprites[y]) return;
    const oldDisplay = this.tileSprites[y][x];
    if (oldDisplay) {
      this.mapContainer.removeChild(oldDisplay);
      if ('destroy' in oldDisplay) {
        (oldDisplay as any).destroy({ children: true });
      }
    }
    const newDisplay = this.createTileDisplay(x, y, tile, zone);
    this.mapContainer.addChild(newDisplay);
    this.tileSprites[y][x] = newDisplay;

    // If a wall was cleared to floor, re-render cardinal neighboring walls to update autotiling rims
    if (tile.type === 'floor') {
      for (const [adx, ady] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = x + adx;
        const ny = y + ady;
        const neighbor = zone.tiles[ny]?.[nx];
        if (neighbor && (neighbor.type === 'wall' || neighbor.type === 'breakable_wall')) {
          const oldGfx = this.tileSprites[ny]?.[nx];
          if (oldGfx) {
            this.mapContainer.removeChild(oldGfx);
            if ('destroy' in oldGfx) {
              (oldGfx as any).destroy({ children: true });
            }
          }
          const updatedWall = this.createWallTile(nx, ny, neighbor, zone);
          this.mapContainer.addChild(updatedWall);
          this.tileSprites[ny][nx] = updatedWall;
        }
      }
    }
  }

  public setZone(zone: ZoneData) {
    this.currentZone = zone;
    this.mapContainer.removeChildren();
    this.itemContainer.removeChildren();
    this.entityContainer.removeChildren();
    this.projectileContainer.removeChildren();
    this.textContainer.removeChildren();
    this.tileSprites = [];

    for (let y = 0; y < zone.height; y++) {
      const row: (Sprite | Text | Graphics | Container)[] = [];
      for (let x = 0; x < zone.width; x++) {
        const tile = zone.tiles[y][x];
        const display = this.createTileDisplay(x, y, tile, zone);
        this.mapContainer.addChild(display);
        row.push(display);
      }
      this.tileSprites.push(row);
    }
  }

  private isSameZoneCoord(a: ZoneCoord, b: ZoneCoord): boolean {
    return (
      a.parasangX === b.parasangX &&
      a.parasangY === b.parasangY &&
      a.zoneX === b.zoneX &&
      a.zoneY === b.zoneY &&
      a.depth === b.depth
    );
  }

  public renderFrame(
    zone: ZoneData,
    entities: Entity[],
    projectiles: Projectile[],
    floatingTexts: FloatingText[],
    playerEntity?: Entity
  ) {
    if (!this.currentZone || !this.isSameZoneCoord(this.currentZone.coord, zone.coord)) {
      this.setZone(zone);
    }

    // Compute FOV: Surface has ambient daylight; subterranean depths have torch FOV
    let fov: boolean[][] | null = null;
    if (playerEntity) {
      if (zone.coord.depth > 0) {
        fov = computeFOV(playerEntity.x, playerEntity.y, 10, zone.tiles, zone.width, zone.height);
      } else {
        fov = null; // Full daylight on surface!
      }
    }

    // 1. Update Map Tile FOV & lighting
    for (let y = 0; y < zone.height; y++) {
      for (let x = 0; x < zone.width; x++) {
        let sprite = this.tileSprites[y]?.[x];
        if (sprite) {
          const tile = zone.tiles[y][x];

          // If a wall was mined into floor, dynamically replace its sprite
          if (tile.type === 'floor' && !(sprite instanceof Text) && !(sprite instanceof Sprite)) {
            this.updateTile(x, y, tile, zone);
            sprite = this.tileSprites[y][x];
          }

          if ('text' in sprite) {
            sprite.text = tile.char;
            sprite.style.fill = tile.color;
          }
          const isVisible = fov ? fov[y][x] : true;

          if (isVisible) {
            sprite.alpha = 1.0;
            sprite.tint = 0xffffff;
          } else {
            // Ambient twilight for out-of-sight explored terrain
            sprite.alpha = 0.45;
            sprite.tint = 0x8899aa;
          }
        }
      }
    }

    // 2. Render Items
    this.itemContainer.removeChildren();
    const itemsByTile = new Map<string, typeof zone.items>();
    for (const itemEntry of zone.items) {
      const key = `${itemEntry.x},${itemEntry.y}`;
      if (!itemsByTile.has(key)) itemsByTile.set(key, []);
      itemsByTile.get(key)!.push(itemEntry);
    }

    for (const pile of itemsByTile.values()) {
      const topItem = pile[pile.length - 1];
      const isVisible = fov ? fov[topItem.y][topItem.x] : true;
      if (!isVisible) continue;

      // Render glowing aura if any rune is in the pile
      const rune = pile.find(p => p.item.type === 'rune');
      if (rune) {
        const aura = new Graphics();
        let auraCol = 0xffd700;
        if (rune.item.color) {
          const hex = rune.item.color.replace('#', '');
          auraCol = parseInt(hex, 16) || 0xffd700;
        }
        aura.circle(topItem.x * CELL_SIZE + CELL_SIZE / 2, topItem.y * CELL_SIZE + CELL_SIZE / 2, 8);
        aura.fill({ color: auraCol, alpha: 0.35 });
        aura.stroke({ color: auraCol, width: 1.5, alpha: 0.85 });
        this.itemContainer.addChild(aura);
      }

      const spriteUrl = this.getSpriteUrlForItem(topItem.item);
      const tex = spriteUrl ? this.getTexture(spriteUrl) : null;
      if (tex) {
        const spr = new Sprite(tex);
        spr.width = CELL_SIZE;
        spr.height = CELL_SIZE;
        spr.x = topItem.x * CELL_SIZE;
        spr.y = topItem.y * CELL_SIZE;
        this.itemContainer.addChild(spr);
      } else {
        const itTxt = new Text({
          text: topItem.item.symbol,
          style: {
            fontFamily: 'Courier New, monospace',
            fontSize: CELL_SIZE - 2,
            fontWeight: 'bold',
            fill: topItem.item.color
          }
        });
        itTxt.x = topItem.x * CELL_SIZE + 2;
        itTxt.y = topItem.y * CELL_SIZE + 2;
        this.itemContainer.addChild(itTxt);
      }

      // Multi-item indicator badge if > 1 item on this tile
      if (pile.length > 1) {
        const badgeBg = new Graphics();
        const bx = topItem.x * CELL_SIZE + CELL_SIZE - 7;
        const by = topItem.y * CELL_SIZE;
        badgeBg.roundRect(bx - 3, by, 10, 8, 2);
        badgeBg.fill({ color: 0x090e14, alpha: 0.85 });
        badgeBg.stroke({ color: 0x00ffff, width: 1 });
        this.itemContainer.addChild(badgeBg);

        const badgeTxt = new Text({
          text: `${pile.length}`,
          style: {
            fontFamily: 'Courier New, monospace',
            fontSize: 7,
            fontWeight: 'bold',
            fill: 0x00ffff
          }
        });
        badgeTxt.x = bx - 1;
        badgeTxt.y = by - 1;
        this.itemContainer.addChild(badgeTxt);
      }
    }

    // 3. Render Entities
    this.entityContainer.removeChildren();
    for (const entity of entities) {
      const isVisible = fov ? fov[entity.y][entity.x] : true;
      if (!isVisible && !entity.isGhost) continue; // Ghosts might be faintly seen or hidden

      const entContainer = new Container();
      entContainer.x = entity.x * CELL_SIZE;
      entContainer.y = entity.y * CELL_SIZE;

      const spriteUrl = this.getSpriteUrlForEntity(entity);
      const tex = spriteUrl ? this.getTexture(spriteUrl) : null;
      if (tex) {
        const spr = new Sprite(tex);
        spr.width = CELL_SIZE;
        spr.height = CELL_SIZE;

        if (entity.isDowned) {
          spr.anchor.set(0.5, 0.5);
          spr.x = CELL_SIZE / 2;
          spr.y = CELL_SIZE / 2;
          spr.rotation = Math.PI / 2; // Fallen on ground!
          spr.tint = 0xff6666;
        } else if (entity.statusEffects.frozen) {
          spr.tint = 0x88ddff;
        }

        entContainer.addChild(spr);

        if (entity.isDowned) {
          const crossTxt = new Text({
            text: '✝',
            style: {
              fontFamily: 'Courier New, monospace',
              fontSize: 16,
              fontWeight: 'bold',
              fill: 0xff3333
            }
          });
          crossTxt.x = CELL_SIZE / 2 - 5;
          crossTxt.y = -12;
          entContainer.addChild(crossTxt);
        }
      } else {
        let symbolColor = entity.color;
        let symbolChar = entity.symbol;
        if (entity.isDowned) {
          symbolColor = COLORS.fireRed;
          symbolChar = '✝';
        } else if (entity.statusEffects.frozen) {
          symbolColor = COLORS.cyan;
        }

        const entTxt = new Text({
          text: symbolChar,
          style: {
            fontFamily: 'Courier New, monospace',
            fontSize: CELL_SIZE,
            fontWeight: 'bold',
            fill: symbolColor
          }
        });
        entTxt.x = 2;
        entTxt.y = 2;
        entContainer.addChild(entTxt);
      }

      // Frozen Ice Block Overlay
      if (entity.statusEffects.frozen) {
        const iceBox = new Graphics();
        iceBox.rect(0, 0, CELL_SIZE, CELL_SIZE);
        iceBox.stroke({ color: 0x00ffff, width: 2, alpha: 0.8 });
        iceBox.fill({ color: 0x00ffff, alpha: 0.25 });
        entContainer.addChild(iceBox);
      }

      // Energy Shield matrix visual (sleek sci-fi corner brackets + shield mini-bar)
      if (entity.hasShield && entity.shieldHp && entity.shieldHp > 0) {
        const shieldGfx = new Graphics();
        const cornerLen = 5;
        shieldGfx.stroke({ color: 0x00e5ff, width: 1.5, alpha: 0.85 });
        // Top-left bracket
        shieldGfx.moveTo(1, 1 + cornerLen).lineTo(1, 1).lineTo(1 + cornerLen, 1);
        // Top-right bracket
        shieldGfx.moveTo(CELL_SIZE - 1 - cornerLen, 1).lineTo(CELL_SIZE - 1, 1).lineTo(CELL_SIZE - 1, 1 + cornerLen);
        // Bottom-left bracket
        shieldGfx.moveTo(1, CELL_SIZE - 1 - cornerLen).lineTo(1, CELL_SIZE - 1).lineTo(1 + cornerLen, CELL_SIZE - 1);
        // Bottom-right bracket
        shieldGfx.moveTo(CELL_SIZE - 1 - cornerLen, CELL_SIZE - 1).lineTo(CELL_SIZE - 1, CELL_SIZE - 1).lineTo(CELL_SIZE - 1, CELL_SIZE - 1 - cornerLen);
        shieldGfx.stroke();
        entContainer.addChild(shieldGfx);

        // Shield mini-bar right above health bar
        const shieldBar = new Graphics();
        const barWidth = CELL_SIZE;
        const maxShield = 120;
        const shieldPct = Math.min(1, Math.max(0, entity.shieldHp / maxShield));
        shieldBar.rect(0, -8, barWidth, 2);
        shieldBar.fill({ color: 0x003344 });
        shieldBar.rect(0, -8, barWidth * shieldPct, 2);
        shieldBar.fill({ color: 0x00ffff });
        entContainer.addChild(shieldBar);
      }

      // Health bar above entity
      if (!entity.isDowned && entity.hp < entity.maxHp) {
        const hpBar = new Graphics();
        const barWidth = CELL_SIZE;
        const hpPct = Math.max(0, entity.hp / entity.maxHp);
        hpBar.rect(0, -4, barWidth, 3);
        hpBar.fill({ color: 0x330000 });
        hpBar.rect(0, -4, barWidth * hpPct, 3);
        hpBar.fill({ color: entity.isPlayer ? 0x55ff55 : 0xff4422 });
        entContainer.addChild(hpBar);
      }

      this.entityContainer.addChild(entContainer);
    }

    // 4. Render Projectiles
    this.projectileContainer.removeChildren();
    for (const proj of projectiles) {
      const projTxt = new Text({
        text: proj.symbol,
        style: {
          fontFamily: 'Courier New, monospace',
          fontSize: CELL_SIZE,
          fontWeight: 'bold',
          fill: proj.color
        }
      });
      projTxt.x = proj.targetX * CELL_SIZE + 2;
      projTxt.y = proj.targetY * CELL_SIZE + 2;
      this.projectileContainer.addChild(projTxt);
    }

    // 5. Add any new floating texts
    for (const ft of floatingTexts) {
      const ftTxt = new Text({
        text: ft.text,
        style: {
          fontFamily: 'Courier New, monospace',
          fontSize: 14,
          fontWeight: 'bold',
          fill: ft.color,
          stroke: { color: 0x000000, width: 3 }
        }
      });
      ftTxt.x = ft.x * CELL_SIZE;
      ftTxt.y = ft.y * CELL_SIZE - 10;
      this.textContainer.addChild(ftTxt);
    }
  }
}
