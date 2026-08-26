require("dotenv").config();
console.log("APPLICATION_ID:", process.env.APPLICATION_ID);
console.log("GUILD_ID:", process.env.GUILD_ID);
console.log("TOKEN length:", process.env.TOKEN?.length);
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

// -----------------------------------------------------
// LOAD COMMANDS
// -----------------------------------------------------
let loadedCount = 0;
let failedCount = 0;

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);

    try {
      const command = require(filePath);

      if (command.data && command.data.toJSON) {
        commands.push(command.data.toJSON());
        loadedCount++;
      } else {
        console.warn(`⚠️ [WARN] ${folder}/${file} missing data.toJSON()`);
        failedCount++;
      }
    } catch (err) {
      console.error(`❌ [FAILED TO LOAD] ${folder}/${file}`);
      console.error(`   Reason: ${err.message}`);
      failedCount++;
    }
  }
}

console.log(
  `\n📦 Loaded ${loadedCount} command(s), ${failedCount} failed to load.\n`,
);

// -----------------------------------------------------
// REGISTER COMMANDS
// -----------------------------------------------------
const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("🔄 Registering slash commands...");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log(`✅ Successfully registered ${commands.length} commands.`);
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
