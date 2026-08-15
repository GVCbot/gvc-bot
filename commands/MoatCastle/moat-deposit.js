const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-deposit")
    .setDescription(
      "Deposit cash into your Moat Castle account to earn Castle Points.",
    )
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of cash to deposit (number or 'all')")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amountInput = interaction.options.getString("amount");
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

    // Handle "all"
    let amount;
    if (amountInput.toLowerCase() === "all") {
      amount = userRecord.cash;
    } else {
      amount = parseInt(amountInput, 10);
      if (isNaN(amount) || amount <= 0) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Amount",
          description: "> Amount must be a positive number or 'all'.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    if (userRecord.cash < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Cash",
        description: `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Earn points (1 per 1000)
    const earnedPoints = Math.floor(amount / 1000);

    userRecord.moatCastle.rewards = Math.min(
      userRecord.moatCastle.rewards + earnedPoints,
      5000,
    );

    // Apply deposit
    userRecord.cash -= amount;
    userRecord.moatCastle.balance += amount;

    userRecord.moatCastle.lastDeposit = { amount, timestamp: Date.now() };
    userRecord.moatCastle.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Deposit Successful",
      description:
        `> ${ARROW} **Deposited:** $${amount.toLocaleString()}\n` +
        `> ${ARROW} **Points Earned:** ${earnedPoints}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Total Castle Points:** ${userRecord.moatCastle.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
