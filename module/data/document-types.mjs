/**
 * The supported system document types. Keep this module free of Foundry globals
 * so the manifest/template contract can be checked with Node as well as at init.
 */
export const ACTOR_TYPES = Object.freeze([
  "character",
  "npc",
  "squad",
  "platoon",
  "titan",
  "vehicle",
  "domain",
]);

export const ITEM_TYPES = Object.freeze([
  "item",
  "gupt-kala",
  "technique",
  "form",
  "imbalance",
  "archetype",
  "clan",
  "skill",
  "armor",
  "weapon",
  "artifact",
  "ability",
  "anatomy",
  "node",
]);
