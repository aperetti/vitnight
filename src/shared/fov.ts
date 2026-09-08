import { Tile } from './types';

export function computeFOV(
  originX: number,
  originY: number,
  radius: number,
  tiles: Tile[][],
  width: number,
  height: number
): boolean[][] {
  const visible: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  if (originX < 0 || originX >= width || originY < 0 || originY >= height) {
    return visible;
  }

  visible[originY][originX] = true;

  // Simple and robust raycasting for roguelike FOV (360 degrees, sub-cell steps)
  const numRays = 360;
  for (let i = 0; i < numRays; i++) {
    const angle = (i * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);

    for (let r = 1; r <= radius; r += 0.5) {
      const cx = Math.round(originX + cos * r);
      const cy = Math.round(originY + sin * r);

      if (cx < 0 || cx >= width || cy < 0 || cy >= height) {
        break;
      }

      visible[cy][cx] = true;

      const tile = tiles[cy][cx];
      if (tile && !tile.transparent) {
        break; // Light is blocked by opaque tile (wall, door, etc.)
      }
    }
  }

  return visible;
}
