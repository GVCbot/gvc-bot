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
        .addChoices(
          // This will be dynamically replaced later
          { name: "Your Moat Castle Card", value: "use_card" },
        ),
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
        description: "> You cannot pay yourself.",
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
          description: "> Amount must be a number or 'all'.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }
    }

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description: "> Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (sender.cash < amount) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description: "> You do not have enough cash to make this payment.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Process payment
    sender.cash -= amount;
    receiverRecord.cash += amount;

    let moatCardUsedText = "";

    // If user selected Moat Castle card
    if (moatCardOption === "use_card" && sender.moatCastle) {
      const earnedPoints = Math.floor(amount / 100);
      sender.moatCastle.rewards += earnedPoints;

      moatCardUsedText =
        `> <:moatcastleright:1537695231409918002> **Moat Castle Card Used:** ${sender.moatCastle.cardNumber}\n` +
        `> <:moatcastleright:1537695231409918002> **Points Earned:** ${earnedPoints}\n`;
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
