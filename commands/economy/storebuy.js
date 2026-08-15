const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const FOX_DISCOUNTS = {
  standard: 0,
  gold: 0.05,
  platinum: 0.1,
  diamond: 0.15,
  elite: 0.2,
};

const MOAT_DISCOUNTS = {
  standard: 0,
  silver: 0.05,
  gold: 0.1,
  platinum: 0.15,
  black: 0.2,
};

const FOX_PRICES = {
  home_basic: 3400,
  home_all: 5500,
  life: 30000,
  car_basic: 600,
  car_all: 1000,
};

const MOAT_PRICES = {
  vehicle_basic: 500,
  vehicle_all: 850,
  health: 25000,
  home_basic: 3000,
  home_all: 4800,
};

const FOX_ROLES = {
  home_basic: "1537049129803448391",
  home_all: "1537048719805911060",
  life: "1538200236269240400",
  car_basic: "1538199302453858314",
  car_all: "1538199121788145744",
};

const MOAT_ROLES = {
  vehicle_basic: "1537066784279240724",
  vehicle_all: "1537066846786949120",
  health: "1538201686869287002",
  home_basic: "1538201826799788123",
  home_all: "1538201914569789550",
};

// ⭐ NEW — readable plan names
const READABLE_NAMES = {
  // FOX
  home_basic: "Fox Basic Home Insurance",
  home_all: "Fox All Home Insurance",
  life: "Fox Life Insurance",
  car_basic: "Fox Basic Car Insurance",
  car_all: "Fox All Car Insurance",

  // MOAT
  vehicle_basic: "Moat Basic Vehicle Insurance",
  vehicle_all: "Moat All Vehicle Insurance",
  health: "Moat Health Insurance",
  home_basic_moat: "Moat Basic Home Insurance",
  home_all_moat: "Moat All Home Insurance",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("storebuy")
    .setDescription("Purchase an insurance plan.")
    .addStringOption((opt) =>
      opt
        .setName("plan")
        .setDescription("Choose a plan to purchase")
        .setRequired(true)
        .addChoices(
          // FOX
          { name: "Fox Basic Home", value: "home_basic" },
          { name: "Fox All Home", value: "home_all" },
          { name: "Fox Life Insurance", value: "life" },
          { name: "Fox Basic Car", value: "car_basic" },
          { name: "Fox All Car", value: "car_all" },

          // MOAT
          { name: "Moat Basic Vehicle", value: "vehicle_basic" },
          { name: "Moat All Vehicle", value: "vehicle_all" },
          { name: "Moat Health Insurance", value: "health" },
          { name: "Moat Basic Home", value: "home_basic_moat" },
          { name: "Moat All Home", value: "home_all_moat" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const plan = interaction.options.getString("plan");
    const userRecord = await getUserRecord(interaction.user.id);
    const member = interaction.member;

    userRecord.store = userRecord.store || {};

    // ⭐ Normalize Moat home plans
    const normalizedPlan = plan.replace("_moat", "");

    const isFox = [
      "home_basic",
      "home_all",
      "life",
      "car_basic",
      "car_all",
    ].includes(plan);
    const isMoat = [
      "vehicle_basic",
      "vehicle_all",
      "health",
      "home_basic_moat",
      "home_all_moat",
    ].includes(plan);

    let price = isFox ? FOX_PRICES[plan] : MOAT_PRICES[normalizedPlan];

    // ⭐ Apply discount
    if (isFox) {
      const tier = userRecord.foxBank?.tier?.toLowerCase() || "standard";
      price = Math.floor(price * (1 - FOX_DISCOUNTS[tier]));
    } else {
      const tier = userRecord.moatCastle?.tier?.toLowerCase() || "standard";
      price = Math.floor(price * (1 - MOAT_DISCOUNTS[tier]));
    }

    if ((userRecord.cash ?? 0) < price) {
      const template = isFox ? foxbankembedTemplate : moatembedTemplate;
      const { embed, files } = template({
        title: "Insufficient Funds",
        description: `> You need **$${price.toLocaleString()}** but only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.cash -= price;

    // ⭐ Payment cycle
    const cycleDays = isFox
      ? plan === "life"
        ? 60
        : 30
      : plan === "health"
        ? 60
        : 30;

    const nextPayment = Date.now() + cycleDays * 24 * 60 * 60 * 1000;

    const key = normalizedPlan;

    userRecord.store[key] = {
      active: true,
      nextPayment,
    };

    // ⭐ Correct role assignment
    const roleId = isFox ? FOX_ROLES[plan] : MOAT_ROLES[key];
    await member.roles.add(roleId).catch(() => {});

    await updateUserRecord(userRecord);

    // ⭐ Correct readable plan name
    const readableName = READABLE_NAMES[plan];

    const template = isFox ? foxbankembedTemplate : moatembedTemplate;

    const { embed, files } = template({
      title: "Insurance Purchased",
      description:
        `> **Plan:** ${readableName}\n` +
        `> **Price Paid:** $${price.toLocaleString()}\n` +
        `> **Next Payment:** <t:${Math.floor(nextPayment / 1000)}:F>`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
