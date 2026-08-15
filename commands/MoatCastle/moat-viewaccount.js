const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewaccount")
    .setDescription("View your Moat Castle account"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // If no Moat Castle account exists
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

    // Account exists
    const acct = userRecord.moatCastle;
    const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);

    // Accurate card status
    const cardStatus = acct.cardStatus ? acct.cardStatus : "Active";

    const { embed, files } = moatembedTemplate({
      title: "Your Moat Castle Account",
      description:
        `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
        `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
        `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
        `> ${ARROW} **Card Status:** ${cardStatus}\n\n` +
        `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Tier:** ${acct.tier}\n` +
        `> ${ARROW} **Rewards:** ${acct.rewards.toLocaleString()} / 5000\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
