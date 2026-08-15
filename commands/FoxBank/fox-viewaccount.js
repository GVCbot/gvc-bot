const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-viewaccount")
    .setDescription("View your Fox Bank account"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // If no Fox Bank account exists
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

    // ================================
    // ⭐ INSURANCE DISPLAY
    // ================================
    const store = userRecord.store || {};

    const foxBasic = store.fox_basic?.active ? store.fox_basic : null;
    const foxAll = store.fox_all?.active ? store.fox_all : null;

    let insuranceText = "";

    if (foxBasic) {
      insuranceText +=
        `> ${ARROW} **Insurance:** Fox Basic Insured\n` +
        `> ${ARROW} **Next Payment:** <t:${Math.floor(
          foxBasic.nextPayment / 1000,
        )}:F>\n\n`;
    }

    if (foxAll) {
      insuranceText +=
        `> ${ARROW} **Insurance:** Fox All Insured\n` +
        `> ${ARROW} **Next Payment:** <t:${Math.floor(
          foxAll.nextPayment / 1000,
        )}:F>\n\n`;
    }

    if (!foxBasic && !foxAll) {
      insuranceText += `> ${ARROW} **Insurance:** None\n\n`;
    }

    // ================================
    // ⭐ FINAL EMBED
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
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        insuranceText,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
