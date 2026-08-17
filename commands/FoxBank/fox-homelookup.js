const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  loadLakevillePrices,
  loadSixhousentPrices,
} = require("../../economy/economyutils");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717"; // Staff role ID

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-homelookup")
    .setDescription(
      "Look up a home to see if it's owned, by whom, and its price.",
    )
    .addStringOption((opt) =>
      opt
        .setName("area")
        .setDescription("lakeville or sixhousent")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("homeid").setDescription("Home ID").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      return interaction.editReply(
        "❌ You do not have permission to use this command.",
      );
    }

    const area = interaction.options.getString("area");
    const homeId = interaction.options.getInteger("homeid");

    if (!["lakeville", "sixhousent"].includes(area)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Load price table
    const prices =
      area === "lakeville"
        ? await loadLakevillePrices()
        : await loadSixhousentPrices();

    const price = prices[homeId];

    if (price === undefined) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Home ID",
        description: `> ${ARROW} Home ID **${homeId}** does not exist.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (price === null) {
      const { embed, files } = foxbankembedTemplate({
        title: "Bank Property",
        description: `> ${ARROW} Home **${homeId}** is **BANK PROPERTY** and cannot be purchased.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Check ownership
    const allUsers = await getAllUserRecords();
    let owner = null;

    for (const u of allUsers) {
      const homes = u.homes?.[area] || [];
      if (homes.some((h) => h.homeId === homeId)) {
        owner = u;
        break;
      }
    }

    let description;

    if (owner) {
      description =
        `> ${ARROW} **Home ID:** ${homeId}\n` +
        `> ${ARROW} **Area:** ${area}\n` +
        `> ${ARROW} **Price:** $${price.toLocaleString()}\n\n` +
        `> ${ARROW} **Owned By:** <@${owner.userId}> (${owner.userId})`;
    } else {
      description =
        `> ${ARROW} **Home ID:** ${homeId}\n` +
        `> ${ARROW} **Area:** ${area}\n` +
        `> ${ARROW} **Price:** $${price.toLocaleString()}\n\n` +
        `> ${ARROW} **Ownership:** Not owned by any user.`;
    }

    const { embed, files } = foxbankembedTemplate({
      title: "🏠 Home Lookup Result",
      description,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
