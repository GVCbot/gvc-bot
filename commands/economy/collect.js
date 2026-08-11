const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  loadRoleIncome,
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("collect")
    .setDescription("Collect your role-based income.")
    .setDefaultMemberPermissions(PermissionFlagsBits.SendMessages),

  async execute(interaction) {
    const member = interaction.member;
    const userId = interaction.user.id;

    const roleIncome = await loadRoleIncome();
    const user = await getUserRecord(userId);

    const now = Date.now();
    const cooldownMs = 60 * 60 * 1000; // 1 hour

    // Bypass cooldown using ROLE
    const bypassRole = "1368142895181205636";
    const isBypass = interaction.member.roles.cache.has(bypassRole);

    // COOLDOWN → EPHEMERAL
    if (!isBypass && user.lastCollect && now - user.lastCollect < cooldownMs) {
      const remaining = cooldownMs - (now - user.lastCollect);

      await interaction.deferReply({ ephemeral: true });

      const { embed } = embedTemplate({
        title: "⏳ Cooldown Active",
        description: `You already collected.\nTry again <t:${Math.floor((now + remaining) / 1000)}:R>.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // CALCULATE INCOME
    let totalIncome = 0;
    const earnedFrom = [];

    for (const [roleId, amount] of Object.entries(roleIncome)) {
      if (member.roles.cache.has(roleId)) {
        totalIncome += amount;
        earnedFrom.push({ roleId, amount });
      }
    }

    // NO INCOME ROLES → EPHEMERAL
    if (totalIncome === 0) {
      await interaction.deferReply({ ephemeral: true });
      return interaction.editReply({
        content: "❌ You don't have any income-eligible roles.",
      });
    }

    // SUCCESSFUL COLLECT → PUBLIC
    await interaction.deferReply();

    user.cash = (user.cash ?? 0) + totalIncome;
    user.lastCollect = now;
    await updateUserRecord(user);

    let desc = "";
    desc += `> <:arrowright:1534182706836144158> **Total Collected:** $${totalIncome}\n`;
    desc += `> <:arrowright:1534182706836144158> **New Cash Balance:** $${user.cash.toLocaleString()}\n\n`;
    desc += `> <:arrowright:1534182706836144158> **Income Breakdown:**\n`;

    for (const entry of earnedFrom) {
      const role = interaction.guild.roles.cache.get(entry.roleId);
      const roleName = role ? role.name : `Unknown (${entry.roleId})`;
      desc += `> • ${roleName}: $${entry.amount}\n`;
    }

    const { embed } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Income Collected <a:gvcsunspin:1527220557890850846>",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
