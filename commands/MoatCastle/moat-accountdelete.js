const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-accountdelete")
    .setDescription("Delete your Moat Castle account permanently."),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userRecord = await getUserRecord(interaction.user.id);

    // No account exists
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> <:moatcastleright:1537695231409918002> You do not have a Moat Castle account.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-accountcreate** to open one.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // Refund balance (Moat Castle balance = cash)
    const refundedCash = userRecord.moatCastle.balance || 0;
    userRecord.cash += refundedCash;

    // Delete the account
    userRecord.moatCastle = null;

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Moat Castle Account Deleted",
      description:
        `> <:moatcastleright:1537695231409918002> Your Moat Castle account has been permanently deleted.\n` +
        `> <:moatcastleright:1537695231409918002> **Refunded:** $${refundedCash.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n\n` +
        `> <:moatcastleright:1537695231409918002> You may create a new account anytime using **/moat-accountcreate**.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
