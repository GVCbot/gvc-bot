const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-loan")
    .setDescription("Manage your Moat Castle loans.")

    // REVIEW
    .addSubcommand((sub) =>
      sub
        .setName("review")
        .setDescription("Review your active Moat Castle loans."),
    )

    // PAY (balance only)
    .addSubcommand((sub) =>
      sub
        .setName("pay")
        .setDescription("Pay off one of your Moat Castle loans.")
        .addIntegerOption((opt) =>
          opt
            .setName("loan")
            .setDescription("Loan number to pay.")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to pay (number or 'all').")
            .setRequired(true),
        ),
    )

    // REQUEST
    .addSubcommand((sub) =>
      sub
        .setName("request")
        .setDescription("Request a new Moat Castle loan.")
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Loan amount you want to request.")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("reason")
            .setDescription("Reason for requesting the loan.")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sub = interaction.options.getSubcommand();
    const userRecord = await getUserRecord(interaction.user.id);

    // Shared: no account
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `${ARROW} You must create a Moat Castle account first.\n` +
          `${ARROW} Use **/moat-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 📘 REVIEW LOANS
    // ===============================
    if (sub === "review") {
      const loans = userRecord.moatCastle.loans || [];

      if (loans.length === 0) {
        const { embed, files } = moatembedTemplate({
          title: "No Active Loans",
          description: `${ARROW} You do not have any active loans.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      let desc = "";
      loans.forEach((loan, i) => {
        const createdUnix = Math.floor(loan.createdAt / 1000);
        desc +=
          `${ARROW} **Loan #${i + 1}**\n` +
          `${ARROW} Amount: $${loan.amount.toLocaleString()}\n` +
          `${ARROW} Remaining: $${loan.remaining.toLocaleString()}\n` +
          `${ARROW} Reason: ${loan.reason}\n` +
          `${ARROW} Created: <t:${createdUnix}:F>\n\n`;
      });

      const { embed, files } = moatembedTemplate({
        title: "💰 Moat Castle Loan Status",
        description: desc,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 💵 PAY LOAN (balance only)
    // ===============================
    if (sub === "pay") {
      const loans = userRecord.moatCastle.loans || [];

      if (loans.length === 0) {
        const { embed, files } = moatembedTemplate({
          title: "No Active Loans",
          description: `${ARROW} You do not have any active loans.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const loanIndex = interaction.options.getInteger("loan") - 1;
      const amountInput = interaction.options.getString("amount");

      if (loanIndex < 0 || loanIndex >= loans.length) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Loan Selection",
          description: `${ARROW} Choose a valid loan number between **1** and **${loans.length}**.`,
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
            description: `${ARROW} Amount must be a positive number or 'all'.`,
            noLogo: true,
          });
          return interaction.editReply({ embeds: [embed], files });
        }
      }

      let balance = userRecord.moatCastle.balance;

      if (balance < amount) {
        const { embed, files } = moatembedTemplate({
          title: "Insufficient Funds",
          description:
            `${ARROW} You tried to pay **$${amount.toLocaleString()}**.\n\n` +
            `${ARROW} Moat Balance: $${balance.toLocaleString()}\n` +
            `${ARROW} **This is not enough to cover the payment.**`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      // Pay from balance only
      balance -= amount;
      loan.remaining -= amount;

      userRecord.moatCastle.balance = balance;
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
          `${ARROW} **Loan #${loanIndex + 1}**\n` +
          `${ARROW} **Total Payment:** $${amount.toLocaleString()}\n` +
          `${ARROW} **Paid From Balance:** $${amount.toLocaleString()}\n` +
          (refund > 0
            ? `${ARROW} **Refunded Extra:** $${refund.toLocaleString()}\n`
            : "") +
          `${ARROW} **Remaining Loan:** ${finished ? "0" : loan.remaining.toLocaleString()}\n\n` +
          `${ARROW} **New Moat Balance:** $${userRecord.moatCastle.balance.toLocaleString()}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 📝 REQUEST LOAN
    // ===============================
    if (sub === "request") {
      const amount = interaction.options.getInteger("amount");
      const reason = interaction.options.getString("reason");
      const user = interaction.user;

      const loanChannelId = "1537722326496452678";
      const loanRoleId = "1537722114176581724";

      if (
        userRecord.moatCastle.loans &&
        userRecord.moatCastle.loans.length > 0
      ) {
        const { embed, files } = moatembedTemplate({
          title: "Active Loan Exists",
          description:
            `${ARROW} You already have an active Moat Castle loan.\n` +
            `${ARROW} You must pay or clear your existing loan before requesting another.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const loanRequest = {
        id: Date.now().toString(),
        requesterId: user.id,
        amount,
        reason,
        createdAt: Date.now(),
        status: "pending",
      };

      if (!userRecord.moatCastle.loanRequests) {
        userRecord.moatCastle.loanRequests = [];
      }

      userRecord.moatCastle.loanRequests.push(loanRequest);
      userRecord.moatCastle.updatedAt = Date.now();

      await updateUserRecord(userRecord);

      const { embed, files } = moatembedTemplate({
        title: "💰 Moat Castle Loan Request",
        description:
          `${ARROW} **Requester:** ${user} (${user.id})\n` +
          `${ARROW} **Requested Amount:** $${amount.toLocaleString()}\n` +
          `${ARROW} **Reason:** ${reason}\n` +
          `${ARROW} **Status:** Pending Review\n\n` +
          `${ARROW} <@&${loanRoleId}> please review this request.`,
        noLogo: false,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`moat_loan_accept_${user.id}_${loanRequest.id}`)
          .setLabel("Accept Request")
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId(`moat_loan_deny_${user.id}_${loanRequest.id}`)
          .setLabel("Deny Request")
          .setStyle(ButtonStyle.Danger),
      );

      const loanChannel = interaction.client.channels.cache.get(loanChannelId);
      if (loanChannel) {
        await loanChannel.send({
          content: `<@&${loanRoleId}>`,
          embeds: [embed],
          files,
          components: [row],
        });
      }

      return interaction.editReply({
        content: `${ARROW} Your Moat Castle loan request for **$${amount.toLocaleString()}** has been submitted.`,
      });
    }
  },
};
