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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-pointspay")
    .setDescription("Pay a user using Fox Points only.")
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

    let points = sender.foxBank.rewards;
    const pointsValue = points * 1000;

    // Check if points are enough
    if (pointsValue < amount) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Points",
        description: `${ARROW} You do not have enough Fox Points.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct points
    const pointsUsed = Math.ceil(amount / 1000);
    points -= pointsUsed;

    sender.foxBank.rewards = points;
    receiverRecord.cash += amount;

    sender.foxBank.updatedAt = Date.now();

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // ⭐ Detailed invoice → billing channel
    const invoice = foxbankembedTemplate({
      title: "🦊 Fox Bank Points Invoice",
      description:
        `${FOXICON} **Fox Points Payment**\n\n` +
        `${ARROW} **Sender:** <@${senderId}>\n` +
        `${ARROW} **Receiver:** <@${receiver.id}>\n` +
        `${ARROW} **Amount:** $${amount.toLocaleString()}\n\n` +
        `${ARROW} **Points Used:** ${pointsUsed}\n` +
        `${ARROW} **Remaining Points:** ${points.toLocaleString()}\n` +
        `${ARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      noLogo: false,
    });

    const invoiceChannel =
      interaction.client.channels.cache.get(invoiceChannelId);

    if (invoiceChannel) {
      invoiceChannel.send({
        embeds: [invoice.embed],
        files: invoice.files,
      });
    }

    // ⭐ Simple confirmation → user
    const { embed, files } = foxbankembedTemplate({
      title: "Payment Sent",
      description:
        `${ARROW} You paid <@${receiver.id}> $${amount.toLocaleString()} using Fox Points.\n` +
        `${ARROW} Remaining Fox Points: ${points.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
