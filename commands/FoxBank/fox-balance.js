const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-balance")
    .setDescription("Manage your Fox Bank balance.")

    // DEPOSIT
    .addSubcommand((sub) =>
      sub
        .setName("deposit")
        .setDescription("Deposit cash into your Fox Bank account.")
        .addStringOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount of cash to deposit (number or 'all')")
            .setRequired(true),
        ),
    )

    // WITHDRAW
    .addSubcommand((sub) =>
      sub
        .setName("withdraw")
        .setDescription("Withdraw money from your Fox Bank account.")
        .addStringOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to withdraw (number or 'all')")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const amountInput = interaction.options.getString("amount");
    const userRecord = await getUserRecord(interaction.user.id);

    // No account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `${ARROW} You do not have a Fox Bank account.\n` +
          `${ARROW} Use **/fox-account create** to open one.`,
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
          `${ARROW} Your Fox Bank card is **Frozen**.\n` +
          `${ARROW} You cannot deposit or withdraw until you unfreeze it.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Parse amount
    let amount;
    if (amountInput.toLowerCase() === "all") {
      amount = sub === "deposit" ? userRecord.cash : acct.balance;
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

    // ===============================
    // 💰 DEPOSIT
    // ===============================
    if (sub === "deposit") {
      if (userRecord.cash < amount) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Cash",
          description: `${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      userRecord.cash -= amount;
      acct.balance += amount;

      acct.lastDeposit = { amount, timestamp: Date.now() };
      acct.updatedAt = Date.now();

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Deposit Successful",
        description:
          `${ARROW} **Deposited:** $${amount.toLocaleString()}\n\n` +
          `${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
          `${ARROW} **Fox Bank Balance:** $${acct.balance.toLocaleString()}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 💵 WITHDRAW
    // ===============================
    if (sub === "withdraw") {
      if (acct.balance < amount) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Account Balance",
          description: `${ARROW} Your Fox Bank account only has **$${acct.balance.toLocaleString()}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      acct.balance -= amount;
      userRecord.cash += amount;

      acct.lastWithdrawal = { amount, timestamp: Date.now() };
      acct.updatedAt = Date.now();

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Withdrawal Successful",
        description:
          `${ARROW} **Withdrawn:** $${amount.toLocaleString()}\n\n` +
          `${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
          `${ARROW} **Remaining Fox Bank Balance:** $${acct.balance.toLocaleString()}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
