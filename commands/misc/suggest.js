const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");

const SUGGESTION_CHANNEL = "1394669829189013668";
const ARROW = "<:arrowright:1534182706836144158>";
const SUN = "<a:gvcsunspin:1527220557890850846>";

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
      title: `${SUN} New Suggestion Submitted ${SUN}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(user.displayAvatarURL({ dynamic: true }));

    // Send suggestion
    const sentMessage = await channel.send({ embeds: [embed] });

    // Auto-react with yes/no emojis
    await sentMessage.react("1536265772379148298"); // <:summeryes:...>
    await sentMessage.react("1536265802649571349"); // <:summerno:...>

    const { embed: confirmEmbed } = embedTemplate({
      title: `${SUN} Suggestion Sent ${SUN}`,
      description:
        `> ${ARROW} Your suggestion has been forwarded to the suggestion channel.\n` +
        `> ${ARROW} Thank you for helping improve Greenville Community.`,
      noLogo: true,
    });

    confirmEmbed.setThumbnail(user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [confirmEmbed] });
  },
};
