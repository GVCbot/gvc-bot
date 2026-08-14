const { EmbedBuilder } = require("discord.js");
const path = require("node:path");

function foxbankembedTemplate({ title, description, noLogo }) {
  const FOXICON = "<:foxicon:1537892097581916231>";
  const FOXLOGO = "<:foxbanklogo:1537891941440819291>";
  const ARROW = "<:foxright:1537892525350723676>";

  const embed = new EmbedBuilder()
    .setColor("#FEB54C")
    .setTitle(`${FOXICON} ${title} ${FOXICON}`)
    .setDescription(description)
    .setThumbnail("attachment://foxbanklogo.png");

  if (!noLogo) {
    embed.setFooter({
      text: "Fox Bank Financial Division",
      iconURL: "attachment://foxbanklogo.png",
    });
  }

  const files = [
    {
      attachment: path.join(__dirname, "../graphics/foxbanklogo.png"),
      name: "foxbanklogo.png",
    },
  ];

  return { embed, files };
}

module.exports = foxbankembedTemplate;

module.exports.FOXEMOJIS = {
  FOXICON: "<:foxicon:1537892097581916231>",
  FOXLOGO: "<:foxbanklogo:1537891941440819291>",
  ARROW: "<:foxright:1537892525350723676>",
};
