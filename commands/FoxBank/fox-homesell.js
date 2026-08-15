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
    .setDescription("Sell your home for 75% refund."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Required",
        description: `> ${ARROW} You must have a **Fox Bank account** to sell your home.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const home = userRecord.homes.lakeville || userRecord.homes.sixhousnet;

    if (!home) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Home Owned",
        description: `> ${ARROW} You do not own a home.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const refund = Math.floor(home.price * 0.75);

    userRecord.foxBank.balance += refund;

    if (userRecord.homes.lakeville) userRecord.homes.lakeville = null;
    if (userRecord.homes.sixhousnet) userRecord.homes.sixhousnet = null;

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Home Sold",
      description:
        `> ${ARROW} **Refund:** $${refund.toLocaleString()}\n` +
        `> ${ARROW} **New Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
