const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewaccount")
    .setDescription("View your Moat Castle account"),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // If no Moat Castle account exists
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Account Required",
        description:
          `> <:moatcastleright:1537695231409918002> You do not have a Moat Castle account yet.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-accountcreate name:** to open one.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // If account exists
    const acct = userRecord.moatCastle;
    const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);

    const { embed, files } = moatembedTemplate({
      title: "Your Moat Castle Account",
      description:
        `> <:moatcastleright:1537695231409918002> **Account Name:** ${acct.accountName}\n` +
        `> <:moatcastleright:1537695231409918002> **Account ID:** ${acct.accountId}\n` +
        `> <:moatcastleright:1537695231409918002> **Balance:** $${acct.balance.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Tier:** ${acct.tier}\n` +
        `> <:moatcastleright:1537695231409918002> **Rewards:** ${acct.rewards.toLocaleString()} points\n` +
        `> <:moatcastleright:1537695231409918002> **Created:** <t:${createdUnix}:F>`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
