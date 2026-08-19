const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW } = MOATEMOJIS;

const MOAT_STAFF_ROLE = "1537722114176581724"; // your staff role

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-managebalance")
    .setDescription("[Staff] Manage a user's Moat Castle balance.")
    .addSubcommand((sub) =>
      sub
        .setName("add")
        .setDescription("Add Moat Castle balance to a user.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User to add balance to")
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
        .setDescription("Remove ALL Moat Castle balance from a user.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User whose balance will be cleared")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Set a user's Moat Castle balance.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User whose balance will be set")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("amount").setDescription("New balance").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (!interaction.member.roles.cache.has(MOAT_STAFF_ROLE)) {
      const { embed, files } = moatembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only Moat Castle staff can use this command.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const sub = interaction.options.getSubcommand();
    const targetUser = interaction.options.getUser("user");
    const targetRecord = await getUserRecord(targetUser.id);

    // Ensure Moat Castle account exists
    if (!targetRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description: `${ARROW} That user does not have a Moat Castle account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const oldBalance = Number(targetRecord.moatCastle.balance) || 0;

    // ===============================
    // ➕ ADD BALANCE
    // ===============================
    if (sub === "add") {
      const amount = interaction.options.getInteger("amount");

      if (amount <= 0) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Amount",
          description: `${ARROW} Amount must be greater than 0.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      targetRecord.moatCastle.balance = oldBalance + amount;
      targetRecord.moatCastle.updatedAt = Date.now();
      await updateUserRecord(targetRecord);

      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Balance Added",
        description:
          `${ARROW} **User:** <@${targetUser.id}>\n` +
          `${ARROW} **Old Balance:** $${oldBalance.toLocaleString()}\n` +
          `${ARROW} **Added:** $${amount.toLocaleString()}\n` +
          `${ARROW} **New Balance:** $${targetRecord.moatCastle.balance.toLocaleString()}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // ➖ REMOVE BALANCE (clear to 0)
    // ===============================
    if (sub === "remove") {
      targetRecord.moatCastle.balance = 0;
      targetRecord.moatCastle.updatedAt = Date.now();
      await updateUserRecord(targetRecord);

      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Balance Removed",
        description:
          `${ARROW} **User:** <@${targetUser.id}>\n` +
          `${ARROW} **Old Balance:** $${oldBalance.toLocaleString()}\n` +
          `${ARROW} **New Balance:** $0`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🎯 SET BALANCE
    // ===============================
    if (sub === "set") {
      const amount = interaction.options.getInteger("amount");

      if (amount < 0) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Amount",
          description: `${ARROW} Balance cannot be negative.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      targetRecord.moatCastle.balance = amount;
      targetRecord.moatCastle.updatedAt = Date.now();
      await updateUserRecord(targetRecord);

      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Balance Updated",
        description:
          `${ARROW} **User:** <@${targetUser.id}>\n` +
          `${ARROW} **Old Balance:** $${oldBalance.toLocaleString()}\n` +
          `${ARROW} **New Balance:** $${amount.toLocaleString()}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
