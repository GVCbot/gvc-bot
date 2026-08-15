const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-clearloans")
    .setDescription(
      "Fox Bank Staff ONLY — Clear ALL Fox Bank loans for ALL users.",
    ),

  async execute(interaction) {
    const foxStaffRole = "1537894455779270717"; // Fox Bank Staff

    // Staff-only check
    if (!interaction.member.roles.cache.has(foxStaffRole)) {
      return interaction.reply({
        content: "❌ Only Fox Bank staff can clear loans.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: false });

    const allRecords = await getAllUserRecords();
    let clearedCount = 0;

    for (const userRecord of allRecords) {
      if (!userRecord.foxBank) continue;

      // If user has any loan data, wipe it
      if (
        userRecord.foxBank.loans?.length ||
        userRecord.foxBank.loanRequests?.length
      ) {
        userRecord.foxBank.loans = [];
        userRecord.foxBank.loanRequests = [];
        userRecord.foxBank.updatedAt = Date.now();

        await updateUserRecord(userRecord);
        clearedCount++;
      }
    }

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Loans Cleared",
      description:
        `> ${ARROW} Cleared **all Fox Bank loans** for **${clearedCount} users**.\n` +
        `> ${ARROW} All loan requests and active loans have been fully removed.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
