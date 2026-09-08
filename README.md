# The Battle of the Homesteads: A Caves of Qud-style Multiplayer Roguelike

A multiplayer, procedurally generated roguelike crafted in the distinct aesthetic and systemic simulation depth of **Caves of Qud**, powered by **PixiJS (v8)** and authoritative WebSockets.

Faithfully adapts the epic narrative: **"The Adventures of Barrett, Luther, and Beau: The Battle of the Homesteads"**.

---

## 🎮 Core Features

1. **PixiJS (v8) Retro Phosphor Engine**:
   - High-contrast Caves of Qud CRT terminal styling with custom scanlines, ambient phosphor glow, and screen-shake physics.
   - Dynamic Field-of-View (FOV raycasting & shadowcasting), fog-of-war, and colored ambient lighting.
   - Zero-dependency procedural Web Audio API sound synthesizer (lasers, freeze chimes, shatter blasts, creeper hiss, Rock King slap, and victory fanfare).

2. **Three Hero Archetypes & Systemic Synergies**:
   - **Barrett (The Clever Miner & Archer)**: Pickaxe mining through stone walls, gathering scrap & crystals, crafting laser rifles & lightsabers, firing blazing fireballs, agility & shield climbing.
   - **Luther (The Fearless Fighter & Combat Medic)**: High endurance, frontline combat, tanks hordes, wields Barrett's crafted laser weapon, rushes in with magical healing draughts to revive fallen comrades, subject to explosive knockback physics.
   - **Beau (The Fearless Fighter & Cryomancer)**: Launches cryo-projectiles that encase foes in solid ice blocks, laser blasting against undead.
   - **Elemental Combo**: Beau freezes enemies into brittle ice blocks; Barrett shoots them with fireballs/fire arrows to trigger a massive `SHATTER_EXPLOSION` dealing devastating AoE ice shrapnel to all surrounding monsters!

3. **Caves of Qud Parasang & Hybrid Pacing**:
   - The world is organized into **Parasangs** and local **Zones (Pages/Screens)**.
   - **Turn-Based Roguelike Mode**: When players explore separate zones or strata (e.g. Barrett mining in Whitehill Mines while Luther and Beau hold the surface house), each zone simulates step-by-step only when the player takes an action.
   - **Crisp Real-Time Mode**: As soon as two or more human players enter the *same* screen ("on the same page"), the zone automatically shifts into continuous real-time execution.
   - **Adjustable Tick Rate**: Configurable in settings from 2 Hz to 10 Hz (default: 5 ticks/sec or 200ms per tick).

4. **Key Rebinding & Dual Persistence**:
   - Full interactive in-game key mapping for 8-directional movement, waiting, attack, special abilities, mining, crafting, and revival.
   - **Local Browser Storage**: Automatically persists keybindings and preferences to `localStorage`.
   - **Optional Firebase Single Sign-On (SSO)**: Sign in with Google / Firebase to sync settings and room history across devices and browsers.

5. **Multiplayer & Smart Companion AI**:
   - WebSockets client/server room system (`?room=coopers-party&hero=barrett`).
   - Unoccupied heroes are piloted by intelligent companion AI bots:
     - Luther AI rushes to downed players and revives them with healing potions.
     - Beau AI prioritizes freezing unfrozen targets.
     - Barrett AI targets frozen foes with fireballs to proc shatter explosions.

---

## 📜 Story Progression: The Complete Journey

- **Level 1**:
  - *Spawn Outpost*: Barrett gathers metal scrap and laser crystals outside to craft Luther's Heavy Laser Weapon at the workbench.
  - *Whitehill Mines*: Descend into the subterranean tunnels beneath the house, mine through breakable stone veins, defeat cavern mobs, and retrieve the ancient Whitehill Key.
  - *Zombie Creek*: Navigate murky waters and mist where spooky ghosts phase directly through solid stone walls. Luther holds the line, Beau freezes the horde, and Barrett's fireballs detonate the ice in AoE shatter blasts.
  - *Water Mountain (The Broken Puzzle)*: Ascend mountain trails to find the Broken Rainbow Altar. Collect the 6 scattered pom-poms (Red, Orange, Yellow, Green, Blue, Purple) and align them on the pedestals in rainbow order to activate the Victory Switch!
- **Level 2: The Homesteads & Power Down**:
  - *Skeleton Homestead*: Breach the bone fortress and defeat the skeleton army. Set up camp and fortify defenses.
  - *Mutant Skeleton Ambush*: Barrett and Beau are downed! Luther charges in with the magical healing draught, executes a double revival, and the trio rallies to slay the mutant skeleton.
  - *Creeper Homestead*: Volatile creeper swarms. A colossal explosion sends Luther flying across the fortress! Barrett and Beau clear the room, then revive Luther.
  - *Mutant Creeper & Energy Shield*: The fortress rebuilds an impervious shield around the Mutant Creeper. Barrett scales the high shield scaffolding, taunts the boss, and dodges at the split second—causing the Mutant Creeper's devastating strike to smash its own shield!
  - *Power Down*: Legendary high-tech subterranean labyrinth. Acquire humming lightsabers at the energy relay.
  - *Rocky Doom*:
    - 100 giant rock mini-bosses erupt across the arena with flying boulders!
    - The gigantic Rock King Boss delivers an earth-shaking slap that wipes the party.
    - Roguelike retry mechanic: Team respawns at the arena checkpoint with tactical wave management.
    - Dual Boss Battle: Arch-Villager & Heart of Ender simultaneous encounter!
- **Act 4 / Epilogue: The Final Stand (Cooper's Birthday Party Ending)**:
  - Real life calls as Cooper's birthday party comes to a close.
  - Beau logs off first ("Pick up time!"), followed by Luther.
  - Only Barrett remains alone against the two colossal final bosses (Void Overlord and Nether Titan).
  - Solo tactical execution using mining cover, laser kiting, and fireballs to defeat both bosses and save the realm!

---

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Running Tests
```bash
npm test
```
All 18 automated unit and network integration tests will execute.

### Running the Game
1. **Start the WebSocket Game Server**:
   ```bash
   npm run server
   ```
   (Listens on port 3001)

2. **Start the Vite Frontend Development Server**:
   ```bash
   npm run dev
   ```
   (Accessible at `http://localhost:3000`)

3. **Multiplayer Co-op**:
   - Player 1: Open `http://localhost:3000/?room=coopers-party&hero=barrett`
   - Player 2: Open `http://localhost:3000/?room=coopers-party&hero=luther`
   - Player 3: Open `http://localhost:3000/?room=coopers-party&hero=beau`

---

## 🐳 Docker Deployment

Vitnight can be run in containerized environments with a single command.

### 1. Using Docker Compose (Production)

Start the unified production game server and client:
```bash
docker compose up --build -d
```
The game will be accessible at: `http://localhost:3000`

- Check health and status:
  ```bash
  docker compose ps
  ```
- View real-time logs:
  ```bash
  docker compose logs -f
  ```
- Stop the container:
  ```bash
  docker compose down
  ```

### 2. Live Development with Docker Compose

To develop inside Docker with live source code syncing and hot module replacement:
```bash
docker compose -f docker-compose.dev.yml up --build
```

### 3. Standalone Docker Commands

- **Build the image**:
  ```bash
  docker build -t vitnight:latest .
  ```
- **Run the container**:
  ```bash
  docker run -d -p 3000:3000 --name vitnight vitnight:latest
  ```
- **Run on a custom port**:
  ```bash
  docker run -d -p 8080:8080 -e PORT=8080 --name vitnight vitnight:latest
  ```

