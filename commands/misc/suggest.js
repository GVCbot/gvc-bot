const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");

const SUGGESTION_CHANNEL = "1394669829189013668";
const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit a suggestion to the Greenville Community staff.")
    .addStringOption((option) =>
      option
        .setName("suggestion")
        .setDescription("Your suggestion")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const suggestion = interaction.options.getString("suggestion");
    const user = interaction.user;

    const guild = interaction.guild;
    const channel = guild.channels.cache.get(SUGGESTION_CHANNEL);

    if (!channel) {
      return interaction.editReply({
        content: "Suggestion channel not found.",
      });
    }

    const desc =
      `> ${ARROW} **From:** ${user.tag} (${user.id})\n` +
      `> ${ARROW} **Submitted:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
      `> ${ARROW} **Suggestion:** ${suggestion}`;

    const { embed } = embedTemplate({
      title: `${STAR} New Suggestion Submitted ${STAR}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));

    // Send suggestion
    const sentMessage = await channel.send({ embeds: [embed] });

    // Auto-react with yes/no emojis
    await sentMessage.react("1541478847281889481");
    await sentMessage.react("1541478254748246087");

    const { embed: confirmEmbed } = embedTemplate({
      title: `${STAR} Suggestion Sent ${STAR}`,
      description:
        `> ${ARROW} Your suggestion has been forwarded to the suggestion channel.\n` +
        `> ${ARROW} Thank you for helping improve Greenville Community.`,
      noLogo: true,
    });

    confirmEmbed.setThumbnail(user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [confirmEmbed] });
  },
};
