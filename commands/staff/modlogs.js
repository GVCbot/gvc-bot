// commands/staff/modlogs.js

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const STAFF_ROLE = "1350897509752373341"; // Staff Team
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("modlogs")
    .setDescription("View moderation logs for a user (Staff Only).")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to view logs for")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // Permission check
    if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
      return interaction.editReply({
        content: "❌ You do not have permission to view modlogs.",
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    if (!userRecord.modlogs || userRecord.modlogs.length === 0) {
      const { embed } = embedTemplate({
        title: `${SUN} No Modlogs Found ${SUN}`,
        description: `> ${ARROW} **User:** ${target}\n> ${ARROW} This user has no moderation logs.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Pagination setup
    const logs = userRecord.modlogs.sort((a, b) => b.timestamp - a.timestamp);
    const perPage = 10;
    const totalPages = Math.ceil(logs.length / perPage);

    return sendPage(interaction, target, logs, 0, totalPages);
  },

  async handleButton(interaction) {
    const [_, userId, pageStr] = interaction.customId.split("_");
    const page = parseInt(pageStr, 10);

    const userRecord = await getUserRecord(userId);
    const logs = userRecord.modlogs.sort((a, b) => b.timestamp - a.timestamp);

    const perPage = 10;
    const totalPages = Math.ceil(logs.length / perPage);

    return sendPage(interaction, { id: userId }, logs, page, totalPages, true);
  },
};

// ===============================
// PAGE SENDER
// ===============================
async function sendPage(
  interaction,
  target,
  logs,
  page,
  totalPages,
  isUpdate = false,
) {
  const start = page * 10;
  const pageLogs = logs.slice(start, start + 10);

  let desc = `> ${ARROW} **User:** <@${target.id}>\n`;
  desc += `> ${ARROW} **Page:** ${page + 1}/${totalPages}\n\n`;

  for (const log of pageLogs) {
    const unix = Math.floor(log.timestamp / 1000);
    desc +=
      `> **Case ID:** ${log.caseId}\n` +
      `> • **Type:** ${log.type}\n` +
      `> • **Reason:** ${log.reason}\n` +
      `> • **Evidence:** ${log.evidence}\n` +
      `> • **Moderator:** <@${log.moderator}>\n` +
      `> • **Timestamp:** <t:${unix}:F>\n`;

    if (log.suspensionEnd) {
      const endUnix = Math.floor(log.suspensionEnd / 1000);
      desc += `> • **Suspension Ends:** <t:${endUnix}:F>\n`;
    }

    desc += "\n";
  }

  const { embed } = embedTemplate({
    title: `${SUN} Moderation Logs ${SUN}`,
    description: desc,
    noLogo: true,
  });

  // Buttons
  const row = new ActionRowBuilder();

  if (page > 0) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`modlogs_${target.id}_${page - 1}`)
        .setLabel("⬅ Previous")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  if (page < totalPages - 1) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(`modlogs_${target.id}_${page + 1}`)
        .setLabel("Next ➡")
        .setStyle(ButtonStyle.Secondary),
    );
  }

  if (isUpdate) {
    return interaction.update({
      embeds: [embed],
      components: row.components.length ? [row] : [],
    });
  }

  return interaction.editReply({
    embeds: [embed],
    components: row.components.length ? [row] : [],
  });
}
