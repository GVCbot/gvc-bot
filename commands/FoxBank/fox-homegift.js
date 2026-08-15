const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  getAllUserRecords,
  updateUserRecord,
  loadLakevillePrices,
  loadSixhousentPrices,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
  return num;
}

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
        .setDescription("lakeville or sixhousent")
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
    const sixhousent = await loadSixhousentPrices();

    const priceTable =
      area === "lakeville"
        ? lakeville
        : area === "sixhousent"
          ? sixhousent
          : null;

    if (!priceTable) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const price = priceTable[homeId];

    // ⭐ Only Lakeville Home 1 is ungiftable
    if (area === "lakeville" && homeId === 1) {
      const { embed, files } = foxbankembedTemplate({
        title: "Bank Property",
        description: `> ${ARROW} Lakeville Home 1 is **BANK PROPERTY** and cannot be gifted.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (price === undefined) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Home ID",
        description: `> ${ARROW} Home ID ${homeId} does not exist.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Check if home is already owned
    for (const u of allUsers) {
      const homes = u.homes?.[area] || [];

      if (Array.isArray(homes)) {
        if (homes.some((h) => h.homeId === homeId)) {
          const { embed, files } = foxbankembedTemplate({
            title: "Home Already Owned",
            description: `> ${ARROW} Home ${homeId} is already owned.`,
          });
          return interaction.editReply({ embeds: [embed], files });
        }
      }
    }

    // ⭐ Auto‑create Fox Bank account if missing
    if (!userRecord.foxBank) {
      userRecord.foxBank = {
        accountName: `Fox Account #${Math.floor(Math.random() * 1000)}`,
        tier: "Standard",
        balance: 0,
        createdAt: Date.now(),
        cardStatus: "Active",
        accountId: `FB-${target.id}`,
        cardNumber: generateCardNumber(),
      };
    }

    // ⭐ Ensure homes structure exists
    if (!userRecord.homes) {
      userRecord.homes = {
        lakeville: [],
        sixhousent: [],
      };
    }

    if (!Array.isArray(userRecord.homes[area])) {
      userRecord.homes[area] = [];
    }

    // ⭐ Save home to user
    userRecord.homes[area].push({ homeId, price });
    await updateUserRecord(userRecord);

    // DM the recipient
    try {
      const { embed, files } = foxbankembedTemplate({
        title: "You Received a Home!",
        description:
          `> ${ARROW} **A Fox Bank staff member has gifted you a home.**\n\n` +
          `> ${ARROW} **Home:** ${area} #${homeId}\n` +
          `> ${ARROW} **Value:** $${price.toLocaleString()}\n\n` +
          `> ${ARROW} View your home using **/fox-viewaccount**.`,
      });
      await target.send({ embeds: [embed], files });
    } catch {
      // Ignore if DMs closed
    }

    // Staff confirmation
    const { embed, files } = foxbankembedTemplate({
      title: "Home Gifted",
      description:
        `> ${ARROW} **Home:** ${area} #${homeId}\n` +
        `> ${ARROW} **Recipient:** ${target.tag}\n` +
        `> ${ARROW} Successfully gifted.\n\n` +
        `> ${ARROW} The user has been notified via DM (if enabled).`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
