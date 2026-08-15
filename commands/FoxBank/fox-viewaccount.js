const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

// ⭐ Added discount table
const FOX_DISCOUNTS = {
  standard: 0,
  gold: 0.05,
  platinum: 0.1,
  diamond: 0.15,
  elite: 0.2,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-viewaccount")
    .setDescription("View your Fox Bank account"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Account Required",
        description:
          `> ${ARROW} You do not have a Fox Bank account yet.\n` +
          `> ${ARROW} Use **/fox-accountcreate name:** to open one.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.foxBank;
    const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);
    const cardStatus = acct.cardStatus || "Active";

    // ⭐ Added discount calculation
    const tier = acct.tier?.toLowerCase() || "standard";
    const discountPercent = FOX_DISCOUNTS[tier] * 100;

    // ================================
    // ⭐ INSURANCE DISPLAY (ALL FOX PLANS)
    // ================================
    const store = userRecord.store || {};

    const foxPlans = {
      home_basic: "Fox Basic Home Insurance",
      home_all: "Fox All Home Insurance",
      car_basic: "Fox Basic Car Insurance",
      car_all: "Fox All Car Insurance",
      life: "Fox Life Insurance",
    };

    let insuranceText = "";
    let hasFoxInsurance = false;

    for (const key of Object.keys(foxPlans)) {
      const plan = store[key];
      if (plan?.active) {
        hasFoxInsurance = true;

        const nextPaymentUnix = Math.floor(plan.nextPayment / 1000);

        insuranceText +=
          `> ${ARROW} **Insurance:** ${foxPlans[key]}\n` +
          `> ${ARROW} **Next Payment:** <t:${nextPaymentUnix}:F>\n\n`;
      }
    }

    if (!hasFoxInsurance) {
      insuranceText += `> ${ARROW} **Insurance:** None\n\n`;
    }

    // ================================
    // ⭐ OWNED HOMES DISPLAY (unchanged)
    // ================================
    let homesText = "";

    const lakevilleHomes = userRecord.homes?.lakeville || [];
    const sixhousentHomes = userRecord.homes?.sixhousent || [];

    if (lakevilleHomes.length === 0 && sixhousentHomes.length === 0) {
      homesText += `> ${ARROW} **Owned Homes:** None\n\n`;
    } else {
      homesText += `> ${ARROW} **Owned Homes:**\n`;

      for (const home of lakevilleHomes) {
        homesText += `> ${ARROW} Lakeville Home #${home.homeId} — $${home.price.toLocaleString()}\n`;
      }

      for (const home of sixhousentHomes) {
        homesText += `> ${ARROW} Sixhousent Home #${home.homeId} — $${home.price.toLocaleString()}\n`;
      }

      homesText += `\n`;
    }

    // ================================
    // ⭐ FINAL EMBED (added discount line)
    // ================================
    const { embed, files } = foxbankembedTemplate({
      title: "Your Fox Bank Account",
      description:
        `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
        `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
        `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
        `> ${ARROW} **Card Status:** ${cardStatus}\n\n` +
        `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Tier:** ${acct.tier}\n` +
        `> ${ARROW} **Tier Discount:** ${discountPercent}%\n` + // ⭐ Added
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        homesText +
        insuranceText,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
