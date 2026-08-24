const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650"; // HR Staff role

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";
const BULLETPOINT = "<:bulletpoint:1541479624209604608>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ecoremove")
    .setDescription("HR: Remove money from a user's cash balance.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove money from.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of money to remove.")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // HR role check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      const { embed } = embedTemplate({
        title:
          "${STAR} Access Denied ${STAR}",
        description:
          "> ${ARROW} Only HR staff can use this command.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const hrMember = interaction.member;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title:
          "${STAR} Invalid Amount ${STAR}",
        description:
          "> ${ARROW} Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const receiverRecord = await getUserRecord(receiver.id);

    receiverRecord.cash = receiverRecord.cash ?? 0;

    if (receiverRecord.cash < amount) {
      const { embed } = embedTemplate({
        title:
          "${STAR} Insufficient Funds ${STAR}",
        description:
          "> ${ARROW} That user does not have enough cash.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Remove ONLY from cash
    receiverRecord.cash -= amount;

    await updateUserRecord(receiverRecord);

    const desc =
      `> ${BULLETPOINT} **Removed from:** <@${receiver.id}>\n` +
      `> ${BULLETPOINT} **Amount:** $${amount.toLocaleString()}\n` +
      `> ${BULLETPOINT} **New Cash Balance:** $${receiverRecord.cash.toLocaleString()}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Money Removed ${STAR}",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const { embed: dmEmbed } = embedTemplate({
        title:
          "${STAR} Money Removed ${STAR}",
        description:
          `> ${BULLETPOINT} **By:** ${hrMember.user.username} (HR)\n` +
          `> ${BULLETPOINT} **Amount Removed:** $${amount.toLocaleString()}\n` +
          `> ${BULLETPOINT} **New Cash Balance:** $${receiverRecord.cash.toLocaleString()}`,
        noLogo: true,
      });

      dmEmbed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));

      await receiver.send({ embeds: [dmEmbed] });
    } catch {
      // Ignore if DMs are closed
    }
  },
};
