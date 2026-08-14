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
    .setColor("#422E57")
    .setTitle(`${MOATCASTLE} ${title} ${MOATCASTLE}`)
    .setDescription(description);

  // Default banner file
  const bannerPath =
    banner || path.join(__dirname, "../graphics/moatbanklogo.png");

  // Attach file and reference it
  const files = [
    {
      attachment: bannerPath,
      name: "moatbanner.png",
    },
  ];

  embed.setImage("attachment://moatbanner.png");

  if (!noLogo) {
    embed.setFooter({ text: "Moat Castle Banking Division" });
  }

  return { embed, files };
};
