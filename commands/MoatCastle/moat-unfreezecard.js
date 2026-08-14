const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-unfreezecard")
    .setDescription("Unfreeze your Moat Castle card."),

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

    userRecord.moatCastle.cardStatus = "Active";
    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Card Unfrozen",
      description:
        `> <:moatcastleright:1537695231409918002> Your Moat Castle card is now **Active**.\n` +
        `> <:moatcastleright:1537695231409918002> You may use it for payments again.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
