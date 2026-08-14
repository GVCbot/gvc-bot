const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay another user money.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user you want to pay.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to pay (number or 'all').")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("moat_card")
        .setDescription(
          "Pay using your Moat Castle card to earn Castle Points.",
        )
        .setRequired(false)
        .addChoices({ name: "Use Moat Castle Card", value: "use_card" }),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amountInput = interaction.options.getString("amount");
    const moatCardOption = interaction.options.getString("moat_card");

    if (receiver.id === senderId) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description:
          "> <:bulletpoint:1534184707900837961> You cannot pay yourself.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const sender = await getUserRecord(senderId);
    const receiverRecord = await getUserRecord(receiver.id);

    sender.cash = sender.cash ?? 0;
    receiverRecord.cash = receiverRecord.cash ?? 0;

    let amount;

    if (amountInput.toLowerCase() === "all") {
      amount = sender.cash;
    } else {
      amount = parseInt(amountInput, 10);
      if (isNaN(amount)) {
        const { embed } = embedTemplate({
          title: "Payment Error",
          description:
            "> <:bulletpoint:1534184707900837961> Amount must be a number or 'all'.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }
    }

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description:
          "> <:bulletpoint:1534184707900837961> Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    let moatCardUsedText = "";

    // ⭐ If user selected Moat Castle card
    if (moatCardOption === "use_card") {
      if (!sender.moatCastle) {
        const { embed } = embedTemplate({
          title: "Moat Castle Card Error",
          description:
            "> <:bulletpoint:1534184707900837961> You do not have a Moat Castle account or card.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // ⭐ Check if card is frozen
      if (sender.moatCastle.cardStatus === "Frozen") {
        const { embed } = embedTemplate({
          title: "Card Frozen",
          description:
            "> <:bulletpoint:1534184707900837961> Your Moat Castle card is **Frozen**.\n" +
            "> <:bulletpoint:1534184707900837961> Unfreeze it using **/moat-unfreezecard**.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // ⭐ Check Moat Castle balance
      if (sender.moatCastle.balance < amount) {
        const { embed } = embedTemplate({
          title: "Insufficient Moat Castle Balance",
          description:
            `> <:bulletpoint:1534184707900837961> Your Moat Castle account only has **$${sender.moatCastle.balance.toLocaleString()}**.\n` +
            `> <:bulletpoint:1534184707900837961> You need **$${amount.toLocaleString()}** to complete this payment.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // ⭐ Deduct from Moat Castle balance instead of cash
      sender.moatCastle.balance -= amount;
      receiverRecord.cash += amount;

      // ⭐ Award points (1 per 100)
      const earnedPoints = Math.floor(amount / 100);
      sender.moatCastle.rewards += earnedPoints;

      moatCardUsedText =
        `> <:bulletpoint:1534184707900837961> **Moat Castle Card Used:** ${sender.moatCastle.cardNumber}\n` +
        `> <:bulletpoint:1534184707900837961> **Points Earned:** ${earnedPoints}\n`;
    } else {
      // ⭐ Normal cash payment
      if (sender.cash < amount) {
        const { embed } = embedTemplate({
          title: "Payment Error",
          description:
            "> <:bulletpoint:1534184707900837961> You do not have enough cash to make this payment.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      sender.cash -= amount;
      receiverRecord.cash += amount;
    }

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    const desc =
      `> <:bulletpoint:1534184707900837961> **You paid:** <@${receiver.id}> $${amount.toLocaleString()}\n` +
      moatCardUsedText +
      `> <:bulletpoint:1534184707900837961> **Your new cash balance:** $${sender.cash.toLocaleString()}`;

    const { embed } = embedTemplate({
      title: "Payment Sent",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM receiver
    try {
      const { embed: dmEmbed } = embedTemplate({
        title: "Payment Received",
        description:
          `> <:bulletpoint:1534184707900837961> **From:** ${interaction.user.username}\n` +
          `> <:bulletpoint:1534184707900837961> **Amount:** $${amount.toLocaleString()}\n` +
          `> <:bulletpoint:1534184707900837961> **New Cash Balance:** $${receiverRecord.cash.toLocaleString()}`,
        noLogo: true,
      });

      dmEmbed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));

      await receiver.send({ embeds: [dmEmbed] });
    } catch {
      // Ignore DM errors
    }
  },
};
