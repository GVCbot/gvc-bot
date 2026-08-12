const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getAllUserRecords } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";
const HR_ROLE_ID = "1350582607217430650";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrviewbank")
    .setDescription("HR ONLY — View global bank statistics."),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // HR check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      const { embed } = embedTemplate({
        title: "❌ Access Denied",
        description: "> Only **HR** can use this command.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const allRecords = await getAllUserRecords();

    // Collect all banks from all users
    const allBanks = [];
    for (const rec of allRecords) {
      for (const bank of rec.banks || []) {
        allBanks.push({
          ...bank,
          owner: rec.userId,
        });
      }
    }

    if (allBanks.length === 0) {
      const { embed } = embedTemplate({
        title: "🏦 No Banks Found",
        description: "> There are currently **no banks** in the system.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Total banks
    const totalBanks = allBanks.length;

    // Richest bank
    const richestBank = allBanks.reduce((a, b) =>
      (a.balance ?? 0) > (b.balance ?? 0) ? a : b,
    );

    // Poorest bank
    const poorestBank = allBanks.reduce((a, b) =>
      (a.balance ?? 0) < (b.balance ?? 0) ? a : b,
    );

    // Biggest bank (most members)
    const biggestBank = allBanks.reduce((a, b) =>
      (a.members?.length ?? 0) > (b.members?.length ?? 0) ? a : b,
    );

    // Count by type
    const foxBanks = allBanks.filter((b) => b.type === "Fox Bank").length;
    const moatBanks = allBanks.filter((b) => b.type === "Moat Castle").length;

    const { embed } = embedTemplate({
      title: `${SUN} HR Bank Audit ${SUN}`,
      description:
        `> ${ARROW} **Total Banks:** ${totalBanks}\n` +
        `> ${ARROW} **Fox Banks:** ${foxBanks}\n` +
        `> ${ARROW} **Moat Castle Banks:** ${moatBanks}\n\n` +
        `> ${ARROW} **Richest Bank:** ${richestBank.name} — $${richestBank.balance.toLocaleString()} (Owner: <@${richestBank.owner}>)\n` +
        `> ${ARROW} **Poorest Bank:** ${poorestBank.name} — $${poorestBank.balance.toLocaleString()} (Owner: <@${poorestBank.owner}>)\n` +
        `> ${ARROW} **Biggest Bank:** ${biggestBank.name} — ${biggestBank.members.length} members (Owner: <@${biggestBank.owner}>)`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
