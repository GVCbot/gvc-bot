const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
  findBusinessOwnerRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-paybusiness")
    .setDescription("Pay a Moat Castle business from your balance")
    .addStringOption((opt) =>
      opt.setName("id").setDescription("Business ID").setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to pay")
        .setRequired(true)
        .setMinValue(1),
    ),

  async execute(interaction) {
    const businessId = interaction.options.getString("id");
    const amount = interaction.options.getInteger("amount");

    await interaction.deferReply({ ephemeral: true });

    const payerRecord = await getUserRecord(interaction.user.id);

    if (!payerRecord.moatCastle) {
      return interaction.editReply({
        content: "❌ You need a Moat Castle account to pay a business.",
      });
    }

    if (payerRecord.moatCastle.balance < amount) {
      return interaction.editReply({
        content: "❌ Insufficient Moat Castle balance.",
      });
    }

    const ownerDoc = await findBusinessOwnerRecord(businessId);

    if (!ownerDoc) {
      return interaction.editReply({
        content: "❌ No business found with that ID.",
      });
    }

    if (ownerDoc.userId === interaction.user.id) {
      return interaction.editReply({
        content: "❌ You can't pay your own business.",
      });
    }

    payerRecord.moatCastle.balance -= amount;
    await updateUserRecord(payerRecord);

    ownerDoc.moatCastle.balance =
      (Number(ownerDoc.moatCastle.balance) || 0) + amount;
    await updateUserRecord(ownerDoc);

    try {
      const ownerUser = await interaction.client.users.fetch(ownerDoc.userId);
      const { embed } = moatembedTemplate({
        title: "🏢 Business Payment Received",
        description: `> ${interaction.user} paid your business **${ownerDoc.moatCastle.business.name}** $${amount.toLocaleString()}.`,
        noLogo: false,
      });
      await ownerUser.send({ embeds: [embed] });
    } catch {}

    return interaction.editReply({
      content: `✅ Paid $${amount.toLocaleString()} to **${ownerDoc.moatCastle.business.name}**.`,
    });
  },
};
