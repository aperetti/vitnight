import { describe, it, expect } from 'vitest';
import { generateZone } from '../src/server/mapGen';
import { ZONE_WIDTH, ZONE_HEIGHT } from '../src/shared/constants';

describe('Map Generation for Parasangs & Zones', () => {
  it('generates spawn house with crafting materials and workbench', () => {
    const spawnZone = generateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 0 });
    expect(spawnZone.width).toBe(ZONE_WIDTH);
    expect(spawnZone.height).toBe(ZONE_HEIGHT);

    // Workbench exists
    const hasWorkbench = spawnZone.tiles.some(row => row.some(t => t.type === 'workbench'));
    expect(hasWorkbench).toBe(true);

    // Scrap and crystals exist
    const hasScrap = spawnZone.items.some(it => it.item.id.startsWith('scrap'));
    const hasCrystal = spawnZone.items.some(it => it.item.id.startsWith('crystal'));
    expect(hasScrap).toBe(true);
    expect(hasCrystal).toBe(true);
  });

  it('generates Whitehill Mines with minable breakable walls and the ancient key', () => {
    const mines = generateZone({ parasangX: 0, parasangY: 0, zoneX: 0, zoneY: 0, depth: 1 });
    const hasMinableWall = mines.tiles.some(row => row.some(t => t.minable));
    expect(hasMinableWall).toBe(true);

    const hasKey = mines.items.some(it => it.item.id === 'whitehill-key');
    expect(hasKey).toBe(true);
  });

  it('generates Water Mountain with 6 rainbow pom-poms and rainbow altar pedestals', () => {
    const mountain = generateZone({ parasangX: 0, parasangY: 0, zoneX: 1, zoneY: 1, depth: 0 });

    const pomPoms = mountain.items.filter(it => it.item.type === 'puzzle_piece');
    expect(pomPoms.length).toBe(6);

    const pedestals = mountain.tiles.flatMap(row => row.filter(t => t.type === 'altar' && t.pedestalColor));
    expect(pedestals.length).toBe(6);

    const hasVictorySwitch = mountain.tiles.some(row => row.some(t => t.type === 'victory_switch'));
    expect(hasVictorySwitch).toBe(true);
  });

  it('generates Power Down with lightsabers', () => {
    const powerDown = generateZone({ parasangX: 1, parasangY: 0, zoneX: 2, zoneY: 0, depth: 0 });
    const sabers = powerDown.items.filter(it => it.item.type === 'weapon' && it.item.id.startsWith('saber'));
    expect(sabers.length).toBe(3);
  });
});
