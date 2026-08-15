const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-homesell")
    .setDescription("Sell one of your homes for a 75% refund.")
    .addStringOption((opt) =>
      opt
        .setName("area")
        .setDescription("lakeville or sixhousent")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("homeid").setDescription("Home ID to sell").setRequired(true),
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

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Required",
        description: `> ${ARROW} You must have a **Fox Bank account** to sell your home.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const homes = userRecord.homes?.[area] || [];

    if (!Array.isArray(homes) || homes.length === 0) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Homes Owned",
        description: `> ${ARROW} You do not own any homes in **${area}**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const index = homes.findIndex((h) => h.homeId === homeId);

    if (index === -1) {
      const { embed, files } = foxbankembedTemplate({
        title: "Home Not Found",
        description: `> ${ARROW} You do not own **Home #${homeId}** in **${area}**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const home = homes[index];
    const refund = Math.floor((home.price || 0) * 0.75);

    userRecord.foxBank.balance += refund;
    homes.splice(index, 1);

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Home Sold",
      description:
        `> ${ARROW} **Area:** ${area}\n` +
        `> ${ARROW} **Home ID:** ${homeId}\n` +
        `> ${ARROW} **Refund:** $${refund.toLocaleString()}\n` +
        `> ${ARROW} **New Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
