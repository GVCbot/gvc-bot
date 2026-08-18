require("dotenv").config();
const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");

const clientId = process.env.APPLICATION_ID;
const token = process.env.TOKEN;

const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);

    if (command.data && command.data.toJSON) {
      commands.push(command.data.toJSON());
    } else {
      console.warn(`[WARN] Command file missing data.toJSON(): ${file}`);
    }
  }
}

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log(`🔄 Registering ${commands.length} GLOBAL slash commands...`);
    await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    });
    console.log(
      `✅ Successfully registered ${commands.length} global commands. Note: can take up to ~1hr to appear in Discord.`,
    );
  } catch (error) {
    console.error("❌ Error registering commands:", error);
  }
})();
