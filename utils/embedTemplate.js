const { EmbedBuilder, AttachmentBuilder } = require("discord.js");
const path = require("node:path");

// Default GVRE brand color
const DEFAULT_COLOR = 0x7f34eb;

// Default logo path (inside graphics folder)
const DEFAULT_LOGO = path.join(__dirname, "..", "graphics", "GVClogo.png");

// -----------------------------------------------------
// UNIVERSAL EMBED TEMPLATE (supports noLogo)
// -----------------------------------------------------
function embedTemplate({ title, description, banner, color, noLogo = false }) {
  const files = [];
  let logoName = null;
  let bannerName = null;

  // Attach logo ONLY if noLogo is false
  if (!noLogo) {
    logoName = path.basename(DEFAULT_LOGO);
    files.push(new AttachmentBuilder(DEFAULT_LOGO).setName(logoName));
  }

  // Optional banner
  if (banner) {
    bannerName = path.basename(banner);
    files.push(new AttachmentBuilder(banner).setName(bannerName));
  }

  // Build embed
  const embed = new EmbedBuilder()
    .setColor(color || DEFAULT_COLOR)
    .setTitle(title || "GVC Bot")
    .setDescription(description || "No description provided.");

  // Add thumbnail only if logo is attached
  if (logoName) {
    embed.setThumbnail(`attachment://${logoName}`);
  }

  // Add banner image if provided
  if (bannerName) {
    embed.setImage(`attachment://${bannerName}`);
  }

  return { embed, files };
}

module.exports = embedTemplate;
