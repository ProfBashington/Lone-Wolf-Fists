const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

function sameMembers(label, actual, expected) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = [...expectedSet].filter((entry) => !actualSet.has(entry));
  const unexpected = [...actualSet].filter((entry) => !expectedSet.has(entry));
  if (missing.length || unexpected.length || actualSet.size !== actual.length) {
    throw new Error(`${label} mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`);
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(fullPath) : [fullPath];
  });
}

function checkForms(templateRoot) {
  for (const filePath of walk(templateRoot).filter((entry) => entry.endsWith(".hbs"))) {
    const source = fs.readFileSync(filePath, "utf8");
    let depth = 0;
    for (const match of source.matchAll(/<\/?form\b[^>]*>/gi)) {
      if (match[0].startsWith("</")) depth -= 1;
      else depth += 1;
      if (depth < 0 || depth > 1) throw new Error(`Invalid or nested form in ${path.relative(process.cwd(), filePath)}`);
    }
    if (depth !== 0) throw new Error(`Unclosed form in ${path.relative(process.cwd(), filePath)}`);
  }
}

(async () => {
  const documentTypes = await import(pathToFileURL(path.resolve("module/data/document-types.mjs")).href);
  const manifest = JSON.parse(fs.readFileSync("system.json", "utf8"));
  const runtime = fs.readFileSync("module/lone-wolf-fists.mjs", "utf8");

  sameMembers("Manifest Actor documentTypes", Object.keys(manifest.documentTypes?.Actor || {}), documentTypes.ACTOR_TYPES);
  sameMembers("Manifest Item documentTypes", Object.keys(manifest.documentTypes?.Item || {}), documentTypes.ITEM_TYPES);
  // Keys v14 no longer recognizes (it warns and ignores them), with their replacements.
  const retiredKeys = { gridDistance: "grid.distance", gridUnits: "grid.units", minimumCoreVersion: "compatibility.minimum", compatibleCoreVersion: "compatibility.verified", author: "authors", dependencies: "relationships", name: "id" };
  for (const [key, replacement] of Object.entries(retiredKeys)) {
    if (key in manifest) throw new Error(`system.json key "${key}" is not recognized by Foundry v14; use "${replacement}"`);
  }
  // Install/update links: the manifest always resolves to the latest release, and the download
  // must be this version's own release asset, so a version bump cannot ship a stale download link.
  if (manifest.manifest || manifest.download) {
    const expectedManifest = `${manifest.url}/releases/latest/download/system.json`;
    const expectedDownload = `${manifest.url}/releases/download/v${manifest.version}/lone-wolf-fists.zip`;
    if (manifest.manifest !== expectedManifest) throw new Error(`system.json manifest must be ${expectedManifest}`);
    if (manifest.download !== expectedDownload) throw new Error(`system.json download must be ${expectedDownload} for version ${manifest.version}`);
  }
  // v14 deprecates legacy template.json; TypeDataModels are the only source of type data.
  if (fs.existsSync("template.json")) throw new Error("template.json must not return; declare types in system.json documentTypes and TypeDataModels");
  const models = fs.readFileSync("module/data/_module.mjs", "utf8");
  for (const [block, types] of [["actorDataModels", documentTypes.ACTOR_TYPES], ["itemDataModels", documentTypes.ITEM_TYPES]]) {
    const body = runtime.slice(runtime.indexOf(`const ${block} = {`), runtime.indexOf("}", runtime.indexOf(`const ${block} = {`)));
    for (const type of types) {
      const entry = body.match(new RegExp(`(?:^|[\\s,{])"?${type}"?\\s*:\\s*models\\.(\\w+)`));
      if (!entry) throw new Error(`${block} has no data model for type "${type}"`);
      if (!new RegExp(`\\b${entry[1]}\\b`).test(models)) throw new Error(`Data model ${entry[1]} for "${type}" is not exported from module/data/_module.mjs`);
    }
  }

  if (!runtime.includes("ACTOR_TYPES.map") || !runtime.includes("ITEM_TYPES.map")) {
    throw new Error("Runtime model registration must be derived from the declared document types");
  }
  checkForms(path.resolve("templates"));
  process.stdout.write(`Document-type and template contracts passed (${documentTypes.ACTOR_TYPES.length} Actor, ${documentTypes.ITEM_TYPES.length} Item types).\n`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
