const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  getAllUserRecords,
  updateUserRecord,
  loadLakevillePrices,
  loadSixhousnetPrices,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW, FOXICON } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-homegift")
    .setDescription("Fox Staff Only — Gift a home to a user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Recipient").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("area")
        .setDescription("lakeville or sixhousnet")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("homeid").setDescription("Home ID").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const target = interaction.options.getUser("user");
    const area = interaction.options.getString("area");
    const homeId = interaction.options.getInteger("homeid");

    const userRecord = await getUserRecord(target.id);
    const allUsers = await getAllUserRecords();

    const lakeville = await loadLakevillePrices();
    const sixhousnet = await loadSixhousnetPrices();

    const priceTable =
      area === "lakeville"
        ? lakeville
        : area === "sixhousnet"
          ? sixhousnet
          : null;

    if (!priceTable) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousnet**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const price = priceTable[homeId];

    if (price === undefined || price === null) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Home ID",
        description: `> ${ARROW} Home ID **${homeId}** cannot be gifted.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    for (const u of allUsers) {
      if (u.homes?.[area]?.homeId === homeId) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Already Owned",
          description: `> ${ARROW} Home **${homeId}** is already owned.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    // Save home to user
    userRecord.homes[area] = { homeId, price };
    await updateUserRecord(userRecord);

    // DM the recipient
    try {
      const { embed, files } = foxbankembedTemplate({
        title: "You Received a Home!",
        description:
          `> ${ARROW} **A Fox Bank staff member has gifted you a home.**\n\n` +
          `> ${ARROW} **Home:** ${area} #${homeId}\n` +
          `> ${ARROW} **Value:** $${price.toLocaleString()}\n\n` +
          `> ${ARROW} You can view your home using **/fox-viewaccount**.`,
      });

      await target.send({ embeds: [embed], files });
    } catch (err) {
      // User has DMs closed — ignore silently
    }

    // Staff confirmation embed
    const { embed, files } = foxbankembedTemplate({
      title: "Home Gifted",
      description:
        `> ${ARROW} **Home:** ${area} #${homeId}\n` +
        `> ${ARROW} **Recipient:** ${target.tag}\n` +
        `> ${ARROW} Successfully gifted.\n\n` +
        `> ${ARROW} The user has been notified via DM (if enabled).`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
