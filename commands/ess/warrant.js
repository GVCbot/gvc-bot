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
    .setName("warrant")
    .setDescription("LEO: Issue a warrant for a user.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user receiving the warrant.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("offense")
        .setDescription("Offense (custom text).")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Reason for the warrant (custom text).")
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
          `${STAR} Access Denied ${STAR}`,
        description:
          `> ${ARROW} You are not authorized to issue warrants.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const target = interaction.options.getUser("user");
    const offense = interaction.options.getString("offense");
    const reason = interaction.options.getString("reason");

    // Load user record
    const userRecord = await getUserRecord(target.id);

    // Ensure records object exists
    if (!userRecord.records) {
      userRecord.records = { citations: [], warrants: [], blackpoints: 0 };
    }

    // Generate case number
    const caseNumber = `W-${Math.floor(Math.random() * 90000 + 10000)}`;

    // Build warrant entry
    const warrantEntry = {
      case: caseNumber,
      offense,
      reason,
      timestamp: Date.now(),
    };

    // Add warrant
    userRecord.records.warrants.push(warrantEntry);

    // Save
    await updateUserRecord(userRecord);

    // Build embed for LEO confirmation
    const desc =
      `> ${ARROW} **Warrant Issued For:** <@${target.id}>\n` +
      `> ${ARROW} **Case:** ${caseNumber}\n` +
      `> ${ARROW} **Offense:** ${offense}\n` +
      `> ${ARROW} **Reason:** ${reason}\n` +
      `> ${ARROW} **Status:** ⚠️ Active Warrant`;

    const { embed } = embedTemplate({
      title:
        `${STAR} Warrant Issued ${STAR}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const dmDesc =
        `> ${ARROW} **A warrant has been issued for you.**\n\n` +
        `> ${BULLETPOINT} **Case:** ${caseNumber}\n` +
        `> ${BULLETPOINT} **Offense:** ${offense}\n` +
        `> ${BULLETPOINT} **Reason:** ${reason}\n` +
        `> ${BULLETPOINT} **Issued By:** ${interaction.user.username}`;

      const { embed: dmEmbed } = embedTemplate({
        title:
          "${STAR} Active Warrant Notice ${STAR}",
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
