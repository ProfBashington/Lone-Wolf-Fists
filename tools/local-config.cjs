const fs = require("node:fs");
const path = require("node:path");

/**
 * Machine-specific paths for development tools. They come from environment variables or from
 * local.config.json (git-ignored; copy local.config.example.json to create it), never from the repo.
 */
function localConfig() {
  const file = path.resolve(__dirname, "..", "local.config.json");
  const config = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
  return {
    devServer: process.env.LWF_DEV_SERVER ?? config.devServer,
    gameIconsModule: process.env.LWF_GAME_ICONS_MODULE ?? config.gameIconsModule,
  };
}

function requireSetting(name, value) {
  if (!value) throw new Error(`Set "${name}" in local.config.json (see local.config.example.json) or the matching environment variable.`);
  return value;
}

module.exports = { localConfig, requireSetting };
