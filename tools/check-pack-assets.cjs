const fs = require("node:fs");
const path = require("node:path");
const { ClassicLevel } = require("classic-level");

const { localConfig, requireSetting } = require("./local-config.cjs");

const moduleRoot = process.argv[2] ?? requireSetting("gameIconsModule", localConfig().gameIconsModule);

function indexFiles(root) {
  const files = new Set();
  const visit = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(fullPath);
      else files.add(path.relative(root, fullPath).replaceAll("\\", "/"));
    }
  };
  visit(root);
  return files;
}

function collectStrings(value, output = []) {
  if (typeof value === "string") output.push(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (value && typeof value === "object") Object.values(value).forEach((entry) => collectStrings(entry, output));
  return output;
}

(async () => {
  const systemFiles = indexFiles(".");
  const moduleFiles = indexFiles(moduleRoot);
  const missing = new Set();
  let references = 0;
  for (const entry of fs.readdirSync("build/packs", { withFileTypes: true }).filter((entry) => entry.isDirectory())) {
    const db = new ClassicLevel(path.join("build/packs", entry.name), { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
    try {
      await db.open();
      for await (const [, value] of db.iterator({ fillCache: false })) {
        for (const asset of collectStrings(value)) {
          if (!/^(?:systems\/lone-wolf-fists|modules\/game-icons-net)\//.test(asset)) continue;
          references += 1;
          const systemAsset = asset.startsWith("systems/lone-wolf-fists/");
          const relative = decodeURIComponent(asset.split(/[?#]/, 1)[0]).replace(systemAsset ? "systems/lone-wolf-fists/" : "modules/game-icons-net/", "");
          if (!(systemAsset ? systemFiles : moduleFiles).has(relative)) missing.add(asset);
        }
      }
    } finally { await db.close(); }
  }
  if (missing.size) throw new Error(`Missing pack assets:\n${[...missing].sort().join("\n")}`);
  process.stdout.write(`Validated ${references} pack asset references against source and game-icons-net.\n`);
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
