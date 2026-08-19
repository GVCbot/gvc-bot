const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW } = MOATEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-balance")
    .setDescription("Deposit or withdraw money from your Moat Castle account.")
    .addSubcommand((sub) =>
      sub
        .setName("deposit")
        .setDescription("Deposit money into your Moat Castle account.")
        .addStringOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to deposit (number or 'all')")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("withdraw")
        .setDescription("Withdraw money from your Moat Castle account.")
        .addStringOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to withdraw (number or 'all')")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user = await getUserRecord(userId);

    if (!user.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description: `${ARROW} You must create a Moat Castle account first.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const sub = interaction.options.getSubcommand();
    const amountInput = interaction.options.getString("amount");
    const acct = user.moatCastle;

    // Convert amount
    let amount;
    if (amountInput.toLowerCase() === "all") {
      amount = sub === "deposit" ? user.cash : acct.balance;
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

    // ===============================
    // 💰 DEPOSIT
    // ===============================
    if (sub === "deposit") {
      if (user.cash < amount) {
        const { embed, files } = moatembedTemplate({
          title: "Insufficient Cash",
          description: `${ARROW} You only have **$${user.cash.toLocaleString()}** in cash.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      user.cash -= amount;
      acct.balance += amount;

      acct.lastDeposit = { amount, timestamp: Date.now() };
      await updateUserRecord(user);

      const { embed, files } = moatembedTemplate({
        title: "Deposit Successful",
        description:
          `${ARROW} Deposited: **$${amount.toLocaleString()}**\n\n` +
          `${ARROW} New Cash Balance: **$${user.cash.toLocaleString()}**\n` +
          `${ARROW} New Moat Castle Balance: **$${acct.balance.toLocaleString()}**`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 💵 WITHDRAW
    // ===============================
    if (sub === "withdraw") {
      if (acct.cardStatus === "Frozen") {
        const { embed, files } = moatembedTemplate({
          title: "Card Frozen",
          description:
            `${ARROW} Your Moat Castle card is **Frozen**.\n` +
            `${ARROW} You cannot withdraw until you unfreeze it.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (acct.balance < amount) {
        const { embed, files } = moatembedTemplate({
          title: "Insufficient Account Balance",
          description: `${ARROW} Your Moat Castle account only has **$${acct.balance.toLocaleString()}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      acct.balance -= amount;
      user.cash += amount;

      acct.lastWithdrawal = { amount, timestamp: Date.now() };
      await updateUserRecord(user);

      const { embed, files } = moatembedTemplate({
        title: "Withdrawal Successful",
        description:
          `${ARROW} Withdrawn: **$${amount.toLocaleString()}**\n\n` +
          `${ARROW} New Cash Balance: **$${user.cash.toLocaleString()}**\n` +
          `${ARROW} Remaining Moat Castle Balance: **$${acct.balance.toLocaleString()}**`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
