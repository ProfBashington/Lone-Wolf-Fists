const fs = require("node:fs");
const path = require("node:path");

const failures = [];
for (const file of fs.readdirSync("pack-source").filter((entry) => entry.endsWith(".json")).sort()) {
  const pack = JSON.parse(fs.readFileSync(path.join("pack-source", file), "utf8"));
  for (const record of pack.records) {
    if (!record.key.includes(".effects!")) continue;
    const effect = record.value;
    if (Array.isArray(effect.changes) || !Array.isArray(effect.system?.changes)) failures.push(`${file}:${record.key}: changes must be system.changes`);
    if (effect.system?.changes?.some((change) => typeof change.type !== "string" || "mode" in change)) failures.push(`${file}:${record.key}: changes must use string type`);
    if (["rounds", "turns", "seconds", "startRound", "startTime", "startTurn"].some((key) => key in (effect.duration || {}))) failures.push(`${file}:${record.key}: duration uses legacy fields`);
  }
}
for (const file of ["module/lone-wolf-fists.mjs", "module/documents/item.mjs", "module/sheets/actor-sheet.mjs"]) {
  const source = fs.readFileSync(file, "utf8");
  if (source.includes("rollMode")) failures.push(`${file}: rollMode is deprecated; use messageMode`);
}
if (fs.readFileSync("module/lone-wolf-fists.mjs", "utf8").includes("legacyTransferral")) failures.push("module/lone-wolf-fists.mjs: legacyTransferral is obsolete");
if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write("Foundry v14 Active Effect and message-mode contracts passed.\n");
