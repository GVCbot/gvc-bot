const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const GVCARROW = "<:arrowright:1534182706836144158>";
const invoiceChannelId = "1537770259677847612";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("pay")
    .setDescription("Pay another user using GVC cash.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to pay").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("amount").setDescription("Amount or 'all'").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amountInput = interaction.options.getString("amount");

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

    let amount =
      amountInput.toLowerCase() === "all"
        ? sender.cash
        : parseInt(amountInput, 10);

    if (isNaN(amount) || amount <= 0) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description: `${GVCARROW} Invalid amount.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (sender.cash < amount) {
      const { embed } = embedTemplate({
        title: "Payment Error",
        description: `${GVCARROW} You do not have enough cash.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    sender.cash -= amount;
    receiverRecord.cash += amount;

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    const invoice = embedTemplate({
      title: "💵 GVC Billing Invoice",
      description:
        `${GVCARROW} **Sender:** <@${senderId}>\n` +
        `${GVCARROW} **Receiver:** <@${receiver.id}>\n` +
        `${GVCARROW} **Amount:** $${amount.toLocaleString()}\n` +
        `${GVCARROW} **Timestamp:** <t:${Math.floor(Date.now() / 1000)}:F>`,
      noLogo: true,
    });

    const invoiceChannel =
      interaction.client.channels.cache.get(invoiceChannelId);
    if (invoiceChannel) {
      invoiceChannel.send({ embeds: [invoice.embed], files: invoice.files });
    }

    const { embed } = embedTemplate({
      title: "Payment Sent",
      description:
        `${GVCARROW} You paid <@${receiver.id}> $${amount.toLocaleString()}\n` +
        `${GVCARROW} New Balance: $${sender.cash.toLocaleString()}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
