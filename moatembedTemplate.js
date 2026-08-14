const { EmbedBuilder } = require("discord.js");
const path = require("node:path");

module.exports = function moatembedTemplate({
  title,
  description,
  banner,
  noLogo,
}) {
  const MOATCASTLE = "<:moatcastle:1537694454998372372>";
  const ARROW = "<:moatcastleright:1537695231409918002>";

  const embed = new EmbedBuilder()
    .setColor("#422E57") // Moat Castle theme color
    .setTitle(`${MOATCASTLE} ${title} ${MOATCASTLE}`)
    .setDescription(description)
    .setImage(banner || path.join(__dirname, "../graphics/moatbanklogo.png"));

  if (!noLogo) {
    embed.setFooter({ text: "Moat Castle Banking Division" });
  }

  return { embed };
};
