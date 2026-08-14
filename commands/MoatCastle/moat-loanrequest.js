const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-loanrequest")
    .setDescription("Request a loan from Moat Castle.")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Loan amount you want to request.")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("reason")
        .setDescription("Reason for requesting the loan.")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const amount = interaction.options.getInteger("amount");
    const reason = interaction.options.getString("reason");
    const user = interaction.user;

    const loanChannelId = "1537722326496452678";
    const loanRoleId = "1537722114176581724";

    const userRecord = await getUserRecord(user.id);

    // Ensure Moat Castle account exists
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> ${ARROW} You must create a Moat Castle account first.\n` +
          `> ${ARROW} Use **/moat-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ⭐ NEW: Prevent multiple active loans
    if (userRecord.moatCastle.loans && userRecord.moatCastle.loans.length > 0) {
      const { embed, files } = moatembedTemplate({
        title: "Active Loan Exists",
        description:
          `> ${ARROW} You already have an active Moat Castle loan.\n` +
          `> ${ARROW} You must pay or clear your existing loan before requesting another.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Create loan request object
    const loanRequest = {
      id: Date.now().toString(),
      requesterId: user.id,
      amount,
      reason,
      createdAt: Date.now(),
      status: "pending",
    };

    if (!userRecord.moatCastle.loanRequests) {
      userRecord.moatCastle.loanRequests = [];
    }

    userRecord.moatCastle.loanRequests.push(loanRequest);
    userRecord.moatCastle.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "💰 Moat Castle Loan Request",
      description:
        `> ${ARROW} **Requester:** ${user} (${user.id})\n` +
        `> ${ARROW} **Requested Amount:** $${amount.toLocaleString()}\n` +
        `> ${ARROW} **Reason:** ${reason}\n` +
        `> ${ARROW} **Status:** Pending Review\n\n` +
        `> ${ARROW} <@&${loanRoleId}> please review this request.`,
      noLogo: false,
    });

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`moat_loan_accept_${user.id}_${loanRequest.id}`)
        .setLabel("Accept Request")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`moat_loan_deny_${user.id}_${loanRequest.id}`)
        .setLabel("Deny Request")
        .setStyle(ButtonStyle.Danger),
    );

    const loanChannel = interaction.client.channels.cache.get(loanChannelId);
    if (loanChannel) {
      await loanChannel.send({
        content: `<@&${loanRoleId}>`,
        embeds: [embed],
        files,
        components: [row],
      });
    }

    return interaction.editReply({
      content: `✅ Your Moat Castle loan request for **$${amount.toLocaleString()}** has been submitted.`,
    });
  },
};
