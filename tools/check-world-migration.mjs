import assert from "node:assert/strict";
import { runV14WorldMigration, WORLD_MIGRATION_SETTING, WORLD_MIGRATION_VERSION } from "../module/migrations/world-v14.mjs";

class Settings {
  constructor(values = {}) { this.values = values; this.writes = []; }
  get(key) { return this.values[key]; }
  async set(key, value) { this.values[key] = value; this.writes.push(key); }
}

function legacyEffect() {
  const effect = {
    uuid: "Actor.test.ActiveEffect.test",
    toObject: () => ({ changes: [{ key: "system.power.lvl", mode: 2, value: "2", priority: null }], duration: { rounds: 1 } }),
    update: async (update) => { effect.lastUpdate = update; },
  };
  return effect;
}

const effect = legacyEffect();
const settings = new Settings();
const first = await runV14WorldMigration({ settings, actors: [{ effects: [effect], items: [] }], now: () => "2026-09-21T00:00:00.000Z", clone: (value) => structuredClone(value) });
assert.equal(first.migratedEffects, 1);
assert.equal(effect.lastUpdate.system.changes[0].type, "add");
assert.equal(effect.lastUpdate.system.changes[0].value, 2);
assert.equal(effect.lastUpdate["-=changes"], null);
assert.equal(settings.values[WORLD_MIGRATION_SETTING], WORLD_MIGRATION_VERSION);
assert.deepEqual(settings.writes, ["v14MigrationReport", WORLD_MIGRATION_SETTING]);

const second = await runV14WorldMigration({ settings, actors: [{ effects: [effect], items: [] }] });
assert.equal(second.skipped, true);

const failingSettings = new Settings();
const failingEffect = { ...legacyEffect(), update: async () => { throw new Error("simulated update failure"); } };
await assert.rejects(() => runV14WorldMigration({ settings: failingSettings, actors: [{ effects: [failingEffect], items: [] }] }));
assert.equal(failingSettings.values[WORLD_MIGRATION_SETTING], undefined);
process.stdout.write("World migration first-run, rerun, and failure-marker contracts passed.\n");
