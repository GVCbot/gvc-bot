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
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription(
          "Amount of money to withdraw from your Moat Castle account",
        )
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const amount = interaction.options.getInteger("amount");
    const userRecord = await getUserRecord(interaction.user.id);

    // Check if account exists
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

    // Validate amount
    if (amount <= 0) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Amount",
        description: "> Amount must be greater than 0.",
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

    // Check if account has enough balance
    if (acct.balance < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Account Balance",
        description: `> ${ARROW} Your Moat Castle account only has **$${acct.balance.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Withdraw: move money from Moat Castle → user cash
    acct.balance -= amount;
    userRecord.cash += amount;

    userRecord.moatCastle.lastWithdrawal = {
      amount,
      timestamp: Date.now(),
    };

    userRecord.moatCastle.updatedAt = Date.now();

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
