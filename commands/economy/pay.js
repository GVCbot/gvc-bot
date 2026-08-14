const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { MOATCASTLE, ARROW } = MOATEMOJIS;

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
        .addChoices({ name: "Use Moat Castle Card", value: "use_card" })
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amountInput = interaction.options.getString("amount");
    const moatCardOption = interaction.options.getString("moat_card");

    const invoiceChannelId = "1537770259677847612";

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

    let moatCardUsedText = "";
    let invoiceEmbed;
    let invoiceFiles;

    // ============================
    // ⭐ Moat Castle Payment
    // ============================
    if (moatCardOption === "use_card") {
      if (!sender.moatCastle) {
        const { embed } = embedTemplate({
          title: "Moat Castle Card Error",
          description: "> You do not have a Moat Castle account or card.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (sender.moatCastle.cardStatus === "Frozen") {
        const { embed } = embedTemplate({
          title: "Card Frozen",
          description:
            "> Your Moat Castle card is **Frozen**.\n" +
            "> Unfreeze it using **/moat-unfreezecard**.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (sender.moatCastle.balance < amount) {
        const { embed } = embedTemplate({
          title: "Insufficient Moat Castle Balance",
          description:
            `> Your Moat Castle account only has **$${sender.moatCastle.balance.toLocaleString()}**.\n` +
            `> You need **$${amount.toLocaleString()}** to complete this payment.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // Deduct from Moat Castle
      sender.moatCastle.balance -= amount;
      receiverRecord.cash += amount;

      // Award points (1 per 100)
      const earnedPoints = Math.floor(amount / 100);
      sender.moatCastle.rewards += earnedPoints;

      moatCardUsedText =
        `${ARROW} **Moat Castle Card Used:** ${sender.moatCastle.cardNumber}\n` +
        `${ARROW} **Points Earned:** ${earnedPoints}\n`;

      // ⭐ Create Moat Castle invoice
      const invoice = moatembedTemplate({
        title: "🏦 Moat Castle Billing Invoice",
        description:
          `${MOATCASTLE} **Payment Processed via Moat Castle**\n\n` +
          `${ARROW} **Sender:** <@${senderId}>\n` +
          `${ARROW} **Receiver:** <@${receiver.id}>\n` +
          `${ARROW} **Amount:** $${amount.toLocaleString()}\n` +
          `${ARROW} **Card Number:** ${sender.moatCastle.cardNumber}\n` +
          `${ARROW} **Points Earned:** ${earnedPoints}\n` +
          `${ARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        noLogo: false,
      });

      invoiceEmbed = invoice.embed;
      invoiceFiles = invoice.files;
    } else {
      // ============================
      // ⭐ Normal Cash Payment
      // ============================
      if (sender.cash < amount) {
        const { embed } = embedTemplate({
          title: "Payment Error",
          description: "> You do not have enough cash to make this payment.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      sender.cash -= amount;
      receiverRecord.cash += amount;

      // ⭐ Create GVC invoice
      const invoice = embedTemplate({
        title: "💵 GVC Billing Invoice",
        description:
          `> **Cash Payment Processed**\n\n` +
          `> **Sender:** <@${senderId}>\n` +
          `> **Receiver:** <@${receiver.id}>\n` +
          `> **Amount:** $${amount.toLocaleString()}\n` +
          `> **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        noLogo: true,
      });

      invoiceEmbed = invoice.embed;
      invoiceFiles = invoice.files;
    }

    // Save changes
    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // ============================
    // ⭐ Send invoice to invoice channel
    // ============================
    const invoiceChannel =
      interaction.client.channels.cache.get(invoiceChannelId);
    if (invoiceChannel) {
      await invoiceChannel.send({
        embeds: [invoiceEmbed],
        files: invoiceFiles,
      });
    }

    // ============================
    // ⭐ User-facing confirmation
    // ============================
    const desc =
      `${ARROW} **You paid:** <@${receiver.id}> $${amount.toLocaleString()}\n` +
      moatCardUsedText +
      `${ARROW} **Your new cash balance:** $${sender.cash.toLocaleString()}`;

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
          `> **From:** ${interaction.user.username}\n` +
          `> **Amount:** $${amount.toLocaleString()}\n` +
          `> **New Cash Balance:** $${receiverRecord.cash.toLocaleString()}`,
        noLogo: true,
      });

      dmEmbed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));
      await receiver.send({ embeds: [dmEmbed] });
    } catch {}
  },
};
