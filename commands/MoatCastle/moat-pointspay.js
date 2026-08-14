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
    .setName("moat-pointspay")
    .setDescription("Pay a user using Castle Points only.")
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

    let points = sender.moatCastle.rewards;
    const pointsValue = points * 1000;

    if (pointsValue < amount) {
      const { embed } = moatembedTemplate({
        title: "Insufficient Points",
        description: `${ARROW} You do not have enough Castle Points.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const pointsUsed = Math.ceil(amount / 1000);
    points -= pointsUsed;

    sender.moatCastle.rewards = points;
    receiverRecord.cash += amount;

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // ⭐ Detailed invoice → billing channel
    const invoice = moatembedTemplate({
      title: "🏦 Moat Castle Points Invoice",
      description:
        `${MOATCASTLE} **Points Payment**\n\n` +
        `${ARROW} **Sender:** <@${senderId}>\n` +
        `${ARROW} **Receiver:** <@${receiver.id}>\n` +
        `${ARROW} **Amount:** $${amount.toLocaleString()}\n\n` +
        `${ARROW} **Points Used:** ${pointsUsed}\n` +
        `${ARROW} **New Points:** ${points.toLocaleString()}\n` +
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
        `${ARROW} You paid <@${receiver.id}> $${amount.toLocaleString()} using Castle Points\n` +
        `${ARROW} New Points: ${points.toLocaleString()}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
