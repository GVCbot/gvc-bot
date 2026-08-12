const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";
const HR_ROLE_ID = "1350582607217430650";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrwithdraw")
    .setDescription("HR ONLY — Move a user's bank balance into their cash.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose bank you want to withdraw from")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("bankid")
        .setDescription("Bank ID to withdraw from")
        .setRequired(true),
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

    const userRecord = await getUserRecord(targetUser.id);

    if (!userRecord.banks || userRecord.banks.length === 0) {
      const { embed } = embedTemplate({
        title: "❌ No Banks",
        description: `> ${targetUser.username} has no banks.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const bank = userRecord.banks.find((b) => b.id === bankId);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> That bank ID does not exist for this user.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const amount = bank.balance;

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title: "❌ No Balance",
        description: "> This bank has **0** balance.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Move money into cash
    userRecord.cash = (userRecord.cash ?? 0) + amount;
    bank.balance = 0;

    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: `${SUN} HR Withdrawal Complete ${SUN}`,
      description:
        `> ${ARROW} **User:** <@${targetUser.id}>\n` +
        `> ${ARROW} **Bank:** ${bank.name} (${bank.id})\n` +
        `> ${ARROW} **Amount Moved:** $${amount.toLocaleString()}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
