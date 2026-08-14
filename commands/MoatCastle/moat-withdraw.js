const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

function getTierMultiplier(tier) {
  switch ((tier || "").toLowerCase()) {
    case "silver":
      return 1.5;
    case "gold":
      return 2;
    case "platinum":
      return 2.5;
    case "black":
      return 3;
    default:
      return 1;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-withdraw")
    .setDescription("Withdraw Castle Points to gain cash.")
    .addIntegerOption((opt) =>
      opt
        .setName("points")
        .setDescription("Castle Points to withdraw")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const points = interaction.options.getInteger("points");
    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> <:moatcastleright:1537695231409918002> You must create an account first.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (points <= 0) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Amount",
        description: "> Points must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (userRecord.moatCastle.rewards < points) {
      const { embed, files } = moatembedTemplate({
        title: "Not Enough Points",
        description: `> You only have **${userRecord.moatCastle.rewards.toLocaleString()} Castle Points**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Convert points → cash
    const cashGained = points * 10;

    // Update records
    userRecord.moatCastle.rewards -= points;
    userRecord.cash += cashGained;

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Withdrawal Successful",
      description:
        `> <:moatcastleright:1537695231409918002> **Points Withdrawn:** ${points}\n` +
        `> <:moatcastleright:1537695231409918002> **Cash Gained:** $${cashGained.toLocaleString()}\n\n` +
        `> <:moatcastleright:1537695231409918002> **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Remaining Castle Points:** ${userRecord.moatCastle.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
