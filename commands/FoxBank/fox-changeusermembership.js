const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

// Fox Bank Staff Role
const FOX_BANK_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-changeusermembership")
    .setDescription(
      "Manually change a user's Fox Bank membership. (Fox Bank Staff Only)",
    )
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose membership will be changed")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("membership")
        .setDescription("New membership level")
        .setRequired(true)
        .addChoices(
          { name: "Benefits", value: "benefits" },
          { name: "Gold", value: "gold" },
          { name: "Platinum", value: "platinum" },
          { name: "Diamond", value: "diamond" },
          { name: "Express", value: "express" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (!interaction.member.roles.cache.has(FOX_BANK_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only Fox Bank staff can use this command.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const targetUser = interaction.options.getUser("user");
    const newMembership = interaction.options.getString("membership");

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

    const oldMembership = targetRecord.foxBank.membership || "None";

    // Apply membership change (FREE)
    targetRecord.foxBank.membership =
      newMembership.charAt(0).toUpperCase() + newMembership.slice(1);

    targetRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(targetRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Membership Updated",
      description:
        `${ARROW} **User:** <@${targetUser.id}>\n` +
        `${ARROW} **Old Membership:** ${oldMembership}\n` +
        `${ARROW} **New Membership:** ${targetRecord.foxBank.membership}\n\n` +
        `${ARROW} Membership updated successfully by Fox Bank staff.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
