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
    .setName("moat-deposit")
    .setDescription(
      "Deposit cash into your Moat Castle account to earn Castle Points.",
    )
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of cash to deposit")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger("amount");
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

    if (amount <= 0) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Amount",
        description: "> Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (userRecord.cash < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Cash",
        description: `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Calculate points with cap
    const basePoints = Math.floor(amount / 10); // 1 point per $10
    const multiplier = getTierMultiplier(userRecord.moatCastle.tier);

    // Bonus only (multiplier - 1)
    const bonusPoints = Math.floor(basePoints * (multiplier - 1));

    // Total points
    const earnedPoints = Math.min(basePoints + bonusPoints, 5000);

    // Update records
    userRecord.cash -= amount;
    userRecord.moatCastle.balance += amount;
    userRecord.moatCastle.rewards += earnedPoints;

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Deposit Successful",
      description:
        `> <:moatcastleright:1537695231409918002> **Deposited:** $${amount.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Tier Multiplier:** ×${multiplier}\n` +
        `> <:moatcastleright:1537695231409918002> **Points Earned:** ${earnedPoints}\n\n` +
        `> <:moatcastleright:1537695231409918002> **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Total Castle Points:** ${userRecord.moatCastle.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
