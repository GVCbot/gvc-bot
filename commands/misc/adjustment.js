const { SlashCommandBuilder } = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

const HR_ROLE_ID = "1350582607217430650"; // HR role ID
const TARGET_CHANNEL_ID = "1350844469431504929"; // Channel where embed will be sent
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("adjustment")
    .setDescription("HR-only command for staff adjustments.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Select the user to adjust.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Type of adjustment.")
        .setRequired(true)
        .addChoices(
          { name: "Handpick", value: "handpick" },
          { name: "Promotion", value: "promotion" },
          { name: "Demotion", value: "demotion" },
          { name: "Termination", value: "termination" },
          { name: "Resignation", value: "resignation" },
          { name: "Blacklist", value: "blacklist" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the adjustment.")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Anti-spam
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    // HR-only check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const targetUser = interaction.options.getUser("user");
    const type = interaction.options.getString("type");
    const reason = protect.sanitize(interaction.options.getString("reason"));
    const executor = interaction.user;

    // Banner selection based on type
    const bannerMap = {
      handpick: "gvchandpick.png",
      promotion: "gvcpromotion.png",
      demotion: "gvcdemotion.png",
      termination: "gvctermination.png",
      resignation: "gvcresignation.png",
      blacklist: "gvcblacklist.png",
    };

    const bannerFile = path.join(__dirname, "../../graphics", bannerMap[type]);

    const description =
      `> ${ARROW} **User:** ${targetUser} (${targetUser.id})\n` +
      `> ${ARROW} **Type:** ${type.charAt(0).toUpperCase() + type.slice(1)}\n` +
      `> ${ARROW} **Reason:** ${reason}\n` +
      `> ${ARROW} **Carried Out By:** ${executor} (${executor.id})`;

    const { embed, files } = embedTemplate({
      title: `${SUN} Staff Adjustment ${SUN}`,
      description,
      banner: bannerFile,
    });

    embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    // Send to HR channel
    const hrChannel = interaction.guild.channels.cache.get(TARGET_CHANNEL_ID);
    if (!hrChannel) {
      return interaction.editReply({
        content: "❌ HR channel not found. Please check the ID.",
      });
    }

    await hrChannel.send({
      content: `${targetUser}`, // ping outside embed
      embeds: [embed],
      files,
      allowedMentions: { parse: ["users"] },
    });

    await interaction.editReply({
      content: `✅ Adjustment for ${targetUser.tag} (${type}) sent successfully to <#${TARGET_CHANNEL_ID}>.`,
    });
  },
};
