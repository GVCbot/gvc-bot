const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  getAllUserRecords,
  updateUserRecord,
  loadSixhousnetPrices,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-homebuysixhousnet")
    .setDescription("Buy a Sixhousnet home.")
    .addIntegerOption((opt) =>
      opt.setName("homeid").setDescription("Home ID").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const homeId = interaction.options.getInteger("homeid");
    const prices = await loadSixhousnetPrices();
    const price = prices[homeId];

    if (price === undefined) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Home ID",
        description: `> ${ARROW} Home ID **${homeId}** does not exist.`,
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

    if (userRecord.homes.sixhousnet) {
      const { embed, files } = foxbankembedTemplate({
        title: "Already Own Home",
        description: `> ${ARROW} You already own a **Sixhousnet home**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const allUsers = await getAllUserRecords();
    for (const u of allUsers) {
      if (u.homes?.sixhousnet?.homeId === homeId) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Already Owned",
          description: `> ${ARROW} Sixhousnet Home **${homeId}** is already owned.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    if (userRecord.foxBank.balance < price) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} You need **$${price.toLocaleString()}** to buy this home.\n` +
          `> ${ARROW} Your Fox Bank balance: **$${userRecord.foxBank.balance.toLocaleString()}**`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.foxBank.balance -= price;
    userRecord.homes.sixhousnet = { homeId, price };

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Home Purchased",
      description:
        `> ${ARROW} **Home:** Sixhousnet #${homeId}\n` +
        `> ${ARROW} **Price Paid:** $${price.toLocaleString()}\n` +
        `> ${ARROW} **New Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
