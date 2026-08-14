const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { getUserRecord } = require("../../economy/economyutils");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;


module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-loanreview")
    .setDescription("Review your Moat Castle loan status."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Account Deleted",
        description:
          `> ${ARROW} Your Moat Castle account was **deleted**.\n` +
          `> ${ARROW} No further action was taken.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loans = userRecord.moatCastle.loans || [];

    if (loans.length === 0) {
      const { embed, files } = moatembedTemplate({
        title: "No Active Loans",
        description: `> ${ARROW} You do not have any active loans.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

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

    const { embed, files } = moatembedTemplate({
      title: "💰 Moat Castle Loan Status",
      description: desc,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
