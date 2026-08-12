// commands/staff/editmodlog.js

const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");

const punishmentTemplates = require("../../punishmentTemplates");
const {
  getModlog,
  editModlog,
  calculateSuspensionEnd,
} = require("../../modlogHelpers");

const HR_ROLE = "1350582607217430650"; // HR Staff
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";
const STAFF_LOG_CHANNEL = "1534886183040188547";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("editmodlog")
    .setDescription("HR-only: Edit a user's moderation log.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose log you want to edit")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("case")
        .setDescription("Case ID to edit (e.g., MOD-0004)")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("field")
        .setDescription("Field to edit")
        .setRequired(true)
        .addChoices(
          { name: "Type", value: "type" },
          { name: "Reason", value: "reason" },
          { name: "Evidence", value: "evidence" },
          { name: "Suspension End", value: "suspensionEnd" },
        ),
    )
    .addStringOption((opt) =>
      opt
        .setName("newvalue")
        .setDescription("New value for the field")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // HR-only check
    if (!interaction.member.roles.cache.has(HR_ROLE)) {
      return interaction.editReply({
        content: "❌ Only HR staff can edit modlogs.",
      });
    }

    const target = interaction.options.getUser("user");
    const caseId = interaction.options.getString("case");
    const field = interaction.options.getString("field");
    const newValue = interaction.options.getString("newvalue");

    // Fetch log entry
    const log = await getModlog(target.id, caseId);

    if (!log) {
      return interaction.editReply({
        content: `❌ No modlog found with Case ID **${caseId}**.`,
      });
    }

    // ===============================
    // FIELD VALIDATION
    // ===============================

    if (field === "type") {
      if (!punishmentTemplates[newValue]) {
        return interaction.editReply({
          content: "❌ Invalid punishment type.",
        });
      }
    }

    let finalValue = newValue;

    if (field === "suspensionEnd") {
      const days = parseInt(newValue, 10);
      if (isNaN(days) || days < 0) {
        return interaction.editReply({
          content: "❌ Suspension end must be a number of days.",
        });
      }
      finalValue = calculateSuspensionEnd(days);
    }

    // ===============================
    // APPLY EDIT
    // ===============================
    const updated = await editModlog(target.id, caseId, field, finalValue);

    if (!updated) {
      return interaction.editReply({
        content: "❌ Failed to update modlog.",
      });
    }

    // ===============================
    // STAFF LOG EMBED
    // ===============================
    const { embed } = embedTemplate({
      title: `${SUN} Modlog Edited ${SUN}`,
      description:
        `> ${ARROW} **User:** ${target} (${target.id})\n` +
        `> ${ARROW} **Case ID:** ${caseId}\n` +
        `> ${ARROW} **Edited Field:** ${field}\n` +
        `> ${ARROW} **New Value:** ${field === "suspensionEnd" ? `<t:${Math.floor(finalValue / 1000)}:F>` : finalValue}\n` +
        `> ${ARROW} **Edited By:** <@${interaction.user.id}>`,
      noLogo: true,
    });

    const logChannel = interaction.guild.channels.cache.get(STAFF_LOG_CHANNEL);
    if (logChannel) {
      logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // ===============================
    // CONFIRMATION TO HR
    // ===============================
    return interaction.editReply({
      content: `✅ Case **${caseId}** updated successfully.`,
    });
  },
};
