const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { FOXICON, ARROW } = FOXEMOJIS;

const { getUserRecord } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-customerlookup")
    .setDescription(
      "Lookup a user's full Fox Bank account information. (Fox Bank Staff Only)",
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to lookup").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const foxStaffRole = "1537894455779270717"; // Fox Bank Staff

    // Staff-only check
    if (!interaction.member.roles.cache.has(foxStaffRole)) {
      return interaction.editReply({
        content: "❌ Only Fox Bank staff can use this command.",
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} This user does **not** have a Fox Bank account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const fb = userRecord.foxBank;

    // Basic fields
    const balance = fb.balance || 0;
    const loans = fb.loans || [];
    const pending = fb.loanRequests || [];
    const createdAt = fb.createdAt
      ? `<t:${Math.floor(fb.createdAt / 1000)}:F>`
      : "Unknown";
    const updatedAt = fb.updatedAt
      ? `<t:${Math.floor(fb.updatedAt / 1000)}:F>`
      : "Unknown";

    // ============================
    // 📘 Recent Deposit
    // ============================
    const depositSection = fb.lastDeposit
      ? `${ARROW} **Amount:** $${fb.lastDeposit.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(
          fb.lastDeposit.timestamp / 1000,
        )}:F>\n`
      : `${ARROW} No deposits recorded.\n`;

    // ============================
    // 📙 Recent Withdrawal
    // ============================
    const withdrawalSection = fb.lastWithdrawal
      ? `${ARROW} **Amount:** $${fb.lastWithdrawal.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(
          fb.lastWithdrawal.timestamp / 1000,
        )}:F>\n`
      : `${ARROW} No withdrawals recorded.\n`;

    // ============================
    // 📗 Recent Loan Payment
    // ============================
    const paymentSection = fb.lastLoanPayment
      ? `${ARROW} **Amount:** $${fb.lastLoanPayment.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(
          fb.lastLoanPayment.timestamp / 1000,
        )}:F>\n`
      : `${ARROW} No loan payments recorded.\n`;

    // ============================
    // 💳 Card Replacement History
    // ============================
    const cardHistory = fb.cardReplacements || [];
    let cardSection = "";

    if (cardHistory.length === 0) {
      cardSection = `${ARROW} No card replacements recorded.\n`;
    } else {
      cardHistory.forEach((entry, i) => {
        const ts = Math.floor(entry.timestamp / 1000);
        cardSection +=
          `${ARROW} **Replacement #${i + 1}**\n` +
          `${ARROW} Old Card: ${entry.oldCard}\n` +
          `${ARROW} New Card: ${entry.newCard}\n` +
          `${ARROW} Staff: <@${entry.staffId}>\n` +
          `${ARROW} Date: <t:${ts}:F>\n\n`;
      });
    }

    // ============================
    // 📘 Active Loans
    // ============================
    let loanSection = "";
    if (loans.length === 0) {
      loanSection = `${ARROW} No active loans.\n`;
    } else {
      loans.forEach((loan, i) => {
        const createdUnix = Math.floor(loan.createdAt / 1000);
        loanSection +=
          `${ARROW} **Loan #${i + 1}**\n` +
          `${ARROW} Amount: $${loan.amount.toLocaleString()}\n` +
          `${ARROW} Remaining: $${loan.remaining.toLocaleString()}\n` +
          `${ARROW} Reason: ${loan.reason}\n` +
          `${ARROW} Created: <t:${createdUnix}:F>\n\n`;
      });
    }

    // ============================
    // 📙 Pending Loan Requests
    // ============================
    let pendingSection = "";
    if (pending.length === 0) {
      pendingSection = `${ARROW} No pending loan requests.\n`;
    } else {
      pending.forEach((req, i) => {
        const createdUnix = Math.floor(req.createdAt / 1000);
        pendingSection +=
          `${ARROW} **Request #${i + 1}**\n` +
          `${ARROW} Amount: $${req.amount.toLocaleString()}\n` +
          `${ARROW} Reason: ${req.reason}\n` +
          `${ARROW} Created: <t:${createdUnix}:F>\n` +
          `${ARROW} Status: Pending\n\n`;
      });
    }

    // ============================
    // 📦 Final Embed
    // ============================
    const { embed, files } = foxbankembedTemplate({
      title: `Customer Lookup: ${target.username}`,
      description:
        `${FOXICON} **Account Holder:** ${target}\n\n` +
        `${ARROW} **Account Name:** ${fb.accountName}\n` +
        `${ARROW} **Account ID:** ${fb.accountId}\n` +
        `${ARROW} **Card Number:** ${fb.cardNumber}\n` +
        `${ARROW} **Card Status:** ${fb.cardStatus}\n` +
        `${ARROW} **Tier:** ${fb.tier}\n` +
        `${ARROW} **Fox Points:** ${fb.rewards.toLocaleString()} points\n\n` +
        `${ARROW} **Balance:** $${balance.toLocaleString()}\n` +
        `${ARROW} **Created:** ${createdAt}\n` +
        `${ARROW} **Last Updated:** ${updatedAt}\n\n` +
        `**💳 Card Replacement History:**\n${cardSection}\n` +
        `**📘 Most Recent Deposit:**\n${depositSection}\n` +
        `**📙 Most Recent Withdrawal:**\n${withdrawalSection}\n` +
        `**📗 Most Recent Loan Payment:**\n${paymentSection}\n\n` +
        `**📘 Active Loans:**\n${loanSection}\n` +
        `**📙 Pending Requests:**\n${pendingSection}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
