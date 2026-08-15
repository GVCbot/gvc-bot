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
    .setName("fox-withdraw")
    .setDescription(
      "Withdraw money from your Fox Bank account to your cash balance.",
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

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `> ${ARROW} You do not have a Fox Bank account.\n` +
          `> ${ARROW} Use **/fox-accountcreate** to open one.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.foxBank;

    if (acct.cardStatus === "Frozen") {
      const { embed, files } = foxbankembedTemplate({
        title: "Card Frozen",
        description:
          `> ${ARROW} Your Fox Bank card is **Frozen**.\n` +
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
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Amount",
          description: "> Amount must be a positive number or 'all'.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    if (acct.balance < amount) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Account Balance",
        description: `> ${ARROW} Your Fox Bank account only has **$${acct.balance.toLocaleString()}**.`,
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

    const { embed, files } = foxbankembedTemplate({
      title: "Withdrawal Successful",
      description:
        `> ${ARROW} **Withdrawn:** $${amount.toLocaleString()}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Fox Bank Balance:** $${acct.balance.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
