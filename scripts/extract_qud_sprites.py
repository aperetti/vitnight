#!/usr/bin/env python3
"""
Caves of Qud Sprite Extractor using QBE (Qud Blueprint Explorer) & Hagadias
Extracts authentic Caves of Qud sprites for vitnight heroes, monsters, items, and environment.
"""

import io
import json
import os
import sys
from pathlib import Path

# Add hagadias and qud-wiki to path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR / "hagadias-temp"))
sys.path.insert(0, str(BASE_DIR / "qud-wiki-temp"))

try:
    import mwclient
    from PIL import Image
    from hagadias.gameroot import GameRoot
    from qbe.qudobject_wiki import QudObjectWiki
except ImportError as e:
    print(f"Error importing dependencies: {e}", file=sys.stderr)
    sys.exit(1)

SPRITES_DIR = BASE_DIR / "public" / "sprites"
SPRITES_DIR.mkdir(parents=True, exist_ok=True)

# Mapping of game entity/tile keys to Caves of Qud wiki image filenames
SPRITE_MAP = {
    # Heroes
    "hero_barrett": "miner mk i.png",
    "hero_luther": "issachari raider.png",
    "hero_beau": "seeker of the sightless way.png",
    "hero_cooper": "apple farmers daughter.png",

    # Monsters
    "monster_ghost": "phase spider.png",
    "monster_zombie": "cannibal.png",
    "monster_skeleton": "powered exoskeleton.png",
    "monster_creeper": "giant centipede.png",
    "monster_rocky_doom": "large boulder.png",
    "monster_golem": "lichen golem.png",
    "monster_boss_arch_villager": "decarbonizer.png",
    "monster_boss_heart_of_ender": "star kraken.png",
    "monster_mutant_creeper": "prism girshling.png",

    # Weapons & Items
    "item_laser": "laser rifle.png",
    "item_lightsaber": "vibro blade.png",
    "item_healing_draught": "salve injector.png",
    "item_scrap": "bent metal sheet.png",
    "item_crystal": "crystalline branch.png",
    "item_key": "bronze key.png",
    "item_baetyl": "sparking baetyl.png",
    "item_starapple": "starapple.png",

    # Environment / Tiles
    "tile_wall": "granite.png",
    "tile_wall_cave": "fulcrete.png",
    "tile_wall_shale": "shale.png",
    "tile_door": "door.png",
    "tile_water": "water.png",
    "tile_dirt": "dirt.png",
    "tile_watervine": "watervine.png",
    "tile_boulder": "small boulder.png",

    # Overland World Map & Terrain Tiles
    "map_mountains": "Mountains.png",
    "map_jungle": "Jungle.png",
    "map_deep_jungle": "Deep jungle.png",
    "map_flowers": "Bouquet of flowers.png",
    "map_river": "River.png",
    "map_desert": "Salt dunes.png",
    "map_canyon": "Desert canyons.png",
    "map_marsh": "Salt marsh.png",
    "map_ruins": "Baroque ruins.png",
    "map_shrine": "Ruined shrine.png",
    "map_monolith": "Stone monolith.png",

    # Overworld Landmarks (POIs)
    "loc_spawn": "Ovw joppa.png",
    "loc_mines": "Ovw asphalt mines.png",
    "loc_creek": "Ovw red rock.png",
    "loc_mountain": "Ovw rainbow wood.png",
    "loc_skeleton": "Ovw bethesda susa.png",
    "loc_creeper": "Ovw golgotha.png",
    "loc_power": "Ovw rust wells.png",
    "loc_rocky": "Ovw six day stilt.png",
    "loc_final": "Ovw tomb of the eaters.png",
    "loc_ruins": "Ovw rusted archway.png"
}

def main():
    print("Connecting to wiki.cavesofqud.com via mwclient...")
    site = mwclient.Site("wiki.cavesofqud.com", path="/")

    coq_install = Path("/home/adam/.local/share/Steam/steamapps/common/Caves of Qud")
    if coq_install.exists():
        try:
            print(f"Loading local Caves of Qud installation at: {coq_install}")
            root = GameRoot(str(coq_install))
            print(f"Caves of Qud Version: {root.gamever}")
        except Exception as e:
            print(f"Note on gameroot load: {e}")

    manifest = {}
    total = len(SPRITE_MAP)
    success_count = 0

    print(f"Downloading {total} Qud sprites into {SPRITES_DIR}...")
    for key, filename in SPRITE_MAP.items():
        out_path = SPRITES_DIR / f"{key}.png"
        try:
            wiki_img = site.images[filename]
            if wiki_img.exists:
                with io.BytesIO() as buf:
                    wiki_img.download(buf)
                    buf.seek(0)
                    im = Image.open(buf)
                    # Ensure RGBA
                    im = im.convert("RGBA")
                    im.save(out_path, format="PNG")
                manifest[key] = f"/sprites/{key}.png"
                success_count += 1
                print(f"  [OK] {key} -> {filename} saved as {out_path.name}")
            else:
                print(f"  [MISSING] {filename} does not exist on wiki")
        except Exception as e:
            print(f"  [ERROR] Failed to download {filename} for {key}: {e}")

    # Write manifest
    manifest_path = SPRITES_DIR / "manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"\nCompleted! {success_count}/{total} sprites extracted.")
    print(f"Manifest written to {manifest_path}")

if __name__ == "__main__":
    main()
