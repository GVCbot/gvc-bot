const { EmbedBuilder } = require("discord.js");
const path = require("node:path");

module.exports = function moatembedTemplate({ title, description, noLogo }) {
  const MOATCASTLE = "<:moatcastle:1537694454998372372>";
  const ARROW = "<:moatcastleright:1537695231409918002>";
  const FOOTER_ICON = "<:moatcastlebanklogo:1537694498212020274>";

  const embed = new EmbedBuilder()
    .setColor("#422E57")
    .setTitle(`${MOATCASTLE} ${title} ${MOATCASTLE}`)
    .setDescription(description)
    .setThumbnail("attachment://moatcastlebanklogo.png");

  if (!noLogo) {
    embed.setFooter({
      text: `Moat Castle Banking Division ${FOOTER_ICON}`,
    });
  }

  const files = [
    {
      attachment: path.join(__dirname, "../graphics/moatcastlebanklogo.png"),
      name: "moatcastlebanklogo.png",
    },
  ];

  return { embed, files };
};
