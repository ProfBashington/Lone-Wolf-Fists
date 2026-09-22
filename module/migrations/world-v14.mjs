import { migrateActiveEffectSource } from "../helpers/active-effect-migration.mjs";

export const WORLD_MIGRATION_VERSION = 1;
export const WORLD_MIGRATION_SETTING = "v14MigrationVersion";
export const WORLD_MIGRATION_REPORT_SETTING = "v14MigrationReport";

function contents(collection) {
  return collection?.contents ?? (collection ? Array.from(collection) : []);
}

function effectKey(effect) {
  return effect.uuid ?? `${effect.parent?.uuid ?? "unknown"}.${effect.id ?? effect._id}`;
}

function collectEffects({ actors = [], items = [], scenes = [] }) {
  const effects = new Map();
  const addEffects = (document) => {
    for (const effect of contents(document?.effects)) effects.set(effectKey(effect), effect);
    for (const item of contents(document?.items)) addEffects(item);
  };
  for (const actor of actors) addEffects(actor);
  for (const item of items) addEffects(item);
  for (const scene of scenes) for (const token of contents(scene.tokens)) addEffects(token.actor);
  return [...effects.values()];
}

function effectUpdate(effect, clone) {
  const source = clone(effect.toObject());
  if (!migrateActiveEffectSource(source)) return null;
  const update = { system: source.system, duration: source.duration };
  if (source.start) update.start = source.start;
  if (!("changes" in source)) update["-=changes"] = null;
  return update;
}

/**
 * Migrate world-owned Active Effects to Foundry v14 data contracts.
 * A schema marker is written only after every effect update and report write succeeds.
 */
export async function runV14WorldMigration({
  settings,
  actors = [],
  items = [],
  scenes = [],
  macros = [],
  clone = (value) => globalThis.foundry?.utils.deepClone(value) ?? structuredClone(value),
  now = () => new Date().toISOString(),
} = {}) {
  const version = settings.get(WORLD_MIGRATION_SETTING) ?? 0;
  if (version >= WORLD_MIGRATION_VERSION) return { skipped: true, version, migratedEffects: 0 };

  const effects = collectEffects({ actors: contents(actors), items: contents(items), scenes: contents(scenes) });
  const report = {
    version: WORLD_MIGRATION_VERSION,
    startedAt: now(),
    inventory: {
      actors: contents(actors).length,
      items: contents(items).length,
      scenes: contents(scenes).length,
      macros: contents(macros).length,
      activeEffects: effects.length,
    },
    migratedEffects: 0,
  };

  for (const effect of effects) {
    const update = effectUpdate(effect, clone);
    if (!update) continue;
    await effect.update(update);
    report.migratedEffects += 1;
  }

  report.completedAt = now();
  await settings.set(WORLD_MIGRATION_REPORT_SETTING, report);
  await settings.set(WORLD_MIGRATION_SETTING, WORLD_MIGRATION_VERSION);
  return report;
}

export async function migrateCurrentWorld() {
  return runV14WorldMigration({
    settings: {
      get: (key) => game.settings.get("lone-wolf-fists", key),
      set: (key, value) => game.settings.set("lone-wolf-fists", key, value),
    },
    actors: game.actors,
    items: game.items,
    scenes: game.scenes,
    macros: game.macros,
  });
}
