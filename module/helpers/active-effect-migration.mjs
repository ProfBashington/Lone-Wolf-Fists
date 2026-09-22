const LEGACY_CHANGE_TYPES = Object.freeze({
  0: "custom",
  1: "multiply",
  2: "add",
  3: "downgrade",
  4: "upgrade",
  5: "override",
});

function migrateChangeValue(value) {
  if (typeof value !== "string" || value === "") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

/**
 * Convert an Active Effect source object to Foundry v14's persisted schema.
 * It is deliberately idempotent so the same data can be inspected or migrated
 * repeatedly without changing a second time.
 */
export function migrateActiveEffectSource(source) {
  let changed = false;
  source.system ??= {};

  if (Array.isArray(source.changes)) {
    source.system.changes ??= source.changes;
    delete source.changes;
    changed = true;
  }
  if (Array.isArray(source.system.changes)) {
    for (const change of source.system.changes) {
      if (typeof change.mode === "number" && typeof change.type !== "string") {
        change.type = LEGACY_CHANGE_TYPES[change.mode] ?? `custom.${change.mode}`;
        delete change.mode;
        changed = true;
      }
      if (typeof change.value === "string") {
        const value = migrateChangeValue(change.value);
        if (value !== change.value) {
          change.value = value;
          changed = true;
        }
      }
      if (change.priority === null) {
        delete change.priority;
        changed = true;
      }
    }
  }

  const duration = source.duration;
  if (duration && typeof duration === "object" && !("value" in duration)) {
    const unit = ["seconds", "turns", "rounds"].find((key) => typeof duration[key] === "number");
    source.duration = {
      value: unit ? duration[unit] : null,
      units: unit ?? "seconds",
      expiry: null,
    };
    if (typeof duration.startTime === "number") source.start = { time: duration.startTime };
    changed = true;
  }
  return changed;
}
