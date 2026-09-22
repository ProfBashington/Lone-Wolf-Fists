const fs = require("node:fs");
const path = require("node:path");

const sourceRoot = "pack-source";
const write = process.argv.includes("--write");
const typeKeys = { Actor: "actors", Item: "items", JournalEntry: "journal" };
const packs = new Map();
let rewrites = 0;
let originRepairs = 0;

function rewriteNamespaces(value) {
  if (typeof value === "string") {
    return value.replaceAll("Compendium.lwf-compendia.", () => {
      rewrites += 1;
      return "Compendium.lone-wolf-fists.";
    });
  }
  if (Array.isArray(value)) return value.map(rewriteNamespaces);
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) value[key] = rewriteNamespaces(entry);
  }
  return value;
}

function collectStrings(value, output = [], fieldName = "") {
  if (typeof value === "string") {
    if (fieldName !== "compendiumSource") output.push(value);
  } else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output, fieldName));
  else if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) collectStrings(entry, output, key);
  }
  return output;
}

for (const file of fs.readdirSync(sourceRoot).filter((entry) => entry.endsWith(".json")).sort()) {
  const filePath = path.join(sourceRoot, file);
  const pack = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (write) rewriteNamespaces(pack);
  const keys = new Set(pack.records.map((record) => record.key));
  packs.set(path.basename(file, ".json"), { keys, pack });
}

for (const [packName, { keys, pack }] of packs) {
  for (const record of pack.records) {
    const match = record.key.match(/^!actors\.effects!([^.]+)\./) ?? record.key.match(/^!actors\.items\.effects!([^.]+)\.([^.]+)\./);
    const origin = record.value?.origin;
    if (!match || typeof origin !== "string" || !origin.startsWith("Compendium.lone-wolf-fists.")) continue;
    const reference = origin.match(/^Compendium\.lone-wolf-fists\.([\w-]+)\.Actor\.([A-Za-z0-9]{16})/);
    if (!reference || packs.get(reference[1])?.keys.has(`!actors!${reference[2]}`)) continue;
    record.value.origin = `Compendium.lone-wolf-fists.${packName}.Actor.${match[1]}${match[2] ? `.Item.${match[2]}` : ""}`;
    originRepairs += 1;
  }
  if (write) fs.writeFileSync(path.join(sourceRoot, `${packName}.json`), `${JSON.stringify(pack, null, 2)}\n`);
}

const failures = [];
let referenceCount = 0;
for (const [packName, { pack }] of packs) {
  for (const text of collectStrings(pack)) {
    for (const match of text.matchAll(/Compendium\.([\w-]+)\.([\w-]+)\.(Actor|Item|JournalEntry)\.([A-Za-z0-9]{16})/g)) {
      referenceCount += 1;
      const [, systemId, targetPack, documentType, id] = match;
      if (systemId !== "lone-wolf-fists") continue;
      const target = packs.get(targetPack);
      const expectedKey = `!${typeKeys[documentType]}!${id}`;
      if (!target || !target.keys.has(expectedKey)) failures.push(`${packName}: unresolved ${match[0]}`);
    }
  }
}

for (const [packName, { pack }] of packs) {
  if (collectStrings(pack).some((text) => text.includes("Compendium.lwf-compendia."))) failures.push(`${packName}: obsolete lwf-compendia namespace remains`);
}

if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write(`${write ? "Repaired" : "Validated"} ${referenceCount} actionable internal compendium UUID references${write ? `; rewrote ${rewrites} obsolete namespaces and repaired ${originRepairs} stale effect origins` : ""}.\n`);
