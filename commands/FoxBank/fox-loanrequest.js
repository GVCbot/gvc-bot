const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { FOXICON, ARROW } = FOXEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-loanrequest")
    .setDescription("Request a loan from Fox Bank.")
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

    const loanChannelId = "1537722326496452678"; // Fox Bank loan channel
    const loanRoleId = "1537894455779270717"; // Fox Bank staff role

    const userRecord = await getUserRecord(user.id);

    // Ensure Fox Bank account exists
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `> ${ARROW} You must create a Fox Bank account first.\n` +
          `> ${ARROW} Use **/fox-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Prevent multiple active loans
    if (userRecord.foxBank.loans && userRecord.foxBank.loans.length > 0) {
      const { embed, files } = foxbankembedTemplate({
        title: "Active Loan Exists",
        description:
          `> ${ARROW} You already have an active Fox Bank loan.\n` +
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

    if (!userRecord.foxBank.loanRequests) {
      userRecord.foxBank.loanRequests = [];
    }

    userRecord.foxBank.loanRequests.push(loanRequest);
    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "🦊 Fox Bank Loan Request",
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
        .setCustomId(`fox_loan_accept_${user.id}_${loanRequest.id}`)
        .setLabel("Accept Request")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`fox_loan_deny_${user.id}_${loanRequest.id}`)
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
      content: `✅ Your Fox Bank loan request for **$${amount.toLocaleString()}** has been submitted.`,
    });
  },
};
