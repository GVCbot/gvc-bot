const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-viewaccount")
    .setDescription("View your Fox Bank account"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Account Required",
        description:
          `> ${ARROW} You do not have a Fox Bank account yet.\n` +
          `> ${ARROW} Use **/fox-accountcreate** to open one.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.foxBank;
    const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);
    const cardStatus = acct.cardStatus || "Active";

    // ⭐ Membership
    const membership = acct.membership || "None";

    // ⭐ Owned homes display
    let homesText = "";
    const lakevilleHomes = userRecord.homes?.lakeville || [];
    const sixhousentHomes = userRecord.homes?.sixhousent || [];

    if (lakevilleHomes.length === 0 && sixhousentHomes.length === 0) {
      homesText += `> ${ARROW} **Owned Homes:** None\n\n`;
    } else {
      homesText += `> ${ARROW} **Owned Homes:**\n`;
      for (const home of lakevilleHomes) {
        homesText += `> ${ARROW} Lakeville Home #${home.homeId} — $${home.price.toLocaleString()}\n`;
      }
      for (const home of sixhousentHomes) {
        homesText += `> ${ARROW} Sixhousent Home #${home.homeId} — $${home.price.toLocaleString()}\n`;
      }
      homesText += `\n`;
    }

    // ⭐ Final embed
    const { embed, files } = foxbankembedTemplate({
      title: "Your Fox Bank Account",
      description:
        `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
        `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
        `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
        `> ${ARROW} **Card Status:** ${cardStatus}\n\n` +
        `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
        `> ${ARROW} **Membership:** ${membership}\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        homesText,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
