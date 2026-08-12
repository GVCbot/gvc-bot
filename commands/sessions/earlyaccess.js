const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("earlyaccess")
    .setDescription("Send the early access embed")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Early access session link")
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

    const host = interaction.user;

    await interaction.deferReply({ flags: 64 });

    const description =
      `> <:arrowright:1534182706836144158> ${host} has opened **Early Access**.\n` +
      `> <:arrowright:1534182706836144158> Use the button below to get the link.`;

    const { embed, files } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Greenville Community - *__Early Access__* <a:gvcsunspin:1527220557890850846>",
      description,
      banner: path.join(__dirname, "../../graphics/gvcearlyaccess.png"),
    });

    const shortId = `ea_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(shortId)
        .setLabel("Get Early Access Link")
        .setStyle(ButtonStyle.Success),
    );

    const pingRoles = [
      "1350870925582798848", // Early Access role ONLY
    ];

    const pingString = pingRoles.map((id) => `<@&${id}>`).join(" ");

    const sent = await interaction.channel.send({
      content: pingString,
      embeds: [embed],
      files,
      components: [row],
      allowedMentions: { parse: ["roles"] },
    });

    sent.sessionLink = link;

    await interaction.editReply({
      content: "Early Access embed sent successfully.",
    });
  },
};
