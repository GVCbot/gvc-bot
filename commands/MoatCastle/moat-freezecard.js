const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-freezecard")
    .setDescription("Freeze your Moat Castle card to prevent payments."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description: "> You do not have a Moat Castle account.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.moatCastle.cardStatus = "Frozen";
    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Card Frozen",
      description:
        `> <:moatcastleright:1537695231409918002> Your Moat Castle card is now **Frozen**.\n` +
        `> <:moatcastleright:1537695231409918002> You cannot use it for payments until you unfreeze it.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
