const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reinvites")
    .setDescription("Send the reinvites embed")
    .addStringOption((option) =>
      option.setName("link").setDescription("Session Code").setRequired(true),
    ),

  async execute(interaction) {
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    const staffRoleId = "1350897509752373341";
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

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

    // Get raw Greenville private server code
    const code = interaction.options.getString("link").trim();
    const host = interaction.user;

    // Optional: basic empty check
    if (!code) {
      return interaction.reply({
        content: "You must provide a Greenville private server code.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const description =
      `> ${ARROW} ${host} is hosting reinvites.\n` +
      `> ${ARROW} Click the button below to receive the reinvite link privately.`;

    const { embed, files } = embedTemplate({
      title: `${STAR} Greenville Community - *__Reinvites__* ${STAR}`,
      description,
      banner: path.join(__dirname, "../../graphics/gvcreinvites.png"),
    });

    const shortId = `ri_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

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

    sent.sessionCode = code;

    await interaction.editReply({
      content: "Reinvites embed sent successfully.",
    });
  },
};
