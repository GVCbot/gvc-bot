const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

// ⭐ Discount table
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

    // ⭐ Discount calculation
    const tier = acct.tier?.toLowerCase() || "standard";
    const discountPercent = MOAT_DISCOUNTS[tier] * 100;

    // ⭐ Final embed
    const { embed, files } = moatembedTemplate({
      title: "Your Moat Castle Account",
      description:
        `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
        `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
        `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
        `> ${ARROW} **Card Status:** ${cardStatus}\n\n` +
        `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Tier:** ${acct.tier}\n` +
        `> ${ARROW} **Tier Discount:** ${discountPercent}%\n` +
        `> ${ARROW} **Rewards:** ${acct.rewards.toLocaleString()} / 5000\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
