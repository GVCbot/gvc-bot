const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const MOAT_STAFF_ROLE = "1537722114176581724";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-clearbusinessrequest")
    .setDescription("[Staff] Clear pending business requests for a user")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose business requests should be cleared")
        .setRequired(true),
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MOAT_STAFF_ROLE)) {
      return interaction.reply({
        content: "❌ Only Moat Castle staff can use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user");
    const record = await getUserRecord(targetUser.id);

    if (!record.moatCastle) {
      return interaction.editReply({
        content: "❌ That user does not have a Moat Castle account.",
      });
    }

    const pendingCount = record.moatCastle.businessRequests?.length || 0;
    record.moatCastle.businessRequests = [];

    await updateUserRecord(record);

    const { embed } = moatembedTemplate({
      title: "🏢 Business Requests Cleared",
      description:
        `> Cleared **${pendingCount}** pending business request(s) for <@${targetUser.id}>.\n` +
        `> They can now create a new business using **/moat-business create**.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
