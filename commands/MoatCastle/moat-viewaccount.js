const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord, updateUserRecord } = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewaccount")
    .setDescription("View your Moat Castle account"),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // If no Moat Castle account exists
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Account Required",
        description:
          `> ${ARROW} You do not have a Moat Castle account yet.\n` +
          `> ${ARROW} Use **/moat-accountcreate name:** to open one.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    const acct = userRecord.moatCastle;
    const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);

    const cardStatus = acct.cardStatus || "Active";
    const balance = acct.balance || 0;
    const points = acct.rewards || 0;
    const tier = acct.tier;

    // -----------------------------------------
    // ELITE STATUS CHECK (5000 points)
    // -----------------------------------------
    let eliteStatus = false;
    let eliteBonusText = "";

    if (points >= 5000) {
      eliteStatus = true;

      const now = Date.now();
      const lastBonus = acct.lastEliteBonus || 0;
      const twoHours = 2 * 60 * 60 * 1000;

      if (now - lastBonus >= twoHours) {
        // Give bonus
        userRecord.cash = (userRecord.cash || 0) + 100;

        // Update timestamp
        acct.lastEliteBonus = now;

        eliteBonusText =
          `\n\n**💛 Elite Bonus Applied**\n` +
          `> ${ARROW} You received **+$100 cash** for being an Elite Member.`;
      }
    }

    // Save updates (if bonus applied)
    await updateUserRecord(userRecord);

    // -----------------------------------------
    // BUILD EMBED
    // -----------------------------------------
    const { embed, files } = moatembedTemplate({
      title: eliteStatus ? "🌟 Your Moat Castle Elite Profile" : "Your Moat Castle Account",
      description:
        `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
        `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
        `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
        `> ${ARROW} **Card Status:** ${cardStatus}\n\n` +
        `> ${ARROW} **Balance:** $${balance.toLocaleString()}\n` +
        `> ${ARROW} **Tier:** ${tier}\n` +
        `> ${ARROW} **Rewards:** ${points.toLocaleString()} / 5000\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +

        (eliteStatus
          ? `**🌟 Elite Status Unlocked**\n` +
            `> ${ARROW} You have reached **maximum Moat Points**.\n` +
            `> ${ARROW} Your profile has been upgraded.\n` +
            `> ${ARROW} You now earn **$100 every 2 hours**.\n` +
            eliteBonusText
          : "")
      ,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
