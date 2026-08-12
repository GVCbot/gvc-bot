const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { loadEconomy, loadRoleIncome } = require("../../economy/economyutils");

async function loadAllBanksForUser(userRecord, allRecords) {
  const owned = userRecord.banks || [];
  const joinedIds = userRecord.joinedBanks || [];
  const joined = [];

  for (const bankId of joinedIds) {
    for (const rec of allRecords) {
      const bank = (rec.banks || []).find((b) => b.id === bankId);
      if (bank) {
        joined.push(bank);
        break;
      }
    }
  }

  return [...owned, ...joined];
}

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
    const getTotal = async (u) => {
      const cash = u.cash ?? 0;
      const allBanks = await loadAllBanksForUser(u, economy);
      const bankTotal = allBanks.reduce((sum, b) => sum + (b.balance ?? 0), 0);
      return cash + bankTotal;
    };

    // Total money in circulation
    let totalMoney = 0;
    for (const u of economy) totalMoney += await getTotal(u);

    // Average net worth
    const avgBalance = Math.round(totalMoney / economy.length);

    // Richest user
    let richest = economy[0];
    for (const u of economy) {
      if ((await getTotal(u)) > (await getTotal(richest))) richest = u;
    }
    const richestMember = interaction.guild.members.cache.get(richest.userId);

    // Poorest user
    let poorest = economy[0];
    for (const u of economy) {
      if ((await getTotal(u)) < (await getTotal(poorest))) poorest = u;
    }
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
    const totals = [];
    for (const u of economy) {
      totals.push({ user: u, total: await getTotal(u) });
    }

    const topFive = totals.sort((a, b) => b.total - a.total).slice(0, 5);

    let topFiveText = "";
    for (const entry of topFive) {
      const u = entry.user;
      const member = interaction.guild.members.cache.get(u.userId);
      const name = member ? member.user.username : `Unknown (${u.userId})`;

      const cash = u.cash ?? 0;
      const allBanks = await loadAllBanksForUser(u, economy);
      const bankTotal = allBanks.reduce((sum, b) => sum + (b.balance ?? 0), 0);

      topFiveText += `> • **${name}** — $${entry.total.toLocaleString()} `;
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
    } — $${(await getTotal(richest)).toLocaleString()}\n`;

    desc += `> <:bulletpoint:1534184707900837961> **Poorest User:** ${
      poorestMember
        ? poorestMember.user.username
        : `Unknown (${poorest.userId})`
    } — $${(await getTotal(poorest)).toLocaleString()}\n\n`;

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
