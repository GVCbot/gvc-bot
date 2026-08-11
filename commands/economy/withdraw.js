const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw money from one of your banks.")
    .addStringOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount to withdraw or 'all'")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const amountInput = interaction.options
      .getString("amount")
      .trim()
      .toLowerCase();
    const userRecord = await getUserRecord(interaction.user.id);

    const banks = userRecord.banks ?? [];

    if (banks.length === 0) {
      const { embed, files } = embedTemplate({
        title: "❌ No Banks Found",
        description: "> You are not in any banks.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Ask which bank to withdraw from
    const options = banks.map((b) => ({
      label: `${b.type} (${b.id})`,
      description: `Balance: $${b.balance}`,
      value: `${b.id}|${amountInput}`,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`withdraw_select_${interaction.user.id}`)
        .setPlaceholder("Choose a bank to withdraw from")
        .addOptions(options),
    );

    const { embed, files } = embedTemplate({
      title: "🏦 Select a Bank",
      description: "> Choose which bank you want to withdraw from.",
      noLogo: true,
    });

    return interaction.editReply({
      embeds: [embed],
      files,
      components: [row],
    });
  },
};
