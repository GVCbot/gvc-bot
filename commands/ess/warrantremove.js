const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";
const BULLETPOINT = "<:bulletpoint:1541479624209604608>";

// LEO roles allowed to use this command
const LEO_ROLES = [
  "1352019732055851048",
  "1058635044308123719",
  "1058635001329107005",
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warrantremove")
    .setDescription("LEO: Remove a warrant from a user's record.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user whose warrant you want to remove.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("case")
        .setDescription("Case number of the warrant (e.g., W-12345).")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // LEO role check
    const member = interaction.member;
    const isLEO = LEO_ROLES.some((role) => member.roles.cache.has(role));

    if (!isLEO) {
      const { embed } = embedTemplate({
        title:
          "${STAR} Access Denied ${STAR}",
        description:
          "> ${ARROW} You are not authorized to remove warrants.",
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const target = interaction.options.getUser("user");
    const caseNumber = interaction.options.getString("case");

    // Load user record
    const userRecord = await getUserRecord(target.id);

    // Ensure records object exists
    if (!userRecord.records) {
      userRecord.records = { citations: [], warrants: [], blackpoints: 0 };
    }

    const warrants = userRecord.records.warrants;

    // Find warrant by case number
    const index = warrants.findIndex((w) => w.case === caseNumber);

    if (index === -1) {
      const { embed } = embedTemplate({
        title:
          "${STAR} Warrant Not Found ${STAR}",
        description: `> ${ARROW} No warrant found with case **${caseNumber}**.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Remove warrant
    const removed = warrants.splice(index, 1)[0];
    await updateUserRecord(userRecord);

    // Confirmation embed
    const desc =
      `> ${ARROW} **Warrant Removed For:** <@${target.id}>\n` +
      `> ${ARROW} **Case:** ${removed.case}\n` +
      `> ${ARROW} **Offense:** ${removed.offense}\n` +
      `> ${ARROW} **Reason:** ${removed.reason}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Warrant Removed ${STAR}",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const dmDesc =
        `> ${ARROW} **A warrant has been removed from your record.**\n\n` +
        `> ${BULLETPOINT} **Case:** ${removed.case}\n` +
        `> ${BULLETPOINT} **Offense:** ${removed.offense}\n` +
        `> ${BULLETPOINT} **Reason:** ${removed.reason}\n` +
        `> ${BULLETPOINT} **Removed By:** ${interaction.user.username}`;

      const { embed: dmEmbed } = embedTemplate({
        title:
          "${STAR} Warrant Removed ${STAR}",
        description: dmDesc,
        noLogo: true,
      });

      dmEmbed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

      await target.send({ embeds: [dmEmbed] });
    } catch {
      // User has DMs closed — silently ignore
    }
  },
};
