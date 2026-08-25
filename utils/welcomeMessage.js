const path = require("node:path");
const embedTemplate = require("./embedTemplate");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = (client) => {
  const VERIFICATION_CHANNEL = "1351295142878908613";
  const GVC_CENTER_CHANNEL = "1058639853937492132";
  const PUBLIC_WELCOME_CHANNEL = "1058639114452336690";

  client.on("guildMemberAdd", async (member) => {
    try {
      const totalMembers = member.guild.members.cache.filter(
        (m) => !m.user.bot,
      ).size;

      const description =
        `> ${ARROW} Welcome to **Greenville Community**, we’re excited to have you here! You are the **${totalMembers}th** member to join Greenville Community.\n\n` +
        `> ${ARROW} Please head to <#${VERIFICATION_CHANNEL}> to verify yourself and gain access to the rest of the server. After verifying, visit <#${GVC_CENTER_CHANNEL}> to get familiar with our rules, FAQs, and department applications.`;

      const { embed, files } = embedTemplate({
        title: `${STAR} Welcome to **Greenville Community** ${STAR}`,
        description,
        noLogo: false, // ✅ keep thumbnail logo, no banner
      });

      embed.setThumbnail(member.user.displayAvatarURL({ dynamic: true }));

      await member.send({ embeds: [embed], files }).catch(() => {
        console.warn(`Could not DM ${member.user.tag}.`);
      });

      const welcomeChannel = member.guild.channels.cache.get(
        PUBLIC_WELCOME_CHANNEL,
      );
      if (welcomeChannel) {
        await welcomeChannel.send({
          content: `${STAR} Welcome <@${member.id}>!`,
          embeds: [embed],
          files,
        });
      }
    } catch (err) {
      console.error("Error in welcomeMessage.js:", err);
    }
  });
};
