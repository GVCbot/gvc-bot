const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { loadEconomy, loadRoleIncome } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("economyinfo")
    .setDescription("View statistics about the server economy."),

  async execute(interaction) {
    await interaction.deferReply();

    const economy = await loadEconomy();
    const roleIncome = await loadRoleIncome();

    if (!economy.length) {
      const { embed } = embedTemplate({
        title:
          "<a:gvcsunspin:1527220557890850846> Economy Statistics <a:gvcsunspin:1527220557890850846>",
        description:
          "> <:bulletpoint:1534184707900837961> No economy data found.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Helper: total net worth = cash + all bank balances
    const getTotal = (u) => {
      const cash = u.cash ?? 0;
      const banks = u.banks ?? [];
      const bankTotal = banks.reduce((sum, b) => sum + (b.balance ?? 0), 0);
      return cash + bankTotal;
    };

    // Total money in circulation
    const totalMoney = economy.reduce((sum, u) => sum + getTotal(u), 0);

    // Average net worth
    const avgBalance = Math.round(totalMoney / economy.length);

    // Richest user
    const richest = economy.reduce(
      (max, u) => (getTotal(u) > getTotal(max) ? u : max),
      economy[0],
    );
    const richestMember = interaction.guild.members.cache.get(richest.userId);

    // Poorest user
    const poorest = economy.reduce(
      (min, u) => (getTotal(u) < getTotal(min) ? u : min),
      economy[0],
    );
    const poorestMember = interaction.guild.members.cache.get(poorest.userId);

    // Role income stats
    const roleEntries = Object.entries(roleIncome || {});
    let highestRoleText = "None";
    let lowestRoleText = "None";

    if (roleEntries.length > 0) {
      const highestIncome = roleEntries.reduce(
        (max, r) => (r[1] > max[1] ? r : max),
        roleEntries[0],
      );
      const lowestIncome = roleEntries.reduce(
        (min, r) => (r[1] < min[1] ? r : min),
        roleEntries[0],
      );

      const highestRole = interaction.guild.roles.cache.get(highestIncome[0]);
      const lowestRole = interaction.guild.roles.cache.get(lowestIncome[0]);

      highestRoleText = `${highestRole ? highestRole.name : highestIncome[0]} — $${highestIncome[1].toLocaleString()}`;
      lowestRoleText = `${lowestRole ? lowestRole.name : lowestIncome[0]} — $${lowestIncome[1].toLocaleString()}`;
    }

    // Top 5 richest users
    const topFive = [...economy]
      .sort((a, b) => getTotal(b) - getTotal(a))
      .slice(0, 5);

    let topFiveText = "";
    for (const u of topFive) {
      const member = interaction.guild.members.cache.get(u.userId);
      const name = member ? member.user.username : `Unknown (${u.userId})`;

      const cash = u.cash ?? 0;
      const banks = u.banks ?? [];
      const bankTotal = banks.reduce((sum, b) => sum + (b.balance ?? 0), 0);

      topFiveText += `> • **${name}** — $${(cash + bankTotal).toLocaleString()} `;
      topFiveText += `(*$${cash.toLocaleString()} Cash | $${bankTotal.toLocaleString()} Bank*)\n`;
    }

    // Build description
    let desc = "";

    desc += `> <:bulletpoint:1534184707900837961> **Total Money in Circulation:** $${totalMoney.toLocaleString()}\n`;
    desc += `> <:bulletpoint:1534184707900837961> **Registered Users:** ${economy.length}\n`;
    desc += `> <:bulletpoint:1534184707900837961> **Average Net Worth:** $${avgBalance.toLocaleString()}\n\n`;

    desc += `> <:bulletpoint:1534184707900837961> **Richest User:** ${
      richestMember
        ? richestMember.user.username
        : `Unknown (${richest.userId})`
    } — $${getTotal(richest).toLocaleString()}\n`;

    desc += `> <:bulletpoint:1534184707900837961> **Poorest User:** ${
      poorestMember
        ? poorestMember.user.username
        : `Unknown (${poorest.userId})`
    } — $${getTotal(poorest).toLocaleString()}\n\n`;

    desc += `> <:bulletpoint:1534184707900837961> **Highest Role Income:** ${highestRoleText}\n`;
    desc += `> <:bulletpoint:1534184707900837961> **Lowest Role Income:** ${lowestRoleText}\n\n`;

    desc += `> <:bulletpoint:1534184707900837961> **Top 5 Richest Users:**\n${topFiveText}`;

    const { embed } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Economy Statistics <a:gvcsunspin:1527220557890850846>",
      description: desc,
    });

    embed.setThumbnail(interaction.guild.iconURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });
  },
};
