const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { loadEconomy } = require("../../economy/economyutils");

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

    // Build sorted list
    const sorted = [];
    for (const u of economy) {
      const allBanks = await loadAllBanksForUser(u, economy);
      const bankTotal = allBanks.reduce((sum, b) => sum + (b.balance ?? 0), 0);
      const cash = u.cash ?? 0;

      const val = isBank ? bankTotal : cash;
      sorted.push({ user: u, val });
    }

    sorted.sort((a, b) => b.val - a.val);

    // Top 10
    const top = sorted.slice(0, 10);

    let desc = "";

    top.forEach((entry, index) => {
      const u = entry.user;
      const member = interaction.guild.members.cache.get(u.userId);
      const name = member ? member.user.username : `Unknown User (${u.userId})`;

      desc += `> <:bulletpoint:1534184707900837961> **#${index + 1}** — ${name}: $${entry.val.toLocaleString()}\n`;
    });

    // Personal rank
    const yourRank =
      sorted.findIndex((entry) => entry.user.userId === interaction.user.id) +
      1;

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
