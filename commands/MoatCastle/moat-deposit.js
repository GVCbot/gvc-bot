const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

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
          `> ${ARROW} You must create an account first.\n` +
          `> ${ARROW} Use **/moat-accountcreate**.`,
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

    if (userRecord.moatCastle.cardStatus === "Frozen") {
      const { embed, files } = moatembedTemplate({
        title: "Card Frozen",
        description:
          `> ${ARROW} Your Moat Castle card is **Frozen**.\n` +
          `> ${ARROW} You cannot deposit until you unfreeze it.`,
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

    userRecord.moatCastle.lastDeposit = {
      amount,
      timestamp: Date.now(),
    };

    userRecord.moatCastle.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Deposit Successful",
      description:
        `> ${ARROW} **Deposited:** $${amount.toLocaleString()}\n` +
        `> ${ARROW} **Tier Multiplier:** ×${multiplier}\n` +
        `> ${ARROW} **Points Earned:** ${earnedPoints}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Total Castle Points:** ${userRecord.moatCastle.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
