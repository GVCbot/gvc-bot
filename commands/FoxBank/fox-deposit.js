const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-deposit")
    .setDescription(
      "Deposit cash into your Fox Bank account to earn Fox Points.",
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

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `> ${ARROW} You must create an account first.\n` +
          `> ${ARROW} Use **/fox-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (userRecord.foxBank.cardStatus === "Frozen") {
      const { embed, files } = foxbankembedTemplate({
        title: "Card Frozen",
        description:
          `> ${ARROW} Your Fox Bank card is **Frozen**.\n` +
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
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Amount",
          description: "> Amount must be a positive number or 'all'.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    if (userRecord.cash < amount) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Cash",
        description: `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Earn points (1 per $1000)
    const earnedPoints = Math.floor(amount / 1000);

    userRecord.foxBank.rewards = Math.min(
      userRecord.foxBank.rewards + earnedPoints,
      5000,
    );

    // Apply deposit
    userRecord.cash -= amount;
    userRecord.foxBank.balance += amount;

    userRecord.foxBank.lastDeposit = { amount, timestamp: Date.now() };
    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Deposit Successful",
      description:
        `> ${ARROW} **Deposited:** $${amount.toLocaleString()}\n` +
        `> ${ARROW} **Fox Points Earned:** ${earnedPoints}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Total Fox Points:** ${userRecord.foxBank.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
