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

    const balance = userRecord.moatCastle.balance;
    if (balance < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Balance",
        description:
          `> ${ARROW} Your Moat Castle balance is **$${balance.toLocaleString()}**.\n` +
          `> ${ARROW} You need **$${amount.toLocaleString()}** to make this payment.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.moatCastle.balance -= amount;
    loan.remaining -= amount;

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
        `> ${ARROW} **Payment Amount:** $${amount.toLocaleString()}\n` +
        (refund > 0
          ? `> ${ARROW} **Refunded Extra:** $${refund.toLocaleString()}\n`
          : "") +
        `> ${ARROW} **Remaining Loan:** $${finished ? "0" : loan.remaining.toLocaleString()}\n\n` +
        `> ${ARROW}**New Moat Castle Balance:** $${userRecord.moatCastle.balance.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
