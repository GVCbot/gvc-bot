const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-accountdelete")
    .setDescription("Delete your Fox Bank account permanently."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `> ${ARROW} You do not have a Fox Bank account.\n` +
          `> ${ARROW} Use **/fox-accountcreate** to open one.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Check for active homes
    if (userRecord.homes.lakeville || userRecord.homes.sixhousnet) {
      const { embed, files } = foxbankembedTemplate({
        title: "Active Home Detected",
        description:
          `> ${ARROW} You currently own a home.\n` +
          `> ${ARROW} You **must sell your home first** before deleting your Fox Bank account.\n\n` +
          `> ${ARROW} Use **/fox-homesell** to sell your home.`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Refund Fox Bank balance
    const refundedCash = userRecord.foxBank.balance || 0;
    userRecord.cash += refundedCash;

    // Delete Fox Bank account
    userRecord.foxBank = null;

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Account Deleted",
      description:
        `> ${ARROW} Your Fox Bank account has been permanently deleted.\n` +
        `> ${ARROW} **Refunded:** $${refundedCash.toLocaleString()}\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n\n` +
        `> ${ARROW} You may create a new account anytime using **/fox-accountcreate**.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
