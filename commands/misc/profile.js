const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  loadRoleIncome,
  loadWorkMessages,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription("View a civilian's economy profile.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to view (optional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user") || interaction.user;
    const targetMember = interaction.guild.members.cache.get(targetUser.id);

    const userRecord = await getUserRecord(targetUser.id);
    const roleIncome = await loadRoleIncome();
    const workMessages = await loadWorkMessages();

    const cash = userRecord.cash ?? 0;
    const lastCollect = userRecord.lastCollect ?? 0;
    const lastWork = userRecord.lastWork ?? 0;

    // Income breakdown
    let incomeBreakdown = "";
    let totalRoleIncome = 0;

    for (const [roleId, amount] of Object.entries(roleIncome)) {
      if (targetMember.roles.cache.has(roleId)) {
        const role = interaction.guild.roles.cache.get(roleId);
        const roleName = role ? role.name : `Unknown (${roleId})`;
        incomeBreakdown += `> ${ARROW} ${roleName}: $${amount}\n`;
        totalRoleIncome += amount;
      }
    }

    if (!incomeBreakdown) {
      incomeBreakdown = `> ${ARROW} No income roles.`;
    }

    // Build profile description
    let desc = "";

    desc += `\n> ${ARROW} **Last Collected:** ${
      lastCollect ? `<t:${Math.floor(lastCollect / 1000)}:R>` : "Never"
    }\n`;

    desc += `> ${ARROW} **Last Work:** ${
      lastWork ? `<t:${Math.floor(lastWork / 1000)}:R>` : "Never"
    }\n\n`;

    desc += `> ${ARROW} **Account Created:** <t:${Math.floor(
      targetUser.createdTimestamp / 1000,
    )}:D>\n`;

    desc += `> ${ARROW} **Joined Server:** <t:${Math.floor(
      targetMember.joinedTimestamp / 1000,
    )}:D>\n\n`;

    desc += `> ${ARROW} **Role Income:**\n${incomeBreakdown}\n`;
    desc += `> ${ARROW} **Total Role Income:** $${totalRoleIncome.toLocaleString()}\n\n`;

    desc += `> ${ARROW} **Work Messages Loaded:** ${workMessages.length}`;

    const { embed } = embedTemplate({
      title: `${SUN} ${targetUser.username}'s Profile ${SUN}`,
      description: desc,
    });

    embed.setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

    // Buttons
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`viewVehicles_${interaction.user.id}_${targetUser.id}`)
        .setLabel("View Vehicles")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`viewRecords_${interaction.user.id}_${targetUser.id}`)
        .setLabel("Records")
        .setStyle(ButtonStyle.Danger),
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
