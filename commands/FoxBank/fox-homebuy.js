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

// ⭐ Membership-based home discount system
function getHomeDiscountPercent(membership) {
  switch ((membership || "").toLowerCase()) {
    case "benefits":
      return 0.03;
    case "gold":
      return 0.06;
    case "platinum":
      return 0.1;
    case "diamond":
      return 0.15;
    case "express":
      return 0.2;
    default:
      return 0.0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-homebuy")
    .setDescription("Buy a home from any Fox Bank area.")
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

    const area = interaction.options.getString("area");
    const homeId = interaction.options.getInteger("homeid");

    if (!["lakeville", "sixhousent"].includes(area)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Load correct price table
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

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Required",
        description:
          `> ${ARROW} You must have a **Fox Bank account** to buy a home.\n` +
          `> ${ARROW} Use **/fox-accountcreate** to open one.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Ensure balance is numeric
    if (typeof userRecord.foxBank.balance !== "number") {
      userRecord.foxBank.balance = 0;
    }

    // Ensure homes structure exists
    if (!userRecord.homes) {
      userRecord.homes = {
        lakeville: [],
        sixhousent: [],
      };
    }

    if (!Array.isArray(userRecord.homes[area])) {
      userRecord.homes[area] = [];
    }

    // Check if home is already owned by ANY user
    const allUsers = await getAllUserRecords();
    for (const u of allUsers) {
      const homes = u.homes?.[area] || [];
      if (homes.some((h) => h.homeId === homeId)) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Already Owned",
          description: `> ${ARROW} Home **${homeId}** is already owned.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    // ⭐ Apply membership discount
    const membership =
      userRecord.foxBank.membership?.toLowerCase() || "benefits";
    const discountPercent = getHomeDiscountPercent(membership);
    const discountAmount = Math.floor(price * discountPercent);
    const finalPrice = price - discountAmount;

    if (userRecord.foxBank.balance < finalPrice) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} You need **$${finalPrice.toLocaleString()}** to buy this home.\n` +
          `> ${ARROW} Your Fox Bank balance: **$${userRecord.foxBank.balance.toLocaleString()}**`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct balance
    userRecord.foxBank.balance -= finalPrice;

    // Add home to array
    userRecord.homes[area].push({ homeId, price });

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Home Purchased",
      description:
        `> ${ARROW} **Home:** ${area} #${homeId}\n` +
        `> ${ARROW} **Original Price:** $${price.toLocaleString()}\n` +
        `> ${ARROW} **Discount:** $${discountAmount.toLocaleString()}\n` +
        `> ${ARROW} **Final Price Paid:** $${finalPrice.toLocaleString()}\n\n` +
        `> ${ARROW} **New Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
