const { SlashCommandBuilder } = require("discord.js");
const {
  getAllBusinesses,
  getUserRecord,
} = require("../../economy/economyutils");

const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW, MOATCASTLE } = MOATEMOJIS;

// Staff role allowed to view businesses
const moatStaffRole = "1537722114176581724";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewallbusinesses")
    .setDescription(
      "View all Moat Castle businesses and their income. (Staff Only)",
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (!interaction.member.roles.cache.has(moatStaffRole)) {
      const { embed, files } = moatembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only Moat Castle staff can view business records.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Fetch all businesses
    const businesses = await getAllBusinesses();

    if (!businesses || businesses.length === 0) {
      const { embed, files } = moatembedTemplate({
        title: "No Businesses Found",
        description: `${ARROW} There are currently no registered Moat Castle businesses.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Build business list
    let description = `${MOATCASTLE} **Registered Moat Castle Businesses** ${MOATCASTLE}\n\n`;

    for (const biz of businesses) {
      const ownerRecord = await getUserRecord(biz.ownerId);

      description +=
        `${ARROW} **Business Name:** ${biz.name || "Unnamed"}\n` +
        `${ARROW} **Business ID:** ${biz.id}\n` +
        `${ARROW} **Owner:** <@${biz.ownerId}>\n` +
        `${ARROW} **Income:** $${(biz.income || 0).toLocaleString()}\n` +
        `${ARROW} **Status:** ${biz.status || "Active"}\n\n`;
    }

    const { embed, files } = moatembedTemplate({
      title: "Moat Castle Business Directory",
      description,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
