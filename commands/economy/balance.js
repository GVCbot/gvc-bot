const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

async function loadAllBanks(userRecord) {
  const owned = userRecord.banks || [];
  const joinedIds = userRecord.joinedBanks || [];
  const joined = [];

  if (joinedIds.length > 0) {
    const allRecords = await getAllUserRecords();
    for (const bankId of joinedIds) {
      for (const rec of allRecords) {
        const bank = (rec.banks || []).find((b) => b.id === bankId);
        if (bank) {
          joined.push(bank);
          break; // Found the bank on this owner's record
        }
      }
    }
  }

  return { owned, joined };
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your cash and bank accounts."),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord) {
      const { embed } = embedTemplate({
        title: "❌ No Profile Found",
        description: "> You do not have an economy profile yet.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const cash = userRecord.cash ?? 0;
    const { owned, joined } = await loadAllBanks(userRecord);

    let desc = `${ARROW} **Cash:** $${cash.toLocaleString()}\n\n`;

    desc += `${ARROW} **Owned Banks:** ${owned.length}\n`;
    if (owned.length === 0) {
      desc += "> • None\n\n";
    } else {
      for (const b of owned) {
        const sharedBalance = b.balance ?? 0;
        desc += `> • **${b.name}** — $${sharedBalance.toLocaleString()}\n`;
      }
      desc += "\n";
    }

    desc += `${ARROW} **Co‑Owned Banks:** ${joined.length}\n`;
    if (joined.length === 0) {
      desc += "> • None\n";
    } else {
      for (const b of joined) {
        // Fallback to 0 if b.balance is undefined or null
        const sharedBalance = b.balance ?? 0;
        desc += `> • **${b.name}** — $${sharedBalance.toLocaleString()}\n`;
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} Your Balance ${SUN}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
