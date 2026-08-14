const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const moatembedTemplate = require("../../utils/moatembedTemplate");
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

    const loanChannelId = "1537722326496452678"; // Loan review channel
    const loanRoleId = "1537722114176581724"; // Loan officer role

    const userRecord = await getUserRecord(user.id);

    // Ensure Moat Castle account exists
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> <:moatcastleright:1537695231409918002> You must create a Moat Castle account first.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Create loan request object
    const loanRequest = {
      requesterId: user.id,
      amount,
      reason,
      createdAt: Date.now(),
      status: "pending",
    };

    // Store loan request in user record
    if (!userRecord.moatCastle.loanRequests) {
      userRecord.moatCastle.loanRequests = [];
    }

    userRecord.moatCastle.loanRequests.push(loanRequest);
    await updateUserRecord(userRecord);

    // Build embed for loan officers
    const { embed, files } = moatembedTemplate({
      title: "💰 Moat Castle Loan Request",
      description:
        `> <:moatcastleright:1537695231409918002> **Requester:** ${user} (${user.id})\n` +
        `> <:moatcastleright:1537695231409918002> **Requested Amount:** $${amount.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Reason:** ${reason}\n` +
        `> <:moatcastleright:1537695231409918002> **Status:** Pending Review\n\n` +
        `> <:moatcastleright:1537695231409918002> <@&${loanRoleId}> please review this request.`,
      noLogo: false,
    });

    // Buttons for loan officers
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`moat_loan_accept_${user.id}_${amount}`)
        .setLabel("Accept Request")
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`moat_loan_deny_${user.id}_${amount}`)
        .setLabel("Deny Request")
        .setStyle(ButtonStyle.Danger),
    );

    // Send to loan review channel
    const loanChannel = interaction.client.channels.cache.get(loanChannelId);
    if (loanChannel) {
      await loanChannel.send({
        content: `<@&${loanRoleId}>`,
        embeds: [embed],
        files,
        components: [row],
      });
    }

    // User confirmation
    return interaction.editReply({
      content: `✅ Your Moat Castle loan request for **$${amount.toLocaleString()}** has been submitted.`,
    });
  },
};
