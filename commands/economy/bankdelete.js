const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankdelete")
    .setDescription("Delete one of your banks.")
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const password = protect.sanitize(
      interaction.options.getString("password"),
    );

    const record = await getUserRecord(userId);
    if (!record.banks) record.banks = [];

    const bank = record.banks.find((b) => b.password === password);

    if (!bank) {
      const { embed, files } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> No bank matches that password.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    if (bank.owner !== userId) {
      const { embed, files } = embedTemplate({
        title: "❌ Permission Denied",
        description: "> Only the **bank owner** can delete this bank.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    record.banks = record.banks.filter((b) => b.id !== bank.id);
    await updateUserRecord(record);

    const { embed, files } = embedTemplate({
      title: "🗑️ Bank Deleted",
      description: "> Your bank has been deleted successfully.",
      noLogo: true,
    });

    return interaction.reply({ embeds: [embed], files, ephemeral: true });
  },
};
