const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-card")
    .setDescription("Manage your Moat Castle card.")
    .addSubcommand((sub) =>
      sub.setName("freeze").setDescription("Freeze your Moat Castle card."),
    )
    .addSubcommand((sub) =>
      sub.setName("unfreeze").setDescription("Unfreeze your Moat Castle card."),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const userRecord = await getUserRecord(interaction.user.id);

    // Shared: no account
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description: "> You do not have a Moat Castle account.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🧊 FREEZE CARD
    // ===============================
    if (sub === "freeze") {
      userRecord.moatCastle.cardStatus = "Frozen";
      userRecord.moatCastle.updatedAt = Date.now();
      await updateUserRecord(userRecord);

      const { embed, files } = moatembedTemplate({
        title: "Card Frozen",
        description:
          `${ARROW} Your Moat Castle card is now **Frozen**.\n` +
          `${ARROW} You cannot use it for payments until you unfreeze it.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🔓 UNFREEZE CARD
    // ===============================
    if (sub === "unfreeze") {
      userRecord.moatCastle.cardStatus = "Active";
      userRecord.moatCastle.updatedAt = Date.now();
      await updateUserRecord(userRecord);

      const { embed, files } = moatembedTemplate({
        title: "Card Unfrozen",
        description:
          `${ARROW} Your Moat Castle card is now **Active**.\n` +
          `${ARROW} You may use it for payments again.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
