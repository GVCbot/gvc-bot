const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const embedTemplate = require("../../utils/embedTemplate");

const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const LOG_CHANNEL = "1538196137528401991";

// ===============================
// ⭐ DISCOUNTS
// ===============================
const FOX_DISCOUNTS = {
  standard: 0,
  gold: 0.05,
  platinum: 0.10,
  diamond: 0.15,
  elite: 0.20,
};

const MOAT_DISCOUNTS = {
  standard: 0,
  silver: 0.05,
  gold: 0.10,
  platinum: 0.15,
  black: 0.20,
};

// ===============================
// ⭐ FOX INSURANCE DATA
// ===============================
const FOX_ROLES = {
  home_basic: "1537049129803448391",
  home_all: "1537048719805911060",
  life: "1538200236269240400",
  car_basic: "1538199302453858314",
  car_all: "1538199121788145744",
};

const FOX_PRICES = {
  home_basic: 3400,
  home_all: 5500,
  life: 30000,
  car_basic: 600,
  car_all: 1000,
};

const FOX_CYCLES = {
  home_basic: 30,
  home_all: 30,
  life: 60,
  car_basic: 30,
  car_all: 30,
};

// ===============================
// ⭐ MOAT INSURANCE DATA
// ===============================
const MOAT_ROLES = {
  vehicle_basic: "1537066784279240724",
  vehicle_all: "1537066846786949120",
  health: "1538201686869287002",
  home_basic: "1538201826799788123",
  home_all: "1538201914569789550",
};

const MOAT_PRICES = {
  vehicle_basic: 500,
  vehicle_all: 850,
  health: 25000,
  home_basic: 3000,
  home_all: 4800,
};

const MOAT_CYCLES = {
  vehicle_basic: 30,
  vehicle_all: 30,
  health: 60,
  home_basic: 30,
  home_all: 30,
};

// ===============================
// ⭐ COMMAND
// ===============================
module.exports = {
  data: new SlashCommandBuilder()
    .setName("chargeinsurance")
    .setDescription("HR ONLY — Charge all users their insurance fees."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.editReply("❌ Only HR can use this command.");
    }

    const allRecords = await getAllUserRecords();
    const guild = interaction.guild;
    const logChannel = guild.channels.cache.get(LOG_CHANNEL);

    let charged = 0;
    let cancelled = 0;

    for (const userRecord of allRecords) {
      const member = guild.members.cache.get(userRecord.userId);
      if (!member) continue;

      userRecord.store = userRecord.store || {};

      let foxDM = [];
      let moatDM = [];

      for (const key of Object.keys(userRecord.store)) {
        const insurance = userRecord.store[key];
        if (!insurance?.active) continue;

        const isFox = key in FOX_PRICES;
        const isMoat = key in MOAT_PRICES;

        // ===============================
        // ⭐ Determine price with discount
        // ===============================
        let price = isFox ? FOX_PRICES[key] : MOAT_PRICES[key];

        if (isFox) {
          const tier = userRecord.foxBank?.tier?.toLowerCase() || "standard";
          price = Math.floor(price * (1 - FOX_DISCOUNTS[tier]));
        } else {
          const tier = userRecord.moatCastle?.tier?.toLowerCase() || "standard";
          price = Math.floor(price * (1 - MOAT_DISCOUNTS[tier]));
        }

        // ===============================
        // ⭐ Determine cycle
        // ===============================
        const cycleDays = isFox ? FOX_CYCLES[key] : MOAT_CYCLES[key];

        // ===============================
        // ⭐ Payment due?
        // ===============================
        if (Date.now() >= insurance.nextPayment) {
          // ===============================
          // ⭐ User CAN pay
          // ===============================
          if ((userRecord.cash ?? 0) >= price) {
            userRecord.cash -= price;

            const nextPayment =
              Date.now() + cycleDays * 24 * 60 * 60 * 1000;

            insurance.nextPayment = nextPayment;
            charged++;

            const msg =
              `• **${key.replace("_", " ").toUpperCase()} Charged**\n` +
              `• Amount: $${price.toLocaleString()}\n` +
              `• Next Payment: <t:${Math.floor(nextPayment / 1000)}:F>`;

            if (isFox) foxDM.push(msg);
            else moatDM.push(msg);
          }

          // ===============================
          // ❌ User CANNOT pay — cancel
          // ===============================
          else {
            insurance.active = false;
            insurance.nextPayment = 0;
            cancelled++;

            const roleId = isFox ? FOX_ROLES[key] : MOAT_ROLES[key];
            await member.roles.remove(roleId).catch(() => {});

            const msg =
              `• **${key.replace("_", " ").toUpperCase()} Cancelled**\n` +
              `• Reason: Insufficient funds`;

            if (isFox) foxDM.push(msg);
            else moatDM.push(msg);
          }

          await updateUserRecord(userRecord);
        }
      }

      // ===============================
      // ⭐ Send Fox DM
      // ===============================
      if (foxDM.length > 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "Fox Insurance Update",
          description: foxDM.join("\n\n"),
          noLogo: false,
        });

        member.send({ embeds: [embed], files }).catch(() => {});

        if (logChannel) {
          const { embed: logEmbed, files: logFiles } = foxbankembedTemplate({
            title: "Fox Insurance Charge Log",
            description:
              `> **User:** <@${userRecord.userId}>\n\n${foxDM.join("\n\n")}`,
            noLogo: false,
          });

          logChannel.send({ embeds: [logEmbed], files: logFiles }).catch(() => {});
        }
      }

      // ===============================
      // ⭐ Send Moat DM
      // ===============================
      if (moatDM.length > 0) {
        const { embed, files } = moatembedTemplate({
          title: "Moat Insurance Update",
          description: moatDM.join("\n\n"),
          noLogo: false,
        });

        member.send({ embeds: [embed], files }).catch(() => {});

        if (logChannel) {
          const { embed: logEmbed, files: logFiles } = moatembedTemplate({
            title: "Moat Insurance Charge Log",
            description:
              `> **User:** <@${userRecord.userId}>\n\n${moatDM.join("\n\n")}`,
            noLogo: false,
          });

          logChannel.send({ embeds: [logEmbed], files: logFiles }).catch(() => {});
        }
      }
    }

    // ===============================
    // ⭐ Final HR Summary
    // ===============================
    const { embed } = embedTemplate({
      title: "Insurance Billing Complete",
      description:
        `> **Charged:** ${charged} users\n` +
        `> **Cancelled:** ${cancelled} users\n\n` +
        `All insurance plans have been processed.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
