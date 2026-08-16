const { SlashCommandBuilder } = require("discord.js");
const {
  updateUserRecord,
  findBusinessOwnerRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const MOAT_STAFF_ROLE = "1537722114176581724";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-setbusinessincome")
    .setDescription("[Staff] Set a business's daily income")
    .addStringOption((opt) =>
      opt
        .setName("business_id")
        .setDescription("Business ID")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("income")
        .setDescription("Daily income amount")
        .setRequired(true)
        .setMinValue(0),
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MOAT_STAFF_ROLE)) {
      return interaction.reply({
        content: "❌ Only Moat Castle staff can set business income.",
        ephemeral: true,
      });
    }

    const businessId = interaction.options.getString("business_id");
    const income = interaction.options.getInteger("income");

    await interaction.deferReply({ ephemeral: true });

    const ownerDoc = await findBusinessOwnerRecord(businessId);

    if (!ownerDoc) {
      return interaction.editReply({
        content: "❌ No business found with that ID.",
      });
    }

    ownerDoc.moatCastle.business.income = income;
    await updateUserRecord(ownerDoc);

    try {
      const ownerUser = await interaction.client.users.fetch(ownerDoc.userId);
      const { embed } = moatembedTemplate({
        title: "🏢 Business Income Updated",
        description: `> Your business **${ownerDoc.moatCastle.business.name}** now earns **$${income.toLocaleString()}** every 24 hours.`,
        noLogo: false,
      });
      await ownerUser.send({ embeds: [embed] });
    } catch {}

    return interaction.editReply({
      content: `✅ Set daily income for **${ownerDoc.moatCastle.business.name}** (${businessId}) to $${income.toLocaleString()}.`,
    });
  },
};
