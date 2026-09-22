const fs = require("node:fs");

const actorSheet = fs.readFileSync("module/sheets/actor-sheet.mjs", "utf8");
const squadModel = fs.readFileSync("module/data/actor-squad.mjs", "utf8");
const failures = [];

const prepareItems = actorSheet.slice(actorSheet.indexOf("_prepareItems(context)"), actorSheet.indexOf("_prepareSkills(context)"));
if (prepareItems.includes(".delete(")) failures.push("_prepareItems must not persist document deletions during rendering");
if (!actorSheet.includes("context.missingReferences")) failures.push("sheet preparation must record missing UUID references");
if (!squadModel.includes("if (!member) continue;")) failures.push("squad preparation must tolerate missing UUID references");

if (failures.length) throw new Error(failures.join("\n"));
process.stdout.write("Safe lifecycle contracts passed.\n");
