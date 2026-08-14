const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { GVCEMOJIS } = require("../../utils/embedTemplate");
const { getAllUserRecords } = require("../../economy/economyutils");

const { GVCARROW, SUN } = GVCEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrviewallaccounts")
    .setDescription("HR-only: View Fox Bank and Moat Castle statistics."),

  async execute(interaction) {
    const hrRole = "1350582607217430650";

    // HR-only check
    if (!interaction.member.roles.cache.has(hrRole)) {
      return interaction.reply({
        content: "❌ Only HR staff can use this command.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const users = await getAllUserRecords();

    let moatCount = 0;
    let foxCount = 0;
    let bothCount = 0;
    let totalMoatBalance = 0;
    let totalFoxBalance = 0;

    for (const user of users) {
      const hasMoat = !!user.moatCastle;
      const hasFox = !!user.foxBank;

      if (hasMoat) moatCount++;
      if (hasFox) foxCount++;
      if (hasMoat && hasFox) bothCount++;

      if (hasMoat) totalMoatBalance += user.moatCastle.balance || 0;
      if (hasFox) totalFoxBalance += user.foxBank.balance || 0;
    }

    const { embed, files } = embedTemplate({
      title: "Global Banking Statistics",
      description:
        `${GVCARROW} **🏰 Moat Castle Accounts:** ${moatCount}\n` +
        `${GVCARROW} **🦊 Fox Bank Accounts:** ${foxCount}\n` +
        `${GVCARROW} **🔗 Users with Both:** ${bothCount}\n\n` +
        `${GVCARROW} **🏰 Total Moat Castle Money:** $${totalMoatBalance.toLocaleString()}\n` +
        `${GVCARROW} **🦊 Total Fox Bank Money:** $${totalFoxBalance.toLocaleString()}`,
      noLogo: false,
    });

    embed.setTitle(`${SUN} Global Banking Statistics ${SUN}`);
    embed.setFooter({ text: "Greenville Community • HR Division" });
    embed.setTimestamp();

    return interaction.editReply({ embeds: [embed], files });
  },
};
