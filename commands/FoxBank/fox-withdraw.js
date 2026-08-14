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
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription(
          "Amount of money to withdraw from your Fox Bank account",
        )
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger("amount");
    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
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

    // Invalid amount
    if (amount <= 0) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Amount",
        description: "> Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.foxBank;

    // Card frozen
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

    // Insufficient Fox Bank balance
    if (acct.balance < amount) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Account Balance",
        description: `> ${ARROW} Your Fox Bank account only has **$${acct.balance.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Withdraw: Fox Bank → cash
    acct.balance -= amount;
    userRecord.cash += amount;

    userRecord.foxBank.lastWithdrawal = {
      amount,
      timestamp: Date.now(),
    };

    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Withdrawal Successful",
      description:
        `> ${ARROW} **Withdrawn:** $${amount.toLocaleString()}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Fox Bank Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Fox Points:** ${acct.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
