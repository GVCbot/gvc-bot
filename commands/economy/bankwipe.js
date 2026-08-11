const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650"; // HR ONLY
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankwipe")
    .setDescription("HR ONLY — Delete a specific bank from a user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("User whose bank you want to wipe")
        .setRequired(true),
    ),

  async execute(interaction) {
    // HR role check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const targetUser = interaction.options.getUser("user");
    const userRecord = await getUserRecord(targetUser.id);

    const banks = userRecord.banks ?? [];

    if (banks.length === 0) {
      const { embed } = embedTemplate({
        title: "🏦 No Banks",
        description: `> ${ARROW} This user has no banks.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const bankOptions = banks.map((b) => ({
      label: `${b.type}`,
      description: `Balance: $${b.balance.toLocaleString()}`,
      value: b.id,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`bankwipe_select_${targetUser.id}`)
      .setPlaceholder("Select a bank to delete")
      .addOptions(bankOptions);

    const row = new ActionRowBuilder().addComponents(menu);

    const { embed } = embedTemplate({
      title: `${SUN} Bank Wipe — ${targetUser.username} ${SUN}`,
      description: `> ${ARROW} Select which bank you want to delete.`,
      noLogo: true,
    });

    embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
