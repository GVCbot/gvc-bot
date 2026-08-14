const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-loanpayment")
    .setDescription("Pay off one of your Moat Castle loans.")
    .addIntegerOption((opt) =>
      opt
        .setName("loan")
        .setDescription("Select which loan to pay (loan number).")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to pay (number or 'all').")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("points")
        .setDescription("How many Castle Points to use (optional).")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Account Deleted",
        description:
          `> ${ARROW} Your Moat Castle account was **deleted**.\n` +
          `> ${ARROW} No further action was taken.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loans = userRecord.moatCastle.loans || [];
    if (loans.length === 0) {
      const { embed, files } = moatembedTemplate({
        title: "No Active Loans",
        description: `> ${ARROW} You do not have any active loans.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loanIndex = interaction.options.getInteger("loan") - 1;
    const amountInput = interaction.options.getString("amount");
    const pointsInput = interaction.options.getInteger("points") ?? 0;

    if (loanIndex < 0 || loanIndex >= loans.length) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Loan Selection",
        description: `> ${ARROW} Please choose a valid loan number between **1** and **${loans.length}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loan = loans[loanIndex];
    let amount;

    if (amountInput.toLowerCase() === "all") {
      amount = loan.remaining;
    } else {
      amount = parseInt(amountInput, 10);
      if (isNaN(amount) || amount <= 0) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Amount",
          description: `> ${ARROW} Amount must be a positive number or 'all'.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    let balance = userRecord.moatCastle.balance;
    let points = userRecord.moatCastle.rewards;

    // ============================
    // ⭐ User chooses EXACT points to use
    // ============================

    if (pointsInput < 0) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Points",
        description: `> ${ARROW} Points must be **0 or higher**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (pointsInput > points) {
      const { embed, files } = moatembedTemplate({
        title: "Not Enough Points",
        description:
          `> ${ARROW} You only have **${points} Castle Points**.\n` +
          `> ${ARROW} You cannot use **${pointsInput} points**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const pointsValue = pointsInput * 1000;

    // Total available to pay
    const totalAvailable = balance + pointsValue;

    if (totalAvailable < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} You tried to pay **$${amount.toLocaleString()}**.\n\n` +
          `> ${ARROW} Moat Balance: $${balance.toLocaleString()}\n` +
          `> ${ARROW} Points Used: ${pointsInput} (worth $${pointsValue.toLocaleString()})\n\n` +
          `> ${ARROW} Total Available: $${totalAvailable.toLocaleString()}\n` +
          `> ${ARROW} **This is not enough to cover the payment.**`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ============================
    // ⭐ Apply payment
    // ============================

    let amountPaidFromBalance = Math.min(balance, amount);
    let remainingAfterBalance = amount - amountPaidFromBalance;

    let amountPaidFromPoints = remainingAfterBalance;

    // Deduct balance
    balance -= amountPaidFromBalance;

    // Deduct points
    const pointsUsed = Math.ceil(amountPaidFromPoints / 1000);
    points -= pointsUsed;

    // Apply to loan
    loan.remaining -= amount;

    userRecord.moatCastle.balance = balance;
    userRecord.moatCastle.rewards = points;

    userRecord.moatCastle.lastLoanPayment = {
      amount,
      timestamp: Date.now(),
    };

    userRecord.moatCastle.updatedAt = Date.now();

    let refund = 0;
    let finished = false;

    if (loan.remaining < 0) {
      refund = Math.abs(loan.remaining);
      userRecord.moatCastle.balance += refund;
      loan.remaining = 0;
    }

    if (loan.remaining === 0) {
      userRecord.moatCastle.loans.splice(loanIndex, 1);
      finished = true;
    }

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: finished ? "Loan Fully Paid" : "Loan Payment Successful",
      description:
        `> ${ARROW} **Loan #${loanIndex + 1}**\n` +
        `> ${ARROW} **Total Payment:** $${amount.toLocaleString()}\n` +
        `> ${ARROW} **Paid From Balance:** $${amountPaidFromBalance.toLocaleString()}\n` +
        `> ${ARROW} **Paid From Points:** $${amountPaidFromPoints.toLocaleString()} (1 point = 1000)\n` +
        (refund > 0
          ? `> ${ARROW} **Refunded Extra:** $${refund.toLocaleString()}\n`
          : "") +
        `> ${ARROW} **Remaining Loan:** ${finished ? "0" : loan.remaining.toLocaleString()}\n\n` +
        `> ${ARROW} **New Moat Balance:** $${balance.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Castle Points:** ${points.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
