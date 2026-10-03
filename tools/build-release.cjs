#!/usr/bin/env node
"use strict";

// Builds the installable system ZIP from an explicit allowlist, so development files
// (tools, SCSS sources, package manifests, pack sources, node_modules, maps) never ship.
// Usage: node tools/build-release.cjs [outputDirectory]

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const zlib = require("node:zlib");
const { execSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "dist"));

const allowDirectories = ["assets", "css", "lang", "module", "templates"];
const allowFiles = ["system.json", "README.md", "CHANGELOG.md", "LICENSE.md", "MIT-LICENSE.txt", "ATTRIBUTIONS.md"];
const requiredFiles = ["system.json", "LICENSE.md", "MIT-LICENSE.txt", "assets/LICENSE-ASSETS.md", "packs/LICENSE-PACKS.md", "css/lone-wolf-fists.css", "module/lone-wolf-fists.mjs"];
const forbiddenPatterns = [/^LOG$/, /^LOG\.old$/, /\.map$/, /\.scss$/, /^package\.json$/, /^package-lock\.json$/, /^template\.json$/, /\.xcf$/, /^\.git/, /^\.nvmrc$/, /^\.npmrc$/];

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, failure) {
  try {
    execSync(command, { cwd: root, stdio: "inherit" });
  } catch {
    fail(failure);
  }
}

// Collects [sourcePath, archivePath] pairs under a directory.
function collect(sourceDir, archiveDir, { skipDirs = [], skipFile = () => false } = {}) {
  const entries = [];
  for (const dirent of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, dirent.name);
    const archive = `${archiveDir}/${dirent.name}`;
    if (dirent.isDirectory()) {
      if (!skipDirs.includes(dirent.name)) entries.push(...collect(source, archive, { skipDirs, skipFile }));
    } else if (dirent.isFile() && !skipFile(dirent.name)) {
      entries.push([source, archive]);
    }
  }
  return entries;
}

const sha256 = data => crypto.createHash("sha256").update(data).digest("hex");

// Minimal ZIP writer (deflate, fixed 1980-01-01 timestamps) so identical inputs give identical archives.
function writeZip(target, files) {
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const nameBuffer = Buffer.from(name, "utf8");
    const compressed = zlib.deflateRawSync(data, { level: 9 });
    const crc = zlib.crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x0800, 6); // UTF-8 names
    local.writeUInt16LE(8, 8); // deflate
    local.writeUInt16LE(0, 10); // time 00:00
    local.writeUInt16LE(0x21, 12); // date 1980-01-01
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    local.writeUInt16LE(0, 28);
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50, 0);
    header.writeUInt16LE(20, 4);
    header.writeUInt16LE(20, 6);
    local.copy(header, 8, 6, 26);
    header.writeUInt16LE(nameBuffer.length, 28);
    header.writeUInt32LE(offset, 42);
    chunks.push(local, nameBuffer, compressed);
    central.push(header, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralBuffer = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(files.length, 8);
  end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(centralBuffer.length, 12);
  end.writeUInt32LE(offset, 16);
  fs.writeFileSync(target, Buffer.concat([...chunks, centralBuffer, end]));
}

run("npm run build", "SCSS build failed; no release archive was created.");
run("npm run packs:roundtrip", "Pack validation failed; no release archive was created.");

const entries = [];
for (const directory of allowDirectories) {
  entries.push(...collect(path.join(root, directory), directory, { skipDirs: ["GIMP"], skipFile: name => name.endsWith(".map") }));
}
for (const file of allowFiles) entries.push([path.join(root, file), file]);
// LevelDB LOG files are timestamped diagnostics, not data; leaving them out keeps builds reproducible.
entries.push(...collect(path.join(root, "build", "packs"), "packs", { skipFile: name => name === "LOG" || name === "LOG.old" }));
// The rebuilt LevelDB packs do not carry the pack license notice; it must ship with them.
entries.push([path.join(root, "packs", "LICENSE-PACKS.md"), "packs/LICENSE-PACKS.md"]);
entries.sort((a, b) => (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0));

const names = new Set(entries.map(([, name]) => name));
for (const file of requiredFiles) {
  if (!names.has(file)) fail(`Release is missing required file ${file}.`);
}
const forbidden = entries.filter(([, name]) => forbiddenPatterns.some(pattern => pattern.test(path.posix.basename(name))));
if (forbidden.length) fail(`Release contains excluded files: ${forbidden.map(([, name]) => name).join(", ")}`);

const manifestText = fs.readFileSync(path.join(root, "system.json"), "utf8");
const manifest = JSON.parse(manifestText);
if (manifest.id !== "lone-wolf-fists") fail("Manifest has an unexpected system id.");

const files = entries.map(([source, name]) => ({ name, data: fs.readFileSync(source) }));
// Per-file content hashes let two builds be compared independently of the ZIP container.
const contentText = files.map(({ name, data }) => `${sha256(data)}  ${name}`).join("\n") + "\n";
const contentHash = sha256(Buffer.from(contentText, "utf8"));

const now = new Date();
const stamp = now.toISOString().replace(/[-:]/g, "").replace("T", "-").slice(0, 15);
fs.mkdirSync(output, { recursive: true });
const archive = path.join(output, `lone-wolf-fists-${manifest.version}-v14.368-local-${stamp}.zip`);
writeZip(archive, files);
const hash = sha256(fs.readFileSync(archive));
fs.writeFileSync(`${archive}.contents.txt`, contentText);
const git = args => execSync(`git ${args}`, { cwd: root, encoding: "utf8" }).trim();
const receipt = {
  archive,
  sha256: hash,
  contentSha256: contentHash,
  fileCount: files.length,
  system: manifest.id,
  systemVersion: manifest.version,
  sourceCommit: git("rev-parse HEAD"),
  sourceDirty: git("status --porcelain").length > 0,
  targetFoundry: "14.368",
  createdAt: now.toISOString()
};
fs.writeFileSync(`${archive}.json`, JSON.stringify(receipt, null, 2) + "\n");

// GitHub Release assets with the fixed names the manifest/download URLs expect.
const releaseDir = path.join(output, `release-v${manifest.version}`);
fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir);
fs.copyFileSync(archive, path.join(releaseDir, "lone-wolf-fists.zip"));
fs.writeFileSync(path.join(releaseDir, "system.json"), manifestText);
console.log(`Release assets: ${releaseDir} (upload lone-wolf-fists.zip and system.json to tag v${manifest.version})`);
console.log(`Built ${archive}`);
console.log(`SHA256 ${hash}`);
console.log(`Content SHA256 ${contentHash} (${files.length} files)`);
