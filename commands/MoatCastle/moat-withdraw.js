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
    .setName("moat-withdraw")
    .setDescription(
      "Withdraw money from your Moat Castle account to your cash balance.",
    )
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to withdraw (number or 'all')")
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
          `> ${ARROW} You do not have a Moat Castle account.\n` +
          `> ${ARROW} Use **/moat-accountcreate** to open one.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.moatCastle;

    if (acct.cardStatus === "Frozen") {
      const { embed, files } = moatembedTemplate({
        title: "Card Frozen",
        description:
          `> ${ARROW} Your Moat Castle card is **Frozen**.\n` +
          `> ${ARROW} You cannot withdraw until you unfreeze it.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Handle "all"
    let amount;
    if (amountInput.toLowerCase() === "all") {
      amount = acct.balance;
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

    if (acct.balance < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Account Balance",
        description: `> ${ARROW} Your Moat Castle account only has **$${acct.balance.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Apply withdrawal
    acct.balance -= amount;
    userRecord.cash += amount;

    acct.lastWithdrawal = { amount, timestamp: Date.now() };
    acct.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Withdrawal Successful",
      description:
        `> ${ARROW} **Withdrawn:** $${amount.toLocaleString()}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Moat Castle Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Castle Points:** ${acct.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
