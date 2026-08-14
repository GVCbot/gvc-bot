const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { FOXICON, ARROW } = FOXEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

// ⭐ Fox Bank invoice channel
const invoiceChannelId = "1537770259677847612";

// ⭐ Cashback table
function getCashbackPercent(tier) {
  switch ((tier || "").toLowerCase()) {
    case "silver":
      return 0.02;
    case "gold":
      return 0.03;
    case "platinum":
      return 0.04;
    case "black":
      return 0.05;
    default:
      return 0.01; // Standard
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-pay")
    .setDescription(
      "Pay a user using Fox Bank balance (with optional backup Fox Points).",
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
        .setDescription("Use Fox Points if balance is not enough")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const useBackup =
      interaction.options.getBoolean("use_backup_points") ?? false;

    // Prevent self-payment
    if (receiver.id === senderId) {
      const { embed, files } = foxbankembedTemplate({
        title: "Payment Error",
        description: `${ARROW} You cannot pay yourself.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const sender = await getUserRecord(senderId);
    const receiverRecord = await getUserRecord(receiver.id);

    // Ensure Fox Bank account exists
    if (!sender.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description: `${ARROW} You must create an account first.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Ensure card is not frozen
    if (sender.foxBank.cardStatus === "Frozen") {
      const { embed, files } = foxbankembedTemplate({
        title: "Card Frozen",
        description: `${ARROW} Your Fox Bank card is frozen.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    let balance = sender.foxBank.balance;
    let points = sender.foxBank.rewards;

    let amountPaidFromBalance = 0;
    let amountPaidFromPoints = 0;

    // Case 1: Balance covers full amount
    if (balance >= amount) {
      amountPaidFromBalance = amount;
      balance -= amount;
    }

    // Case 2: Balance insufficient, backup points enabled
    else if (useBackup) {
      amountPaidFromBalance = balance;
      const remaining = amount - balance;

      const pointsValue = points * 1000;
      if (pointsValue < remaining) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Funds",
          description: `${ARROW} Balance + Fox Points are not enough to cover this payment.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const pointsUsed = Math.ceil(remaining / 1000);
      points -= pointsUsed;
      amountPaidFromPoints = remaining;
      balance = 0;
    }

    // Case 3: Balance insufficient, backup disabled
    else {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Balance",
        description: `${ARROW} Your Fox Bank balance is not enough.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Apply payment
    sender.foxBank.balance = balance;
    sender.foxBank.rewards = points;

    receiverRecord.cash += amount;

    // ⭐ Cashback ONLY if backup points were NOT used
    let cashbackPoints = 0;

    if (!useBackup) {
      const cashbackPercent = getCashbackPercent(sender.foxBank.tier);
      cashbackPoints = Math.floor(amountPaidFromBalance * cashbackPercent);

      sender.foxBank.rewards = Math.min(
        sender.foxBank.rewards + cashbackPoints,
        5000,
      );
    }

    sender.foxBank.updatedAt = Date.now();

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // ⭐ Detailed invoice → billing channel
    const invoice = foxbankembedTemplate({
      title: "🦊 Fox Bank Billing Invoice",
      description:
        `${FOXICON} **Fox Bank Payment**\n\n` +
        `${ARROW} **Sender:** <@${senderId}>\n` +
        `${ARROW} **Receiver:** <@${receiver.id}>\n` +
        `${ARROW} **Amount:** $${amount.toLocaleString()}\n\n` +
        `${ARROW} **Paid From Balance:** $${amountPaidFromBalance.toLocaleString()}\n` +
        `${ARROW} **Paid From Fox Points:** $${amountPaidFromPoints.toLocaleString()}\n\n` +
        `${ARROW} **Cashback Earned:** ${cashbackPoints}\n` +
        `${ARROW} **New Balance:** $${balance.toLocaleString()}\n` +
        `${ARROW} **New Fox Points:** ${sender.foxBank.rewards.toLocaleString()}\n` +
        `${ARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      noLogo: false,
    });

    const invoiceChannel =
      interaction.client.channels.cache.get(invoiceChannelId);
    if (invoiceChannel) {
      invoiceChannel.send({ embeds: [invoice.embed], files: invoice.files });
    }

    // ⭐ Simple confirmation → user
    const { embed, files } = foxbankembedTemplate({
      title: "Payment Sent",
      description:
        `${ARROW} You paid <@${receiver.id}> $${amount.toLocaleString()}.\n` +
        `${ARROW} Cashback Earned: ${cashbackPoints}\n` +
        `${ARROW} Remaining Fox Bank Balance: $${balance.toLocaleString()}\n` +
        `${ARROW} Total Fox Points: ${sender.foxBank.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
