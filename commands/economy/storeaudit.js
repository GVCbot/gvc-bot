const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getAllUserRecords } = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("storeaudit")
    .setDescription("HR ONLY — View all users with active insurance plans."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    // HR check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.editReply("❌ Only HR can use this command.");
    }

    const allRecords = await getAllUserRecords();
    const guild = interaction.guild;

    let basicList = [];
    let allList = [];

    for (const userRecord of allRecords) {
      if (!userRecord.store) continue;

      const member = guild.members.cache.get(userRecord.userId);
      const username = member
        ? member.user.username
        : `Unknown (${userRecord.userId})`;

      // BASIC INSURANCE
      if (userRecord.store.basicInsured?.active) {
        const nextPay = userRecord.store.basicInsured.nextPayment;
        const cash = userRecord.cash ?? 0;

        basicList.push({
          username,
          userId: userRecord.userId,
          nextPayment: nextPay,
          cash,
          risk: cash < 600,
        });
      }

      // ALL INSURANCE
      if (userRecord.store.allInsured?.active) {
        const nextPay = userRecord.store.allInsured.nextPayment;
        const cash = userRecord.cash ?? 0;

        allList.push({
          username,
          userId: userRecord.userId,
          nextPayment: nextPay,
          cash,
          risk: cash < 1000,
        });
      }
    }

    let desc = "";

    // BASIC INSURANCE SECTION
    desc += `### 🔵 Fox Basic Insured\n`;
    if (basicList.length === 0) {
      desc += "> No users currently have Basic Insurance.\n\n";
    } else {
      for (const u of basicList) {
        desc +=
          `> ${ARROW} **${u.username}** (<@${u.userId}>)\n` +
          `> • Next Payment: <t:${Math.floor(u.nextPayment / 1000)}:F>\n` +
          `> • Cash: $${u.cash.toLocaleString()}\n` +
          `> • Status: ${u.risk ? "⚠️ At Risk" : "✅ Stable"}\n\n`;
      }
    }

    // ALL INSURANCE SECTION
    desc += `### 🟣 Fox All Insured\n`;
    if (allList.length === 0) {
      desc += "> No users currently have All Insurance.\n\n";
    } else {
      for (const u of allList) {
        desc +=
          `> ${ARROW} **${u.username}** (<@${u.userId}>)\n` +
          `> • Next Payment: <t:${Math.floor(u.nextPayment / 1000)}:F>\n` +
          `> • Cash: $${u.cash.toLocaleString()}\n` +
          `> • Status: ${u.risk ? "⚠️ At Risk" : "✅ Stable"}\n\n`;
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} Store Audit — Active Insurance Plans ${SUN}`,
      description: desc,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
