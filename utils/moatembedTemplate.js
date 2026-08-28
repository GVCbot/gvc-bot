const { EmbedBuilder } = require("discord.js");
const path = require("node:path");

function moatembedTemplate({ title, description, noLogo }) {
  const MOATCASTLE = "<:moatcastle:1537694454998372372>";
  const ARROW = "<:moatcastleright:1537695231409918002>";

  const embed = new EmbedBuilder()
    .setColor("#422E57")
    .setTitle(`${MOATCASTLE} ${title} ${MOATCASTLE}`)
    .setDescription(description)
    .setThumbnail("attachment://moatcastlebanklogo.png");

  if (!noLogo) {
    embed.setFooter({
      text: "Moat Castle Banking Division",
      iconURL: "attachment://moatcastlebanklogo.png",
    });
  }

  const files = [
    {
      attachment: path.join(__dirname, "../graphics/moatcastlebanklogo.png"),
      name: "moatcastlebanklogo.png",
    },
  ];

  return { embed, files };
}

module.exports = moatembedTemplate;

module.exports.MOATEMOJIS = {
  MOATCASTLE: "<:moatcastle:1537694454998372372>",
  ARROW: "<:moatcastleright:1537695231409918002>",
};