const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { FOXICON, ARROW } = FOXEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-loanpayment")
    .setDescription("Pay off one of your Fox Bank loans.")
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
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description: `> ${ARROW} You do not have a Fox Bank account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loans = userRecord.foxBank.loans || [];

    // No active loans
    if (loans.length === 0) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Active Loans",
        description: `> ${ARROW} You do not have any active Fox Bank loans.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loanIndex = interaction.options.getInteger("loan") - 1;
    const amountInput = interaction.options.getString("amount");

    if (loanIndex < 0 || loanIndex >= loans.length) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Loan Selection",
        description: `> ${ARROW} Please choose a valid loan number between **1** and **${loans.length}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loan = loans[loanIndex];

    // Determine payment amount
    let amount;
    if (amountInput.toLowerCase() === "all") {
      amount = loan.remaining;
    } else {
      amount = parseInt(amountInput, 10);
      if (isNaN(amount) || amount <= 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Amount",
          description: `> ${ARROW} Amount must be a positive number or 'all'.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    let balance = userRecord.foxBank.balance;

    // Insufficient funds
    if (balance < amount) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} You tried to pay **$${amount.toLocaleString()}**.\n\n` +
          `> ${ARROW} Fox Bank Balance: $${balance.toLocaleString()}\n\n` +
          `> ${ARROW} **This is not enough to cover the payment.**`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ============================
    // ⭐ Apply payment (cash only)
    // ============================

    balance -= amount;
    loan.remaining -= amount;

    userRecord.foxBank.balance = balance;

    userRecord.foxBank.lastLoanPayment = {
      amount,
      timestamp: Date.now(),
    };

    userRecord.foxBank.updatedAt = Date.now();

    let refund = 0;
    let finished = false;

    // Refund if overpaid
    if (loan.remaining < 0) {
      refund = Math.abs(loan.remaining);
      userRecord.foxBank.balance += refund;
      loan.remaining = 0;
    }

    // Loan fully paid → remove it
    if (loan.remaining === 0) {
      userRecord.foxBank.loans.splice(loanIndex, 1);
      finished = true;
    }

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: finished ? "Loan Fully Paid" : "Loan Payment Successful",
      description:
        `> ${ARROW} **Loan #${loanIndex + 1}**\n` +
        `> ${ARROW} **Total Payment:** $${amount.toLocaleString()}\n` +
        (refund > 0
          ? `> ${ARROW} **Refunded Extra:** $${refund.toLocaleString()}\n`
          : "") +
        `> ${ARROW} **Remaining Loan:** ${
          finished ? "0" : loan.remaining.toLocaleString()
        }\n\n` +
        `> ${ARROW} **New Fox Bank Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
