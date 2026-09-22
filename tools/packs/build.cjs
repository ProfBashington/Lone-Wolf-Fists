const fs = require("node:fs");
const path = require("node:path");
const { ClassicLevel } = require("classic-level");

const [sourceRoot = "pack-source", destination = "build/packs"] = process.argv.slice(2);

function assertSafeDestination(destinationPath) {
  const expectedRoot = path.resolve("build", "packs");
  const resolved = path.resolve(destinationPath);
  if (resolved !== expectedRoot && !resolved.startsWith(`${expectedRoot}${path.sep}`)) throw new Error(`Refusing to write outside ${expectedRoot}: ${resolved}`);
}

function loadSource(filePath) {
  const source = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (source.format !== "lwf-pack-source-v1" || typeof source.pack !== "string" || !Array.isArray(source.records)) throw new Error(`Invalid pack source: ${filePath}`);
  const seen = new Set();
  for (const record of source.records) {
    if (!record || typeof record.key !== "string" || !("value" in record)) throw new Error(`Invalid record in ${filePath}`);
    if (seen.has(record.key)) throw new Error(`Duplicate key in ${filePath}: ${record.key}`);
    seen.add(record.key);
  }
  return source;
}

(async () => {
  if (!fs.existsSync(sourceRoot)) throw new Error(`Pack source does not exist: ${sourceRoot}`);
  assertSafeDestination(destination);
  fs.rmSync(destination, { recursive: true, force: true });
  fs.mkdirSync(destination, { recursive: true });
  const files = fs.readdirSync(sourceRoot).filter((file) => file.endsWith(".json")).sort();
  if (!files.length) throw new Error(`No pack source files found in: ${sourceRoot}`);
  for (const file of files) {
    const source = loadSource(path.join(sourceRoot, file));
    const db = new ClassicLevel(path.join(destination, source.pack), { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: true });
    try {
      await db.open();
      for (const record of [...source.records].sort((left, right) => left.key.localeCompare(right.key))) await db.put(record.key, record.value);
    } finally { await db.close(); }
    process.stdout.write(`${source.pack}: ${source.records.length} records\n`);
  }
})().catch((error) => { console.error(error.stack || error); process.exitCode = 1; });
