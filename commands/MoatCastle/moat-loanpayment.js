const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-loanpayment")
    .setDescription("Pay off your Moat Castle loan.")
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to pay (number or 'all').")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Account Deleted",
        description:
          `> <:moatcastleright:1537695231409918002> Your Moat Castle account was **deleted**.\n` +
          `> <:moatcastleright:1537695231409918002> No further action was taken.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loans = userRecord.moatCastle.loans || [];
    if (loans.length === 0) {
      const { embed, files } = moatembedTemplate({
        title: "No Active Loans",
        description: `> <:moatcastleright:1537695231409918002> You do not have any active loans.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const loan = loans[0];
    const amountInput = interaction.options.getString("amount");

    let amount;
    if (amountInput.toLowerCase() === "all") {
      amount = loan.remaining;
    } else {
      amount = parseInt(amountInput, 10);
      if (isNaN(amount) || amount <= 0) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Amount",
          description: "> Amount must be a number or 'all'.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    const balance = userRecord.moatCastle.balance;

    if (balance < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Moat Castle Balance",
        description:
          `> <:moatcastleright:1537695231409918002> Your Moat Castle balance is **$${balance.toLocaleString()}**.\n` +
          `> <:moatcastleright:1537695231409918002> You need **$${amount.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.moatCastle.balance -= amount;
    loan.remaining -= amount;

    let extraRefund = 0;
    let finished = false;

    if (loan.remaining < 0) {
      extraRefund = Math.abs(loan.remaining);
      userRecord.moatCastle.balance += extraRefund;
      loan.remaining = 0;
    }

    if (loan.remaining === 0) {
      userRecord.moatCastle.loans = [];
      finished = true;
    }

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: finished ? "Loan Fully Paid" : "Loan Payment Successful",
      description:
        `> <:moatcastleright:1537695231409918002> **Payment Amount:** $${amount.toLocaleString()}\n` +
        (extraRefund > 0
          ? `> <:moatcastleright:1537695231409918002> **Refunded Extra:** $${extraRefund.toLocaleString()}\n`
          : "") +
        `> <:moatcastleright:1537695231409918002> **Remaining Loan:** $${finished ? "0" : loan.remaining.toLocaleString()}\n\n` +
        `> <:moatcastleright:1537695231409918002> **New Moat Castle Balance:** $${userRecord.moatCastle.balance.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
