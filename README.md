# Lone Wolf Fists for Foundry VTT

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

This is a system for playing the post-apocalyptic, anime-inspired TTRPG [Lone Wolf Fists](https://www.drivethrurpg.com/en/product/416442/tian-shang-lone-wolf-fists-core-rulebook) on Foundry VTT version 14 (tested on 14.368). This release keeps the system's AppV1 sheets; see [CHANGELOG.md](CHANGELOG.md) for what changed.

This is the Foundry v14 continuation of the original Lone Wolf Fists system by **El-Gobbo**
([original repository](https://github.com/DuncanLittlechild/lone-wolf-fists)). It is maintained by
[ProfBashington](https://github.com/ProfBashington).

## Installation

### From inside Foundry (recommended)

1. In Foundry's setup screen, open **Game Systems** → **Install System**.
2. Paste this **Manifest URL** at the bottom and click **Install**:

   ```
   https://github.com/ProfBashington/Lone-Wolf-Fists/releases/latest/download/system.json
   ```

3. Foundry also installs the required **Game-icons.net** module (`game-icons-net`). If it doesn't,
   install it from the module browser.
4. Create a world using the Lone Wolf Fists system. Foundry will offer future updates automatically.

### Manually

1. Install the required module **Game-icons.net** (`game-icons-net`) from Foundry's module browser.
2. Download `lone-wolf-fists.zip` from the latest release on this repository's
   [Releases](https://github.com/ProfBashington/Lone-Wolf-Fists/releases) and extract it into a new
   folder named `lone-wolf-fists` inside your Foundry `Data/systems/` folder, so that
   `Data/systems/lone-wolf-fists/system.json` exists.
3. Restart Foundry and create a world using the Lone Wolf Fists system.

Requires Foundry VTT 14. Worlds from earlier Foundry versions are not a supported upgrade path.

## Features
- Character sheets for player characters, npcs/monsters, titans/disasters, vehicles, platoons, and squads.
- Item sheets for forms, gupt kala, techniques, armor, weapons, titan anatomy/vehicle parts, monster abilities, and artifacts.
- Packs with archetypes, weapons, armor, skills, masteries, and all 14 base Yuddhakala.
- Giving a character a technique from these packs that requires a Hell chakra will give them a Hell chakra
- Roll effort by either clicking the effort icon on a character sheet, or by typing "/effort" then the number of dice to roll into chat (eg, "/effort 10" would roll 10 dice).
- Fully editable initiative that automatically rerolls at the start of every round.
- Add followers to players or members to squads by dragging and dropping onto the relevant sheet, or simply add nameless mooks by clicking the + button.
- Add rulers to domains by dragging and dropping onto the relevant sheet.
- Squad and platoon stats auto-calculate based on their numbers and collective effort.
- Nodes auto-calculate the number of resources produced based on number of workers and their attributes.
- Create and modify imbalances on the sheet of the character with that imbalance
- Seperately track the health of each part of a Titan's anatomy.
- Sort your techniques by type using a dropdown menu.
- Forgotten what the skills do? Click on them at the side of your character sheet to access both the description and the effect chart.
- Create custom artifacts, techniques, forms, and weapons.
- If you're a gm, edit any non-character sheet by either pressing the edit button in the top right, or selecting the edit tab.

## Known issues
- Effort and health max cannot be increased for player characters - as a workaround for techniques that change these things, create an npc with the relevant stats.
- Health bars should display properly, but please let me know if any other issues arise around display of health or other attributes!

## Pack development

Foundry compendium packs are LevelDB databases and must not be edited directly. Their
`CURRENT` pointer files are sensitive to line-ending conversion on Windows. The reviewed
source of record is `pack-source/*.json`; it preserves every LevelDB key and document ID.

Use the following workflow after installing dependencies (Node 24):

```powershell
npm run check:contracts
npm run packs:roundtrip
```

The contract check verifies that the manifest `documentTypes` and runtime TypeDataModel
registrations agree (there is no legacy template.json), and prevents nested form markup. The pack command deterministically
rebuilds temporary packs under `build/packs`, reopens them, and compares their semantic records
with `pack-source`. `npm run packs:export` is intentionally refusing when `pack-source` is
non-empty so it cannot overwrite reviewed content by accident. Only export from a verified
release archive or a checkout whose LevelDB pointer files retain LF.

Machine-specific paths for the optional dev-server and icon-module checks go in a git-ignored
`local.config.json`; copy `local.config.example.json` to create it. `npm run check:all` runs every
check, and `npm run release:build` builds the install ZIP.

## Credits

- **Original system:** El-Gobbo ([DuncanLittlechild/lone-wolf-fists](https://github.com/DuncanLittlechild/lone-wolf-fists)), versions 0.1–1.2.4.
- **Foundry v14 port and maintenance:** [ProfBashington](https://github.com/ProfBashington), from 1.3.0.
- **Compendium packs:** assembled by [cdrit](https://github.com/cdrit).
- **Game:** *Lone Wolf Fists* is the work of its creator; the compendium content and game art in this
  system are distributed with the creator's permission.
- **Framework:** built from the [Boilerplate system](https://github.com/asacolips-projects/boilerplate) by asacolips.
- **Icons:** [game-icons.net](https://game-icons.net/) by Lorc, Delapouite, and contributors (CC BY 3.0).

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md) for details.

## Licenses

The system code is distributed under the MIT license ([MIT-LICENSE.txt](MIT-LICENSE.txt)). The `packs`
folder and the game art listed in [assets/LICENSE-ASSETS.md](assets/LICENSE-ASSETS.md) are not covered by the MIT
license; they are distributed with the permission of the game's creator. See
[packs/LICENSE-PACKS.md](packs/LICENSE-PACKS.md) and [assets/LICENSE-ASSETS.md](assets/LICENSE-ASSETS.md).
