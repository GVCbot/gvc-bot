const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

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
    .setName("withdraw")
    .setDescription("Withdraw money from one of your banks.")
    .addStringOption((opt) =>
      opt.setName("amount").setDescription("Amount or 'all'").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const amountInput = interaction.options
      .getString("amount")
      .trim()
      .toLowerCase();
    const userRecord = await getUserRecord(interaction.user.id);
    const banks = await loadAllBanks(userRecord);

    if (banks.length === 0) {
      const { embed } = embedTemplate({
        title: "❌ No Banks Found",
        description: "> You are not in any banks.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const options = banks.map((b) => ({
      label: `${b.name}`,
      description: `Balance: $${b.balance.toLocaleString()}`,
      value: `${b.id}|${amountInput}`,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`withdraw_select_${interaction.user.id}`)
        .setPlaceholder("Choose a bank to withdraw from")
        .addOptions(options),
    );

    const { embed } = embedTemplate({
      title: "🏦 Select a Bank",
      description:
        "> Choose which bank you want to withdraw from.\n> Co‑owners can withdraw from shared banks.",
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
