const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW, MOATCASTLE } = MOATEMOJIS;

const { getUserRecord } = require("../../economy/economyutils");

const MOAT_BANK_STAFF = ["1538539425540079658"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewofficialbank")
    .setDescription(
      "View the official Moat Castle & Credit Union bank balance (Staff Only).",
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Staff-only check
    if (!MOAT_BANK_STAFF.some((r) => interaction.member.roles.cache.has(r))) {
      const { embed, files } = moatembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only authorized Moat Castle staff can view the official bank.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const bankRecord = await getUserRecord("MOAT_OFFICIAL_BANK");

    const balance = bankRecord.moatCastleOfficialBank.balance || 0;
    const updated = Math.floor(
      (bankRecord.moatCastleOfficialBank.lastUpdated || Date.now()) / 1000,
    );

    const { embed, files } = moatembedTemplate({
      title: "Official Moat Castle Bank",
      description:
        `${MOATCASTLE} **Moat Castle & Credit Union Official Bank** ${MOATCASTLE}\n\n` +
        `${ARROW} **Balance:** $${balance.toLocaleString()}\n` +
        `${ARROW} **Last Updated:** <t:${updated}:F>`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
