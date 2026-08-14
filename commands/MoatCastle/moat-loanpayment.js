const {
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
} = require("discord.js");

const moatembedTemplate = require("../../utils/moatembedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-loanpayment")
    .setDescription("Pay off your Moat Castle loan.")
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to pay (number or 'all').")
        .setRequired(true),
    ),

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

    const menu = new StringSelectMenuBuilder()
      .setCustomId("loan_select")
      .setPlaceholder("Select a loan to pay")
      .addOptions(
        loans.map((loan, i) => ({
          label: `Loan #${i + 1} - $${loan.remaining.toLocaleString()} remaining`,
          value: i.toString(),
        })),
      );

    const row = new ActionRowBuilder().addComponents(menu);

    return interaction.editReply({
      content: "Select the loan you want to pay:",
      components: [row],
    });
  },
};
