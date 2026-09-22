# LWF System

![Foundry v14](https://img.shields.io/badge/foundry-v14-green)

This is a system to play the post-apocalyptic anime inspired ttrpg [Lone Wolf Fists](https://www.drivethrurpg.com/en/product/416442/tian-shang-lone-wolf-fists-core-rulebook) using Foundry VTT version 14.368. It retains its AppV1 sheets for this compatibility release.

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
- The module dice so nice does not work with the dice rolling mechanic - no dice are rolled.
- Effort and health max cannot be increased for player characters - as a workaround for techniques that change these things, create an npc with the relevant stats.
- Health bars should display properly, but please let me know if any other issues arise around display of health or other attributes!

## Pack development

Foundry compendium packs are LevelDB databases and must not be edited directly. Their
`CURRENT` pointer files are sensitive to line-ending conversion on Windows. The reviewed
source of record is `pack-source/*.json`; it preserves every LevelDB key and document ID.

Use the following workflow after installing dependencies:

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

## Licenses
The majority of this system is distributed under the MIT license, but the assets and packs folders are not. See 'assets/LICENSE-ASSETS.md' and 'packs/LICENSE-PACKS.md' for more information
