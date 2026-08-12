// commands/staff/deletemodlog.js

const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");

const { getModlog, deleteModlog } = require("../../modlogHelpers");

const HR_ROLE = "1350582607217430650"; // HR Staff
const STAFF_LOG_CHANNEL = "1534886183040188547";

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deletemodlog")
    .setDescription("HR-only: Delete a user's moderation log.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose log you want to delete")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("case")
        .setDescription("Case ID to delete (e.g., MOD-0004)")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // HR-only check
    if (!interaction.member.roles.cache.has(HR_ROLE)) {
      return interaction.editReply({
        content: "❌ Only HR staff can delete modlogs.",
      });
    }

    const target = interaction.options.getUser("user");
    const caseId = interaction.options.getString("case");

    // Fetch log entry
    const log = await getModlog(target.id, caseId);

    if (!log) {
      return interaction.editReply({
        content: `❌ No modlog found with Case ID **${caseId}**.`,
      });
    }

    // Delete the log
    const success = await deleteModlog(target.id, caseId);

    if (!success) {
      return interaction.editReply({
        content: "❌ Failed to delete modlog.",
      });
    }

    // ===============================
    // STAFF LOG EMBED
    // ===============================
    const unix = Math.floor(log.timestamp / 1000);

    const { embed } = embedTemplate({
      title: `${SUN} Modlog Deleted ${SUN}`,
      description:
        `> ${ARROW} **User:** ${target} (${target.id})\n` +
        `> ${ARROW} **Case ID:** ${caseId}\n` +
        `> ${ARROW} **Type:** ${log.type}\n` +
        `> ${ARROW} **Reason:** ${log.reason}\n` +
        `> ${ARROW} **Evidence:** ${log.evidence}\n` +
        `> ${ARROW} **Original Timestamp:** <t:${unix}:F>\n\n` +
        `> ${ARROW} **Deleted By:** <@${interaction.user.id}>`,
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
      content: `🗑️ Case **${caseId}** deleted successfully.`,
    });
  },
};
