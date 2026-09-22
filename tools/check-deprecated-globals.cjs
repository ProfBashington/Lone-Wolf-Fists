const fs = require("node:fs");
const path = require("node:path");

// Foundry v14 keeps these globals only as deprecated aliases. System code must use the
// namespaced APIs (foundry.applications.*, foundry.utils.*) instead.
const FORBIDDEN = [
  [/(?<![.\w])Dialog\s*\.\s*(confirm|prompt|wait)\b/, "use foundry.applications.api.DialogV2"],
  [/(?<![.\w])new\s+Dialog\s*\(/, "use foundry.applications.api.DialogV2"],
  [/(?<![.\w])renderTemplate\s*\(/, "use foundry.applications.handlebars.renderTemplate"],
  [/(?<![.\w])loadTemplates\s*\(/, "use foundry.applications.handlebars.loadTemplates"],
  [/(?<![.\w])FormDataExtended\b/, "use foundry.applications.ux.FormDataExtended"],
  [/(?<![.\w])(duplicate|mergeObject|getProperty|setProperty|expandObject|flattenObject)\s*\(/, "use foundry.utils"],
];

const files = [];
const visit = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) visit(full);
    else if (entry.name.endsWith(".mjs")) files.push(full);
  }
};
visit("module");

const failures = [];
for (const file of files) {
  fs.readFileSync(file, "utf8").split(/\r?\n/).forEach((line, index) => {
    if (/^\s*(\/\/|\*)/.test(line)) return;
    for (const [pattern, fix] of FORBIDDEN) {
      if (pattern.test(line)) failures.push(`${file}:${index + 1}: ${line.trim()} (${fix})`);
    }
  });
}

// Dialog content is inserted into DialogV2's own <form> and sanitized, so popup templates
// must not contain a <form> root or inline scripts.
for (const entry of fs.readdirSync("templates/popups")) {
  const text = fs.readFileSync(path.join("templates/popups", entry), "utf8");
  if (/<form\b/i.test(text)) failures.push(`templates/popups/${entry}: popup content must not contain <form>`);
  if (/<script\b/i.test(text)) failures.push(`templates/popups/${entry}: popup content must not contain <script>`);
}

if (failures.length) throw new Error(`Deprecated global API usage:\n${failures.join("\n")}`);
process.stdout.write(`Deprecated-global contracts passed (${files.length} modules).\n`);
