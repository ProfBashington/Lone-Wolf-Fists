const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const sourceRoot = process.argv[2] || "pack-source";
const write = process.argv.includes("--write");

(async () => {
  const { migrateActiveEffectSource } = await import(pathToFileURL(path.resolve("module/helpers/active-effect-migration.mjs")).href);
  let effects = 0;
  let migrated = 0;
  for (const file of fs.readdirSync(sourceRoot).filter((entry) => entry.endsWith(".json")).sort()) {
    const filePath = path.join(sourceRoot, file);
    const pack = JSON.parse(fs.readFileSync(filePath, "utf8"));
    let packChanged = false;
    for (const record of pack.records) {
      if (!record.key.includes(".effects!") || !record.value || typeof record.value !== "object") continue;
      effects += 1;
      if (migrateActiveEffectSource(record.value)) {
        migrated += 1;
        packChanged = true;
      }
    }
    if (write && packChanged) fs.writeFileSync(filePath, `${JSON.stringify(pack, null, 2)}\n`);
  }
  process.stdout.write(`${write ? "Migrated" : "Would migrate"} ${migrated} of ${effects} Active Effects.\n`);
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
