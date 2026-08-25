const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");

const HR_ROLE = "1350582607217430650"; // GVC HR
const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("support")
    .setDescription("Send the public GVC Support menu (HR only)."),

  async execute(interaction) {
    // Permission check
    if (!interaction.member.roles.cache.has(HR_ROLE)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: 64,
      });
    }

    // Banner path
    const bannerPath = path.join(__dirname, "../../graphics/gvcsupport.png");

    // Single embed — compact, clean, announcement-style
    const { embed, files } = embedTemplate({
      title: `${STAR} Server Support ${STAR}`,
      description: `${ARROW} Welcome to the Greenville Community Server Support channel. In this channel, you can open several different types of tickets — from general assistance to member reports. Ensure that you have picked the correct ticket type for your need. Any troll or spam tickets will be punished.`,
      banner: bannerPath,
      noLogo: false,
    });

    // Dropdown menu
    const menu = new StringSelectMenuBuilder()
      .setCustomId("support_select")
      .setPlaceholder("Select an option to open a ticket")
      .addOptions([
        { label: "General Support", value: "general" },
        { label: "Partnership Support", value: "partnership" },
        { label: "Staff Report", value: "staff" },
        { label: "User Report", value: "user" },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    // Send publicly (not ephemeral)
    await interaction.channel.send({
      embeds: [embed],
      files,
      components: [row],
    });

    // Silently acknowledge command
    await interaction.deferReply({ flags: 64 });
    await interaction.deleteReply().catch(() => {});
  },
};
