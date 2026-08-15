const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

// ⭐ Added discount table
const MOAT_DISCOUNTS = {
  standard: 0,
  silver: 0.05,
  gold: 0.1,
  platinum: 0.15,
  black: 0.2,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewaccount")
    .setDescription("View your Moat Castle account"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Account Required",
        description:
          `> ${ARROW} You do not have a Moat Castle account yet.\n` +
          `> ${ARROW} Use **/moat-accountcreate name:** to open one.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.moatCastle;
    const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);
    const cardStatus = acct.cardStatus || "Active";

    // ⭐ Added discount calculation
    const tier = acct.tier?.toLowerCase() || "standard";
    const discountPercent = MOAT_DISCOUNTS[tier] * 100;

    // ================================
    // ⭐ INSURANCE DISPLAY (ALL MOAT PLANS)
    // ================================
    const store = userRecord.store || {};

    const moatPlans = {
      vehicle_basic: "Moat Basic Vehicle Insurance",
      vehicle_all: "Moat All Vehicle Insurance",
      health: "Moat Health Insurance",
      home_basic: "Moat Basic Home Insurance",
      home_all: "Moat All Home Insurance",
    };

    let insuranceText = "";
    let hasMoatInsurance = false;

    for (const key of Object.keys(moatPlans)) {
      const plan = store[key];
      if (plan?.active) {
        hasMoatInsurance = true;

        const nextPaymentUnix = Math.floor(plan.nextPayment / 1000);

        insuranceText +=
          `> ${ARROW} **Insurance:** ${moatPlans[key]}\n` +
          `> ${ARROW} **Next Payment:** <t:${nextPaymentUnix}:F>\n\n`;
      }
    }

    if (!hasMoatInsurance) {
      insuranceText += `> ${ARROW} **Insurance:** None\n\n`;
    }

    // ================================
    // ⭐ FINAL EMBED (added discount line)
    // ================================
    const { embed, files } = moatembedTemplate({
      title: "Your Moat Castle Account",
      description:
        `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
        `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
        `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
        `> ${ARROW} **Card Status:** ${cardStatus}\n\n` +
        `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Tier:** ${acct.tier}\n` +
        `> ${ARROW} **Tier Discount:** ${discountPercent}%\n` + // ⭐ Added
        `> ${ARROW} **Rewards:** ${acct.rewards.toLocaleString()} / 5000\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        insuranceText,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
