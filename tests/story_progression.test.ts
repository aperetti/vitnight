import { describe, it, expect } from 'vitest';
import { StoryManager } from '../src/server/story';

describe('Story Progression & Dialogue Machine', () => {
  it('initializes at SPAWN with Barrett crafting quest', () => {
    const story = new StoryManager();
    expect(story.stage).toBe('SPAWN');
    expect(story.questTitle).toContain('The Adventure Begins');
    const dlg = story.getDialogueForStage('SPAWN');
    expect(dlg).toBeDefined();
    expect(dlg?.speaker).toContain('Barrett');
    expect(dlg?.text).toContain('laser rifle');
  });

  it('advances through Whitehill Mines, Zombie Creek, and Water Mountain', () => {
    const story = new StoryManager();

    const mines = story.advanceStage('WHITEHILL_MINES');
    expect(mines.questTitle).toContain('Whitehill Mines');
    expect(mines.dialogue?.speaker).toContain('Luther');

    const creek = story.advanceStage('ZOMBIE_CREEK');
    expect(creek.questTitle).toContain('Zombie Creek');
    expect(creek.dialogue?.text).toContain('freeze');

    const mountain = story.advanceStage('WATER_MOUNTAIN_PUZZLE');
    expect(mountain.questTitle).toContain('Water Mountain');
    expect(mountain.dialogue?.text).toContain('pom-poms');
  });

  it('handles the Homestead battles and Mutant Skeleton double revive', () => {
    const story = new StoryManager();

    story.advanceStage('SKELETON_HOMESTEAD');
    expect(story.stage).toBe('SKELETON_HOMESTEAD');

    const mutantSkel = story.advanceStage('MUTANT_SKELETON');
    expect(mutantSkel.dialogue?.text).toContain('revive you both');

    const creeper = story.advanceStage('CREEPER_HOMESTEAD');
    expect(creeper.dialogue?.text).toContain('flying across the fortress');

    const mutantCreeper = story.advanceStage('MUTANT_CREEPER');
    expect(mutantCreeper.dialogue?.text).toContain('energy shield');
  });

  it('handles Power Down, Rocky Doom 100 swarm, slap wipe, and the Cooper birthday finale', () => {
    const story = new StoryManager();

    story.advanceStage('POWER_DOWN');
    expect(story.questTitle).toContain('Power Down');

    const swarm = story.advanceStage('ROCKY_DOOM_SWARM');
    expect(swarm.dialogue?.text).toContain('100 giant rock mini-bosses');

    const slap = story.advanceStage('ROCKY_DOOM_SLAP');
    expect(slap.dialogue?.speaker).toContain('Rock King');

    const dualBoss = story.advanceStage('ROCKY_DOOM_DUAL_BOSS');
    expect(dualBoss.dialogue?.text).toContain('Arch-Villager');
    expect(dualBoss.dialogue?.text).toContain('Heart of Ender');

    const birthdaySolo = story.advanceStage('SOLO_FINAL_STAND');
    expect(birthdaySolo.dialogue?.text).toContain('Cooper\'s birthday party');
    expect(birthdaySolo.dialogue?.text).toContain('Only Barrett remains');

    const victory = story.advanceStage('VICTORY');
    expect(victory.dialogue?.text).toContain('VICTORY');
  });
});
