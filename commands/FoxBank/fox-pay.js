const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { FOXICON, ARROW } = FOXEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

// Fox Bank invoice channel
const invoiceChannelId = "1537770259677847612";

// Cashback table (still works, but now adds CASH instead of points)
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
    .setDescription("Pay a user using Fox Bank balance.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to pay").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Amount to pay").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

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

    // Insufficient balance
    if (balance < amount) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Balance",
        description: `${ARROW} Your Fox Bank balance is not enough.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Apply payment
    sender.foxBank.balance -= amount;
    receiverRecord.cash += amount;

    // Cashback (now adds CASH instead of points)
    const cashbackPercent = getCashbackPercent(sender.foxBank.tier);
    const cashbackCash = Math.floor(amount * cashbackPercent);

    sender.cash += cashbackCash;
    sender.foxBank.updatedAt = Date.now();

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // Invoice → billing channel
    const invoice = foxbankembedTemplate({
      title: "🦊 Fox Bank Billing Invoice",
      description:
        `${FOXICON} **Fox Bank Payment**\n\n` +
        `${ARROW} **Sender:** <@${senderId}>\n` +
        `${ARROW} **Receiver:** <@${receiver.id}>\n` +
        `${ARROW} **Amount:** $${amount.toLocaleString()}\n\n` +
        `${ARROW} **Paid From Balance:** $${amount.toLocaleString()}\n` +
        `${ARROW} **Cashback Earned:** $${cashbackCash.toLocaleString()}\n\n` +
        `${ARROW} **New Balance:** $${sender.foxBank.balance.toLocaleString()}\n` +
        `${ARROW} **New Cash:** $${sender.cash.toLocaleString()}\n` +
        `${ARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      noLogo: false,
    });

    const invoiceChannel =
      interaction.client.channels.cache.get(invoiceChannelId);
    if (invoiceChannel) {
      invoiceChannel.send({ embeds: [invoice.embed], files: invoice.files });
    }

    // Confirmation → user
    const { embed, files } = foxbankembedTemplate({
      title: "Payment Sent",
      description:
        `${ARROW} You paid <@${receiver.id}> $${amount.toLocaleString()}.\n` +
        `${ARROW} Cashback Earned: $${cashbackCash.toLocaleString()}\n` +
        `${ARROW} Remaining Fox Bank Balance: $${sender.foxBank.balance.toLocaleString()}\n` +
        `${ARROW} New Cash: $${sender.cash.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
