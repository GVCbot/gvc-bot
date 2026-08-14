const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-clearloans")
    .setDescription("Clear all Moat Castle loans for a user.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to clear loans for.")
        .setRequired(true),
    ),

  async execute(interaction) {
    const moatStaffRole = "1537722114176581724";

    if (!interaction.member.roles.cache.has(moatStaffRole)) {
      return interaction.reply({
        content: "❌ Only Moat Castle staff can clear loans.",
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    if (!userRecord.moatCastle) {
      return interaction.reply({
        content: "❌ User has no Moat Castle account.",
        ephemeral: true,
      });
    }

    userRecord.moatCastle.loans = [];
    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Loans Cleared",
      description: `> <:moatcastleright:1537695231409918002> Cleared all loans for **${target.tag}**.`,
      noLogo: false,
    });

    return interaction.reply({ embeds: [embed], files });
  },
};
