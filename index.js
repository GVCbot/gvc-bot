require("dotenv").config();
const express = require("express");
const app = express();
app.get("/", (req, res) => res.send("Bot is alive!"));
app.listen(3000, () => console.log("Web server running on port 3000"));

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
} = require("./economy/economyutils");
const handleInbox = require("./utils/inbox");

//Configuration
const GENERAL_LOG_CHANNEL = "1534886183040188547";
const SESSION_LOG_CHANNEL = "1534889791416438784";
const HR_ROLE_ID = "1350582607217430650";
const SESSION_BUTTON_LOG = "1515684241101295646";
const OTHER_BUTTON_LOG = "1536797059355508826";

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

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

//Recovered Embed Helper
function createRecoveredEmbed(originalEmbed, executor, timestamp) {
  const recoveredEmbed = { ...originalEmbed.data };
  recoveredEmbed.color = parseInt("db2727", 16);
  recoveredEmbed.title = `${SUN} RECOVERED DELETED LOG BY ${executor.tag || executor.username} AT ${timestamp} ${SUN}`;
  return recoveredEmbed;
}

//Option Formatting Helpers
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

//Logging Helper
function logEvent(
  client,
  channelIds,
  title,
  interaction,
  extraDescription = "",
) {
  const guild = client.guilds.cache.get("1058305800252182528");
  if (!guild) return;

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
    if (logChannel) logChannel.send({ embeds: [embed] }).catch(() => {});
  }
}

//Button Click Logging Helper
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
    title: `${SUN} Button Click Logged ${SUN}`,
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

  if (targetLogChannel)
    targetLogChannel.send({ embeds: [embed] }).catch(() => {});
}

//Vehicle Page Helper
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

// Normalize bank types so old banks still work
function normalizeType(type) {
  if (!type) return type;
  const t = type.toLowerCase();

  if (t.includes("fox")) return "Fox Bank";
  if (t.includes("moat")) return "Moat Castle";

  return type;
}

// Unified Bank Loader (owned + joined)
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

//Bank Owner Record Finder
async function findBankOwnerRecord(bankId, userRecord) {
  if ((userRecord.banks || []).some((b) => b.id === bankId)) return userRecord;

  const allRecords = await getAllUserRecords();
  return (
    allRecords.find((rec) => (rec.banks || []).some((b) => b.id === bankId)) ||
    null
  );
}

//Client Setup
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

client.on("error", (err) => {
  console.error("🔴 Discord client error:", err);
});

client.on("shardError", (err) => {
  console.error("🔴 Shard error:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("🔴 Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("🔴 Uncaught exception:", err);
});

//Command Loader
const foldersPath = path.join(__dirname, "commands");
for (const folder of fs.readdirSync(foldersPath)) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((f) => f.endsWith(".js"));
  for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    client.commands.set(command.data.name, command);
  }
}

client.once(Events.ClientReady, () =>
  console.log(`🟢 Bot is online as ${client.user.tag}`),
);

//Interaction Handler
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    let logTitle = `${SUN} Interaction Used ${SUN}`;
    let extraDetails = "";
    let logChannels = [GENERAL_LOG_CHANNEL];

    if (interaction.isChatInputCommand()) {
      logTitle = `${SUN} Command Used ${SUN}`;

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
      logTitle = `${SUN} Menu Selected ${SUN}`;
      extraDetails =
        `> ${ARROW} **Menu ID:** ${interaction.customId}\n` +
        `> ${ARROW} **Values:** ${interaction.values.join(", ")}`;
    } else if (interaction.isModalSubmit()) {
      logTitle = `${SUN} Modal Submitted ${SUN}`;
      extraDetails = `> ${ARROW} **Modal ID:** ${interaction.customId}`;
    } else if (interaction.isContextMenuCommand()) {
      logTitle = `${SUN} Context Menu Used ${SUN}`;
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

      // Modal form
      const modal = new ModalBuilder()
        .setCustomId(`support_modal_${selection}`)
        .setTitle(`${SUN} Support Request ${SUN}`);

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
    // 📝 Modal Submission Handler
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
        topic: "UNCLAIMED",
        permissionOverwrites: [
          { id: guild.roles.everyone, deny: ["ViewChannel"] },
          { id: roleId, allow: ["ViewChannel", "SendMessages"] },
          { id: user.id, allow: ["ViewChannel", "SendMessages"] },
        ],
      });

      const { embed, files } = embedTemplate({
        title: `${SUN} Support Ticket Created ${SUN}`,
        description:
          `${ARROW} **Opened By:** ${user}\n` +
          `${ARROW} **Type:** ${selection.charAt(0).toUpperCase() + selection.slice(1)} Support\n` +
          `${ARROW} **Description:** ${reason}`,
        noLogo: false,
      });

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
      const channelId = interaction.customId.split("_")[1];
      const channel = interaction.guild.channels.cache.get(channelId);

      if (!channel) {
        return interaction.reply({
          content: "❌ Channel not found.",
          flags: 64,
        });
      }

      const topic = channel.topic || "UNCLAIMED";
      const claimedMatch = topic.match(/CLAIMED:(\d+)/);
      const claimedBy = claimedMatch ? claimedMatch[1] : null;

      // Already claimed by someone else
      if (claimedBy && claimedBy !== interaction.user.id) {
        return interaction.reply({
          content: `❌ This ticket is already claimed by <@${claimedBy}>.`,
          flags: 64,
        });
      }

      // Unclaim
      if (claimedBy && claimedBy === interaction.user.id) {
        await channel.setTopic("UNCLAIMED");

        const { embed } = embedTemplate({
          title: `${SUN} Ticket Unclaimed ${SUN}`,
          description: `${ARROW} **${interaction.user}** has unclaimed this ticket.`,
          noLogo: false,
        });

        await channel.send({ embeds: [embed] });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`claim_${channel.id}`)
            .setLabel("Claim Ticket")
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`close_${channel.id}`)
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Secondary),
        );

        return interaction.update({ components: [row] });
      }

      // Claim
      await channel.setTopic(`CLAIMED:${interaction.user.id}`);

      const { embed } = embedTemplate({
        title: `${SUN} Ticket Claimed ${SUN}`,
        description: `${ARROW} **${interaction.user}** has claimed this ticket.`,
        noLogo: false,
      });

      await channel.send({ embeds: [embed] });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`claim_${channel.id}`)
          .setLabel("Claimed")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId(`close_${channel.id}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Secondary),
      );

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

      const topic = channel.topic || "UNCLAIMED";
      const claimedMatch = topic.match(/CLAIMED:(\d+)/);
      const claimedBy = claimedMatch ? claimedMatch[1] : null;

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
        content: `${SUN} **Transcript for:** ${channel.name}\n${ARROW} Closed by: <@${interaction.user.id}>`,
        files: [
          {
            attachment: Buffer.from(transcriptText, "utf-8"),
            name: `${channel.name}-transcript.txt`,
          },
        ],
      });

      const { embed } = embedTemplate({
        title: `${SUN} Ticket Closed ${SUN}`,
        description:
          `${ARROW} Closed by: ${interaction.user}\n` +
          `${ARROW} Transcript has been saved.`,
        noLogo: false,
      });

      await channel.send({ embeds: [embed] });

      setTimeout(() => {
        channel.delete().catch(() => {});
      }, 5000);

      return interaction.editReply("✅ Ticket closed and transcript saved.");
    }

    //Chat Input Commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      await command.execute(interaction);
      logEvent(client, logChannels, logTitle, interaction, extraDetails);
      return;
    }

    //Records Handler
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
        title: `${SUN} ${viewerId === targetId ? "Your" : `${targetMember?.user.username}'s`} Records ${SUN}`,
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

    //Payfine Handler
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
          title: `${SUN} Insufficient Cash ${SUN}`,
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
        title: `${SUN} Fine Paid ${SUN}`,
        description:
          `> ${ARROW} **Case:** ${citation.case}\n` +
          `> ${ARROW} **Violation:** ${citation.violation}\n` +
          `> ${ARROW} **Offense:** ${citation.offense}\n` +
          `> ${ARROW} **Amount Paid:** $${citation.price}\n\n` +
          `> ${ARROW} **New Cash Balance:** $${userRecord.cash}`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    //Modlogs Handler
    if (interaction.isButton() && interaction.customId.startsWith("modlogs_")) {
      const cmd = client.commands.get("modlogs");
      if (cmd && cmd.handleButton) {
        return cmd.handleButton(interaction);
      }
    }

    // ===============================
    // 🏢 Moat Castle Business Accept / Deny Handler
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("moat_business_")
    ) {
      const moatStaffRole = "1537722114176581724"; // Moat Castle Staff
      const businessOwnerRole = "1470101925662953704"; // Business Owner role

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

      const businessRequests =
        requesterRecord.moatCastle.businessRequests || [];
      const request = businessRequests.find((r) => r.id === requestId);

      if (!request) {
        return interaction.editReply({
          content: "❌ Business request not found.",
        });
      }

      const requesterUser = await interaction.client.users.fetch(requesterId);

      // Remove request from pending list either way
      requesterRecord.moatCastle.businessRequests =
        requesterRecord.moatCastle.businessRequests.filter(
          (r) => r !== request,
        );

      let channelEmbed;

      // ===============================
      // ✔ ACCEPT BUSINESS
      // ===============================
      if (action === "accept") {
        // Guard: in case they somehow already have a business by the time
        // staff click Accept (e.g. two pending requests slipped through)
        if (requesterRecord.moatCastle.business) {
          await updateUserRecord(requesterRecord);

          channelEmbed = moatembedTemplate({
            title: "❌ Business Already Exists",
            description: `> ${ARROW} <@${requesterId}> already owns a business. Request skipped.`,
            noLogo: true,
          }).embed;

          await interaction.message.reply({ embeds: [channelEmbed] });
          return interaction.editReply({
            content: "That user already owns a business.",
          });
        }

        requesterRecord.moatCastle.business = {
          id: "BIZ-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
          name: request.name,
          description: request.description,
          income: 0,
          ownerId: requesterId,
          createdAt: Date.now(),
          lastIncomeCollected: Date.now(),
        };

        await updateUserRecord(requesterRecord);

        // Assign business owner role
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
            `> ${ARROW} **ID:** ${requesterRecord.moatCastle.business.id}\n` +
            `> ${ARROW} Business has been **approved** and created.`,
          noLogo: false,
        }).embed;

        // DM requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏢 Moat Castle Business Approved",
            description:
              `> ${ARROW} Your business **${request.name}** has been **approved**.\n` +
              `> ${ARROW} Business ID: **${requesterRecord.moatCastle.business.id}**\n\n` +
              `> ${ARROW} You can review it using **/moat-viewbusiness**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      // ===============================
      // ❌ DENY BUSINESS
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

        // DM requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏢 Moat Castle Business Denied",
            description:
              `> ${ARROW} Your business request for **${request.name}** has been **denied**.\n` +
              `> ${ARROW} You may submit another request using **/moat-businesscreate** if needed.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      // Reply in the channel (not ephemeral)
      await interaction.message.reply({ embeds: [channelEmbed] });

      // Staff confirmation
      return interaction.editReply({
        content: `Business ${action === "accept" ? "approved ✅" : "denied ❌"} successfully.`,
      });
    }

    //Vehicle Handler
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

    //Vehicle Pagination Handler
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

    //Session Link Handler
    if (
      interaction.isButton() &&
      SESSION_LINK_IDS.some((id) => interaction.customId.startsWith(id))
    ) {
      await interaction.deferReply({ flags: 64 });

      const messages = await interaction.channel.messages.fetch({ limit: 50 });
      const msg = messages.find(
        (m) =>
          m.components.length > 0 &&
          m.components[0].components[0].customId === interaction.customId,
      );

      if (!msg || !msg.sessionLink) {
        return interaction.editReply({
          content: "Link not found. The session message may be too old.",
        });
      }

      const { embed } = embedTemplate({
        title: `${SUN} Session Link ${SUN}`,
        description: `> ${ARROW} Here is your link:\n${msg.sessionLink}`,
      });

      return interaction.editReply({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Interaction error:", error);
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

//Inbox Handler
client.on(Events.MessageCreate, async (message) => {
  handleInbox(message, client);
});

//Message Delete Protection
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
    console.error("Failed to recover deleted log:", error);
  }
});

//Bulk Delete Protection
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
    console.error("Failed to recover bulk deleted logs:", error);
  }
});

//Reaction Goal Handler
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    if (user.bot) return;

    const message = reaction.message;
    if (!message.embeds.length) return;
    const embed = message.embeds[0];

    if (!embed.title || !embed.title.includes("Session Startup")) return;

    const match = embed.description.match(/Required reactions:\s\*\*(\d+)\*\*/);
    if (!match) return;

    const required = parseInt(match[1], 10);
    const reactionCount = reaction.count;

    if (reactionCount >= required) {
      if (reaction.message.hasSentReady) return;
      reaction.message.hasSentReady = true;

      const host = embed.description.match(/<@!?(\d+)>/);
      const hostId = host ? host[1] : null;

      const notifyChannel = reaction.message.guild.channels.cache.get(
        "1495828191300948111",
      );
      if (!notifyChannel) return;

      await notifyChannel.send(`<@${hostId}> Your session is ready to start!`);
    }
  } catch (err) {
    console.error("Reaction goal handler error:", err);
  }
});

//Login
if (!process.env.TOKEN) {
  console.error(
    "🔴 TOKEN env var is missing or empty — check Render's Environment tab.",
  );
  process.exit(1);
}

client.login(process.env.TOKEN).catch((err) => {
  console.error("🔴 client.login() failed:", err);
  process.exit(1);
});
