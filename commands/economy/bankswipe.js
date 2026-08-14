const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { getDB } = require("../../economy/economyutils");
const embedTemplate = require("../../utils/embedTemplate");

const HR_ROLE_ID = "1350582607217430650"; // ✅ Only HR can use this

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankswipe")
    .setDescription("⚠️ Delete all GVC banks from the economy database.")
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // ✅ HR role check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      const { embed } = embedTemplate({
        title: "🚫 Access Denied",
        description:
          "> You must be part of **HR** to use this command.\n" +
          "> Contact a system administrator if you believe this is an error.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    try {
      const db = await getDB();
      const collection = db.collection("banks");

      const result = await collection.deleteMany({});
      const { embed } = embedTemplate({
        title: "🧹 GVC Bank Wipe Complete",
        description:
          `> All **GVC banks** have been deleted from the database.\n` +
          `> **Total Removed:** ${result.deletedCount}`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("❌ Bank wipe failed:", err);
      const { embed } = embedTemplate({
        title: "❌ Error",
        description: "> Failed to delete banks. Check console for details.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }
  },
};
