const fs = require("node:fs");

const dice = fs.readFileSync("module/helpers/dice-roll.mjs", "utf8");
const actorSheet = fs.readFileSync("module/sheets/actor-sheet.mjs", "utf8");
const system = fs.readFileSync("module/lone-wolf-fists.mjs", "utf8");
const actorDoc = fs.readFileSync("module/documents/actor.mjs", "utf8");
const failures = [];

if (dice.includes("=== NaN") || !dice.includes("Number.isInteger(diceNumber)")) failures.push("/effort must reject invalid dice counts");
if (actorSheet.includes("const value = ev.currentTarget.value;")) failures.push("membership bounds must use a mutable or normalized value");
if (!actorSheet.includes("for (const artifact of artifacts)")) failures.push("Prana Flare must iterate artifact documents");
if (!actorSheet.includes("await this._prepareDomain(context)")) failures.push("domain sheet preparation must await asynchronous references");
if (system.includes("Hooks.on('endCombat'")) failures.push("release build must not retain the test endCombat hook");
if (system.includes("'renderChatLog'") || !system.includes("Hooks.on('renderChatMessageHTML'")) failures.push("dice-set listeners must bind per message via renderChatMessageHTML (v14 passes HTMLElement, not jQuery)");

if (!actorDoc.includes("super.prepareBaseData()")) failures.push("lwfActor.prepareBaseData must call super so v14 resets Active Effect phases");
if (!actorDoc.includes("super.prepareDerivedData()")) failures.push("lwfActor.prepareDerivedData must call super");
if (actorSheet.includes('dataset.id.split("-")[1]')) failures.push("deleting a named squad/follower member must look up its full UUID, not split('-')[1] (removed the wrong member)");
if (!/Hooks\.on\('hotbarDrop'[\s\S]{0,200}return false;/.test(system)) failures.push("hotbarDrop must return false synchronously for Item drops so core does not also create a sheet macro");
if (/if \(!game\.user\.isGM\) return;[\s\S]*Hooks\.on\('hotbarDrop'/.test(system)) failures.push("hotbarDrop must be registered for every user, not only GMs");
if (/Folder\.create|\.configure\(/.test(system)) failures.push("startup must not create compendium folders or reconfigure packs; system.json packFolders is authoritative");

if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write("Release-blocker regression contracts passed.\n");
