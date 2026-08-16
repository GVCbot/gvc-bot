const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const BUSINESS_OWNER_ROLE = "1470101925662953704";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-deletebusiness")
    .setDescription("Delete your Moat Castle business"),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const record = await getUserRecord(interaction.user.id);

    if (!record.moatCastle || !record.moatCastle.business) {
      return interaction.editReply({ content: "❌ You don't own a business." });
    }

    const businessName = record.moatCastle.business.name;
    record.moatCastle.business = null;
    await updateUserRecord(record);

    try {
      const member = await interaction.guild.members.fetch(interaction.user.id);
      await member.roles.remove(BUSINESS_OWNER_ROLE);
    } catch (err) {
      console.error("❌ Failed to remove business owner role:", err);
    }

    return interaction.editReply({
      content: `✅ Your business **${businessName}** has been deleted.`,
    });
  },
};
