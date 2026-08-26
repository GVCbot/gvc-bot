require("dotenv").config();
const { REST, Routes } = require("discord.js");

const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    const commands = await rest.get(
      Routes.applicationGuildCommands(clientId, guildId),
    );
    console.log(`📋 ${commands.length} commands currently registered:\n`);
    commands
      .map((c) => c.name)
      .sort()
      .forEach((name) => console.log(`  /${name}`));
  } catch (err) {
    console.error("❌ Failed to fetch commands:", err);
  }
})();
