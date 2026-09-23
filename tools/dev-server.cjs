const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { localConfig, requireSetting } = require("./local-config.cjs");

// Forwards an action (deploy, stop, status, verify, logs) to the local dev server controller.
// Start the server by running server.ps1 directly: through npm, the Foundry child keeps npm's pipe open.
const action = process.argv[2];
if (!action) throw new Error("Usage: node tools/dev-server.cjs <deploy|stop|status|verify|logs>");
const script = path.join(requireSetting("devServer", localConfig().devServer), "server.ps1");
const result = spawnSync("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Action", action], { stdio: "inherit" });
process.exitCode = result.status ?? 1;
