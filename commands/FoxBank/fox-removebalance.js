const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

// Only THIS user can use the command
const FOX_ADMIN_ID = "922196235954307114";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-removebalance")
    .setDescription("Remove ALL Fox Bank balance from a user. (Admin Only)")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose Fox Bank balance will be removed")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (interaction.user.id !== FOX_ADMIN_ID) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only the Fox Bank Administrator can use this command.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const targetUser = interaction.options.getUser("user");
    const targetRecord = await getUserRecord(targetUser.id);

    // Ensure Fox Bank account exists
    if (!targetRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description: `${ARROW} That user does not have a Fox Bank account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const oldBalance = Number(targetRecord.foxBank.balance) || 0;

    // ⭐ Prevent negative values — force to zero
    targetRecord.foxBank.balance = 0;
    targetRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(targetRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Balance Removed",
      description:
        `${ARROW} **User:** <@${targetUser.id}>\n` +
        `${ARROW} **Old Balance:** $${oldBalance.toLocaleString()}\n` +
        `${ARROW} **New Balance:** $0\n\n` +
        `${ARROW} Balance successfully cleared.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
