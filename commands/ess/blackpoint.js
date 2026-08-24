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
    .setName("blackpoint")
    .setDescription("LEO: Add blackpoints to a user's record.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user receiving blackpoints.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of blackpoints to add.")
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
          "> ${ARROW} You are not authorized to add blackpoints.",
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const target = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title:
          "${STAR} Invalid Amount ${STAR}",
        description:
          "> ${ARROW} Amount must be greater than 0.",
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Load user record
    const userRecord = await getUserRecord(target.id);

    // Ensure records object exists
    if (!userRecord.records) {
      userRecord.records = { citations: [], warrants: [], blackpoints: 0 };
    }

    // Add blackpoints
    userRecord.records.blackpoints += amount;

    await updateUserRecord(userRecord);

    const desc =
      `> ${ARROW} **Blackpoints Added To:** <@${target.id}>\n` +
      `> ${ARROW} **Amount:** ${amount}\n` +
      `> ${ARROW} **New Total:** ${userRecord.records.blackpoints}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Blackpoints Added ${STAR}",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const dmDesc =
        `> ${ARROW} **Blackpoints have been added to your record.**\n\n` +
        `> ${BULLETPOINT} **Amount:** ${amount}\n` +
        `> ${BULLETPOINT} **New Total:** ${userRecord.records.blackpoints}\n` +
        `> ${BULLETPOINT} **Added By:** ${interaction.user.username}`;

      const { embed: dmEmbed } = embedTemplate({
        title:
          "${STAR} Blackpoint Notice ${STAR}",
        description: dmDesc,
        noLogo: true,
      });

      dmEmbed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

      await target.send({ embeds: [dmEmbed] });
    } catch {}
  },
};
