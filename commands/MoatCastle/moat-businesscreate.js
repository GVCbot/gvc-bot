const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
  generateBusinessRequestId,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const MOAT_STAFF_ROLE = "1537722114176581724";
const BUSINESS_REQUEST_CHANNEL = "1538507930502963251";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-businesscreate")
    .setDescription("Request to open a new Moat Castle business")
    .addStringOption((opt) =>
      opt
        .setName("name")
        .setDescription("Business name")
        .setRequired(true)
        .setMaxLength(50),
    )
    .addStringOption((opt) =>
      opt
        .setName("description")
        .setDescription("Business description")
        .setRequired(true)
        .setMaxLength(300),
    ),

  async execute(interaction) {
    const name = interaction.options.getString("name");
    const description = interaction.options.getString("description");

    await interaction.deferReply({ ephemeral: true });

    const record = await getUserRecord(interaction.user.id);

    if (!record.moatCastle) {
      return interaction.editReply({
        content:
          "❌ You need a Moat Castle account before requesting a business.",
      });
    }

    if (record.moatCastle.business) {
      return interaction.editReply({
        content:
          "❌ You already own a business. Only one business is allowed per person.",
      });
    }

    if (record.moatCastle.businessRequests.length > 0) {
      return interaction.editReply({
        content:
          "❌ You already have a pending business request awaiting staff review.",
      });
    }

    const requestId = generateBusinessRequestId();

    const request = {
      id: requestId,
      name,
      description,
      requestedAt: Date.now(),
    };

    record.moatCastle.businessRequests.push(request);
    await updateUserRecord(record);

    const { embed, files } = moatembedTemplate({
      title: "🏢 New Business Request",
      description:
        `> Requester: <@${interaction.user.id}>\n` +
        `> Business Name: **${name}**\n` +
        `> Description: ${description}\n\n` +
        `> Moat staff, please accept or deny this request below.`,
      noLogo: false,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`moat_business_accept_${interaction.user.id}_${requestId}`)
        .setLabel("Accept")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`moat_business_deny_${interaction.user.id}_${requestId}`)
        .setLabel("Deny")
        .setStyle(ButtonStyle.Danger),
    );

    const channel = await interaction.client.channels.fetch(
      BUSINESS_REQUEST_CHANNEL,
    );
    await channel.send({
      content: `<@&${MOAT_STAFF_ROLE}>`,
      embeds: [embed],
      components: [row],
      files,
    });

    return interaction.editReply({
      content: "✅ Your business request has been submitted for staff review.",
    });
  },
};
