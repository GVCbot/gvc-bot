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
    .setName("blackpointremove")
    .setDescription("LEO: Remove blackpoints from a user's record.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user losing blackpoints.")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("amount")
        .setDescription("Number of blackpoints to remove or 'all'.")
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
          `> ${ARROW} You are not authorized to remove blackpoints.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const target = interaction.options.getUser("user");
    const input = interaction.options.getString("amount").trim().toLowerCase();

    // Load user record
    const userRecord = await getUserRecord(target.id);

    // Ensure records object exists
    if (!userRecord.records) {
      userRecord.records = { citations: [], warrants: [], blackpoints: 0 };
    }

    const currentPoints = userRecord.records.blackpoints ?? 0;

    if (currentPoints <= 0) {
      const { embed } = embedTemplate({
        title:
          `${STAR} No Blackpoints ${STAR}`,
        description: `> ${ARROW} <@${target.id}> currently has 0 blackpoints.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    let amountToRemove = 0;

    if (input === "all") {
      amountToRemove = currentPoints;
    } else {
      amountToRemove = parseInt(input, 10);
    }

    if (isNaN(amountToRemove) || amountToRemove <= 0) {
      const { embed } = embedTemplate({
        title:
          `${STAR} Invalid Amount ${STAR}`,
        description:
          `> ${ARROW} Please provide a valid positive number or type "all".`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (amountToRemove > currentPoints) {
      const { embed } = embedTemplate({
        title:
          `${STAR} Invalid Amount ${STAR}`,
        description: `> ${ARROW} Cannot remove **${amountToRemove}** blackpoints because <@${target.id}> only has **${currentPoints}**.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Deduct blackpoints
    userRecord.records.blackpoints -= amountToRemove;

    await updateUserRecord(userRecord);

    const desc =
      `> ${ARROW} **Blackpoints Removed From:** <@${target.id}>\n` +
      `> ${ARROW} **Amount Removed:** ${amountToRemove}\n` +
      `> ${ARROW} **New Total:** ${userRecord.records.blackpoints}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Blackpoints Removed ${STAR}",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const dmDesc =
        `> ${ARROW} **Blackpoints have been removed from your record.**\n\n` +
        `> ${BULLETPOINT} **Amount Removed:** ${amountToRemove}\n` +
        `> ${BULLETPOINT} **New Total:** ${userRecord.records.blackpoints}\n` +
        `> ${BULLETPOINT} **Removed By:** ${interaction.user.username}`;

      const { embed: dmEmbed } = embedTemplate({
        title:
          "${STAR} Blackpoint Removal Notice ${STAR}",
        description: dmDesc,
        noLogo: true,
      });

      dmEmbed.setThumbnail(target.displayAvatarURL({ dynamic: true }));

      await target.send({ embeds: [dmEmbed] });
    } catch {}
  },
};