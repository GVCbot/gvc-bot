// commands/staff/moderate.js

const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");

const punishmentTemplates = require("../../punishmentTemplates");
const {
  canUsePunishmentType,
  calculateSuspensionEnd,
  buildDmEmbed,
  buildStaffLogMessage,
  saveModlog,
} = require("../../modlogHelpers");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const STAFF_LOG_CHANNEL = "1534886183040188547"; // your staff log channel

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moderate")
    .setDescription("Issue a moderation punishment to a user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to punish").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Type of punishment")
        .setRequired(true)
        .addChoices(
          // COMMUNITY PUNISHMENTS
          { name: "Documented Warning", value: "documented_warning" },
          { name: "Mark", value: "mark" },
          { name: "2 Marks", value: "mark2" },
          { name: "Infraction", value: "infraction" },
          { name: "2 Infractions", value: "infraction2" },
          { name: "2 Infractions + 7d Suspension", value: "infraction2_7d" },
          { name: "2 Infractions + 14d Suspension", value: "infraction2_14d" },

          // STAFF PUNISHMENTS
          { name: "Staff Mark", value: "staff_mark" },
          { name: "2 Staff Marks", value: "staff_mark2" },
          { name: "Staff Strike", value: "staff_strike" },
          { name: "2 Staff Strikes", value: "staff_strike2" },
          {
            name: "2 Staff Strikes + 7d Staff Suspension",
            value: "staff_strike2_7d",
          },
          {
            name: "2 Staff Strikes + 14d Staff Suspension",
            value: "staff_strike2_14d",
          },

          // HR ONLY
          { name: "Staff Termination", value: "staff_termination" },
          { name: "Staff Blacklist", value: "staff_blacklist" },
        ),
    )
    .addStringOption((opt) =>
      opt
        .setName("reason")
        .setDescription("Reason for the punishment")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("evidence")
        .setDescription("Evidence (link or description)")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const target = interaction.options.getUser("user");
    const type = interaction.options.getString("type");
    const reason = interaction.options.getString("reason");
    const evidence = interaction.options.getString("evidence");

    const moderator = interaction.user.id;
    const member = interaction.member;

    // ===============================
    // ROLE PERMISSION CHECK
    // ===============================
    if (!canUsePunishmentType(member, type)) {
      return interaction.editReply({
        content: "❌ You do not have permission to issue this punishment.",
      });
    }

    // ===============================
    // SUSPENSION END CALCULATION
    // ===============================
    const template = punishmentTemplates[type];
    const suspensionEnd = calculateSuspensionEnd(template.suspensionDays);

    // ===============================
    // SAVE MODLOG ENTRY
    // ===============================
    const entry = await saveModlog(
      target.id,
      type,
      reason,
      evidence,
      moderator,
      suspensionEnd,
    );

    // ===============================
    // SEND DM TO USER
    // ===============================
    const dmEmbedData = buildDmEmbed(
      type,
      reason,
      evidence,
      suspensionEnd,
      entry.caseId,
    );

    try {
      await target.send({
        embeds: [
          {
            title: dmEmbedData.title,
            description: dmEmbedData.description,
            color: 0xffad65, // your brand color
          },
        ],
      });
    } catch (err) {
      console.log("DM failed:", err);
    }

    // ===============================
    // STAFF LOG EMBED
    // ===============================
    const staffLogText = buildStaffLogMessage(
      type,
      reason,
      evidence,
      moderator,
      suspensionEnd,
    );

    const { embed } = embedTemplate({
      title: `${SUN} Moderation Action Issued ${SUN}`,
      description:
        `> ${ARROW} **User:** ${target} (${target.id})\n` +
        `> ${ARROW} **Case ID:** ${entry.caseId}\n\n` +
        staffLogText,
      noLogo: true,
    });

    const logChannel = interaction.guild.channels.cache.get(STAFF_LOG_CHANNEL);
    if (logChannel) {
      logChannel.send({ embeds: [embed] }).catch(() => {});
    }

    // ===============================
    // CONFIRMATION TO MODERATOR
    // ===============================
    return interaction.editReply({
      content: `✅ Punishment **${template.label}** issued to **${target.tag}**.\nCase ID: **${entry.caseId}**`,
    });
  },
};
