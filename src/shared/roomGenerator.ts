// Caves of Qud / post-apocalyptic wasteland themed 5-word room name generator

export const ADJECTIVES_1 = [
  'ancient', 'amber', 'azure', 'blazing', 'brave', 'bronze', 'chrome', 'cobalt',
  'copper', 'crimson', 'crystal', 'cyber', 'distant', 'dusk', 'echoing', 'electric',
  'fading', 'feral', 'forgotten', 'frozen', 'gilded', 'glowing', 'golden', 'hidden',
  'hollow', 'iron', 'lunar', 'mystic', 'noble', 'obsidian', 'phantom', 'plasma',
  'prismatic', 'quantum', 'radiant', 'relic', 'rust', 'sacred', 'savage', 'shadow',
  'shattered', 'silent', 'silver', 'solar', 'spectral', 'stellar', 'sunken', 'swift',
  'verdant', 'vibrant', 'wild'
];

export const ELEMENTS_2 = [
  'ash', 'basalt', 'bone', 'bramble', 'brass', 'clay', 'coal', 'copper',
  'dust', 'ember', 'flint', 'fossil', 'frost', 'fungus', 'glass', 'granite',
  'gravel', 'iron', 'jade', 'lichen', 'loam', 'magma', 'metal', 'mineral',
  'moss', 'mud', 'obsidian', 'ore', 'peat', 'pebble', 'petrol', 'quartz',
  'relic', 'resin', 'rock', 'root', 'rust', 'salt', 'sand', 'scrap',
  'shale', 'silt', 'spore', 'steel', 'stone', 'tar', 'thorn', 'vine'
];

export const QUALITIES_3 = [
  'bold', 'bound', 'calm', 'cold', 'deep', 'dim', 'drifting', 'endless',
  'fierce', 'fleet', 'free', 'fresh', 'grand', 'great', 'green', 'grim',
  'harsh', 'heavy', 'keen', 'lone', 'long', 'lost', 'lucent', 'mute',
  'pale', 'prime', 'pure', 'quick', 'quiet', 'rare', 'red', 'rough',
  'sharp', 'shining', 'slow', 'stark', 'steady', 'still', 'stout', 'strong',
  'true', 'vast', 'vivid', 'wandering', 'warm', 'wild', 'wise'
];

export const SITES_4 = [
  'abyss', 'basin', 'bastion', 'bayou', 'canyon', 'cavern', 'chasm', 'citadel',
  'cliff', 'crag', 'crater', 'creek', 'delta', 'dune', 'fissure', 'forest',
  'forge', 'gorge', 'grove', 'haven', 'hollow', 'knoll', 'marsh', 'meadow',
  'mesa', 'mine', 'monolith', 'oasis', 'outpost', 'passage', 'pass', 'peak',
  'plateau', 'quarry', 'ravine', 'refuge', 'ridge', 'rift', 'river', 'ruin',
  'sanctuary', 'sanctum', 'spire', 'steppe', 'swamp', 'vault', 'valley'
];

export const BEINGS_5 = [
  'automaton', 'badger', 'baetyl', 'beacon', 'beast', 'beetle', 'blade', 'caravan',
  'cipher', 'drifter', 'drone', 'druid', 'falcon', 'finder', 'ghost', 'golem',
  'guard', 'guide', 'herald', 'hermit', 'hound', 'hunter', 'keeper', 'knight',
  'miner', 'monk', 'nomad', 'oracle', 'pilgrim', 'prowler', 'ranger', 'raven',
  'relic', 'rider', 'sage', 'scavenger', 'scout', 'seeker', 'sentry', 'serpent',
  'shadow', 'sigil', 'spark', 'specter', 'spider', 'spirit', 'strider', 'titan',
  'warden', 'watcher', 'wraith'
];

/**
 * Generates a random room name composed of exactly 5 words hyphenated together.
 * Example: 'ancient-spore-lone-cavern-nomad'
 */
export function generateRandomRoomName(): string {
  const pick = (list: string[]) => list[Math.floor(Math.random() * list.length)];
  return `${pick(ADJECTIVES_1)}-${pick(ELEMENTS_2)}-${pick(QUALITIES_3)}-${pick(SITES_4)}-${pick(BEINGS_5)}`;
}

/**
 * Validates whether a room name is composed of 5 hyphen-separated alphanumeric words.
 */
export function isValidRoomName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const parts = name.trim().toLowerCase().split('-');
  return parts.length === 5 && parts.every(p => /^[a-z0-9]+$/.test(p));
}

/**
 * Normalizes a raw room string (e.g. trims, converts spaces to hyphens, cleans characters).
 */
export function sanitizeRoomName(name: string): string {
  if (!name) return generateRandomRoomName();
  const cleaned = name.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return cleaned || generateRandomRoomName();
}
