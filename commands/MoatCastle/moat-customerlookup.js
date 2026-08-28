const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { MOATCASTLE, ARROW } = MOATEMOJIS;

const { getUserRecord } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-customerlookup")
    .setDescription(
      "Lookup a user's full Moat Castle account information. (Moat Staff Only)",
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to lookup").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const moatStaffRole = "1537722114176581724";

    if (!interaction.member.roles.cache.has(moatStaffRole)) {
      return interaction.editReply({
        content: "❌ Only Moat Castle staff can use this command.",
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} This user does **not** have a Moat Castle account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const mc = userRecord.moatCastle;

    // Basic fields
    const balance = mc.balance || 0;
    const loans = mc.loans || [];
    const pending = mc.loanRequests || [];
    const createdAt = mc.createdAt
      ? `<t:${Math.floor(mc.createdAt / 1000)}:F>`
      : "Unknown";
    const updatedAt = mc.updatedAt
      ? `<t:${Math.floor(mc.updatedAt / 1000)}:F>`
      : "Unknown";

    // ============================
    // 📘 Recent Deposit
    // ============================
    const depositSection = mc.lastDeposit
      ? `${ARROW} **Amount:** $${mc.lastDeposit.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(mc.lastDeposit.timestamp / 1000)}:F>\n`
      : `${ARROW} No deposits recorded.\n`;

    // ============================
    // 📙 Recent Withdrawal
    // ============================
    const withdrawalSection = mc.lastWithdrawal
      ? `${ARROW} **Amount:** $${mc.lastWithdrawal.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(mc.lastWithdrawal.timestamp / 1000)}:F>\n`
      : `${ARROW} No withdrawals recorded.\n`;

    // ============================
    // 📗 Recent Loan Payment
    // ============================
    const paymentSection = mc.lastLoanPayment
      ? `${ARROW} **Amount:** $${mc.lastLoanPayment.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(mc.lastLoanPayment.timestamp / 1000)}:F>\n`
      : `${ARROW} No loan payments recorded.\n`;

    // ============================
    // 💳 Card Replacement History
    // ============================
    const cardHistory = mc.cardReplacements || [];
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
    const { embed, files } = moatembedTemplate({
      title: `Customer Lookup: ${target.username}`,
      description:
        `${MOATCASTLE} **Account Holder:** ${target}\n\n` +
        `${ARROW} **Account Name:** ${mc.accountName}\n` +
        `${ARROW} **Account ID:** ${mc.accountId}\n` +
        `${ARROW} **Card Number:** ${mc.cardNumber}\n` +
        `${ARROW} **Card Status:** ${mc.cardStatus}\n` +
        `${ARROW} **Tier:** ${mc.tier}\n` +
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
