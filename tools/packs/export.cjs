const fs = require("node:fs");
const path = require("node:path");
const { ClassicLevel } = require("classic-level");

const [packRoot = "packs", destination = "pack-source"] = process.argv.slice(2);

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}

async function readPack(packPath) {
  const db = new ClassicLevel(packPath, { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
  const records = [];
  try {
    await db.open();
    for await (const [key, value] of db.iterator({ fillCache: false })) records.push({ key, value: stable(value) });
  } finally {
    await db.close();
  }
  return records.sort((left, right) => left.key.localeCompare(right.key));
}

(async () => {
  if (!fs.existsSync(packRoot)) throw new Error(`Pack root does not exist: ${packRoot}`);
  if (fs.existsSync(destination) && fs.readdirSync(destination).length) throw new Error(`Refusing to overwrite non-empty pack source: ${destination}`);
  const packs = fs.readdirSync(packRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
  fs.mkdirSync(destination, { recursive: true });
  for (const pack of packs) {
    const records = await readPack(path.join(packRoot, pack));
    fs.writeFileSync(path.join(destination, `${pack}.json`), `${JSON.stringify({ format: "lwf-pack-source-v1", pack, records }, null, 2)}\n`);
    process.stdout.write(`${pack}: ${records.length} records\n`);
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
