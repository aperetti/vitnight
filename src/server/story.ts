import { StoryStage, DialogueBox, CombatLogEntry } from '../shared/types';

export class StoryManager {
  public stage: StoryStage = 'SPAWN';
  public questTitle: string = 'The Adventure Begins';
  public questDesc: string = 'Barrett: Gather scrap and laser crystal to craft Luther\'s Laser Weapon at the workbench.';

  // Milestones
  public laserCrafted: boolean = false;
  public whitehillKeyFound: boolean = false;
  public zombieCreekCleared: boolean = false;
  public rainbowPiecesPlaced: string[] = [];
  public skeletonHomesteadClaimed: boolean = false;
  public mutantSkeletonKilled: boolean = false;
  public creeperHomesteadCleared: boolean = false;
  public mutantCreeperShieldBroken: boolean = false;
  public mutantCreeperKilled: boolean = false;
  public powerDownCleared: boolean = false;
  public rockyDoomSwarmTriggered: boolean = false;
  public rockKingSlapWiped: boolean = false;
  public rockyDoomDualBossKilled: boolean = false;
  public beauDeparted: boolean = false;
  public lutherDeparted: boolean = false;
  public soloBossesDefeated: boolean = false;

  public getDialogueForStage(stage: StoryStage): DialogueBox | undefined {
    switch (stage) {
      case 'SPAWN':
        return {
          id: 'dlg-spawn',
          speaker: 'Barrett (The Clever Miner)',
          avatarSymbol: '@',
          avatarColor: '#ffb733',
          text: 'We are setting out to save the realm! Luther, Beau, hold tight while I gather materials outside to craft Luther a high-powered laser rifle at the workbench.'
        };
      case 'WHITEHILL_MINES':
        return {
          id: 'dlg-mines',
          speaker: 'Luther (The Fearless Fighter)',
          avatarSymbol: '@',
          avatarColor: '#55ff55',
          text: 'There is a subterranean entrance inside the house! Let\'s delve into the Whitehill Mines, excavate the veins, and find the ancient dungeon key.'
        };
      case 'ZOMBIE_CREEK':
        return {
          id: 'dlg-zombie-creek',
          speaker: 'Beau (The Ice-Blaster)',
          avatarSymbol: '@',
          avatarColor: '#00ffff',
          text: 'Beware! Spooky ghosts are phasing straight through solid stone walls! Luther, hold the horde back. I\'ll freeze them in ice, and Barrett, detonate my ice balls with your blazing fireballs!'
        };
      case 'WATER_MOUNTAIN_PUZZLE':
        return {
          id: 'dlg-water-mountain',
          speaker: 'Barrett',
          avatarSymbol: '@',
          avatarColor: '#ffb733',
          text: 'We reached Water Mountain, but the shrine puzzle is broken! We must recover the 6 scattered pom-poms and arrange them in rainbow order (Red, Orange, Yellow, Green, Blue, Violet) to unlock victory!'
        };
      case 'SKELETON_HOMESTEAD':
        return {
          id: 'dlg-skel-homestead',
          speaker: 'Beau',
          avatarSymbol: '@',
          avatarColor: '#00ffff',
          text: 'Skeleton archers on the palisades! Barrett, cover the sky with fire arrows while I blast the garrison with lasers!'
        };
      case 'MUTANT_SKELETON':
        return {
          id: 'dlg-mutant-skel',
          speaker: 'Luther (Combat Medic)',
          avatarSymbol: '@',
          avatarColor: '#55ff55',
          text: 'Barrett and Beau are both knocked down by the Mutant Skeleton! Hold on, friends—I\'m charging into the fray with the restorative healing potion to revive you both!'
        };
      case 'CREEPER_HOMESTEAD':
        return {
          id: 'dlg-creeper',
          speaker: 'Luther',
          avatarSymbol: '@',
          avatarColor: '#55ff55',
          text: 'LOOK OUT! A giant creeper explosion just sent me flying across the fortress! Clear the creepers and patch me up!'
        };
      case 'MUTANT_CREEPER':
        return {
          id: 'dlg-mutant-creeper',
          speaker: 'Barrett',
          avatarSymbol: '@',
          avatarColor: '#ffb733',
          text: 'The Mutant Creeper raised a massive energy shield! I\'m climbing the high fortress scaffolding. I\'ll bait its attack and dodge at the last split-second so it shatters its own defenses!'
        };
      case 'POWER_DOWN':
        return {
          id: 'dlg-power-down',
          speaker: 'Party',
          avatarSymbol: '▲',
          avatarColor: '#00ffff',
          text: 'Level 2: Power Down! The legendary tech-dungeon. Grab the humming lightsabers from the energy relay before proceeding to Rocky Doom!'
        };
      case 'ROCKY_DOOM_SWARM':
        return {
          id: 'dlg-rocky-swarm',
          speaker: 'Narrator',
          avatarSymbol: '●',
          avatarColor: '#ff4422',
          text: 'The ground trembles beneath your boots... Not one... Not ten... But 100 giant rock mini-bosses erupt across the arena with flying boulders!'
        };
      case 'ROCKY_DOOM_SLAP':
        return {
          id: 'dlg-rock-king',
          speaker: 'Rock King Boss',
          avatarSymbol: 'R',
          avatarColor: '#ffd700',
          text: 'EARTH-SHAKING SLAP! The Rock King delivers a colossal swipe that wipes the team! The entire level resets—fight smarter this time!'
        };
      case 'ROCKY_DOOM_DUAL_BOSS':
        return {
          id: 'dlg-dual-boss',
          speaker: 'Narrator',
          avatarSymbol: 'V',
          avatarColor: '#aa22ff',
          text: 'The masters of Rocky Doom emerge together: The Arch-Villager and the Heart of Ender! Ignite your lightsabers and fight as one!'
        };
      case 'SOLO_FINAL_STAND':
        return {
          id: 'dlg-birthday-party',
          speaker: 'Narrator (Cooper\'s Birthday Party)',
          avatarSymbol: '★',
          avatarColor: '#ffd700',
          text: 'Real life calls! Cooper\'s birthday party is winding down. Beau has to head home first, and Luther packs up his gear. Only Barrett remains alone against the two gigantic realm bosses!'
        };
      case 'VICTORY':
        return {
          id: 'dlg-victory',
          speaker: 'Narrator',
          avatarSymbol: '★',
          avatarColor: '#55ff55',
          text: 'VICTORY! The kingdom is saved and the homesteads are peaceful once again! The legendary tale of Barrett the Miner, Luther the Fighter & Healer, and Beau the Ice-Blaster will echo for generations!'
        };
      default:
        return undefined;
    }
  }

  public advanceStage(newStage: StoryStage): { dialogue?: DialogueBox; questTitle: string; questDesc: string } {
    this.stage = newStage;
    switch (newStage) {
      case 'WHITEHILL_MINES':
        this.questTitle = 'Delve into Whitehill Mines';
        this.questDesc = 'Descend the trapdoor inside the house. Mine through stone and locate the Whitehill Key.';
        break;
      case 'ZOMBIE_CREEK':
        this.questTitle = 'Zombie Creek & The Phasing Ghosts';
        this.questDesc = 'Advance east. Use Beau\'s ice to freeze enemies and Barrett\'s fireballs to detonate them!';
        break;
      case 'WATER_MOUNTAIN_PUZZLE':
        this.questTitle = 'Water Mountain: The Broken Rainbow';
        this.questDesc = 'Collect all 6 pom-poms (Red, Orange, Yellow, Green, Blue, Purple) and complete the rainbow line on the altar.';
        break;
      case 'SKELETON_HOMESTEAD':
        this.questTitle = 'Storm the Skeleton Homestead';
        this.questDesc = 'Assault the bone fortress, conquer the skeleton army, and claim the camp.';
        break;
      case 'MUTANT_SKELETON':
        this.questTitle = 'Mutant Skeleton Ambush';
        this.questDesc = 'Barrett and Beau are downed! Luther must use his magical healing draught to revive both allies!';
        break;
      case 'CREEPER_HOMESTEAD':
        this.questTitle = 'Creeper Homestead Siege';
        this.questDesc = 'Luther was blasted across the room! Clear all creepers and revive Luther.';
        break;
      case 'MUTANT_CREEPER':
        this.questTitle = 'The Mutant Creeper & The Shield';
        this.questDesc = 'Barrett: Climb the fortress shield and dodge at the last moment to shatter its barrier!';
        break;
      case 'POWER_DOWN':
        this.questTitle = 'Level 2: Power Down';
        this.questDesc = 'Navigate the energy labyrinth and arm yourselves with lightsabers at the relay.';
        break;
      case 'ROCKY_DOOM_SWARM':
        this.questTitle = 'Rocky Doom: The 100 Mini-Boss Swarm';
        this.questDesc = 'Withstand the barrage of 100 rock mini-bosses!';
        break;
      case 'ROCKY_DOOM_SLAP':
        this.questTitle = 'Rocky Doom: The Slap Reset';
        this.questDesc = 'The Rock King wiped the squad! Regroup, fight smarter, and conquer Rocky Doom!';
        break;
      case 'ROCKY_DOOM_DUAL_BOSS':
        this.questTitle = 'Rocky Doom: Arch-Villager & Heart of Ender';
        this.questDesc = 'Strike down both bosses using lightsabers and tactical coordination!';
        break;
      case 'SOLO_FINAL_STAND':
        this.questTitle = 'The Final Stand (Cooper\'s Party Ending)';
        this.questDesc = 'Beau and Luther have departed! Barrett stands alone against two colossal final bosses.';
        break;
      case 'VICTORY':
        this.questTitle = 'The Realm is Saved!';
        this.questDesc = 'All homesteads restored to peace. Congratulations, heroes!';
        break;
    }

    return {
      dialogue: this.getDialogueForStage(newStage),
      questTitle: this.questTitle,
      questDesc: this.questDesc
    };
  }
}
