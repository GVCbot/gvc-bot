const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

async function loadAllBanks(userRecord) {
  const owned = userRecord.banks || [];
  const joinedIds = userRecord.joinedBanks || [];
  const joined = [];

  for (const bankId of joinedIds) {
    const ownerId = bankId.split("_")[1];
    const ownerRecord = await getUserRecord(ownerId);
    if (!ownerRecord.banks) continue;
    const bank = ownerRecord.banks.find((b) => b.id === bankId);
    if (bank) joined.push(bank);
  }

  return [...owned, ...joined];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deposit")
    .setDescription("Deposit money into one of your banks.")
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
        .setCustomId(`deposit_select_${interaction.user.id}`)
        .setPlaceholder("Choose a bank to deposit into")
        .addOptions(options),
    );

    const { embed } = embedTemplate({
      title: "🏦 Select a Bank",
      description:
        "> Choose which bank you want to deposit into.\n> Co‑owners can deposit into shared banks.",
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
