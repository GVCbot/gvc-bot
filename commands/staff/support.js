const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");

const HR_ROLE = "1350582607217430650"; // GVC HR
const STAFF_ROLE = "1350897509752373341"; // All staff
const PARTNERSHIP_ROLE = "1497520864135086090"; // Partnership team
const CATEGORY_ID = "1539173722743906344"; // Support category

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Open the GVC Support menu (HR only)."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(HR_ROLE)) {
      return interaction.editReply(
        "❌ You do not have permission to use this command.",
      );
    }

    // Banner embed
    const bannerPath = path.join(__dirname, "../../graphics/gvcsupport.png");
    const { embed: bannerEmbed, files: bannerFiles } = embedTemplate({
      title: `${SUN} GVC Support Center ${SUN}`,
      description: `${ARROW} Welcome to the official GVC Support system.`,
      banner: bannerPath,
      noLogo: false,
    });

    // Main embed
    const { embed: mainEmbed } = embedTemplate({
      title: `${SUN} Support Options ${SUN}`,
      description:
        `${ARROW} Please select the type of support you need below.\n\n` +
        `${ARROW} 🧭 **General Support** — For general inquiries.\n` +
        `${ARROW} 🤝 **Partnership Support** — For partnership questions.\n` +
        `${ARROW} 🧑‍💼 **Staff Report** — Report a staff member.\n` +
        `${ARROW} 👥 **User Report** — Report a user.`,
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

    return interaction.editReply({
      embeds: [bannerEmbed, mainEmbed],
      files: bannerFiles,
      components: [row],
    });
  },
};
