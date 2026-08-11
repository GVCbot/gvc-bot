const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { loadEconomy } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View the top richest players.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Select which balance to rank by (Default: Cash)")
        .setRequired(false)
        .addChoices(
          { name: "Cash", value: "cash" },
          { name: "Bank", value: "bank" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const selectedType = interaction.options.getString("type") || "cash";
    const isBank = selectedType === "bank";
    const label = isBank ? "Bank" : "Cash";

    const economy = await loadEconomy();

    if (!economy.length) {
      const { embed } = embedTemplate({
        title: `<a:gvcsunspin:1527220557890850846> Economy Leaderboard (${label}) <a:gvcsunspin:1527220557890850846>`,
        description:
          "> <:bulletpoint:1524621721318195230> No economy data found.",
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Sort descending based on selected type
    const sorted = [...economy].sort((a, b) => {
      const valA = isBank
        ? a.banks
          ? a.banks.reduce((sum, b) => sum + (b.balance ?? 0), 0)
          : 0
        : (a.cash ?? 0);

      const valB = isBank
        ? b.banks
          ? b.banks.reduce((sum, b) => sum + (b.balance ?? 0), 0)
          : 0
        : (b.cash ?? 0);

      return valB - valA;
    });

    // Top 10
    const top = sorted.slice(0, 10);

    let desc = "";

    top.forEach((user, index) => {
      const member = interaction.guild.members.cache.get(user.userId);
      const name = member
        ? member.user.username
        : `Unknown User (${user.userId})`;
      const amount = isBank
        ? user.banks
          ? user.banks.reduce((sum, b) => sum + (b.balance ?? 0), 0)
          : 0
        : (user.cash ?? 0);

      desc += `> <:bulletpoint:1534184707900837961> **#${index + 1}** — ${name}: $${amount.toLocaleString()}\n`;
    });

    // Personal rank
    const yourRank =
      sorted.findIndex((u) => u.userId === interaction.user.id) + 1;

    desc += `\n> <:arrowright:1534182706836144158> **Your ${label} Rank:** #${yourRank > 0 ? yourRank : "N/A"}`;

    const { embed } = embedTemplate({
      title: `<a:gvcsunspin:1527220557890850846> Economy Leaderboard (${label}) <a:gvcsunspin:1527220557890850846>`,
      description: desc,
    });

    embed.setThumbnail(interaction.guild.iconURL({ dynamic: true }));

    await interaction.editReply({
      embeds: [embed],
    });
  },
};
