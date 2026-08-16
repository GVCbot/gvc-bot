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
    .setName("fox-addbalance")
    .setDescription("Add Fox Bank balance to a user. (Admin Only)")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to add Fox Bank balance to")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt.setName("amount").setDescription("Amount to add").setRequired(true),
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
    const amount = interaction.options.getInteger("amount");

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

    if (amount <= 0) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Amount",
        description: `${ARROW} Amount must be greater than 0.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const oldBalance = targetRecord.foxBank.balance || 0;

    // Add balance
    targetRecord.foxBank.balance = oldBalance + amount;
    targetRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(targetRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Balance Added",
      description:
        `${ARROW} **User:** <@${targetUser.id}>\n` +
        `${ARROW} **Old Balance:** $${oldBalance.toLocaleString()}\n` +
        `${ARROW} **Added:** $${amount.toLocaleString()}\n` +
        `${ARROW} **New Balance:** $${targetRecord.foxBank.balance.toLocaleString()}\n\n` +
        `${ARROW} Balance successfully updated.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
