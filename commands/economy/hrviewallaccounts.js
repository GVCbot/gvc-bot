const { SlashCommandBuilder } = require("discord.js");
const { getAllUserRecords } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrviewallaccounts")
    .setDescription("HR-only: View global banking statistics."),

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
    let neitherCount = 0;

    let totalCash = 0;
    let totalMoatBalance = 0;
    let totalFoxBalance = 0;

    for (const user of users) {
      const hasMoat = !!user.moatCastle;
      const hasFox = !!user.foxBank;

      if (hasMoat) moatCount++;
      if (hasFox) foxCount++;
      if (hasMoat && hasFox) bothCount++;
      if (!hasMoat && !hasFox) neitherCount++;

      totalCash += user.cash || 0;

      if (hasMoat) totalMoatBalance += user.moatCastle.balance || 0;
      if (hasFox) totalFoxBalance += user.foxBank.balance || 0;
    }

    const totalUsers = users.length;

    const embed = {
      color: 0x00aaff,
      title: "📊 Global Banking Statistics",
      description:
        `**Total Users:** ${totalUsers}\n\n` +
        `**🏰 Moat Castle Accounts:** ${moatCount}\n` +
        `**🦊 Fox Bank Accounts:** ${foxCount}\n` +
        `**🔗 Users with Both:** ${bothCount}\n` +
        `**🚫 Users with Neither:** ${neitherCount}\n\n` +
        `**💵 Total Cash in Circulation:** $${totalCash.toLocaleString()}\n` +
        `**🏰 Total Moat Castle Balance:** $${totalMoatBalance.toLocaleString()}\n` +
        `**🦊 Total Fox Bank Balance:** $${totalFoxBalance.toLocaleString()}`,
    };

    return interaction.editReply({ embeds: [embed] });
  },
};
