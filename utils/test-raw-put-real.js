require("dotenv").config();
const fs = require("node:fs");
const path = require("node:path");

const clientId = process.env.APPLICATION_ID;
const guildId = process.env.GUILD_ID;
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

console.log(`Loaded ${commands.length} commands. Sending PUT...`);

const url = `https://discord.com/api/v10/applications/${clientId}/guilds/${guildId}/commands`;

fetch(url, {
  method: "PUT",
  headers: {
    Authorization: `Bot ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(commands),
})
  .then(async (res) => {
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Body:", text.slice(0, 1000));
  })
  .catch((err) => console.error("❌ fetch failed:", err));

setTimeout(() => {
  console.log("⏱️ Still hanging after 15s.");
}, 15000);
