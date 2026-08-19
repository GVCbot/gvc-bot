const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-clearloans")
    .setDescription("Clear all Fox Bank loans for a user.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to clear loans for.")
        .setRequired(true),
    ),

  async execute(interaction) {
    const foxStaffRole = "1537894455779270717";

    if (!interaction.member.roles.cache.has(foxStaffRole)) {
      return interaction.reply({
        content: "❌ Only Fox Bank staff can clear loans.",
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    if (!userRecord.foxBank) {
      return interaction.reply({
        content: "❌ User has no Fox Bank account.",
        ephemeral: true,
      });
    }

    userRecord.foxBank.loans = [];
    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Loans Cleared",
      description: `> ${ARROW} Cleared all Fox Bank loans for **${target.tag}**.`,
      noLogo: false,
    });

    return interaction.reply({ embeds: [embed], files });
  },
};
