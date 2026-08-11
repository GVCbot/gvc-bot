const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";
const HR_ROLE_ID = "1350582607217430650";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrviewbank")
    .setDescription("HR ONLY — View someone else's bank information.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("The user whose bank you want to view")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("bankid").setDescription("Bank ID to view").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // HR check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      const { embed } = embedTemplate({
        title: "❌ Access Denied",
        description: "> Only **HR** can use this command.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const targetUser = interaction.options.getUser("user");
    const bankId = interaction.options.getString("bankid");

    const targetRecord = await getUserRecord(targetUser.id);

    if (!targetRecord.banks || targetRecord.banks.length === 0) {
      const { embed } = embedTemplate({
        title: "❌ No Banks",
        description: `> ${targetUser.username} has no banks.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const bank = targetRecord.banks.find((b) => b.id === bankId);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> That bank ID does not exist for this user.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Build HR view embed
    const { embed } = embedTemplate({
      title: `${SUN} HR Bank Viewer ${SUN}`,
      description:
        `> ${ARROW} **Bank ID:** ${bank.id}\n` +
        `> ${ARROW} **Type:** ${bank.type}\n` +
        `> ${ARROW} **Owner:** <@${bank.owner}>\n` +
        `> ${ARROW} **Members:** ${bank.members.map((m) => `<@${m}>`).join(", ")}\n` +
        `> ${ARROW} **Balance:** $${bank.balance.toLocaleString()}\n` +
        `> ${ARROW} **Password:** ${bank.password}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
