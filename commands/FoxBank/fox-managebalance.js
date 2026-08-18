const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

// Only THIS user can use these subcommands
const FOX_ADMIN_ID = "922196235954307114";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-managebalance")
    .setDescription("Manage a user's Fox Bank balance. (Admin Only)")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add Fox Bank balance to a user.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User to add Fox Bank balance to")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to add")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("remove")
        .setDescription("Remove ALL Fox Bank balance from a user.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User whose Fox Bank balance will be removed")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a user's Fox Bank balance to a specific amount.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User whose Fox Bank balance will be set")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("New Fox Bank balance")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check — shared across all subcommands
    if (interaction.user.id !== FOX_ADMIN_ID) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only the Fox Bank Administrator can use this command.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const subcommand = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("user");
    const targetRecord = await getUserRecord(targetUser.id);

    // Ensure Fox Bank account exists — shared across all subcommands
    if (!targetRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description: `${ARROW} That user does not have a Fox Bank account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const oldBalance = Number(targetRecord.foxBank.balance) || 0;

    // ===============================
    // ➕ Add Balance
    // ===============================
    if (subcommand === "add") {
      const amount = interaction.options.getInteger("amount");

      if (amount <= 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Amount",
          description: `${ARROW} Amount must be greater than 0.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

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
    }

    // ===============================
    // ➖ Remove Balance (clears to 0)
    // ===============================
    if (subcommand === "remove") {
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
    }

    // ===============================
    // 🎯 Set Balance
    // ===============================
    if (subcommand === "set") {
      const amount = interaction.options.getInteger("amount");

      if (amount < 0) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Amount",
          description: `${ARROW} Balance cannot be negative.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      targetRecord.foxBank.balance = amount;
      targetRecord.foxBank.updatedAt = Date.now();
      await updateUserRecord(targetRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Balance Updated",
        description:
          `${ARROW} **User:** <@${targetUser.id}>\n` +
          `${ARROW} **Old Balance:** $${oldBalance.toLocaleString()}\n` +
          `${ARROW} **New Balance:** $${amount.toLocaleString()}\n\n` +
          `${ARROW} Balance successfully set.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
