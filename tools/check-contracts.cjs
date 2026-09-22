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
  const templates = JSON.parse(fs.readFileSync("template.json", "utf8"));
  const runtime = fs.readFileSync("module/lone-wolf-fists.mjs", "utf8");

  sameMembers("Manifest Actor documentTypes", Object.keys(manifest.documentTypes?.Actor || {}), documentTypes.ACTOR_TYPES);
  sameMembers("Manifest Item documentTypes", Object.keys(manifest.documentTypes?.Item || {}), documentTypes.ITEM_TYPES);
  sameMembers("Legacy template Actor types", templates.Actor?.types || [], documentTypes.ACTOR_TYPES);
  sameMembers("Legacy template Item types", templates.Item?.types || [], documentTypes.ITEM_TYPES);

  if (!runtime.includes("ACTOR_TYPES.map") || !runtime.includes("ITEM_TYPES.map")) {
    throw new Error("Runtime model registration must be derived from the declared document types");
  }
  checkForms(path.resolve("templates"));
  process.stdout.write(`Document-type and template contracts passed (${documentTypes.ACTOR_TYPES.length} Actor, ${documentTypes.ITEM_TYPES.length} Item types).\n`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
