const fs = require("node:fs");
const path = require("node:path");
const { ClassicLevel } = require("classic-level");

const [sourceRoot = "pack-source", packRoot = "build/packs"] = process.argv.slice(2);

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
  } finally { await db.close(); }
  return records.sort((left, right) => left.key.localeCompare(right.key));
}

(async () => {
  const files = fs.readdirSync(sourceRoot).filter((file) => file.endsWith(".json")).sort();
  const failures = [];
  for (const file of files) {
    const source = JSON.parse(fs.readFileSync(path.join(sourceRoot, file), "utf8"));
    const actual = await readPack(path.join(packRoot, source.pack));
    const expected = source.records.map(({ key, value }) => ({ key, value: stable(value) })).sort((left, right) => left.key.localeCompare(right.key));
    if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(source.pack);
    else process.stdout.write(`${source.pack}: semantic readback passed (${actual.length} records)\n`);
  }
  if (failures.length) throw new Error(`Semantic readback failed: ${failures.join(", ")}`);
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
