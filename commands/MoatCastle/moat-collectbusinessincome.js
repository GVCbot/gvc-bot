const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const MOAT_STAFF_ROLE = "1537722114176581724";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-collectbusinessincome")
    .setDescription(
      "[Staff] Manually run business income collection for all businesses",
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MOAT_STAFF_ROLE)) {
      return interaction.reply({
        content: "❌ Only Moat Castle staff can run manual income collection.",
        ephemeral: true,
      });
    }

    await interaction.deferReply({ ephemeral: true });

    const allUsers = await getAllUserRecords();
    let collectedCount = 0;
    let totalPaid = 0;

    for (const user of allUsers) {
      if (!user.moatCastle || !user.moatCastle.business) continue;

      const income = Number(user.moatCastle.business.income) || 0;
      if (income <= 0) continue;

      user.moatCastle.balance = (Number(user.moatCastle.balance) || 0) + income;
      user.moatCastle.business.lastIncomeCollected = Date.now();

      await updateUserRecord(user);

      collectedCount++;
      totalPaid += income;

      try {
        const owner = await interaction.client.users.fetch(user.userId);
        const { embed } = moatembedTemplate({
          title: "🏢 Business Income Collected",
          description: `> Your business **${user.moatCastle.business.name}** earned **$${income.toLocaleString()}**.`,
          noLogo: false,
        });
        await owner.send({ embeds: [embed] });
      } catch {}
    }

    return interaction.editReply({
      content: `✅ Collected income for **${collectedCount}** business(es). Total paid: $${totalPaid.toLocaleString()}.`,
    });
  },
};
