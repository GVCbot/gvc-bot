const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-freezecard")
    .setDescription("Freeze your Fox Bank card to prevent payments."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description: "> You do not have a Fox Bank account.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Freeze card
    userRecord.foxBank.cardStatus = "Frozen";
    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Card Frozen",
      description:
        `> ${ARROW} Your Fox Bank card is now **Frozen**.\n` +
        `> ${ARROW} You cannot use it for payments until you unfreeze it.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
