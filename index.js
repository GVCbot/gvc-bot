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
const moatembedTemplate = require("./utils/moatembedTemplate");

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

// ===============================
// 🔄 Automatic Insurance Billing
// ===============================

const BASIC_ROLE = "1537049129803448391";
const ALL_ROLE = "1537048719805911060";

async function runInsuranceBilling() {
  const allRecords = await getAllUserRecords();
  const guild = client.guilds.cache.get("1058305800252182528");
  if (!guild) return;

  const now = Date.now();

  for (const userRecord of allRecords) {
    if (!userRecord.store) continue;

    // BASIC INSURANCE
    if (userRecord.store.basicInsured?.active) {
      if (now >= userRecord.store.basicInsured.nextPayment) {
        const member = guild.members.cache.get(userRecord.userId);
        const cost = 600;

        if ((userRecord.cash ?? 0) >= cost) {
          // Charge fee
          userRecord.cash -= cost;
          userRecord.store.basicInsured.nextPayment =
            now + 30 * 24 * 60 * 60 * 1000;
          await updateUserRecord(userRecord);
        } else {
          // Cancel insurance
          userRecord.store.basicInsured.active = false;
          userRecord.store.basicInsured.nextPayment = 0;
          await updateUserRecord(userRecord);

          if (member) {
            await member.roles.remove(BASIC_ROLE).catch(() => {});
            member
              .send(
                "⚠️ Your **Fox Basic Insured** plan has been cancelled due to insufficient funds.",
              )
              .catch(() => {});
          }
        }
      }
    }

    // ALL INSURANCE
    if (userRecord.store.allInsured?.active) {
      if (now >= userRecord.store.allInsured.nextPayment) {
        const member = guild.members.cache.get(userRecord.userId);
        const cost = 1000;

        if ((userRecord.cash ?? 0) >= cost) {
          // Charge fee
          userRecord.cash -= cost;
          userRecord.store.allInsured.nextPayment =
            now + 30 * 24 * 60 * 60 * 1000;
          await updateUserRecord(userRecord);
        } else {
          // Cancel insurance
          userRecord.store.allInsured.active = false;
          userRecord.store.allInsured.nextPayment = 0;
          await updateUserRecord(userRecord);

          if (member) {
            await member.roles.remove(ALL_ROLE).catch(() => {});
            member
              .send(
                "⚠️ Your **Fox All Insured** plan has been cancelled due to insufficient funds.",
              )
              .catch(() => {});
          }
        }
      }
    }
  }
}

// Run every 12 hours
setInterval(runInsuranceBilling, 12 * 60 * 60 * 1000);

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

    //Bank Balance Handler
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("viewBalance_")
    ) {
      const [, viewerId, targetId] = interaction.customId.split("_");
      const targetRecord = await getUserRecord(targetId);

      const banks = await loadAllBanks(targetRecord);

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

    // Bank Deposit Handler
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("deposit_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const [bankId, amountInput] = interaction.values[0].split("|");
      const userRecord = await getUserRecord(interaction.user.id);

      // 1. Locate the true owner's record for this bank
      const ownerRecord = await findBankOwnerRecord(bankId, userRecord);
      if (!ownerRecord) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      const bank = ownerRecord.banks.find((b) => b.id === bankId);

      // 2. Determine deposit amount
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

      // 3. Update balances
      userRecord.cash -= amount;
      bank.balance = (bank.balance ?? 0) + amount;

      // 4. Save both records (or just userRecord if the user owns the bank)
      await updateUserRecord(userRecord);
      if (ownerRecord.userId !== userRecord.userId) {
        await updateUserRecord(ownerRecord);
      }

      // 5. Send confirmation using bank.name
      const { embed } = embedTemplate({
        title: "🏦 Deposit Successful",
        description:
          `> Deposited **$${amount.toLocaleString()}** into **${bank.name}**.\n\n` +
          `> **New Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> **Bank Balance:** $${bank.balance.toLocaleString()}`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Bank Withdraw Handler
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("withdraw_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const [bankId, amountInput] = interaction.values[0].split("|");
      const userRecord = await getUserRecord(interaction.user.id);

      const ownerRecord = await findBankOwnerRecord(bankId, userRecord);
      if (!ownerRecord) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }
      const bank = ownerRecord.banks.find((b) => b.id === bankId);

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
      if (ownerRecord.userId !== userRecord.userId) {
        await updateUserRecord(ownerRecord);
      }

      const { embed } = embedTemplate({
        title: "🏦 Withdrawal Successful",
        description:
          `> Withdrew **$${amount.toLocaleString()}** from **${bank.name}**.\n\n` +
          `> **New Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> **Bank Balance:** $${bank.balance.toLocaleString()}`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Bank Delete Handler
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("bank_delete_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const bankId = interaction.customId.replace("bank_delete_", "");
      const userId = interaction.user.id;

      const ownerRecord = await getUserRecord(userId);

      const bank = ownerRecord?.banks?.find((b) => b.id === bankId);
      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      if (bank.owner !== userId) {
        return interaction.editReply({
          content: "❌ Only the bank owner can delete this bank.",
          flags: 64,
        });
      }

      // 1. Get remaining balance (default to 0 if undefined)
      const returnedCash = Number(bank.balance) || 0;

      // 2. Add bank balance back to owner's cash
      ownerRecord.cash = (Number(ownerRecord.cash) || 0) + returnedCash;

      // 3. Remove bank from owner's banks list
      ownerRecord.banks = ownerRecord.banks.filter((b) => b.id !== bankId);

      // 4. Save updated owner record IMMEDIATELY so the cash refund is persisted
      await updateUserRecord(ownerRecord);

      // 5. Clean up joinedBanks for co-owners AFTER saving ownerRecord
      if (Array.isArray(bank.members) && bank.members.length > 0) {
        for (const memberId of bank.members) {
          // Ensure owner is completely skipped
          if (memberId === userId) continue;

          const memberRecord = await getUserRecord(memberId);
          if (memberRecord?.joinedBanks) {
            memberRecord.joinedBanks = memberRecord.joinedBanks.filter(
              (id) => id !== bankId,
            );
            await updateUserRecord(memberRecord);
          }
        }
      }

      // 6. Respond with confirmation & refunded amount
      const { embed } = embedTemplate({
        title: "🗑️ Bank Deleted",
        description:
          `> ${ARROW} Your bank **${bank.name || bank.type}** has been deleted.\n` +
          `> ${ARROW} **$${returnedCash.toLocaleString()}** was deposited back into your cash balance.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    //Bank Join Accept Handler
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("inv_accept_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const parts = interaction.customId.split("_");
      const bankId = `${parts[2]}_${parts[3]}_${parts[4]}`;
      const userId = parts[5];

      let ownerRecord = await getUserRecord(interaction.user.id);

      if (!ownerRecord) {
        console.warn(
          "⚠️ Owner record not found, searching all user records...",
        );
        const allRecords = await getAllUserRecords();
        ownerRecord = allRecords.find((r) =>
          r.banks?.some((b) => b.id === bankId),
        );
      }

      if (!ownerRecord || !ownerRecord.userId) {
        console.error(
          "❌ Owner record missing, aborting update to prevent overwrite.",
        );
        const { embed } = embedTemplate({
          title: "⚠️ Internal Error",
          description:
            "> Could not verify the bank owner record. Please try again later.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], flags: 64 });
      }

      let bank = ownerRecord.banks.find((b) => b.id === bankId);

      if (!bank) {
        const allRecords = await getAllUserRecords();
        for (const rec of allRecords) {
          if (!rec.banks) continue;
          const found = rec.banks.find((b) => b.id === bankId);
          if (found) {
            bank = found;
            break;
          }
        }
      }

      if (!bank) {
        const { embed } = embedTemplate({
          title: "❌ Bank Not Found",
          description: "> The specified bank could not be located.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], flags: 64 });
      }

      let userRecord = await getUserRecord(userId);
      if (!userRecord) {
        userRecord = {
          id: userId,
          cash: 0,
          banks: [],
          joinedBanks: [],
          records: { citations: [], warrants: [], blackpoints: 0 },
        };
        await updateUserRecord(userRecord);
      }

      if (!bank.members.includes(userId)) bank.members.push(userId);
      if (!userRecord.joinedBanks) userRecord.joinedBanks = [];
      if (!userRecord.joinedBanks.includes(bankId))
        userRecord.joinedBanks.push(bankId);

      ownerRecord.joinRequests = ownerRecord.joinRequests.filter(
        (r) => !(r.bankId === bankId && r.userId === userId),
      );

      await updateUserRecord(ownerRecord);
      await updateUserRecord(userRecord);

      const { embed } = embedTemplate({
        title: "✅ Join Request Accepted",
        description:
          `> ${ARROW} **Bank:** ${bank.name}\n` +
          `> ${ARROW} **New Member:** <@${userId}>\n\n` +
          `> The user has been successfully added as a co‑owner.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], flags: 64 });
    }

    //Bank Join Deny Handler
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("inv_deny_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const parts = interaction.customId.split("_");
      const bankId = `${parts[2]}_${parts[3]}_${parts[4]}`;
      const userId = parts[5];

      const ownerRecord = await getUserRecord(interaction.user.id);

      ownerRecord.joinRequests = ownerRecord.joinRequests.filter(
        (r) => !(r.bankId === bankId && r.userId === userId),
      );

      if (!ownerRecord || !ownerRecord.userId) {
        console.error(
          "❌ Owner record missing, aborting update to prevent overwrite.",
        );
        const { embed } = embedTemplate({
          title: "⚠️ Internal Error",
          description:
            "> Could not verify the bank owner record. Please try again later.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], flags: 64 });
      }

      await updateUserRecord(ownerRecord);

      const { embed } = embedTemplate({
        title: "❌ Join Request Denied",
        description:
          `> ${ARROW} **Bank ID:** ${bankId}\n` +
          `> ${ARROW} **User:** <@${userId}>\n\n` +
          `> The join request has been denied and removed from your list.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], flags: 64 });
    }

    //Remove Bank Member Handler
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("removebankmember_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const bankId = interaction.customId.replace(
        "removebankmember_select_",
        "",
      );
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

      bank.members = bank.members.filter((id) => id !== removedId);

      if (!ownerRecord || !ownerRecord.userId) {
        console.error(
          "❌ Owner record missing, aborting update to prevent overwrite.",
        );
        const { embed } = embedTemplate({
          title: "⚠️ Internal Error",
          description:
            "> Could not verify the bank owner record. Please try again later.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], flags: 64 });
      }

      await updateUserRecord(ownerRecord);

      const removedRecord = await getUserRecord(removedId);
      removedRecord.joinedBanks = (removedRecord.joinedBanks || []).filter(
        (id) => id !== bankId,
      );
      await updateUserRecord(removedRecord);

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

    //Manage Bank Select Handler
    if (
      interaction.isStringSelectMenu() &&
      interaction.customId.startsWith("managebank_select_")
    ) {
      await interaction.deferReply({ flags: 64 });

      const bankId = interaction.values[0];
      const userRecord = await getUserRecord(interaction.user.id);

      const banks = await loadAllBanks(userRecord);
      const bank = banks.find((b) => b.id === bankId);

      if (!bank) {
        return interaction.editReply({
          content: "❌ Bank not found.",
          flags: 64,
        });
      }

      if (bank.owner !== interaction.user.id) {
        const { embed } = embedTemplate({
          title: "❌ Access Denied",
          description:
            `> Only the **bank owner** can manage this bank.\n` +
            `> As a co‑owner, you can still:\n` +
            `> ${ARROW} **Deposit** using /deposit\n` +
            `> ${ARROW} **Withdraw** using /withdraw\n\n` +
            `> You cannot delete or modify bank settings.`,
          noLogo: true,
        });

        embed.setThumbnail(
          interaction.user.displayAvatarURL({ dynamic: true }),
        );

        return interaction.editReply({ embeds: [embed] });
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

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`bank_delete_${bank.id}`)
          .setLabel("Delete Bank")
          .setStyle(ButtonStyle.Danger),
      );

      return interaction.editReply({ embeds: [embed], components: [buttons] });
    }
    // ===============================
    // 🔵 Moat Castle Loan Accept / Deny Handler
    // ===============================
    if (
      interaction.isButton() &&
      interaction.customId.startsWith("moat_loan_")
    ) {
      const moatStaffRole = "1537722114176581724"; // Moat Castle Staff

      if (!interaction.member.roles.cache.has(moatStaffRole)) {
        return interaction.reply({
          content: "❌ Only Moat Castle staff can manage loans.",
          ephemeral: true,
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const parts = interaction.customId.split("_");
      const action = parts[2]; // accept or deny
      const requesterId = parts[3];
      const requestId = parts[4];

      const requesterRecord = await getUserRecord(requesterId);

      if (!requesterRecord.moatCastle) {
        const { embed } = moatembedTemplate({
          title: "Account Deleted",
          description:
            `> ${ARROW} The requester’s Moat Castle account was **deleted**.\n` +
            `> ${ARROW} No further action was taken.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const loanRequests = requesterRecord.moatCastle.loanRequests || [];
      const request = loanRequests.find((r) => r.id === requestId);

      if (!request) {
        return interaction.editReply({ content: "❌ Loan request not found." });
      }

      const requesterUser = await interaction.client.users.fetch(requesterId);

      // Initialize loans array if missing
      if (!requesterRecord.moatCastle.loans) {
        requesterRecord.moatCastle.loans = [];
      }

      // Remove request from pending list
      requesterRecord.moatCastle.loanRequests =
        requesterRecord.moatCastle.loanRequests.filter((r) => r !== request);

      let channelEmbed;

      // ===============================
      // ✔ ACCEPT LOAN
      // ===============================
      if (action === "accept") {
        requesterRecord.moatCastle.loans.push({
          amount: request.amount,
          remaining: request.amount,
          reason: request.reason,
          createdAt: Date.now(),
        });

        requesterRecord.moatCastle.balance += request.amount;

        // ⭐ NEW: Update last modified timestamp
        requesterRecord.moatCastle.updatedAt = Date.now();

        await updateUserRecord(requesterRecord);

        channelEmbed = moatembedTemplate({
          title: "✅ Loan Accepted",
          description:
            `> ${ARROW} **Requester:** <@${requesterId}>\n` +
            `> ${ARROW} **Amount:** $${request.amount.toLocaleString()}\n` +
            `> ${ARROW} Loan has been **approved** and added to their Moat Castle balance.`,
          noLogo: false,
        }).embed;

        // DM requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏦 Moat Castle Loan Approved",
            description:
              `> ${ARROW} Your loan for **$${request.amount.toLocaleString()}** has been **approved**.\n` +
              `> ${ARROW} Funds have been added to your Moat Castle balance.\n\n` +
              `> ${ARROW} You can review your loan using **/moat-loanreview**.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      // ===============================
      // ❌ DENY LOAN
      // ===============================
      if (action === "deny") {
        requesterRecord.moatCastle.loans = [];

        // ⭐ NEW: Update last modified timestamp
        requesterRecord.moatCastle.updatedAt = Date.now();

        await updateUserRecord(requesterRecord);

        channelEmbed = moatembedTemplate({
          title: "❌ Loan Denied",
          description:
            `> ${ARROW} **Requester:** <@${requesterId}>\n` +
            `> ${ARROW} **Amount:** $${request.amount.toLocaleString()}\n` +
            `> ${ARROW} Loan request has been **denied**.`,
          noLogo: false,
        }).embed;

        // DM requester
        try {
          const { embed: dmEmbed } = moatembedTemplate({
            title: "🏦 Moat Castle Loan Denied",
            description:
              `> ${ARROW} Your loan request for **$${request.amount.toLocaleString()}** has been **denied**.\n` +
              `> ${ARROW} You may submit another request using **/moat-loanrequest** if needed.`,
            noLogo: false,
          });
          await requesterUser.send({ embeds: [dmEmbed] });
        } catch {}
      }

      // Reply in the channel (not ephemeral)
      await interaction.message.reply({ embeds: [channelEmbed] });

      // Staff confirmation
      return interaction.editReply({
        content: `Loan ${action === "accept" ? "approved ✅" : "denied ❌"} successfully.`,
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
