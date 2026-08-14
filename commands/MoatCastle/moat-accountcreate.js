const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-accountcreate")
    .setDescription("Create a Moat Castle account")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Your Moat Castle account name")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // Prevent duplicate accounts
    if (userRecord.moatCastle) {
      const { embed } = moatembedTemplate({
        title: "Account Already Exists",
        description:
          `> <:moatcastleright:1537695231409918002> You already have a Moat Castle account.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-viewaccount** to view it.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // Get account name
    const accountName = interaction.options.getString("name");

    // Generate unique Moat Castle account ID
    const accountId = `MC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create the account
    userRecord.moatCastle = {
      accountName,
      accountId,
      balance: 0,
      tier: "Basic",
      rewards: 0,
      createdAt: Date.now(),
    };

    await updateUserRecord(userRecord);

    // Confirmation embed
    const createdUnix = Math.floor(Date.now() / 1000);

    const { embed } = moatembedTemplate({
      title: "Moat Castle Account Created",
      description:
        `> <:moatcastleright:1537695231409918002> **Account Name:** ${accountName}\n` +
        `> <:moatcastleright:1537695231409918002> **Account ID:** ${accountId}\n` +
        `> <:moatcastleright:1537695231409918002> **Tier:** Basic\n` +
        `> <:moatcastleright:1537695231409918002> **Balance:** $0\n` +
        `> <:moatcastleright:1537695231409918002> **Created:** <t:${createdUnix}:F>\n\n` +
        `> <:moatcastleright:1537695231409918002> Use **/moat-viewaccount** to view your new account.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
