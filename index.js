// ===============================
// 🚀 BOOT SEQUENCE TRACKER
// ===============================
// Every stage of startup logs a timestamped checkpoint. If the process
// stalls, whatever printed last tells you exactly where to look.
const BOOT_START = Date.now();
function boot(stage, extra = "") {
  const elapsed = Date.now() - BOOT_START;
  console.log(`🚀 [BOOT +${elapsed}ms] ${stage}${extra ? " — " + extra : ""}`);
}

boot("Process started", `node ${process.version} on ${process.platform}`);

require("dotenv").config();
boot("dotenv config loaded");

// ===============================
// 🌐 Web Server (Render health check)
// ===============================
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => boot("Web server listening", "port 3000"));

// ===============================
// 📦 Core Dependencies
// ===============================
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
  Events,
  AuditLogEvent,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const fs = require("node:fs");
const path = require("node:path");
const embedTemplate = require("./utils/embedTemplate");
const moatembedTemplate = require("./utils/moatembedTemplate");
const foxbankembedTemplate = require("./utils/foxbankembedTemplate");

const {
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
  MOAT_BUSINESS_LIMIT,
} = require("./economy/economyutils");
const handleInbox = require("./utils/inbox");

boot("Dependencies loaded");

// ===============================
// ⚙️ Configuration
// ===============================
const GENERAL_LOG_CHANNEL = "1534886183040188547";
const SESSION_LOG_CHANNEL = "1534889791416438784";
const HR_ROLE_ID = "1350582607217430650";
const SESSION_BUTTON_LOG = "1515684241101295646";
const OTHER_BUTTON_LOG = "1536797059355508826";

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

const SESSION_LINK_IDS = ["rl_", "ri_", "ea_", "regen_"];

const SESSION_COMMANDS = [
  "session",
  "release",
  "reinvite",
  "earlyaccess",
  "regen",
  "aorpchange",
  "peacetime",
  "drift",
];

const protect = require("./security/protect");
protect.enableGlobalProtection();
boot("Global protection enabled");

// ===============================
// 🧰 Helper Functions
// ===============================
function createRecoveredEmbed(originalEmbed, executor, timestamp) {
  const recoveredEmbed = { ...originalEmbed.data };
  recoveredEmbed.color = parseInt("db2727", 16);
  recoveredEmbed.title = `${STAR} RECOVERED DELETED LOG BY ${executor.tag || executor.username} AT ${timestamp} ${STAR}`;
  return recoveredEmbed;
}

function flattenOptions(options = []) {
  let result = [];
  for (const opt of options) {
    if (opt.options) result = result.concat(flattenOptions(opt.options));
    else result.push(opt);
  }
  return result;
}

function formatOptionValue(opt) {
  if (opt.user) return `${opt.user} (${opt.user.id})`;
  if (opt.channel) return `${opt.channel} (${opt.channel.id})`;
  if (opt.role) return `${opt.role} (${opt.role.id})`;
  if (opt.attachment) return `${opt.attachment.url}`;
  return opt.value;
}

function isSessionRelated(commandName = "") {
  return SESSION_COMMANDS.some((s) => commandName.toLowerCase().includes(s));
}

function logEvent(
  client,
  channelIds,
  title,
  interaction,
  extraDescription = "",
) {
  const guild = client.guilds.cache.get("1058305800252182528");
  if (!guild) {
    console.warn("🟡 logEvent: target guild not found in cache");
    return;
  }

  const unix = Math.floor(Date.now() / 1000);
  const timestamp = `<t:${unix}:F>`;

  const description =
    `> ${ARROW} **User:** ${interaction.user} (${interaction.user.id})\n` +
    `> ${ARROW} **Guild:** ${guild.name} (${guild.id})\n` +
    (interaction.channel
      ? `> ${ARROW} **Channel:** ${interaction.channel} (${interaction.channel.id})\n`
      : `> ${ARROW} **Channel:** DM\n`) +
    (interaction.message
      ? `> ${ARROW} **Message ID:** ${interaction.message.id}\n`
      : "") +
    `> ${ARROW} **Timestamp:** ${timestamp}\n\n` +
    extraDescription;

  const { embed } = embedTemplate({ title, description });

  const ids = Array.isArray(channelIds) ? channelIds : [channelIds];
  for (const id of ids) {
    const logChannel = guild.channels.cache.get(id);
    if (logChannel) {
      logChannel
        .send({ embeds: [embed] })
        .catch((err) =>
          console.error(
            `🔴 logEvent: failed to send to channel ${id}:`,
            err.message,
          ),
        );
    } else {
      console.warn(`🟡 logEvent: channel ${id} not found in cache`);
    }
  }
}

function logButtonClick(interaction) {
  const unix = Math.floor(Date.now() / 1000);
  const timestamp = `<t:${unix}:F>`;
  const user = interaction.user;
  const buttonName = interaction.component?.label || "Unknown Button";

  const channelInfo = interaction.guild
    ? `${interaction.channel} (${interaction.channel.id})`
    : "Direct Message";

  const logDescription =
    `> ${ARROW} **User:** ${user}\n` +
    `> ${ARROW} **User ID:** ${user.id}\n` +
    `> ${ARROW} **Button ID:** ${interaction.customId}\n` +
    `> ${ARROW} **Button Name:** ${buttonName}\n` +
    `> ${ARROW} **Channel:** ${channelInfo}\n` +
    (interaction.message
      ? `> ${ARROW} **Message ID:** ${interaction.message.id}\n`
      : "") +
    `> ${ARROW} **Clicked At:** ${timestamp}`;

  const { embed } = embedTemplate({
    title: `${STAR} Button Click Logged ${STAR}`,
    description: logDescription,
    noLogo: true,
  });

  if (!interaction.guild) return;

  const isSessionButton = SESSION_LINK_IDS.some((id) =>
    interaction.customId.startsWith(id),
  );
  const targetLogChannel = interaction.guild.channels.cache.get(
    isSessionButton ? SESSION_BUTTON_LOG : OTHER_BUTTON_LOG,
  );

  if (targetLogChannel) {
    targetLogChannel
      .send({ embeds: [embed] })
      .catch((err) =>
        console.error("🔴 logButtonClick: send failed:", err.message),
      );
  } else {
    console.warn("🟡 logButtonClick: target log channel not found in cache");
  }
}

async function sendVehiclePage(interaction, vehicles, page, targetId) {
  const perPage = 5;
  const totalPages = Math.max(1, Math.ceil(vehicles.length / perPage));
  const start = page * perPage;
  const pageVehicles = vehicles.slice(start, start + perPage);

  let desc = pageVehicles.length
    ? pageVehicles
        .map(
          (v) =>
            `> • **${v.year} ${v.make} ${v.model}** (${v.color}) — Plate: ${v.plate}`,
        )
        .join("\n")
    : `> ${ARROW} No vehicles on this page.`;

  const { embed } = embedTemplate({
    title: `🚗 Registered Vehicles (Page ${page + 1}/${totalPages})`,
    description: desc,
  });

  const targetMember = interaction.guild.members.cache.get(targetId);
  embed.setThumbnail(
    targetMember?.user.displayAvatarURL({ dynamic: true }) ||
      interaction.user.displayAvatarURL({ dynamic: true }),
  );

  const row = new ActionRowBuilder();
  if (page > 0)
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`vehPage_${interaction.user.id}_${targetId}_${page - 1}`)
        .setLabel("⬅ Previous")
        .setStyle(ButtonStyle.Secondary),
    );
  if (page < totalPages - 1)
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`vehPage_${interaction.user.id}_${targetId}_${page + 1}`)
        .setLabel("Next ➡")
        .setStyle(ButtonStyle.Secondary),
    );

  return interaction.reply({
    embeds: [embed],
    components: row.components.length ? [row] : [],
    flags: 64,
  });
}

// Normalizes legacy bank type strings so old banks still resolve correctly
function normalizeType(type) {
  if (!type) return type;
  const t = type.toLowerCase();

  if (t.includes("fox")) return "Fox Bank";
  if (t.includes("moat")) return "Moat Castle";

  return type;
}

async function loadAllBanks(userRecord) {
  const owned = (userRecord.banks || []).map((b) => ({
    ...b,
    type: normalizeType(b.type),
  }));

  const joinedIds = userRecord.joinedBanks || [];
  const joined = [];

  if (joinedIds.length > 0) {
    const allRecords = await getAllUserRecords();
    for (const bankId of joinedIds) {
      for (const rec of allRecords) {
        const bank = (rec.banks || []).find((b) => b.id === bankId);
        if (bank) {
          joined.push({
            ...bank,
            type: normalizeType(bank.type),
          });
          break;
        }
      }
    }
  }

  return [...owned, ...joined];
}

async function findBankOwnerRecord(bankId, userRecord) {
  if ((userRecord.banks || []).some((b) => b.id === bankId)) return userRecord;

  const allRecords = await getAllUserRecords();
  return (
    allRecords.find((rec) => (rec.banks || []).some((b) => b.id === bankId)) ||
    null
  );
}

boot("Helper functions defined");

// ===============================
// 🤖 Client Setup
// ===============================
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
boot("Discord Client constructed");

// ===============================
// 🛠 Utility Listeners
// ===============================
require("./utils/roleLeave")(client);
require("./utils/welcomeMessage")(client);
require("./utils/partnerMessage")(client);

const sessionReadySent = new Set();

// ===============================
// 📡 ADVANCED GATEWAY MONITORING
// ===============================

// Successful connection
client.on("shardReady", (id) => {
  console.log(`🟢 [Gateway] Shard ${id} connected successfully.`);
});

// Reconnecting (Discord or network hiccup)
client.on("shardReconnecting", (id) => {
  console.log(`🟡 [Gateway] Shard ${id} reconnecting...`);
});

// Disconnected (with detailed reason)
client.on("shardDisconnect", (event, id) => {
  console.log(
    `🔴 [Gateway] Shard ${id} disconnected — code ${event.code}, reason: ${event.reason || "none"}`,
  );

  // Common gateway close codes
  const codes = {
    1000: "Normal closure",
    4000: "Unknown error",
    4001: "Unknown opcode",
    4002: "Decode error",
    4003: "Not authenticated",
    4004: "Authentication failed (INVALID TOKEN)",
    4005: "Already authenticated",
    4007: "Invalid sequence",
    4008: "Rate limited",
    4009: "Session timed out",
    4010: "Invalid shard",
    4011: "Sharding required",
    4012: "Invalid API version",
    4013: "Invalid intent",
    4014: "Disallowed intent",
  };

  if (codes[event.code]) {
    console.log(`🔎 [Gateway] Meaning: ${codes[event.code]}`);
  }
});

// Resume session (no full reconnect)
client.on("shardResume", (id, replayed) => {
  console.log(
    `🔁 [Gateway] Shard ${id} resumed — replayed ${replayed} events.`,
  );
});

// Debug (filtered for important events)
client.on("debug", (msg) => {
  const lower = msg.toLowerCase();
  const important =
    lower.includes("identify") ||
    lower.includes("invalid session") ||
    lower.includes("cloudflare") ||
    lower.includes("rate limit") ||
    lower.includes("reconnect") ||
    lower.includes("resume") ||
    lower.includes("gateway") ||
    lower.includes("hello") ||
    lower.includes("heartbeat");

  if (important) {
    console.log(`🔍 [Debug] ${msg}`);
  }
});

// Warnings from Discord.js
client.on("warn", (msg) => {
  console.warn(`⚠️ [Warn] ${msg}`);
});

// Fatal gateway errors
client.on("error", (err) => {
  console.error(`❌ [Error] ${err}`);
});

// ===============================
// 🎮 Activity Loader
// ===============================
const activitiesPath = path.join(__dirname, "activities");
const activityFiles = fs
  .readdirSync(activitiesPath)
  .filter((f) => f.endsWith(".js"));

for (const file of activityFiles) {
  try {
    const activity = require(path.join(activitiesPath, file));
    activity(client); // Pass the client to the activity module
    console.log(`🎮 Loaded activity: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to load activity ${file}:`, err.message);
  }
}

// ===============================
// 📂 Command Loader
// ===============================
boot("Command loader starting");
const foldersPath = path.join(__dirname, "commands");
let loadedCount = 0;
let failedCount = 0;

for (const folder of fs.readdirSync(foldersPath)) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((f) => f.endsWith(".js"));

  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      if (!command?.data?.name) {
        console.warn(`🟡 Skipped ${folder}/${file} — missing data.name`);
        failedCount++;
        continue;
      }
      client.commands.set(command.data.name, command);
      loadedCount++;
    } catch (err) {
      console.error(
        `🔴 Failed to load command ${folder}/${file}:`,
        err.message,
      );
      failedCount++;
    }
  }
}

boot("Command loader finished", `${loadedCount} loaded, ${failedCount} failed`);

// ===============================
// 🎉 Ready Event
// ===============================
client.once(Events.ClientReady, () => {
  boot("Client ready", `logged in as ${client.user.tag}`);
  console.log(`🟢 Bot is online as ${client.user.tag}`);
  console.log(`🏠 Serving ${client.guilds.cache.size} guild(s)`);
});

// ===============================
// 🎛️ Interaction Handler
// ===============================
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Prevent duplicate execution/logging
    if (interaction.noLog) return;

    let logTitle = `${STAR} Interaction Used ${STAR}`;
    let extraDetails = "";
    let logChannels = [GENERAL_LOG_CHANNEL];

    if (interaction.isChatInputCommand()) {
      logTitle = `${STAR} Command Used ${STAR}`;

      const flatOptions = flattenOptions(interaction.options.data);
      const optionsFormatted = flatOptions
        .map((opt) => `> ${ARROW} **${opt.name}:** ${formatOptionValue(opt)}`)
        .join("\n");

      extraDetails =
        `> ${ARROW} **Command:** /${interaction.commandName}\n` +
        (optionsFormatted ? `${optionsFormatted}\n` : "");

      if (isSessionRelated(interaction.commandName))
        logChannels = [GENERAL_LOG_CHANNEL, SESSION_LOG_CHANNEL];
    } else if (interaction.isButton()) {
      logButtonClick(interaction);
    } else if (interaction.isAnySelectMenu()) {
      logTitle = `${STAR} Menu Selected ${STAR}`;
      extraDetails =
        `> ${ARROW} **Menu ID:** ${interaction.customId}\n` +
        `> ${ARROW} **Values:** ${interaction.values.join(", ")}`;
    } else if (interaction.isModalSubmit()) {
      logTitle = `${STAR} Modal Submitted ${STAR}`;
      extraDetails = `> ${ARROW} **Modal ID:** ${interaction.customId}`;
    } else if (interaction.isContextMenuCommand()) {
      logTitle = `${STAR} Context Menu Used ${STAR}`;
      extraDetails = `> ${ARROW} **Context Command:** ${interaction.commandName}`;
      if (isSessionRelated(interaction.commandName))
        logChannels = [GENERAL_LOG_CHANNEL, SESSION_LOG_CHANNEL];
    }

    // ===============================
    // 🆘 Support Menu Handler
    // ===============================
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === "support_select"
    ) {
      const selection = interaction.values[0];
      const user = interaction.user;

      const modal = new ModalBuilder()
        .setCustomId(`support_modal_${selection}`)
        .setTitle("Support Request");

      const reasonInput = new TextInputBuilder()
        .setCustomId("support_reason")
        .setLabel("Describe why you’re opening this ticket:")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder("Briefly explain your issue or concern...");

      const row = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(row);

      return interaction.showModal(modal);
    }

    // ===============================
    // 📝 Support Modal Submission Handler
    // ===============================
    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith("support_modal_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const selection = interaction.customId.split("_")[2];
      const reason = interaction.fields.getTextInputValue("support_reason");
      const user = interaction.user;
      const guild = interaction.guild;

      const CATEGORY_ID = "1539173722743906344";
      const STAFF_ROLE = "1350897509752373341";
      const PARTNERSHIP_ROLE = "1497520864135086090";
      const HR_ROLE = "1350582607217430650";

      const roleMap = {
        general: STAFF_ROLE,
        partnership: PARTNERSHIP_ROLE,
        staff: HR_ROLE,
        user: STAFF_ROLE,
      };

      const roleId = roleMap[selection];
      const channelName = `${selection}-${user.username.toLowerCase()}`;
      const category = guild.channels.cache.get(CATEGORY_ID);

      const channel = await guild.channels.create({
        name: channelName,
        type: 0,
        parent: category.id,
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: ["ViewChannel"] },
          { id: roleId, allow: ["ViewChannel", "SendMessages"] },
          { id: user.id, allow: ["ViewChannel", "SendMessages"] },
        ],
      });

      const { embed, files } = embedTemplate({
        title: `${STAR} Support Ticket Created ${STAR}`,
        description:
          `${ARROW} **Opened By:** ${user}\n` +
          `${ARROW} **Type:** ${selection.charAt(0).toUpperCase() + selection.slice(1)} Support\n` +
          `${ARROW} **Description:** ${reason}`,
        noLogo: false,
      });

      // Footer is set once at creation for display only — claim state now
      // lives in the button's customId, not here, so this is never edited again
      embed.setFooter({ text: "Status: UNCLAIMED" });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${channel.id}`)
          .setLabel("Claim Ticket")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`close_${channel.id}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Secondary),
      );

      await channel.send({
        content: `<@${user.id}> <@&${roleId}>`,
        embeds: [embed],
        files,
        components: [buttons],
      });

      return interaction.editReply(
        `✅ Your support ticket has been created: ${channel}`,
      );
    }

    // ===============================
    // 🎟️ Support Ticket Claim / Unclaim
    // ===============================
    if (interaction.isButton() && interaction.customId.startsWith("claim_")) {
      // Claim state lives in this button's own customId:
      // "claim_<channelId>" = unclaimed, "claim_<channelId>_<userId>" = claimed by that user
      const parts = interaction.customId.split("_");
      const channelId = parts[1];
      const claimedBy = parts[2] || null;

      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        return interaction.reply({
          content: "❌ Channel not found.",
          flags: 64,
        });
      }

      if (claimedBy && claimedBy !== interaction.user.id) {
        return interaction.reply({
          content: `❌ This ticket is already claimed by <@${claimedBy}>.`,
          flags: 64,
        });
      }

      // Unclaim
      if (claimedBy && claimedBy === interaction.user.id) {
        const { embed, files } = embedTemplate({
          title: `${STAR} Ticket Unclaimed ${STAR}`,
          description: `${ARROW} **${interaction.user}** has unclaimed this ticket.`,
          noLogo: false,
        });
        await channel.send({ embeds: [embed], files });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_${channelId}`) // reset — no claimer suffix
            .setLabel("Claim Ticket")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`close_${channelId}`)
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Secondary),
        );

        // Only components change here — embeds untouched
        return interaction.update({ components: [row] });
      }

      // Claim
      const { embed, files } = embedTemplate({
        title: `${STAR} Ticket Claimed ${STAR}`,
        description: `${ARROW} **${interaction.user}** has claimed this ticket.`,
        noLogo: false,
      });
      await channel.send({ embeds: [embed], files });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${channelId}_${interaction.user.id}`) // claimer baked in
          .setLabel("Claimed")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`close_${channelId}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Secondary),
      );

      // Only components change here — embeds untouched
      return interaction.update({ components: [row] });
    }

    // ===============================
    // 🔒 Close Ticket Handler
    // ===============================
    if (interaction.isButton() && interaction.customId.startsWith("close_")) {
      const channelId = interaction.customId.split("_")[1];
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        return interaction.reply({
          content: "❌ Channel not found.",
          flags: 64,
        });
      }

      // Claim state no longer lives in the footer — read it from the
      // Claim button's own customId sitting alongside this Close button
      const claimButton = interaction.message.components[0]?.components.find(
        (c) => c.customId?.startsWith("claim_"),
      );
      const claimParts = claimButton?.customId.split("_") || [];
      const claimedBy = claimParts[2] || null;

      if (!claimedBy || claimedBy !== interaction.user.id) {
        return interaction.reply({
          content:
            "❌ Only the staff member who claimed this ticket can close it.",
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const messages = await channel.messages.fetch({ limit: 100 });
      const transcriptChannel = interaction.guild.channels.cache.get(
        "1539176056651784242",
      );

      let transcriptText = `Transcript for ticket ${channel.name}\n\n`;
      messages.reverse().forEach((msg) => {
        transcriptText += `[${msg.createdAt.toLocaleString()}] ${msg.author.tag}: ${msg.content}\n`;
      });

      await transcriptChannel.send({
        content: `${STAR} **Transcript for:** ${channel.name}\n${ARROW} Closed by: <@${interaction.user.id}>`,
        files: [
          {
            attachment: Buffer.from(transcriptText, "utf-8"),
            name: `${channel.name}-transcript.txt`,
          },
        ],
      });

      const { embed, files } = embedTemplate({
        title: `${STAR} Ticket Closed ${STAR}`,
        description:
          `${ARROW} Closed by: ${interaction.user}\n` +
          `${ARROW} Transcript has been saved.`,
        noLogo: false,
      });

      await channel.send({ embeds: [embed], files });

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 5000);

      return interaction.editReply("✅ Ticket closed and transcript saved.");
    }

    // ===============================
    // 💬 Chat Input Commands
    // ===============================
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) {
        console.warn(`🟡 Unknown command invoked: /${interaction.commandName}`);
        return;
      }

      await command.execute(interaction);
      logEvent(client, logChannels, logTitle, interaction, extraDetails);
      return;
    }

    // ===============================
    // 📋 Records Handler
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("viewRecords_")
    ) {
      const [, viewerId, targetId] = interaction.customId.split("_");
      const targetMember = interaction.guild.members.cache.get(targetId);
      const userRecord = await getUserRecord(targetId);

      if (!userRecord.records)
        userRecord.records = { citations: [], warrants: [], blackpoints: 0 };

      const { citations, warrants, blackpoints } = userRecord.records;

      let desc = `> ${ARROW} **Blackpoints:** ${blackpoints}\n\n`;

      desc += `> ${ARROW} **Citations:**\n`;
      desc += citations.length
        ? citations
            .map((c) => `> • **${c.case}** — ${c.violation} — $${c.price}`)
            .join("\n") + "\n\n"
        : "> • None\n\n";

      desc += `> ${ARROW} **Warrants:**\n`;
      desc += warrants.length
        ? warrants
            .map((w) => `> • ⚠️ **${w.case}** — ${w.offense}`)
            .join("\n") + "\n\n"
        : "> • None\n\n";

      const options =
        viewerId === targetId
          ? citations.map((c) => ({
              label: `${c.case} — $${c.price}`,
              description: `${c.violation} | ${c.offense}`,
              value: c.case,
            }))
          : [];

      const row =
        options.length > 0
          ? new ActionRowBuilder().addComponents(
              new StringSelectMenuBuilder()
                .setCustomId(`payfine_select_${targetId}`)
                .setPlaceholder("Select a fine to pay")
                .addOptions(options),
            )
          : null;

      const { embed } = embedTemplate({
        title: `${STAR} ${viewerId === targetId ? "Your" : `${targetMember?.user.username}'s`} Records ${STAR}`,
        description: desc,
        noLogo: true,
      });

      embed.setThumbnail(
        targetMember?.user.displayAvatarURL({ dynamic: true }) ||
          interaction.user.displayAvatarURL({ dynamic: true }),
      );

      return interaction.reply({
        embeds: [embed],
        components: row ? [row] : [],
        flags: 64,
      });
    }

    // ===============================
    // 💵 Pay Fine Handler
    // ===============================
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("payfine_select")
    ) {
      await interaction.deferReply({ flags: 64 });

      const profileOwnerId = interaction.customId.split("_")[2];
      if (profileOwnerId && interaction.user.id !== profileOwnerId) {
        return interaction.editReply({
          content: "❌ You can only pay your own fines.",
        });
      }

      const caseNumber = interaction.values[0];
      const userId = interaction.user.id;
      const userRecord = await getUserRecord(userId);
      const citation = userRecord.records?.citations?.find(
        (c) => c.case === caseNumber,
      );

      if (!citation)
        return interaction.editReply({ content: "❌ Citation not found." });

      const cash = userRecord.cash ?? 0;

      if (cash < citation.price) {
        const { embed } = embedTemplate({
          title: `${STAR} Insufficient Cash ${STAR}`,
          description:
            `> ${ARROW} **Required:** $${citation.price}\n` +
            `> ${ARROW} **You Have:** $${cash}\n\n` +
            `> ${ARROW} Please withdraw from your bank first.`,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      userRecord.cash = cash - citation.price;
      userRecord.records.citations = userRecord.records.citations.filter(
        (c) => c.case !== caseNumber,
      );
      await updateUserRecord(userRecord);

      const { embed } = embedTemplate({
        title: `${STAR} Fine Paid ${STAR}`,
        description:
          `> ${ARROW} **Case:** ${citation.case}\n` +
          `> ${ARROW} **Violation:** ${citation.violation}\n` +
          `> ${ARROW} **Offense:** ${citation.offense}\n` +
          `> ${ARROW} **Amount Paid:** $${citation.price}\n\n` +
          `> ${ARROW} **New Cash Balance:** $${userRecord.cash}`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // ===============================
    // 🏢 Moat Castle Business Accept / Deny Handler
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("moat_business_")
    ) {
      const moatStaffRole = "1537722114176581724";
      const businessOwnerRole = "1470101925662953704";

      if (!interaction.member.roles.cache.has(moatStaffRole)) {
        return interaction.reply({
          content: "❌ Only Moat Castle staff can manage business requests.",
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const parts = interaction.customId.split("_");
      const action = parts[2]; // accept or deny
      const requesterId = parts[3];
      const requestId = parts[4];

      const requesterRecord = await getUserRecord(requesterId);

      if (!requesterRecord.moatCastle) {
        const { embed } = moatembedTemplate({
          title: "Account Deleted",
          description:
            `> ${ARROW} The requester's Moat Castle account was **deleted**.\n` +
            `> ${ARROW} No further action was taken.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      requesterRecord.moatCastle.businesses =
        requesterRecord.moatCastle.businesses || [];
      requesterRecord.moatCastle.businessRequests =
        requesterRecord.moatCastle.businessRequests || [];

      const request = requesterRecord.moatCastle.businessRequests.find(
        (r) => r.id === requestId,
      );

      if (!request) {
        return interaction.editReply({
          content: "❌ Business request not found.",
        });
      }

      const requesterUser = await interaction.client.users.fetch(requesterId);

      // Remove request from pending list
      requesterRecord.moatCastle.businessRequests =
        requesterRecord.moatCastle.businessRequests.filter(
          (r) => r.id !== requestId,
        );

      let channelEmbed;

      // ===============================
      // ✔ ACCEPT BUSINESS REQUEST
      // ===============================
      if (action === "accept") {
        // Prevent exceeding business limit
        if (
          requesterRecord.moatCastle.businesses.length >= MOAT_BUSINESS_LIMIT
        ) {
          channelEmbed = moatembedTemplate({
            title: "❌ Business Limit Reached",
            description:
              `> ${ARROW} <@${requesterId}> already owns **${MOAT_BUSINESS_LIMIT} businesses**.\n` +
              `> ${ARROW} Request skipped.`,
            noLogo: true,
          }).embed;

          await interaction.message.reply({ embeds: [channelEmbed] });
          return interaction.editReply({
            content: "User already owns the maximum number of businesses.",
          });
        }

        // Create new business
        const newBusiness = {
          id: "BIZ-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          name: request.name,
          description: request.description,
          type: request.type,
          income: 0,
          ownerId: requesterId,
          createdAt: Date.now(),
          lastIncomeCollected: Date.now(),
        };

        requesterRecord.moatCastle.businesses.push(newBusiness);
        await updateUserRecord(requesterRecord);

        // Assign business owner role (only if they didn't have it)
        try {
          const guildMember =
            await interaction.guild.members.fetch(requesterId);
          await guildMember.roles.add(businessOwnerRole);
        } catch (err) {
          console.error("❌ Failed to assign business owner role:", err);
        }

        channelEmbed = moatembedTemplate({
          title: "✅ Business Approved",
          description:
            `> ${ARROW} **Owner:** <@${requesterId}>\n` +
            `> ${ARROW} **Business:** ${request.name}\n` +
            `> ${ARROW} **ID:** ${newBusiness.id}\n` +
            `> ${ARROW} Business has been **approved** and created.`,
          noLogo: false,
        }).embed;

        // DM requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏢 Moat Castle Business Approved",
            description:
              `> ${ARROW} Your business **${request.name}** has been **approved**.\n` +
              `> ${ARROW} Business ID: **${newBusiness.id}**\n\n` +
              `> ${ARROW} You can review it using **/moat-business view**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      // ===============================
      // ❌ DENY BUSINESS REQUEST
      // ===============================
      if (action === "deny") {
        await updateUserRecord(requesterRecord);

        channelEmbed = moatembedTemplate({
          title: "❌ Business Denied",
          description:
            `> ${ARROW} **Requester:** <@${requesterId}>\n` +
            `> ${ARROW} **Business:** ${request.name}\n` +
            `> ${ARROW} Business request has been **denied**.`,
          noLogo: false,
        }).embed;

        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏢 Moat Castle Business Denied",
            description:
              `> ${ARROW} Your business request for **${request.name}** has been **denied**.\n` +
              `> ${ARROW} You may submit another request using **/moat-business create**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      await interaction.message.reply({ embeds: [channelEmbed] });

      return interaction.editReply({
        content: `Business ${action === "accept" ? "approved ✅" : "denied ❌"} successfully.`,
      });
    }

    // ===============================
    // 🏦 Moat Castle Loan Accept / Deny Handler
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("moat_loan_")
    ) {
      const moatStaffRole = "1537722114176581724"; // Moat Castle Staff

      if (!interaction.member.roles.cache.has(moatStaffRole)) {
        return interaction.reply({
          content: "❌ Only Moat Castle staff can manage loan requests.",
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const parts = interaction.customId.split("_");
      const action = parts[2]; // accept or deny
      const requesterId = parts[3];
      const requestId = parts[4];

      const requesterRecord = await getUserRecord(requesterId);

      if (!requesterRecord.moatCastle) {
        const { embed } = moatembedTemplate({
          title: "Account Deleted",
          description:
            `${ARROW} The requester's Moat Castle account was **deleted**.\n` +
            `${ARROW} No further action was taken.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const loanRequests = requesterRecord.moatCastle.loanRequests || [];
      const request = loanRequests.find((r) => r.id === requestId);

      if (!request) {
        return interaction.editReply({
          content: "❌ Loan request not found.",
        });
      }

      // Remove request from pending list
      requesterRecord.moatCastle.loanRequests =
        requesterRecord.moatCastle.loanRequests.filter((r) => r !== request);

      let channelEmbed;
      const requesterUser = await interaction.client.users.fetch(requesterId);

      // ===============================
      // ✔ ACCEPT LOAN
      // ===============================
      if (action === "accept") {
        // Add loan to record
        requesterRecord.moatCastle.loans.push({
          amount: request.amount,
          remaining: request.amount,
          reason: request.reason,
          createdAt: Date.now(),
        });

        // Add funds to balance
        requesterRecord.moatCastle.balance += request.amount;
        requesterRecord.moatCastle.updatedAt = Date.now();
        await updateUserRecord(requesterRecord);

        // Channel log
        channelEmbed = moatembedTemplate({
          title: "✅ Loan Approved",
          description:
            `${ARROW} **Requester:** <@${requesterId}>\n` +
            `${ARROW} **Amount:** $${request.amount.toLocaleString()}\n` +
            `${ARROW} Loan has been **approved** and added to their balance.`,
          noLogo: false,
        }).embed;

        // DM to requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏦 Moat Castle Loan Approved",
            description:
              `${ARROW} Your loan for **$${request.amount.toLocaleString()}** has been **approved**.\n` +
              `${ARROW} The funds have been added to your Moat Castle balance.\n` +
              `${ARROW} You can review it using **/moat-loan review**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {
          console.error("⚠️ Failed to DM requester about loan approval.");
        }
      }

      // ===============================
      // ❌ DENY LOAN
      // ===============================
      if (action === "deny") {
        requesterRecord.moatCastle.updatedAt = Date.now();
        await updateUserRecord(requesterRecord);

        channelEmbed = moatembedTemplate({
          title: "❌ Loan Denied",
          description:
            `${ARROW} **Requester:** <@${requesterId}>\n` +
            `${ARROW} **Amount:** $${request.amount.toLocaleString()}\n` +
            `${ARROW} Loan request has been **denied**.`,
          noLogo: false,
        }).embed;

        // DM to requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏦 Moat Castle Loan Denied",
            description:
              `${ARROW} Your loan request for **$${request.amount.toLocaleString()}** has been **denied**.\n` +
              `${ARROW} You may submit another request later using **/moat-loan request**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {
          console.error("⚠️ Failed to DM requester about loan denial.");
        }
      }

      // Reply in staff channel
      await interaction.message.reply({ embeds: [channelEmbed] });

      return interaction.editReply({
        content: `Loan ${action === "accept" ? "approved ✅" : "denied ❌"} successfully.`,
      });
    }

    // ===============================
    // 🦊 Fox Bank Loan Accept / Deny Handler
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("fox_loan_")
    ) {
      const foxStaffRole = "1537894455779270717";

      if (!interaction.member.roles.cache.has(foxStaffRole)) {
        return interaction.reply({
          content: "❌ Only Fox Bank staff can manage loan requests.",
          flags: 64,
        });
      }

      await interaction.deferReply({ flags: 64 });

      const parts = interaction.customId.split("_");
      const action = parts[2]; // accept or deny
      const requesterId = parts[3];
      const requestId = parts[4];

      const requesterRecord = await getUserRecord(requesterId);

      if (!requesterRecord.foxBank) {
        const { embed } = foxbankembedTemplate({
          title: "Account Deleted",
          description:
            `${ARROW} The requester's Fox Bank account was **deleted**.\n` +
            `${ARROW} No further action was taken.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // ⭐ REQUIRED FIX — initialize arrays if missing
      if (!requesterRecord.foxBank.loans) {
        requesterRecord.foxBank.loans = [];
      }

      if (!requesterRecord.foxBank.loanRequests) {
        requesterRecord.foxBank.loanRequests = [];
      }

      const loanRequests = requesterRecord.foxBank.loanRequests;
      const request = loanRequests.find((r) => r.id === requestId);

      if (!request) {
        return interaction.editReply({
          content: "❌ Loan request not found.",
        });
      }

      requesterRecord.foxBank.loanRequests =
        requesterRecord.foxBank.loanRequests.filter((r) => r !== request);

      let channelEmbed;
      const requesterUser = await interaction.client.users.fetch(requesterId);

      // ACCEPT
      if (action === "accept") {
        requesterRecord.foxBank.loans.push({
          amount: request.amount,
          remaining: request.amount,
          reason: request.reason,
          createdAt: Date.now(),
        });

        requesterRecord.foxBank.balance += request.amount;
        requesterRecord.foxBank.updatedAt = Date.now();
        await updateUserRecord(requesterRecord);

        channelEmbed = foxbankembedTemplate({
          title: "Loan Approved",
          description:
            `${ARROW} **Requester:** <@${requesterId}>\n` +
            `${ARROW} **Amount:** $${request.amount.toLocaleString()}\n` +
            `${ARROW} Loan has been **approved** and added to their balance.`,
          noLogo: false,
        }).embed;

        try {
          const { embed: dmEmbed } = foxbankembedTemplate({
            title: "Fox Bank Loan Approved",
            description:
              `${ARROW} Your loan for **$${request.amount.toLocaleString()}** has been **approved**.\n` +
              `${ARROW} The funds have been added to your Fox Bank balance.\n` +
              `${ARROW} Use **/fox-loan review** to view it.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      // DENY
      if (action === "deny") {
        requesterRecord.foxBank.updatedAt = Date.now();
        await updateUserRecord(requesterRecord);

        channelEmbed = foxbankembedTemplate({
          title: "Loan Denied",
          description:
            `${ARROW} **Requester:** <@${requesterId}>\n` +
            `${ARROW} **Amount:** $${request.amount.toLocaleString()}\n` +
            `${ARROW} Loan request has been **denied**.`,
          noLogo: false,
        }).embed;

        try {
          const { embed: dmEmbed } = foxbankembedTemplate({
            title: "Fox Bank Loan Denied",
            description:
              `${ARROW} Your loan request for **$${request.amount.toLocaleString()}** has been **denied**.\n` +
              `${ARROW} You may submit another request later using **/fox-loan request**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      await interaction.message.reply({ embeds: [channelEmbed] });

      return interaction.editReply({
        content: `Loan ${action === "accept" ? "approved ✅" : "denied ❌"} successfully.`,
      });
    }

    // ===============================
    // 🚨 Ban Request Button Handler
    // ===============================
    if (interaction.isButton() && interaction.customId.startsWith("banreq_")) {
      await interaction.deferReply({ flags: 64 });

      const HR_ROLE = "1350582607217430650";

      if (!interaction.member.roles.cache.has(HR_ROLE)) {
        return interaction.editReply("❌ Only HR can handle ban requests.");
      }

      const parts = interaction.customId.split("_");
      const action = parts[1]; // handle or deny

      // Disable buttons
      const disabledRow = new ActionRowBuilder().addComponents(
        ...interaction.message.components[0].components.map((btn) =>
          ButtonBuilder.from(btn).setDisabled(true),
        ),
      );

      await interaction.message.edit({
        components: [disabledRow],
      });

      const { embed } = embedTemplate({
        title:
          action === "handle"
            ? "✅ Ban Request Handled"
            : "❌ Ban Request Denied",
        description:
          `> **HR Staff:** ${interaction.user}\n` +
          `> **Action:** ${action === "handle" ? "Handled" : "Denied"}\n` +
          `> **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        noLogo: false,
      });

      await interaction.message.reply({ embeds: [embed] });

      return interaction.editReply(
        action === "handle"
          ? "Ban request marked as handled."
          : "Ban request marked as denied.",
      );
    }

    // ===============================
    // 🚗 Vehicle Handlers
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("viewVehicles_")
    ) {
      const [, viewerId, targetId] = interaction.customId.split("_");
      const targetRecord = await getUserRecord(targetId);
      const vehicles = targetRecord.vehicles ?? [];

      if (vehicles.length === 0) {
        const { embed } = embedTemplate({
          title: "🚗 Registered Vehicles",
          description: `> ${ARROW} ${
            viewerId === targetId ? "You have" : "They have"
          } no registered vehicles.`,
          noLogo: true,
        });

        const targetMember = interaction.guild.members.cache.get(targetId);
        embed.setThumbnail(
          targetMember?.user.displayAvatarURL({ dynamic: true }) ||
            interaction.user.displayAvatarURL({ dynamic: true }),
        );

        return interaction.reply({ embeds: [embed], flags: 64 });
      }

      return sendVehiclePage(interaction, vehicles, 0, targetId);
    }

    if (interaction.isButton() && interaction.customId.startsWith("vehPage_")) {
      const [, viewerId, targetId, pageStr] = interaction.customId.split("_");
      const targetRecord = await getUserRecord(targetId);
      const vehicles = targetRecord.vehicles ?? [];

      return sendVehiclePage(
        interaction,
        vehicles,
        parseInt(pageStr, 10),
        targetId,
      );
    }

    // ===============================
    // 📟 RAW TEXT SESSION CODE BUTTON HANDLER
    // ===============================
    if (
      interaction.isButton() &&
      SESSION_LINK_IDS.some((id) => interaction.customId.startsWith(id))
    ) {
      await interaction.deferReply({ flags: 64 });

      // Find the original message that contains the stored raw text
      const messages = await interaction.channel.messages.fetch({ limit: 50 });
      const msg = messages.find(
        (m) =>
          m.components.length > 0 &&
          m.components[0].components[0].customId === interaction.customId,
      );

      // If no raw text was stored
      if (!msg || !msg.sessionCode) {
        return interaction.editReply({
          content: "Code not found. The session message may be too old.",
        });
      }

      // Build embed with RAW TEXT (no links, no formatting changes)
      const { embed } = embedTemplate({
        title: `${STAR} Session Code Retrieved ${STAR}`,
        description: `> ${ARROW} **Code:** ${msg.sessionCode}`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    // Extra context: which interaction type/customId/command triggered this
    const context =
      interaction.customId || interaction.commandName || "unknown";
    console.error(`🔴 Interaction error [${context}]:`, error);

    const { embed } = embedTemplate({
      title: "⚠️ Error ⚠️",
      description: `> ${ARROW} There was an error executing this interaction.`,
    });
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [embed], flags: 64 });
    } else {
      await interaction.reply({ embeds: [embed], flags: 64 });
    }
  }
});

// ===============================
// 📥 Inbox Handler
// ===============================
client.on(Events.MessageCreate, async (message) => {
  handleInbox(message, client);
});

// ===============================
// 🛡️ Log Deletion Protection
// ===============================
client.on(Events.MessageDelete, async (message) => {
  if (
    ![GENERAL_LOG_CHANNEL, SESSION_LOG_CHANNEL].includes(message.channelId) ||
    !message.author?.bot ||
    !message.embeds.length
  )
    return;

  try {
    const unix = Math.floor(Date.now() / 1000);
    const timestamp = `<t:${unix}:F>`;

    const fetchedLogs = await message.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageDelete,
    });
    const deletionLog = fetchedLogs.entries.first();

    let executor = { tag: "Unknown User", username: "Unknown User" };
    if (
      deletionLog &&
      deletionLog.target.id === message.author.id &&
      deletionLog.createdTimestamp > Date.now() - 5000
    ) {
      executor = deletionLog.executor;
    }

    const recoveredEmbeds = message.embeds.map((embed) =>
      createRecoveredEmbed(embed, executor, timestamp),
    );
    await message.channel.send({
      content: `<@&${HR_ROLE_ID}>`,
      embeds: recoveredEmbeds,
    });
  } catch (error) {
    console.error("🔴 Failed to recover deleted log:", error);
  }
});

client.on(Events.MessageDeleteBulk, async (messages) => {
  const firstMsg = messages.first();
  if (
    !firstMsg ||
    ![GENERAL_LOG_CHANNEL, SESSION_LOG_CHANNEL].includes(firstMsg.channelId)
  )
    return;

  try {
    const unix = Math.floor(Date.now() / 1000);
    const timestamp = `<t:${unix}:F>`;

    const fetchedLogs = await firstMsg.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.MessageBulkDelete,
    });
    const deletionLog = fetchedLogs.entries.first();

    let executor = { tag: "Unknown User", username: "Unknown User" };
    if (deletionLog && deletionLog.createdTimestamp > Date.now() - 5000)
      executor = deletionLog.executor;

    const botEmbedMessages = messages.filter(
      (m) => m.author?.bot && m.embeds.length > 0,
    );
    for (const msg of botEmbedMessages.values()) {
      const recoveredEmbeds = msg.embeds.map((embed) =>
        createRecoveredEmbed(embed, executor, timestamp),
      );
      await msg.channel.send({
        content: `<@&${HR_ROLE_ID}>`,
        embeds: recoveredEmbeds,
      });
    }
  } catch (error) {
    console.error("🔴 Failed to recover bulk deleted logs:", error);
  }
});

// ===============================
// 🎯 Session Reaction Goal Handler
// ===============================
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    // Prevent bot's own reaction from triggering the handler
    if (user.bot || user.id === client.user.id) return;

    // Resolve partials
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (err) {
        return;
      }
    }

    const message = reaction.message;
    if (!message.embeds.length) return;
    const embed = message.embeds[0];

    if (!embed.title || !embed.title.includes("Session Startup")) return;

    // Check reaction threshold early to avoid race conditions
    if (sessionReadySent.has(message.id)) return;

    const match = embed.description.match(/Required reactions:\s\*\*(\d+)\*\*/);
    if (!match) return;

    const required = parseInt(match[1], 10);

    // Count only non-bot reactions if your bot reacted to its own embed
    const humanReactions = reaction.users.cache.filter((u) => !u.bot).size;

    if (humanReactions >= required) {
      // Set key synchronously to prevent race conditions from concurrent calls
      sessionReadySent.add(message.id);

      const host = embed.description.match(/<@!?(\d+)>/);
      const hostId = host ? host[1] : null;

      const notifyChannel = message.guild.channels.cache.get(
        "1495828191300948111",
      );
      if (notifyChannel && hostId) {
        await notifyChannel.send(
          `<@${hostId}> Your session is ready to start!`,
        );
      }

      const { embed: setupEmbed, files } = embedTemplate({
        title: `${STAR} Greenville Community - *__Session Setup__* ${STAR}`,
        description:
          `> ${ARROW} The reaction goal has been reached!\n` +
          `> ${ARROW} The host is now setting up the session.\n` +
          `> ${ARROW} Please be patient.`,
      });

      await message.channel.send({ embeds: [setupEmbed], files });
    }
  } catch (err) {
    console.error("🔴 Reaction goal handler error:", err);
  }
});

boot("Event handlers registered");

// ===============================
// 🔑 Login
// ===============================
if (!process.env.TOKEN) {
  console.error(
    "🔴 TOKEN env var is missing or empty — check Render's Environment tab.",
  );
  process.exit(1);
}

boot("TOKEN present", `length ${process.env.TOKEN.length}`);
boot("Attempting client.login()");

client
  .login(process.env.TOKEN)
  .then(() => {
    boot("login() promise resolved", "waiting for ClientReady...");
  })
  .catch((err) => {
    console.error("🔴 client.login() failed:", err);
    process.exit(1);
  });
