import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { generateRandomRoomName, isValidRoomName, sanitizeRoomName } from '../src/shared/roomGenerator';
import { saveRoom, loadRoom, hasSavedRoom, deleteRoomSave, setCustomSaveDirectory } from '../src/server/storage';
import { GameEngine } from '../src/server/engine';
import { GameRoom } from '../src/server/room';
import { createItem } from '../src/server/items';

describe('Room Persistence, 5-Word Random Room Strings, and URL Accessibility', () => {
  const TEST_SAVES_DIR = path.resolve(process.cwd(), 'data/test-saves');

  beforeEach(() => {
    setCustomSaveDirectory(TEST_SAVES_DIR);
    if (!fs.existsSync(TEST_SAVES_DIR)) {
      fs.mkdirSync(TEST_SAVES_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_SAVES_DIR)) {
      fs.rmSync(TEST_SAVES_DIR, { recursive: true, force: true });
    }
    setCustomSaveDirectory(null);
  });

  describe('5-Word Hyphenated Random Room Generator', () => {
    it('generates a 5-word hyphenated room string every time', () => {
      for (let i = 0; i < 25; i++) {
        const roomName = generateRandomRoomName();
        expect(typeof roomName).toBe('string');
        const parts = roomName.split('-');
        expect(parts.length).toBe(5);
        for (const part of parts) {
          expect(part.length).toBeGreaterThan(1);
          expect(/^[a-z]+$/.test(part)).toBe(true);
        }
      }
    });

    it('generates high-entropy unique room names', () => {
      const generated = new Set<string>();
      for (let i = 0; i < 50; i++) {
        generated.add(generateRandomRoomName());
      }
      // Out of 50 samples from hundreds of millions of combinations, all should be distinct
      expect(generated.size).toBe(50);
    });

    it('validates 5-word hyphenated room names correctly', () => {
      expect(isValidRoomName('ancient-spore-lone-cavern-nomad')).toBe(true);
      expect(isValidRoomName('cyber-scrap-swift-mesa-seeker')).toBe(true);
      expect(isValidRoomName('four-words-not-enough')).toBe(false);
      expect(isValidRoomName('six-words-are-way-too-many-here')).toBe(false);
      expect(isValidRoomName('invalid character-in-this-room-name')).toBe(false);
      expect(isValidRoomName('')).toBe(false);
    });

    it('sanitizes user input into valid hyphenated room strings', () => {
      expect(sanitizeRoomName('My Epic Room 123')).toBe('my-epic-room-123');
      expect(sanitizeRoomName('COOPER-PARTY-ZONE-SPECIAL-RUN')).toBe('cooper-party-zone-special-run');
      expect(sanitizeRoomName('   dirty---spaces  ')).toBe('dirty-spaces');
    });
  });

  describe('Storage & File Persistence Module', () => {
    it('saves and loads room snapshot data accurately', () => {
      const roomId = 'ancient-spore-lone-cavern-nomad';
      const fakeSaveData = {
        version: 1,
        roomId,
        savedAt: Date.now(),
        story: { stage: 'WATER_MOUNTAIN_PUZZLE', questTitle: 'Water Mountain Quest', questDesc: 'Test desc', rainbowPiecesPlaced: ['red', 'blue'] },
        entities: [],
        zones: [],
        combatLogs: [{ id: '1', timestamp: Date.now(), text: 'Test log', color: '#fff', category: 'combat' as const }]
      };

      expect(hasSavedRoom(roomId)).toBe(false);

      const savedOk = saveRoom(roomId, fakeSaveData as any);
      expect(savedOk).toBe(true);
      expect(hasSavedRoom(roomId)).toBe(true);

      const loaded = loadRoom(roomId);
      expect(loaded).not.toBeNull();
      expect(loaded?.roomId).toBe(roomId);
      expect(loaded?.story.stage).toBe('WATER_MOUNTAIN_PUZZLE');
      expect(loaded?.story.rainbowPiecesPlaced).toEqual(['red', 'blue']);

      const deleted = deleteRoomSave(roomId);
      expect(deleted).toBe(true);
      expect(hasSavedRoom(roomId)).toBe(false);
    });

    it('returns null for non-existent room saves', () => {
      expect(loadRoom('non-existent-room-never-saved')).toBeNull();
    });
  });

  describe('GameEngine State Serialization and Restoration', () => {
    it('serializes and restores full game progress including story, entities, and mined zones', () => {
      const originalEngine = new GameEngine();
      const roomId = 'cyber-scrap-swift-mesa-seeker';

      // 1. Advance story state
      originalEngine.story.stage = 'WATER_MOUNTAIN_PUZZLE';
      originalEngine.story.questTitle = 'Solve the Rainbow Altar';
      originalEngine.story.laserCrafted = true;
      originalEngine.story.rainbowPiecesPlaced = ['red', 'orange', 'yellow'];

      // 2. Modify Barrett entity (level, XP, attributes, inventory)
      const barrett = originalEngine.entities.get('hero-barrett')!;
      barrett.level = 4;
      barrett.xp = 350;
      barrett.attributePoints = 3;
      barrett.skillPoints = 2;
      barrett.attributes = { ...barrett.attributes!, str: 22, vit: 18 };
      barrett.inventory.push(createItem('plasma_drill'));

      // 3. Alter zone terrain (mine through a wall at (8, 6) in the spawn house)
      const spawnCoord = { parasangX: 2, parasangY: 2, zoneX: 0, zoneY: 0, depth: 0 };
      const zone = originalEngine.getOrCreateZone(spawnCoord);
      zone.tiles[6][8] = {
        type: 'floor',
        char: '.',
        color: '#555555',
        walkable: true,
        transparent: true
      };
      // Drop an item in the zone
      zone.items.push({ x: 8, y: 6, item: createItem('copper_ore') });

      // Serialize state
      const serialized = originalEngine.serializeState(roomId);
      expect(serialized.roomId).toBe(roomId);
      expect(serialized.story.stage).toBe('WATER_MOUNTAIN_PUZZLE');
      expect(serialized.story.laserCrafted).toBe(true);

      // Save to disk
      saveRoom(roomId, serialized);
      expect(hasSavedRoom(roomId)).toBe(true);

      // Create a fresh GameEngine with initial default state
      const freshEngine = new GameEngine();
      expect(freshEngine.story.stage).toBe('SPAWN');
      expect(freshEngine.story.laserCrafted).toBe(false);
      expect(freshEngine.entities.get('hero-barrett')!.level).toBe(1);

      // Load saved state into freshEngine
      const loadOk = freshEngine.loadState(serialized);
      expect(loadOk).toBe(true);

      // Verify restored story progress
      expect(freshEngine.story.stage).toBe('WATER_MOUNTAIN_PUZZLE');
      expect(freshEngine.story.questTitle).toBe('Solve the Rainbow Altar');
      expect(freshEngine.story.laserCrafted).toBe(true);
      expect(freshEngine.story.rainbowPiecesPlaced).toEqual(['red', 'orange', 'yellow']);

      // Verify restored hero stats and inventory
      const restoredBarrett = freshEngine.entities.get('hero-barrett')!;
      expect(restoredBarrett.level).toBe(4);
      expect(restoredBarrett.xp).toBe(350);
      expect(restoredBarrett.attributePoints).toBe(3);
      expect(restoredBarrett.skillPoints).toBe(2);
      expect(restoredBarrett.attributes?.str).toBe(22);
      expect(restoredBarrett.attributes?.vit).toBe(18);
      expect(restoredBarrett.inventory.some(it => it.id.includes('plasma_drill'))).toBe(true);

      // Verify restored zone terrain (excavated wall and dropped items)
      const restoredZone = freshEngine.getOrCreateZone(spawnCoord);
      expect(restoredZone.tiles[6][8].walkable).toBe(true);
      expect(restoredZone.tiles[6][8].type).toBe('floor');
      expect(restoredZone.items.some(it => it.x === 8 && it.y === 6 && it.item.id.includes('copper_ore'))).toBe(true);
    });
  });

  describe('GameRoom Automatic Save and Restore Lifecycle', () => {
    it('automatically restores saved room state on creation and saves when state changes', () => {
      const roomId = 'rust-ember-quiet-gorge-baetyl';

      // 1. Pre-populate a saved room file
      const initialEngine = new GameEngine();
      initialEngine.story.stage = 'ZOMBIE_CREEK';
      initialEngine.story.zombieCreekCleared = true;
      const initialBarrett = initialEngine.entities.get('hero-barrett')!;
      initialBarrett.level = 2;
      saveRoom(roomId, initialEngine.serializeState(roomId));

      // 2. Create GameRoom with this roomId
      const room = new GameRoom(roomId);

      // Verify GameRoom restored state automatically
      expect(room.engine.story.stage).toBe('ZOMBIE_CREEK');
      expect(room.engine.story.zombieCreekCleared).toBe(true);
      expect(room.engine.entities.get('hero-barrett')!.level).toBe(2);

      // 3. Make progress in the room
      room.engine.story.stage = 'WATER_MOUNTAIN_PUZZLE';
      room.saveNow();

      // Verify saved file on disk was updated
      const reloadedSave = loadRoom(roomId);
      expect(reloadedSave?.story.stage).toBe('WATER_MOUNTAIN_PUZZLE');

      room.destroy();
    });
  });
});
