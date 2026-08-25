const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

const embedTemplate = require("./embedTemplate");

module.exports = (client) => {
  const STAFF_ROLE = "1350897509752373341";
  const HR_ROLE = "1350582607217430650";
  const LOG_CHANNEL = "1541761916353908746";

  client.on("guildMemberRemove", async (member) => {
    try {
      // Only track if they had the staff role
      if (!member.roles.cache.has(STAFF_ROLE)) return;

      const logChannel = member.guild.channels.cache.get(LOG_CHANNEL);
      if (!logChannel) return;

      const joinedAt = member.joinedAt
        ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>`
        : "Unknown";

      const leftAt = `<t:${Math.floor(Date.now() / 1000)}:F>`;

      const rolesList =
        member.roles.cache
          .filter((r) => r.id !== member.guild.id)
          .map((r) => `${ARROW} <@&${r.id}>`)
          .join("\n") || "None";

      const description =
        `${STAR} **Staff Departure Detected** ${STAR}\n\n` +
        `> ${ARROW} **User:** ${member.user.tag} (${member.id})\n` +
        `> ${ARROW} **Joined:** ${joinedAt}\n` +
        `> ${ARROW} **Left:** ${leftAt}\n\n` +
        `> ${ARROW} **Roles They Had:**\n${rolesList}`;

      const { embed, files } = embedTemplate({
        title: "🚨 Staff Member Left the Server",
        description,
        noLogo: false,
      });

      embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

      await logChannel.send({
        content: `<@&${HR_ROLE}>`,
        embeds: [embed],
        files,
      });
    } catch (err) {
      console.error("Error in roleLeave.js:", err);
    }
  });
};
