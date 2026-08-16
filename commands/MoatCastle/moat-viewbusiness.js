const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  findBusinessOwnerRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewbusiness")
    .setDescription("View your Moat Castle business, or look one up by ID")
    .addStringOption((opt) =>
      opt
        .setName("business_id")
        .setDescription("Look up a business by ID instead of your own")
        .setRequired(false),
    ),

  async execute(interaction) {
    const businessId = interaction.options.getString("business_id");

    await interaction.deferReply({ ephemeral: !businessId });

    let business;
    let ownerId;

    if (businessId) {
      const ownerDoc = await findBusinessOwnerRecord(businessId);

      if (!ownerDoc) {
        return interaction.editReply({
          content: "❌ No business found with that ID.",
        });
      }

      business = ownerDoc.moatCastle.business;
      ownerId = ownerDoc.userId;
    } else {
      const record = await getUserRecord(interaction.user.id);

      if (!record.moatCastle || !record.moatCastle.business) {
        return interaction.editReply({
          content:
            "❌ You don't own a business yet. Use `/moat-businesscreate` to request one.",
        });
      }

      business = record.moatCastle.business;
      ownerId = interaction.user.id;
    }

    const { embed, files } = moatembedTemplate({
      title: "🏢 Business Overview",
      description:
        `> Owner: <@${ownerId}>\n` +
        `> Name: **${business.name}**\n` +
        `> Description: ${business.description}\n` +
        `> ID: **${business.id}**\n` +
        `> Daily Income: $${(business.income || 0).toLocaleString()}\n` +
        `> Created: <t:${Math.floor(business.createdAt / 1000)}:D>`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
