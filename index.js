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
} = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const embedTemplate = require("./utils/embedTemplate");
const { getUserRecord, updateUserRecord } = require("./economy/economyutils");
const handleInbox = require("./utils/inbox");

//Configuration
const GENERAL_LOG_CHANNEL = "1534886183040188547";
const SESSION_LOG_CHANNEL = "1534889791416438784";
const HR_ROLE_ID = "1350582607217430650";

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const SESSION_LINK_IDS = [
  "release_link",
  "reinvites_link",
  "earlyaccess_link",
  "regen_link",
];

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
    : `> <:arrowright:1534182706836144158> No vehicles on this page.`;

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

// Unified Bank Loader (owned + joined)
async function loadAllBanks(userRecord) {
  const owned = userRecord.banks || [];
  const joinedIds = userRecord.joinedBanks || [];

  const joined = [];

  for (const bankId of joinedIds) {
    const ownerId = bankId.split("_")[1];
    const ownerRecord = await getUserRecord(ownerId);
    if (!ownerRecord.banks) continue;

    const bank = ownerRecord.banks.find((b) => b.id === bankId);
    if (bank) joined.push(bank);
  }

  return [...owned, ...joined];
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

      if (
        SESSION_COMMANDS.some((s) =>
          interaction.commandName.toLowerCase().includes(s),
        )
      )
        logChannels = [GENERAL_LOG_CHANNEL, SESSION_LOG_CHANNEL];
    } else if (interaction.isButton()) {
      // ------------------------------
      // BUTTON CLICK LOGGING (LONG ID SYSTEM)
      // ------------------------------
      const SESSION_BUTTON_LOG = "1515684241101295646"; // session button logs
      const OTHER_BUTTON_LOG = "1536797059355508826"; // misc button logs

      const guild = interaction.guild;
      const unix = Math.floor(Date.now() / 1000);
      const timestamp = `<t:${unix}:F>`;
      const user = interaction.user;

      // Try to get the button label (button name)
      let buttonName = "Unknown Button";
      try {
        buttonName = interaction.component?.label || "Unknown Button";
      } catch {}

      // Build log description
      const logDescription =
        `> ${ARROW} **User:** ${user}\n` +
        `> ${ARROW} **User ID:** ${user.id}\n` +
        `> ${ARROW} **Button ID:** ${interaction.customId}\n` +
        `> ${ARROW} **Button Name:** ${buttonName}\n` +
        `> ${ARROW} **Channel:** ${interaction.channel} (${interaction.channel.id})\n` +
        (interaction.message
          ? `> ${ARROW} **Message ID:** ${interaction.message.id}\n`
          : "") +
        `> ${ARROW} **Clicked At:** ${timestamp}`;

      const { embed } = embedTemplate({
        title: `${SUN} Button Click Logged ${SUN}`,
        description: logDescription,
        noLogo: true,
      });

      // Determine which log channel to use based on LONG IDs
      let targetLogChannel;

      if (
        interaction.customId.startsWith("rl_") || // release
        interaction.customId.startsWith("ri_") || // reinvites
        interaction.customId.startsWith("ea_") // earlyaccess
      ) {
        targetLogChannel = guild.channels.cache.get(SESSION_BUTTON_LOG);
      } else {
        targetLogChannel = guild.channels.cache.get(OTHER_BUTTON_LOG);
      }

      if (targetLogChannel) {
        targetLogChannel.send({ embeds: [embed] }).catch(() => {});
      }
      // ------------------------------
      // END BUTTON CLICK LOGGING
      // ------------------------------

      logTitle = `${SUN} Button Clicked ${SUN}`;

      let linkInfo = "";
      if (interaction.customId.startsWith("release_link_")) {
        const link = decodeURIComponent(
          interaction.customId.replace("release_link_", ""),
        );
        linkInfo = `\n> ${ARROW} **Link:** ${link}`;
      }

      extraDetails = `> ${ARROW} **Button ID:** ${interaction.customId}${linkInfo}`;

      if (interaction.customId.startsWith("release_link"))
        logChannels = [GENERAL_LOG_CHANNEL, SESSION_LOG_CHANNEL];
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

    //Balance Handler
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("viewBalance_")
    ) {
      const [, viewerId, targetId] = interaction.customId.split("_");
      const targetRecord = await getUserRecord(targetId);

      const banks = targetRecord.banks ?? [];

      if (banks.length === 0) {
        const { embed, files } = embedTemplate({
          title: "🏦 No Banks",
          description: "> You are not in any banks.",
          noLogo: true,
        });
        return interaction.reply({ embeds: [embed], files, flags: 64 });
      }

      const options = banks.map((b) => ({
        label: `${b.type} (${b.id})`,
        description: `Balance: $${b.balance}`,
        value: b.id,
      }));

      const row = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`bank_select_${targetId}`)
          .setPlaceholder("Choose a bank to view")
          .addOptions(options),
      );

      const { embed, files } = embedTemplate({
        title: "🏦 Select a Bank",
        description: "> Choose which bank you want to view.",
        noLogo: true,
      });

      return interaction.reply({
        embeds: [embed],
        files,
        components: [row],
        flags: 64,
      });
    }

    // Withdraw Handler (Chunk 3A)
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("withdraw_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const [bankId, amountInput] = interaction.values[0].split("|");
      const userRecord = await getUserRecord(interaction.user.id);

      const banks = await loadAllBanks(userRecord);
      const bank = banks.find((b) => b.id === bankId);

      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      let amount =
        amountInput === "all" ? bank.balance : parseInt(amountInput, 10);

      if (isNaN(amount) || amount <= 0) {
        return interaction.editReply({
          content: "❌ Invalid amount.",
          flags: 64,
        });
      }

      if (bank.balance < amount) {
        return interaction.editReply({
          content: "❌ Not enough balance in this bank.",
          flags: 64,
        });
      }

      bank.balance -= amount;
      userRecord.cash += amount;

      await updateUserRecord(userRecord);

      const { embed } = embedTemplate({
        title: "🏦 Withdrawal Successful",
        description:
          `> Withdrew **$${amount.toLocaleString()}** from **${bank.type}**.\n\n` +
          `> **New Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> **Bank Balance:** $${bank.balance.toLocaleString()}`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Deposit Handler (Chunk 3B)
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("deposit_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const [bankId, amountInput] = interaction.values[0].split("|");
      const userRecord = await getUserRecord(interaction.user.id);

      const banks = await loadAllBanks(userRecord);
      const bank = banks.find((b) => b.id === bankId);

      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      let amount =
        amountInput === "all" ? userRecord.cash : parseInt(amountInput, 10);

      if (isNaN(amount) || amount <= 0) {
        return interaction.editReply({
          content: "❌ Invalid amount.",
          flags: 64,
        });
      }

      if (userRecord.cash < amount) {
        return interaction.editReply({
          content: "❌ You don't have enough cash.",
          flags: 64,
        });
      }

      userRecord.cash -= amount;
      bank.balance += amount;

      await updateUserRecord(userRecord);

      const { embed } = embedTemplate({
        title: "🏦 Deposit Successful",
        description:
          `> Deposited **$${amount.toLocaleString()}** into **${bank.type}**.\n\n` +
          `> **New Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> **Bank Balance:** $${bank.balance.toLocaleString()}`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
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
          description: `> <:arrowright:1534182706836144158> ${
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

    // Bank Wipe Handler (Chunk 4A)
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("bankwipe_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const targetId = interaction.customId.split("_")[2];
      const bankId = interaction.values[0];

      const ownerRecord = await getUserRecord(targetId);

      // Find the bank
      const bank = ownerRecord.banks.find((b) => b.id === bankId);
      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      // Remove bank from all members
      for (const memberId of bank.members) {
        const memberRecord = await getUserRecord(memberId);

        if (memberRecord.joinedBanks) {
          memberRecord.joinedBanks = memberRecord.joinedBanks.filter(
            (id) => id !== bankId,
          );
          await updateUserRecord(memberRecord);
        }
      }

      // ⭐ AUTO-WITHDRAW BEFORE DELETION
      ownerRecord.cash = (ownerRecord.cash ?? 0) + bank.balance;
      bank.balance = 0;

      // Remove bank from all members
      for (const memberId of bank.members) {
        const memberRecord = await getUserRecord(memberId);

        if (memberRecord.joinedBanks) {
          memberRecord.joinedBanks = memberRecord.joinedBanks.filter(
            (id) => id !== bankId,
          );
          await updateUserRecord(memberRecord);
        }
      }

      // Remove bank from owner
      ownerRecord.banks = ownerRecord.banks.filter((b) => b.id !== bankId);
      await updateUserRecord(ownerRecord);

      const { embed } = embedTemplate({
        title: "🗑️ Bank Deleted",
        description:
          `> ${ARROW} Your bank **${bank.name}** has been deleted.\n` +
          `> ${ARROW} **$${bank.balance.toLocaleString()}** was withdrawn into your cash.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Delete Bank Button Handler (Chunk 4B)
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("bank_delete_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const bankId = interaction.customId.replace("bank_delete_", "");
      const userId = interaction.user.id;

      const ownerRecord = await getUserRecord(userId);

      // Find the bank
      const bank = ownerRecord.banks.find((b) => b.id === bankId);
      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      // Only owner can delete
      if (bank.owner !== userId) {
        return interaction.editReply({
          content: "❌ Only the bank owner can delete this bank.",
          flags: 64,
        });
      }

      // Remove bank from all members
      for (const memberId of bank.members) {
        const memberRecord = await getUserRecord(memberId);

        if (memberRecord.joinedBanks) {
          memberRecord.joinedBanks = memberRecord.joinedBanks.filter(
            (id) => id !== bankId,
          );
          await updateUserRecord(memberRecord);
        }
      }

      // Remove bank from owner
      ownerRecord.banks = ownerRecord.banks.filter((b) => b.id !== bankId);
      await updateUserRecord(ownerRecord);

      const { embed } = embedTemplate({
        title: "🗑️ Bank Deleted",
        description: `> ${ARROW} Your bank **${bank.type}** has been deleted.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Bank Join Accept
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("bankjoin_accept_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const [, , bankId, userId] = interaction.customId.split("_");

      const ownerRecord = await getUserRecord(interaction.user.id);
      const bank = ownerRecord.banks.find((b) => b.id === bankId);

      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      const userRecord = await getUserRecord(userId);

      bank.members.push(userId);
      userRecord.joinedBanks.push(bankId);

      // Make them co-owner
      bank.owner = interaction.user.id; // or push into a coOwners array if you prefer

      await updateUserRecord(ownerRecord);
      await updateUserRecord(userRecord);

      const user = await interaction.client.users.fetch(userId);
      await user.send(`✅ Your request to join **${bank.name}** was accepted!`);

      return interaction.editReply({
        content: "User added as co-owner.",
        flags: 64,
      });
    }

    // Bank Join Deny
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("bankjoin_deny_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const [, , bankId, userId] = interaction.customId.split("_");

      const user = await interaction.client.users.fetch(userId);
      await user.send(`❌ Your request to join the bank was denied.`);

      return interaction.editReply({ content: "Request denied.", flags: 64 });
    }

    // Remove Bank Member Handler
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("removebankmember_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const bankId = interaction.customId.split("_")[2];
      const removedId = interaction.values[0];
      const ownerId = interaction.user.id;

      const ownerRecord = await getUserRecord(ownerId);
      const bank = ownerRecord.banks.find((b) => b.id === bankId);

      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      // Remove from bank.members
      bank.members = bank.members.filter((id) => id !== removedId);
      await updateUserRecord(ownerRecord);

      // Remove from user's joinedBanks
      const removedRecord = await getUserRecord(removedId);
      removedRecord.joinedBanks = (removedRecord.joinedBanks || []).filter(
        (id) => id !== bankId,
      );
      await updateUserRecord(removedRecord);

      // DM removed user
      try {
        const removedUser = await interaction.client.users.fetch(removedId);
        await removedUser.send(
          `❌ You have been removed as a co-owner of **${bank.name}**.`,
        );
      } catch {}

      const { embed } = embedTemplate({
        title: "🏦 Member Removed",
        description:
          `> ${ARROW} **Bank:** ${bank.name}\n` +
          `> ${ARROW} **Removed:** <@${removedId}>\n\n` +
          `> They are no longer a co-owner.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Managebank Handler
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("managebank_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const bankId = interaction.values[0];
      const userRecord = await getUserRecord(interaction.user.id);

      // Load all banks (owned + joined)
      const banks = await loadAllBanks(userRecord);
      const bank = banks.find((b) => b.id === bankId);

      if (bank.owner !== interaction.user.id) {
        const { embed } = embedTemplate({
          title: "❌ Access Denied",
          description: "> Only the **bank owner** can manage this bank.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      const { embed } = embedTemplate({
        title: `${SUN} ${bank.name} ${SUN}`,
        description:
          `> ${ARROW} **Bank ID:** ${bank.id}\n` +
          `> ${ARROW} **Type:** ${bank.type}\n` +
          `> ${ARROW} **Owner:** <@${bank.owner}>\n` +
          `> ${ARROW} **Members:** ${bank.members.map((m) => `<@${m}>`).join(", ")}\n` +
          `> ${ARROW} **Password:** ${bank.password ? bank.password : "None Set"}\n` +
          `> ${ARROW} **Balance:** $${bank.balance.toLocaleString()}`,
        noLogo: true,
      });

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`bank_delete_${bank.id}`)
          .setLabel("Delete Bank")
          .setStyle(ButtonStyle.Danger),
      );

      return interaction.editReply({ embeds: [embed], components: [buttons] });
    }

    // NEW SESSION LINK HANDLER (short ID system)
    if (
      interaction.isButton() &&
      (interaction.customId.startsWith("rl_") ||
        interaction.customId.startsWith("ri_") ||
        interaction.customId.startsWith("ea_") ||
        interaction.customId.startsWith("regen_"))
    ) {
      await interaction.deferReply({ flags: 64 });

      // Fetch recent messages to find the one containing the button
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

      const link = msg.sessionLink;

      const { embed } = embedTemplate({
        title: `${SUN} Session Link ${SUN}`,
        description: `> ${ARROW} Here is your link:\n${link}`,
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

// Reaction Goal Handler
client.on(Events.MessageReactionAdd, async (reaction, user) => {
  try {
    // Ignore bot reactions
    if (user.bot) return;

    const message = reaction.message;

    // Only track startup embeds
    if (!message.embeds.length) return;
    const embed = message.embeds[0];

    if (!embed.title || !embed.title.includes("Session Startup")) return;

    // Extract required reactions from embed description
    const match = embed.description.match(/Required reactions:\s\*\*(\d+)\*\*/);
    if (!match) return;

    const required = parseInt(match[1], 10);

    // Count reactions
    const reactionCount = reaction.count;

    // If goal met, send message
    if (reactionCount >= required) {
      // Prevent duplicate notifications
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
client.login(process.env.TOKEN);
