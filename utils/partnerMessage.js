const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

const embedTemplate = require("./embedTemplate");

module.exports = (client) => {
  const TARGET_CHANNEL = "1058640806111629343";

  client.on("messageCreate", async (msg) => {
    try {
      if (msg.author.bot) return;
      if (msg.channel.id !== TARGET_CHANNEL) return;

      const description =
        `${ARROW} Tired of constant pings?\n` +
        `${ARROW} You can mute this channel by clicking on __Notification Settings__, then set it to "nothing".`;

      const { embed, files } = embedTemplate({
        title: `${STAR} Notification Tip ${STAR}`,
        description,
        noLogo: false,
      });

      await msg.channel.send({
        embeds: [embed],
        files,
      });
    } catch (err) {
      console.error("Error in partnerMessage.js:", err);
    }
  });
};
