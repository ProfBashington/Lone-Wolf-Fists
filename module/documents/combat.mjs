/**
 * Extend the base Combat document to allow for custom end of combat events.
 * @extends {Combat}
 */
import { chakraReset } from '../helpers/chakra-reset.mjs'

export class lwfCombat extends Combat {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  async endCombat() {
    const confirmed = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize("COMBAT.EndTitle") },
      content: `<p>${game.i18n.localize("COMBAT.EndConfirmation")}</p>`,
    });
    if (!confirmed) return;
    // Use each combatant's own actor so unlinked tokens reset their synthetic actor.
    for (const combatant of this.combatants) {
      if (combatant.actor) await chakraReset(combatant.actor);
    }
    return this.delete();
  }
}
