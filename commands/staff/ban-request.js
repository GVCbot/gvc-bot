const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");

const HR_ROLE = "1350582607217430650"; // GVC HR
const STAFF_ROLE = "1350897509752373341"; // GVC Staff
const BAN_REQUEST_CHANNEL = "1479544563684216843"; // Ban request channel

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban-request")
    .setDescription("Submit a ban request to HR.")
    .addUserOption((opt) =>
      opt
        .setName("target")
        .setDescription("User to request a ban for")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("reason")
        .setDescription("Reason for the ban request")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("evidence")
        .setDescription("Evidence (links, description, etc.)")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // Staff-only check
    if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
      return interaction.editReply(
        "❌ Only GVC Staff can submit ban requests.",
      );
    }

    const target = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");
    const evidence = interaction.options.getString("evidence");

    const guildMember = await interaction.guild.members
      .fetch(target.id)
      .catch(() => null);
    const joinedUnix = guildMember
      ? Math.floor(guildMember.joinedTimestamp / 1000)
      : "Unknown";

    const unix = Math.floor(Date.now() / 1000);

    const { embed, files } = embedTemplate({
      title: "🚨 Ban Request Submitted",
      description:
        `> **Requested By:** ${interaction.user} (${interaction.user.id})\n` +
        `> **Target User:** ${target} (${target.id})\n` +
        `> **Requested At:** <t:${unix}:F>\n` +
        `> **Joined GVC:** ${guildMember ? `<t:${joinedUnix}:F>` : "Unknown"}\n\n` +
        `> **Reason:**\n${reason}\n\n` +
        `> **Evidence:**\n${evidence}\n\n` +
        `> <@&${HR_ROLE}> Please review this ban request.`,
      noLogo: false,
    });

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          `banreq_handle_${interaction.user.id}_${target.id}_${unix}`,
        )
        .setLabel("Handled")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`banreq_deny_${interaction.user.id}_${target.id}_${unix}`)
        .setLabel("Denied")
        .setStyle(ButtonStyle.Danger),
    );

    const channel = interaction.guild.channels.cache.get(BAN_REQUEST_CHANNEL);
    if (!channel) {
      return interaction.editReply("❌ Ban request channel not found.");
    }

    await channel.send({
      content: `<@&${HR_ROLE}>`,
      embeds: [embed],
      files,
      components: [row],
    });

    return interaction.editReply("✅ Ban request submitted to HR.");
  },
};
