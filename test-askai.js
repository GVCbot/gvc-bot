require("dotenv").config();
const { REST, Routes } = require("discord.js");
const path = require("node:path");

const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
const token = process.env.TOKEN;

// Adjust this path to wherever askai.js actually lives
const askaiCommand = require(
  path.join(__dirname, "commands", "misc", "askai.js"),
);

console.log("🔍 Raw command.data:", askaiCommand.data);
console.log(
  "\n🔍 toJSON() output:\n",
  JSON.stringify(askaiCommand.data.toJSON(), null, 2),
);

const rest = new REST({ version: "10" }).setToken(token);

(async () => {
  try {
    console.log("\n🔄 Attempting to register ONLY askai...");
    const result = await rest.post(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: askaiCommand.data.toJSON() },
    );
    console.log("✅ Success! Registered as:", result.name, result.id);
  } catch (err) {
    console.error("❌ Discord rejected this command:");
    console.error(err);
  }
})();
