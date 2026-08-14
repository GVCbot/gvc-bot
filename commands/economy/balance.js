const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your cash balance or someone else's.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("Optional: view another user's balance")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const userRecord = await getUserRecord(targetUser.id);

    if (!userRecord) {
      const { embed } = embedTemplate({
        title: "❌ No Profile Found",
        description: `> <@${targetUser.id}> does not have an economy profile yet.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const cash = userRecord.cash ?? 0;

    const desc =
      `${ARROW} **Cash Balance:** $${cash.toLocaleString()}\n\n` +
      `> ${ARROW} This shows **GVC cash only**.\n` +
      `> ${ARROW} Bank balance is separate and accessed via bank commands.`;

    const { embed } = embedTemplate({
      title: `${SUN} Balance — ${targetUser.username} ${SUN}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
