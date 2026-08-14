const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { MOATCASTLE, ARROW } = MOATEMOJIS;

const GVCARROW = "<:arrowright:1534182706836144158>";

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
    )
    .addIntegerOption((option) =>
      option
        .setName("points")
        .setDescription("Castle Points to use (optional).")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amountInput = interaction.options.getString("amount");
    const moatCardOption = interaction.options.getString("moat_card");
    const pointsInput = interaction.options.getInteger("points") ?? 0;

    const invoiceChannelId = "1537770259677847612";

    if (receiver.id === senderId) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description: `${GVCARROW} You cannot pay yourself.`,
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
      amount =
        moatCardOption === "use_card"
          ? (sender.moatCastle?.balance ?? 0)
          : sender.cash;
    } else {
      amount = parseInt(amountInput, 10);
      if (isNaN(amount)) {
        const { embed } = embedTemplate({
          title: "Payment Error",
          description: `${GVCARROW} Amount must be a number or 'all'.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }
    }

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description: `${GVCARROW} Amount must be greater than 0.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    let moatCardUsedText = "";
    let invoiceEmbed;
    let invoiceFiles;

    // ============================
    // ⭐ Moat Castle Payment (with optional points)
    // ============================
    if (moatCardOption === "use_card") {
      if (!sender.moatCastle) {
        const { embed } = embedTemplate({
          title: "Moat Castle Card Error",
          description: `${GVCARROW} You do not have a Moat Castle account or card.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (sender.moatCastle.cardStatus === "Frozen") {
        const { embed } = embedTemplate({
          title: "Card Frozen",
          description:
            `${GVCARROW} Your Moat Castle card is **Frozen**.\n` +
            `${GVCARROW} Unfreeze it using **/moat-unfreezecard**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      let balance = sender.moatCastle.balance;
      let points = sender.moatCastle.rewards;

      if (pointsInput < 0) {
        const { embed } = embedTemplate({
          title: "Invalid Points",
          description: `${GVCARROW} Points must be **0 or higher**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      if (pointsInput > points) {
        const { embed } = embedTemplate({
          title: "Not Enough Points",
          description:
            `${GVCARROW} You only have **${points} Castle Points**.\n` +
            `${GVCARROW} You cannot use **${pointsInput} points**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const pointsValue = pointsInput * 1000;
      const totalAvailable = balance + pointsValue;

      if (totalAvailable < amount) {
        const { embed } = embedTemplate({
          title: "Insufficient Funds",
          description:
            `${GVCARROW} You tried to pay **$${amount.toLocaleString()}**.\n\n` +
            `${GVCARROW} Moat Balance: $${balance.toLocaleString()}\n` +
            `${GVCARROW} Points Used: ${pointsInput} (worth $${pointsValue.toLocaleString()})\n\n` +
            `${GVCARROW} Total Available: $${totalAvailable.toLocaleString()}\n` +
            `${GVCARROW} **This is not enough to cover the payment.**`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      // Deduct balance first
      const amountPaidFromBalance = Math.min(balance, amount);
      balance -= amountPaidFromBalance;

      // Deduct points second
      const remainingAfterBalance = amount - amountPaidFromBalance;
      const pointsUsed = Math.ceil(remainingAfterBalance / 1000);
      points -= pointsUsed;

      sender.moatCastle.balance = balance;
      sender.moatCastle.rewards = points;

      receiverRecord.cash += amount;

      // ⭐ Award points (1 per 1000) with 5k cap
      const earnedPoints = Math.floor(amount / 1000);
      sender.moatCastle.rewards = Math.min(
        sender.moatCastle.rewards + earnedPoints,
        5000,
      );

      moatCardUsedText =
        `${ARROW} **Moat Castle Card Used:** ${sender.moatCastle.cardNumber}\n` +
        `${ARROW} **Points Used:** ${pointsUsed}\n` +
        `${ARROW} **Points Earned:** ${earnedPoints}\n` +
        `${ARROW} **Total Points:** ${sender.moatCastle.rewards.toLocaleString()}\n`;

      // ⭐ Moat Castle Invoice
      const invoice = moatembedTemplate({
        title: "🏦 Moat Castle Billing Invoice",
        description:
          `${MOATCASTLE} **Payment Processed via Moat Castle**\n\n` +
          `${ARROW} **Sender:** <@${senderId}>\n` +
          `${ARROW} **Receiver:** <@${receiver.id}>\n` +
          `${ARROW} **Amount:** $${amount.toLocaleString()}\n` +
          `${ARROW} **Points Used:** ${pointsUsed}\n` +
          `${ARROW} **Points Earned:** ${earnedPoints}\n` +
          `${ARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
        noLogo: false,
      });

      invoiceEmbed = invoice.embed;
      invoiceFiles = invoice.files;
    } else {
      // ============================
      // ⭐ Normal GVC Cash Payment
      // ============================
      if (sender.cash < amount) {
        const { embed } = embedTemplate({
          title: "Payment Error",
          description: `${GVCARROW} You do not have enough cash to make this payment.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      sender.cash -= amount;
      receiverRecord.cash += amount;

      // ⭐ GVC Invoice
      const invoice = embedTemplate({
        title: "💵 GVC Billing Invoice",
        description:
          `${GVCARROW} **Cash Payment Processed**\n\n` +
          `${GVCARROW} **Sender:** <@${senderId}>\n` +
          `${GVCARROW} **Receiver:** <@${receiver.id}>\n` +
          `${GVCARROW} **Amount:** $${amount.toLocaleString()}\n` +
          `${GVCARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
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
    const arrowEmoji = moatCardOption === "use_card" ? ARROW : GVCARROW;

    const desc =
      `${arrowEmoji} **You paid:** <@${receiver.id}> $${amount.toLocaleString()}\n` +
      moatCardUsedText +
      `${arrowEmoji} **Your new cash balance:** $${sender.cash.toLocaleString()}`;

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
          `${GVCARROW} **From:** ${interaction.user.username}\n` +
          `${GVCARROW} **Amount:** $${amount.toLocaleString()}\n` +
          `${GVCARROW} **New Cash Balance:** $${receiverRecord.cash.toLocaleString()}`,
        noLogo: true,
      });

      dmEmbed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));
      await receiver.send({ embeds: [dmEmbed] });
    } catch {}
  },
};
