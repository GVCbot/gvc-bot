const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");

const HR_ROLE = "1350582607217430650"; // GVC HR
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Send the public GVC Support menu (HR only)."),

  async execute(interaction) {
    // Permission check
    if (!interaction.member.roles.cache.has(HR_ROLE)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        ephemeral: true,
      });
    }

    // Banner embed — no title, no logo, but with a short invisible space so Discord doesn’t auto‑fill defaults
    const bannerPath = path.join(__dirname, "../../graphics/gvcsupport.png");
    const { embed: bannerEmbed, files: bannerFiles } = embedTemplate({
      title: "‎", // invisible character prevents “GVC Bot” fallback
      description: "‎", // invisible character prevents “No description provided”
      banner: bannerPath,
      noLogo: true,
    });

    // Main embed
    const { embed: mainEmbed } = embedTemplate({
      title: `${SUN} Support Options ${SUN}`,
      description:
        `${ARROW} Please select the type of support you need below.\n\n` +
        `${ARROW} **General Support** — For general inquiries.\n` +
        `${ARROW} **Partnership Support** — For partnership questions.\n` +
        `${ARROW} **Staff Report** — Report a staff member.\n` +
        `${ARROW} **User Report** — Report a user.`,
      noLogo: false,
    });

    // Selection menu
    const menu = new StringSelectMenuBuilder()
      .setCustomId("support_select")
      .setPlaceholder("Select a support type")
      .addOptions([
        { label: "General Support", value: "general" },
        { label: "Partnership Support", value: "partnership" },
        { label: "Staff Report", value: "staff" },
        { label: "User Report", value: "user" },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    // Send publicly (not ephemeral)
    await interaction.reply({
      embeds: [bannerEmbed, mainEmbed],
      files: bannerFiles,
      components: [row],
    });

    // Remove only the “used this command” banner, not the embeds
    try {
      await interaction.deleteReply();
    } catch {
      // ignore if already deleted or permissions block deletion
    }
  },
};
