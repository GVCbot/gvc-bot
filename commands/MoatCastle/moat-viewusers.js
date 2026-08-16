const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW, MOATCASTLE } = MOATEMOJIS;

const { getAllUserRecords } = require("../../economy/economyutils");

const MOAT_STAFF_ROLE = "1537722114176581724";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-viewusers")
    .setDescription(
      "View all users who own a Moat Castle account (Staff Only).",
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Staff-only check
    if (!interaction.member.roles.cache.has(MOAT_STAFF_ROLE)) {
      const { embed, files } = moatembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only **Moat Castle Staff** can use this command.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const allUsers = await getAllUserRecords();

    // Filter users with Moat Castle accounts
    const moatUsers = allUsers.filter((u) => u.moatCastle);

    if (moatUsers.length === 0) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Accounts",
        description: `${ARROW} No users currently own a Moat Castle account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Build list
    const lines = moatUsers.map((u) => {
      const accountId = u.moatCastle.accountId || "Unknown";
      const tier = u.moatCastle.tier || "Standard";
      const balance = u.moatCastle.balance?.toLocaleString() || "0";

      return (
        `${ARROW} <@${u.userId}> — **${accountId}**\n` +
        `${ARROW} Tier: **${tier}** | Balance: **$${balance}**\n`
      );
    });

    const description = lines.join("\n");

    const { embed, files } = moatembedTemplate({
      title: "Moat Castle Account Holders",
      description: `${MOATCASTLE} **All Moat Castle Users** ${MOATCASTLE}\n\n${description}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
