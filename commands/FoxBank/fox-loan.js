const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-loan")
    .setDescription("Manage your Fox Bank loans.")

    // REVIEW
    .addSubcommand((sub) =>
      sub
        .setName("review")
        .setDescription("Review your active Fox Bank loans."),
    )

    // PAY
    .addSubcommand((sub) =>
      sub
        .setName("pay")
        .setDescription("Pay off one of your Fox Bank loans.")
        .addIntegerOption((opt) =>
          opt.setName("loan").setDescription("Loan number").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to pay (number or 'all')")
            .setRequired(true),
        ),
    )

    // REQUEST
    .addSubcommand((sub) =>
      sub
        .setName("request")
        .setDescription("Request a new Fox Bank loan.")
        .addIntegerOption((opt) =>
          opt.setName("amount").setDescription("Loan amount").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("reason").setDescription("Reason").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sub = interaction.options.getSubcommand();
    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description: `${ARROW} You must create a Fox Bank account first.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.foxBank;

    // ===============================
    // 📘 REVIEW LOANS
    // ===============================
    if (sub === "review") {
      const loans = acct.loans || [];

      if (loans.length === 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "No Active Loans",
          description: `${ARROW} You do not have any active Fox Bank loans.`,
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

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Loan Status",
        description: desc,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 💵 PAY LOAN
    // ===============================
    if (sub === "pay") {
      const loans = acct.loans || [];

      if (loans.length === 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "No Active Loans",
          description: `${ARROW} You do not have any active Fox Bank loans.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const loanIndex = interaction.options.getInteger("loan") - 1;
      const amountInput = interaction.options.getString("amount");

      if (loanIndex < 0 || loanIndex >= loans.length) {
        const { embed, files } = foxbankembedTemplate({
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
          const { embed, files } = foxbankembedTemplate({
            title: "Invalid Amount",
            description: `${ARROW} Amount must be a positive number or 'all'.`,
            noLogo: true,
          });
          return interaction.editReply({ embeds: [embed], files });
        }
      }

      if (acct.balance < amount) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Balance",
          description: `${ARROW} Your Fox Bank account only has **$${acct.balance.toLocaleString()}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      acct.balance -= amount;
      loan.remaining -= amount;

      acct.lastLoanPayment = { amount, timestamp: Date.now() };

      let finished = false;
      let refund = 0;

      if (loan.remaining < 0) {
        refund = Math.abs(loan.remaining);
        acct.balance += refund;
        loan.remaining = 0;
      }

      if (loan.remaining === 0) {
        acct.loans.splice(loanIndex, 1);
        finished = true;
      }

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: finished ? "Loan Fully Paid" : "Loan Payment Successful",
        description:
          `${ARROW} **Loan #${loanIndex + 1}**\n` +
          `${ARROW} Payment: $${amount.toLocaleString()}\n` +
          (refund > 0 ? `${ARROW} Refund: $${refund.toLocaleString()}\n` : "") +
          `${ARROW} Remaining Loan: ${finished ? "0" : loan.remaining.toLocaleString()}\n\n` +
          `${ARROW} New Fox Bank Balance: $${acct.balance.toLocaleString()}`,
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

      if (acct.loans && acct.loans.length > 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "Active Loan Exists",
          description:
            `${ARROW} You already have an active Fox Bank loan.\n` +
            `${ARROW} You must pay your existing loan before requesting another.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const loanRequest = {
        id: Date.now().toString(),
        requesterId: interaction.user.id,
        amount,
        reason,
        createdAt: Date.now(),
        status: "pending",
      };

      acct.loanRequests = acct.loanRequests || [];
      acct.loanRequests.push(loanRequest);
      acct.updatedAt = Date.now();

      await updateUserRecord(userRecord);

      const staffRoleId = "1537894455779270717";
      const loanChannelId = "1539585916828516382";

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Loan Request",
        description:
          `${ARROW} **Requester:** ${interaction.user}\n` +
          `${ARROW} **Amount:** $${amount.toLocaleString()}\n` +
          `${ARROW} **Reason:** ${reason}\n` +
          `${ARROW} **Status:** Pending Review\n\n` +
          `${ARROW} <@&${staffRoleId}> please review this request.`,
        noLogo: false,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(
            `fox_loan_accept_${interaction.user.id}_${loanRequest.id}`,
          )
          .setLabel("Accept Request")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`fox_loan_deny_${interaction.user.id}_${loanRequest.id}`)
          .setLabel("Deny Request")
          .setStyle(ButtonStyle.Danger),
      );

      const loanChannel = interaction.client.channels.cache.get(loanChannelId);
      if (loanChannel) {
        await loanChannel.send({
          content: `<@&${staffRoleId}>`,
          embeds: [embed],
          files,
          components: [row],
        });
      }

      return interaction.editReply({
        content: `✅ Your Fox Bank loan request for **$${amount.toLocaleString()}** has been submitted.`,
      });
    }
  },
};
