const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-resettier")
    .setDescription("Fox Bank Staff Only — Reset ALL user tiers to Standard."),

  async execute(interaction) {
    await interaction.deferReply();

    // Staff check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const allUsers = await getAllUserRecords();
    let changedCount = 0;

    for (const user of allUsers) {
      if (user.foxBank && user.foxBank.tier.toLowerCase() !== "standard") {
        user.foxBank.tier = "Standard";
        user.foxBank.updatedAt = Date.now();
        await updateUserRecord(user);
        changedCount++;
      }
    }

    const { embed, files } = foxbankembedTemplate({
      title: "Tier Reset Complete",
      description:
        `> ${ARROW} All Fox Bank accounts have been checked.\n` +
        `> ${ARROW} **${changedCount} accounts** were reset to **Standard Tier**.\n\n` +
        `> ${ARROW} Old tiers (Silver, Black, etc.) have been fully removed.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
