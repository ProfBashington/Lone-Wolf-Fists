const fs = require("node:fs");

const dice = fs.readFileSync("module/helpers/dice-roll.mjs", "utf8");
const actorSheet = fs.readFileSync("module/sheets/actor-sheet.mjs", "utf8");
const system = fs.readFileSync("module/lone-wolf-fists.mjs", "utf8");
const failures = [];

if (dice.includes("=== NaN") || !dice.includes("Number.isInteger(diceNumber)")) failures.push("/effort must reject invalid dice counts");
if (actorSheet.includes("const value = ev.currentTarget.value;")) failures.push("membership bounds must use a mutable or normalized value");
if (!actorSheet.includes("for (const artifact of artifacts)")) failures.push("Prana Flare must iterate artifact documents");
if (!actorSheet.includes("await this._prepareDomain(context)")) failures.push("domain sheet preparation must await asynchronous references");
if (system.includes("Hooks.on('endCombat'")) failures.push("release build must not retain the test endCombat hook");
if (!system.includes("off('click.lwf', '.dice-set')")) failures.push("chat listener must be namespaced and deduplicated");

if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write("Release-blocker regression contracts passed.\n");
