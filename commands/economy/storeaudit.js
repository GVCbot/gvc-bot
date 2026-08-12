const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getAllUserRecords } = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("storeaudit")
    .setDescription("HR ONLY — View all store insurance purchases."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.editReply("❌ Only HR can use this command.");
    }

    const allRecords = await getAllUserRecords();
    const guild = interaction.guild;

    let transactions = [];

    for (const userRecord of allRecords) {
      if (!userRecord.store) continue;

      const member = guild.members.cache.get(userRecord.userId);
      const username = member
        ? member.user.username
        : `Unknown (${userRecord.userId})`;

      const store = userRecord.store;

      if (store.fox_basic?.active) {
        transactions.push({
          username,
          userId: userRecord.userId,
          type: "Fox Basic Insured",
          nextPayment: store.fox_basic.nextPayment,
        });
      }

      if (store.fox_all?.active) {
        transactions.push({
          username,
          userId: userRecord.userId,
          type: "Fox All Insured",
          nextPayment: store.fox_all.nextPayment,
        });
      }

      if (store.moat_basic?.active) {
        transactions.push({
          username,
          userId: userRecord.userId,
          type: "Moat Castle Basic Insured",
          nextPayment: store.moat_basic.nextPayment,
        });
      }

      if (store.moat_all?.active) {
        transactions.push({
          username,
          userId: userRecord.userId,
          type: "Moat Castle All Insured",
          nextPayment: store.moat_all.nextPayment,
        });
      }
    }

    let desc = "";

    if (transactions.length === 0) {
      desc = "> No active store transactions found.";
    } else {
      for (const t of transactions) {
        desc +=
          `> ${ARROW} **${t.username}** (<@${t.userId}>)\n` +
          `> • Purchased: **${t.type}**\n` +
          `> • Next Payment: <t:${Math.floor(t.nextPayment / 1000)}:F>\n\n`;
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} Store Audit — All Insurance Purchases ${SUN}`,
      description: desc,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
