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
    .setName("fox-unfreezecard")
    .setDescription("Unfreeze your Fox Bank card."),

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

    // Unfreeze card
    userRecord.foxBank.cardStatus = "Active";
    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Card Unfrozen",
      description:
        `> ${ARROW} Your Fox Bank card is now **Active**.\n` +
        `> ${ARROW} You may use it for payments again.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
