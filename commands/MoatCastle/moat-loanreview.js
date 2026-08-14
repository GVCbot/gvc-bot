const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

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
          `> <:moatcastleright:1537695231409918002> Your Moat Castle account was **deleted**.\n` +
          `> <:moatcastleright:1537695231409918002> No further action was taken.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loans = userRecord.moatCastle.loans || [];

    if (loans.length === 0) {
      const { embed, files } = moatembedTemplate({
        title: "No Active Loans",
        description: `> <:moatcastleright:1537695231409918002> You do not have any active loans.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    let desc = "";
    loans.forEach((loan, i) => {
      const createdUnix = Math.floor(loan.createdAt / 1000);
      desc +=
        `> <:moatcastleright:1537695231409918002> **Loan #${i + 1}**\n` +
        `> Amount: $${loan.amount.toLocaleString()}\n` +
        `> Remaining: $${loan.remaining.toLocaleString()}\n` +
        `> Reason: ${loan.reason}\n` +
        `> Created: <t:${createdUnix}:F>\n\n`;
    });

    const { embed, files } = moatembedTemplate({
      title: "💰 Moat Castle Loan Status",
      description: desc,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
