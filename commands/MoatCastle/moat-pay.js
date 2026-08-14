const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const embedTemplate = require("../../utils/embedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW, MOATCASTLE } = MOATEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const invoiceChannelId = "1537770259677847612";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-pay")
    .setDescription(
      "Pay a user using Moat Castle balance (with optional backup points).",
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to pay").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Amount to pay").setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("use_backup_points")
        .setDescription("Use Castle Points if balance is not enough")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const useBackup =
      interaction.options.getBoolean("use_backup_points") ?? false;

    if (receiver.id === senderId) {
      const { embed } = moatembedTemplate({
        title: "Payment Error",
        description: `${ARROW} You cannot pay yourself.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const sender = await getUserRecord(senderId);
    const receiverRecord = await getUserRecord(receiver.id);

    if (!sender.moatCastle) {
      const { embed } = moatembedTemplate({
        title: "No Moat Castle Account",
        description: `${ARROW} You must create an account first.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (sender.moatCastle.cardStatus === "Frozen") {
      const { embed } = moatembedTemplate({
        title: "Card Frozen",
        description: `${ARROW} Your Moat Castle card is frozen.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    let balance = sender.moatCastle.balance;
    let points = sender.moatCastle.rewards;

    let amountPaidFromBalance = 0;
    let amountPaidFromPoints = 0;

    if (balance >= amount) {
      amountPaidFromBalance = amount;
      balance -= amount;
    } else if (useBackup) {
      amountPaidFromBalance = balance;
      const remaining = amount - balance;

      const pointsValue = points * 1000;
      if (pointsValue < remaining) {
        const { embed } = moatembedTemplate({
          title: "Insufficient Funds",
          description: `${ARROW} Balance + points are not enough to cover this payment.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const pointsUsed = Math.ceil(remaining / 1000);
      points -= pointsUsed;
      amountPaidFromPoints = remaining;
      balance = 0;
    } else {
      const { embed } = moatembedTemplate({
        title: "Insufficient Balance",
        description: `${ARROW} Your Moat Castle balance is not enough.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Apply payment
    sender.moatCastle.balance = balance;
    sender.moatCastle.rewards = points;

    receiverRecord.cash += amount;

    // ⭐ Points earned ONLY if backup points were NOT used
    let earnedPoints = 0;
    if (!useBackup) {
      earnedPoints = Math.floor(amount / 1000);
      sender.moatCastle.rewards = Math.min(
        sender.moatCastle.rewards + earnedPoints,
        5000,
      );
    }

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // ⭐ Detailed invoice → billing channel
    const invoice = moatembedTemplate({
      title: "🏦 Moat Castle Billing Invoice",
      description:
        `${MOATCASTLE} **Moat Castle Payment**\n\n` +
        `${ARROW} **Sender:** <@${senderId}>\n` +
        `${ARROW} **Receiver:** <@${receiver.id}>\n` +
        `${ARROW} **Amount:** $${amount.toLocaleString()}\n\n` +
        `${ARROW} **Paid From Balance:** $${amountPaidFromBalance.toLocaleString()}\n` +
        `${ARROW} **Paid From Points:** $${amountPaidFromPoints.toLocaleString()}\n` +
        `${ARROW} **Points Earned:** ${earnedPoints}\n\n` +
        `${ARROW} **New Balance:** $${balance.toLocaleString()}\n` +
        `${ARROW} **New Points:** ${sender.moatCastle.rewards.toLocaleString()}\n` +
        `${ARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      noLogo: false,
    });

    const invoiceChannel =
      interaction.client.channels.cache.get(invoiceChannelId);
    if (invoiceChannel) {
      invoiceChannel.send({ embeds: [invoice.embed], files: invoice.files });
    }

    // ⭐ Simple confirmation → user
    const { embed } = embedTemplate({
      title: "Payment Sent",
      description:
        `${ARROW} You paid <@${receiver.id}> $${amount.toLocaleString()}\n` +
        `${ARROW} New Moat Balance: $${balance.toLocaleString()}\n` +
        `${ARROW} New Points: ${sender.moatCastle.rewards.toLocaleString()}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
