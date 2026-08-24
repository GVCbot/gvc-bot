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
const BULLETPOINT = "<:bulletpoint:1541479624209604608>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("release")
    .setDescription("Release the session.")
    .addStringOption((option) =>
      option.setName("link").setDescription("Session link").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("aorp")
        .setDescription("Area of Roleplay")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("frplimit")
        .setDescription("Fail RP speed limit")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("peacetimestatus")
        .setDescription("Peacetime status")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("psstatus")
        .setDescription("Public Service status")
        .setRequired(true),
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

    let link = protect.sanitize(interaction.options.getString("link"));
    if (!link.startsWith("http://") && !link.startsWith("https://")) {
      link = `https://${link}`;
    }

    const aorp = protect.sanitize(interaction.options.getString("aorp"));
    const frp = interaction.options.getInteger("frplimit");
    const peacetime = protect.sanitize(
      interaction.options.getString("peacetimestatus"),
    );
    const ps = protect.sanitize(interaction.options.getString("psstatus"));
    const host = interaction.user;

    await interaction.deferReply({ flags: 64 });

    const description =
      `> ${ARROW} ${host} has released their session.\n` +
      `> ${ARROW} Please read the rules below before joining.\n\n` +
      `**Session Rules:**\n` +
      `> ${BULLETPOINT} **Peacetime Status:** ${peacetime}\n` +
      `> ${BULLETPOINT} **Fail RP Speeds:** ${frp}MPH\n` +
      `> ${BULLETPOINT} **Public Service Status:** ${ps}\n` +
      `> ${BULLETPOINT} **Area of Roleplay:** ${aorp}\n\n` +
      `> ${ARROW} Click the button below to receive the session link privately.\n`;

    const { embed, files } = embedTemplate({
      title:
        "${STAR} Greenville Community - *__Session Release__* ${STAR}",
      description,
      banner: path.join(__dirname, "../../graphics/gvcrelease.png"),
    });

    const shortId = `rl_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(shortId)
        .setLabel("Get Session Link")
        .setStyle(ButtonStyle.Success),
    );

    const sent = await interaction.channel.send({
      content: "<@&1058636416164315147>",
      embeds: [embed],
      files,
      components: [row],
      allowedMentions: { parse: ["roles"] },
    });

    sent.sessionLink = link;

    await interaction.editReply({
      content: "Session release embed sent successfully.",
    });
  },
};
