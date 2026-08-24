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
    .setName("ecoadd")
    .setDescription("HR: Add money to a user's cash balance.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to give money to.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of money to add.")
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
          "${STAR}Invalid Amount ${STAR}",
        description:
          "> $(ARROW) Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Load user record
    const receiverRecord = await getUserRecord(receiver.id);

    // Add to CASH only
    receiverRecord.cash = receiverRecord.cash ?? 0;
    receiverRecord.cash += amount;

    await updateUserRecord(receiverRecord);

    const desc =
      `> ${BULLETPOINT} **Added to:** <@${receiver.id}>\n` +
      `> ${BULLETPOINT} **Amount:** $${amount.toLocaleString()}\n` +
      `> ${BULLETPOINT} **New Cash Balance:** $${receiverRecord.cash.toLocaleString()}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Money Added ${STAR}",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the receiver
    try {
      const { embed: dmEmbed } = embedTemplate({
        title:
          `${STAR} Money Received ${STAR}`,
        description:
          `> ${BULLETPOINT} **From:** ${hrMember.user.username} (HR)\n` +
          `> ${BULLETPOINT} **Amount:** $${amount.toLocaleString()}\n` +
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
