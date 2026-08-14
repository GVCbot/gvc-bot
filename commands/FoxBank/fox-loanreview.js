const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { getUserRecord } = require("../../economy/economyutils");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-loanreview")
    .setDescription("Review your Fox Bank loan status."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Account Deleted",
        description:
          `> ${ARROW} Your Fox Bank account was **deleted**.\n` +
          `> ${ARROW} No further action was taken.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loans = userRecord.foxBank.loans || [];

    // No active loans
    if (loans.length === 0) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Active Loans",
        description: `> ${ARROW} You do not have any active Fox Bank loans.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Build loan list
    let desc = "";
    loans.forEach((loan, i) => {
      const createdUnix = Math.floor(loan.createdAt / 1000);
      desc +=
        `> ${ARROW} **Loan #${i + 1}**\n` +
        `> ${ARROW} Amount: $${loan.amount.toLocaleString()}\n` +
        `> ${ARROW} Remaining: $${loan.remaining.toLocaleString()}\n` +
        `> ${ARROW} Reason: ${loan.reason}\n` +
        `> ${ARROW} Created: <t:${createdUnix}:F>\n\n`;
    });

    const { embed, files } = foxbankembedTemplate({
      title: "🦊 Fox Bank Loan Status",
      description: desc,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
