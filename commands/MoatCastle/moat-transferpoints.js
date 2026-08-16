const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW, MOATCASTLE } = MOATEMOJIS;

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-transferpoints")
    .setDescription("Transfer Moat Castle reward points to another user.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to transfer points to")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of points to transfer")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const senderId = interaction.user.id;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    // Prevent self-transfer
    if (receiver.id === senderId) {
      const { embed, files } = moatembedTemplate({
        title: "Transfer Error",
        description: `${ARROW} You cannot transfer points to yourself.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const sender = await getUserRecord(senderId);
    const receiverRecord = await getUserRecord(receiver.id);

    // Ensure receiver has a Moat Castle account
    if (!receiverRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Receiver Has No Account",
        description: `${ARROW} That user does not have a Moat Castle account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Receiver already has max points
    if ((receiverRecord.moatCastle.rewards || 0) >= 5000) {
      const { embed, files } = moatembedTemplate({
        title: "Cannot Transfer Points",
        description: `${ARROW} That user already has **5000 points**.\n${ARROW} You cannot transfer any more points to them.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Ensure card is not frozen
    if (sender.moatCastle.cardStatus === "Frozen") {
      const { embed, files } = moatembedTemplate({
        title: "Card Frozen",
        description: `${ARROW} Your Moat Castle card is frozen.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Ensure receiver has a Moat Castle account
    if (!receiverRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Receiver Has No Account",
        description: `${ARROW} That user does not have a Moat Castle account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Validate amount
    if (amount <= 0) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Amount",
        description: `${ARROW} Amount must be greater than 0.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const senderPoints = sender.moatCastle.rewards || 0;
    const receiverPoints = receiverRecord.moatCastle.rewards || 0;

    // Check sender has enough points
    if (senderPoints < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Points",
        description: `${ARROW} You only have **${senderPoints} points**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Apply transfer
    sender.moatCastle.rewards = senderPoints - amount;
    receiverRecord.moatCastle.rewards = Math.min(receiverPoints + amount, 5000);

    await updateUserRecord(sender);
    await updateUserRecord(receiverRecord);

    // Confirmation embed
    const { embed, files } = moatembedTemplate({
      title: "Points Transferred",
      description:
        `${ARROW} **You transferred:** ${amount.toLocaleString()} points\n` +
        `${ARROW} **To:** <@${receiver.id}>\n\n` +
        `${ARROW} **Your New Points:** ${sender.moatCastle.rewards.toLocaleString()} / 5000\n` +
        `${ARROW} **Their New Points:** ${receiverRecord.moatCastle.rewards.toLocaleString()} / 5000`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
