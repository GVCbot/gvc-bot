const { SlashCommandBuilder } = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

const STAR = "<a:starspin:1541482139759935558>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sessionover")
    .setDescription(
      "End the session, clean up old messages, and send a summary",
    )
    .addStringOption((option) =>
      option
        .setName("notes")
        .setDescription("Session notes by the host")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Anti-spam
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    // Staff-only
    const staffRoleId = "1350897509752373341";
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    // Fetch recent messages
    const recentMessages = await interaction.channel.messages.fetch({
      limit: 100,
    });

    // Find release message
    const releaseMessage = recentMessages.find((m) =>
      m.embeds[0]?.title?.includes("Session Release"),
    );

    if (!releaseMessage) {
      return interaction.editReply({
        content:
          "No session release found. You must run /sessionover in the session channel.",
      });
    }

    // Find startup message
    const startupMessage = recentMessages.find((m) =>
      m.embeds[0]?.title?.includes("Session Startup"),
    );

    if (!startupMessage) {
      return interaction.editReply({
        content: "Startup embed not found. Cannot safely clean messages.",
      });
    }

    // 🧹 Delete EVERYTHING between Session Over and Startup (including Startup)
    let deletedCount = 0;

    const messagesToDelete = await interaction.channel.messages.fetch({
      limit: 100,
    });

    for (const msg of messagesToDelete.values()) {
      // STOP once we hit the startup message — but delete it first
      if (msg.id === startupMessage.id) {
        try {
          await msg.delete();
          deletedCount++;
        } catch (err) {}
        break;
      }

      // Delete everything except pinned messages
      if (!msg.pinned) {
        try {
          await msg.delete();
          deletedCount++;
        } catch (err) {}
      }
    }

    // Session timing
    const startTime = releaseMessage.createdAt;
    const finishTime = new Date();

    const totalMinutes = Math.floor((finishTime - startTime) / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    // Count reinvites
    const reinvitesCount = recentMessages.filter((m) =>
      m.embeds[0]?.title?.includes("Reinvites"),
    ).size;

    // Sanitize notes
    const notes = protect.sanitize(interaction.options.getString("notes"));
    const host = interaction.user;

    // Build summary embed
    const description =
      `${host} has ended their session.\n\n` +
      `> **Session Summary**\n` +
      `> **Start Time:** <t:${Math.floor(startTime.getTime() / 1000)}:F>\n` +
      `> **Finish Time:** <t:${Math.floor(finishTime.getTime() / 1000)}:F>\n` +
      `> **Total Duration:** ${totalHours}h ${remainingMinutes}m\n` +
      `> **Reinvites Sent:** ${reinvitesCount}\n\n` +
      `> **Host Notes:** ${notes}`;

    const { embed, files } = embedTemplate({
      title:
        `${STAR} Greenville Community - *__Session Over__* ${STAR}`,
      description,
      banner: path.join(__dirname, "../../graphics/gvcsessionover.png"),
    });

    await interaction.channel.send({ embeds: [embed], files });

    await interaction.editReply({
      content: `Session summary sent successfully.\n🧹 Deleted **${deletedCount}** messages up to the startup message.`,
    });

    // SESSION LOGGING
    const sessionLogChannel = interaction.guild.channels.cache.get(
      "1534889791416438784",
    );

    if (sessionLogChannel) {
      const unix = Math.floor(Date.now() / 1000);

      const { embed: logEmbed } = embedTemplate({
        title:
          `${STAR} Session Logged ${STAR}`,
        description:
          `> **Host:** ${host} (${host.id})\n` +
          `> **Channel:** ${interaction.channel} (${interaction.channel.id})\n` +
          `> **Guild:** ${interaction.guild.name} (${interaction.guild.id})\n` +
          `> **Logged At:** <t:${unix}:F>\n\n` +
          `> **Duration:** ${totalHours}h ${remainingMinutes}m\n` +
          `> **Reinvites:** ${reinvitesCount}\n` +
          `> **Notes:** ${notes}`,
      });

      await sessionLogChannel.send({ embeds: [logEmbed] });
    }
  },
};
