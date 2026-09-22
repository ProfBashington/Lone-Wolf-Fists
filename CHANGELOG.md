# CHANGELOG

## 1.3.0 — Foundry VTT 14 compatibility

Requires Foundry VTT 14 (tested on 14.368) and `game-icons-net` 0.0.45. This release keeps the
existing sheets and rules; it only makes the system work correctly on v14. Worlds from earlier
Foundry versions are not a supported upgrade path.

### Compatibility changes
- Declares all Actor and Item types in `system.json`; the legacy `template.json` is removed.
- Active Effects in the compendiums use the v14 format, and a one-time world migration converts
  any older effects it finds.
- Chat and rolls use v14 message modes (public, GM, blind, self).
- Dialogs (End Combat, Rest, Masteries) use Foundry's current dialog API.
- The 5 ft grid default uses the current `grid` manifest key. The old `gridDistance` and
  `gridUnits` keys were being ignored.
- Compendium folders come from `packFolders`; the system no longer rearranges packs on every GM
  login, so a GM's own arrangement is kept.

### Fixes
- Actor data preparation failed after the first update on v14, so derived values such as max
  health were wrong.
- Clicking a dice set in an effort roll now highlights it.
- `/effort` rejects blank, non-numeric, zero, negative, and fractional dice counts.
- Deleting a named squad or follower member removed the last member instead of the chosen one.
- Players can create item macros on the hotbar, and a drop creates one macro instead of two.
- End Combat skips combatants without an actor and resets unlinked tokens' own data.
- Prana Flare counts artifact prana recovery correctly.
- Platoon membership is clamped to 0–100.
- Missing squad members or domain rulers no longer break the sheet.
- Sheets no longer delete duplicate archetype or clan items while rendering.

### Known limitations
- Sheets use Foundry's older Application framework, which logs one deprecation warning when a
  sheet opens. Foundry plans to remove it in v16.
- Dice So Nice does not animate effort rolls.

### Rollback
Reinstall Lone Wolf Fists 1.2.4 on a Foundry 13 installation. Worlds opened on Foundry 14 cannot
be opened on 13 again, so keep a backup from before the upgrade.

## 0.1

- Initial release
