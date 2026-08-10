const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

// Persistent link storage
const { saveSessionLink } = require("../../utils/sessionLinksDB");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reinvites")
    .setDescription("Send the reinvites embed")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Session link (e.g., https://discord.gg/yourlink)")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Anti-spam
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    // Staff-only
    const staffRoleId = "1350897509752373341";
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    // Find startup embed
    const messages = await interaction.channel.messages.fetch({ limit: 50 });
    const startupMessage = messages.find((m) =>
      m.embeds[0]?.title?.includes("Session Startup"),
    );

    if (!startupMessage) {
      return interaction.reply({
        content: "Startup embed not found. You must start a session first.",
        flags: 64,
      });
    }

    // Sanitize link
    let link = protect.sanitize(interaction.options.getString("link"));
    const host = interaction.user;

    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      link = `https://${link}`;
    }

    await interaction.deferReply({ flags: 64 });

    const description =
      `> <:arrowright:1534182706836144158> ${host} is hosting reinvites.\n` +
      `> <:arrowright:1534182706836144158> Click the button below to receive the reinvite link privately.`;

    const { embed, files } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Greenville Community - *__Reinvites__* <a:gvcsunspin:1527220557890850846>",
      description,
      banner: path.join(__dirname, "../../graphics/gvcreinvites.png"),
    });

    // Generate short custom ID
    const shortId = `ri_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    // Save link persistently
    await saveSessionLink(shortId, link);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(shortId)
        .setLabel("Get Reinvite Link")
        .setStyle(ButtonStyle.Success),
    );

    const releaseMessage = messages.find((m) =>
      m.embeds[0]?.title?.includes("Session Release"),
    );

    let sent;

    if (releaseMessage) {
      sent = await releaseMessage.reply({
        content: "@here",
        embeds: [embed],
        files,
        components: [row],
        allowedMentions: { parse: ["everyone", "roles"] },
      });
    } else {
      sent = await interaction.channel.send({
        content: "@here",
        embeds: [embed],
        files,
        components: [row],
        allowedMentions: { parse: ["everyone", "roles"] },
      });
    }

    await interaction.editReply({
      content: "Reinvites embed sent successfully.",
    });
  },
};
