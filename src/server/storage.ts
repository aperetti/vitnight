import fs from 'fs';
import path from 'path';
import { Entity, ZoneData, CombatLogEntry } from '../shared/types';
import { sanitizeRoomName } from '../shared/roomGenerator';

export interface RoomSaveData {
  version: number;
  roomId: string;
  savedAt: number;
  story: any;
  entities: [string, Entity][];
  zones: [string, ZoneData][];
  combatLogs: CombatLogEntry[];
  tickRate?: number;
  turnCount?: number;
}

let customSaveDir: string | null = null;

export function setCustomSaveDirectory(dir: string | null) {
  customSaveDir = dir;
}

export function getSaveDirectory(): string {
  if (customSaveDir) {
    if (!fs.existsSync(customSaveDir)) {
      fs.mkdirSync(customSaveDir, { recursive: true });
    }
    return customSaveDir;
  }

  const baseDir = process.env.SAVES_DIR || path.resolve(process.cwd(), 'data/saves');
  if (!fs.existsSync(baseDir)) {
    fs.mkdirSync(baseDir, { recursive: true });
  }
  return baseDir;
}

export function getRoomSavePath(roomId: string): string {
  const safeId = sanitizeRoomName(roomId);
  return path.join(getSaveDirectory(), `${safeId}.json`);
}

/**
 * Saves a room's snapshot safely to disk.
 */
export function saveRoom(roomId: string, data: RoomSaveData): boolean {
  try {
    const savePath = getRoomSavePath(roomId);
    const tempPath = `${savePath}.tmp`;
    const json = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempPath, json, 'utf-8');
    fs.renameSync(tempPath, savePath);
    return true;
  } catch (err) {
    console.error(`[Storage] Error saving room [${roomId}]:`, err);
    return false;
  }
}

/**
 * Loads a saved room snapshot from disk if it exists.
 */
export function loadRoom(roomId: string): RoomSaveData | null {
  try {
    const savePath = getRoomSavePath(roomId);
    if (!fs.existsSync(savePath)) {
      return null;
    }
    const raw = fs.readFileSync(savePath, 'utf-8');
    const data: RoomSaveData = JSON.parse(raw);
    return data;
  } catch (err) {
    console.error(`[Storage] Error loading room [${roomId}]:`, err);
    return null;
  }
}

/**
 * Checks if a room has saved state on disk.
 */
export function hasSavedRoom(roomId: string): boolean {
  try {
    const savePath = getRoomSavePath(roomId);
    return fs.existsSync(savePath);
  } catch {
    return false;
  }
}

/**
 * Deletes a room's save file from disk.
 */
export function deleteRoomSave(roomId: string): boolean {
  try {
    const savePath = getRoomSavePath(roomId);
    if (fs.existsSync(savePath)) {
      fs.unlinkSync(savePath);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[Storage] Error deleting save for [${roomId}]:`, err);
    return false;
  }
}

/**
 * Lists all room IDs that currently have saved files.
 */
export function listSavedRooms(): string[] {
  try {
    const dir = getSaveDirectory();
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace(/\.json$/, ''));
  } catch (err) {
    console.error(`[Storage] Error listing saved rooms:`, err);
    return [];
  }
}
