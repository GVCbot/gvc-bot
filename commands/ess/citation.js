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
    .setName("citation")
    .setDescription("LEO: Add a citation to a user's record.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user receiving the citation.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("violation")
        .setDescription("Violation type (custom text).")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("offense")
        .setDescription("Offense description (custom text).")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option.setName("price").setDescription("Ticket price.").setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("location")
        .setDescription("Location of the incident.")
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
          "> ${ARROW} You are not authorized to issue citations.",
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const target = interaction.options.getUser("user");
    const violation = interaction.options.getString("violation");
    const offense = interaction.options.getString("offense");
    const price = interaction.options.getInteger("price");
    const location = interaction.options.getString("location");

    // Load user record
    const userRecord = await getUserRecord(target.id);

    // Ensure records object exists
    if (!userRecord.records) {
      userRecord.records = { citations: [], warrants: [], blackpoints: 0 };
    }

    // Generate case number
    const caseNumber = `C-${Math.floor(Math.random() * 90000 + 10000)}`;

    // Build citation entry
    const citationEntry = {
      case: caseNumber,
      violation,
      offense,
      price,
      location,
      timestamp: Date.now(),
    };

    // Add citation
    userRecord.records.citations.push(citationEntry);

    // Save
    await updateUserRecord(userRecord);

    // Build embed for LEO confirmation
    const desc =
      `> ${ARROW} **Citation Issued To:** <@${target.id}>\n` +
      `> ${ARROW} **Case:** ${caseNumber}\n` +
      `> ${ARROW} **Violation:** ${violation}\n` +
      `> ${ARROW} **Offense:** ${offense}\n` +
      `> ${ARROW} **Price:** $${price}\n` +
      `> ${ARROW} **Location:** ${location}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Citation Added ${STAR}",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const dmDesc =
        `> ${ARROW} **You have received a citation.**\n\n` +
        `> ${BULLETPOINT} **Case:** ${caseNumber}\n` +
        `> ${BULLETPOINT} **Violation:** ${violation}\n` +
        `> ${BULLETPOINT} **Offense:** ${offense}\n` +
        `> ${BULLETPOINT} **Price:** $${price}\n` +
        `> ${BULLETPOINT} **Location:** ${location}\n` +
        `> ${BULLETPOINT} **Issued By:** ${interaction.user.username}`;

      const { embed: dmEmbed } = embedTemplate({
        title:
          "${STAR} New Citation Issued ${STAR}",
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
