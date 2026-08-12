const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

// Normalize bank types so old banks still work
function normalizeType(type) {
  if (!type) return type;
  const t = type.toLowerCase();

  if (t.includes("fox")) return "Fox Bank";
  if (t.includes("moat")) return "Moat Castle";

  return type;
}

// Unified Bank Loader (owned + joined)
async function loadAllBanks(userRecord) {
  const owned = (userRecord.banks || []).map((b) => ({
    ...b,
    type: normalizeType(b.type),
  }));

  const joinedIds = userRecord.joinedBanks || [];
  const joined = [];

  if (joinedIds.length > 0) {
    const allRecords = await getAllUserRecords();
    for (const bankId of joinedIds) {
      for (const rec of allRecords) {
        const bank = (rec.banks || []).find((b) => b.id === bankId);
        if (bank) {
          joined.push({
            ...bank,
            type: normalizeType(bank.type),
          });
          break;
        }
      }
    }
  }

  return [...owned, ...joined];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your balance or someone else's.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Optional: view another user's balance")
        .setRequired(false),
    ),

  async execute(interaction) {
    // ⭐ NOT EPHEMERAL ANYMORE
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser("user") || interaction.user;

    const userRecord = await getUserRecord(targetUser.id);

    if (!userRecord) {
      const { embed } = embedTemplate({
        title: "❌ No Profile Found",
        description: `> <@${targetUser.id}> does not have an economy profile yet.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const cash = userRecord.cash ?? 0;
    const { owned, joined } = await loadAllBanks(userRecord);

    let desc = `${ARROW} **Cash:** $${cash.toLocaleString()}\n\n`;

    // Owned banks
    desc += `${ARROW} **Owned Banks:** ${owned.length}\n`;
    if (owned.length === 0) {
      desc += "> • None\n\n";
    } else {
      for (const b of owned) {
        const bal = b.balance ?? 0;
        desc += `> • **${b.name}** — $${bal.toLocaleString()}\n`;
      }
      desc += "\n";
    }

    // Co-owned banks
    desc += `${ARROW} **Co‑Owned Banks:** ${joined.length}\n`;
    if (joined.length === 0) {
      desc += "> • None\n";
    } else {
      for (const b of joined) {
        const bal = b.balance ?? 0;
        desc += `> • **${b.name}** — $${bal.toLocaleString()}\n`;
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} Balance — ${targetUser.username} ${SUN}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
