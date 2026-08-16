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
    .setName("moat-deposit")
    .setDescription("Deposit cash into your Moat Castle account."),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const user = await getUserRecord(userId);

    // Ensure user has a Moat Castle account
    if (!user.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description: `${ARROW} You must create a Moat Castle account first.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const depositAmount = user.cash || 0;

    // Nothing to deposit
    if (depositAmount <= 0) {
      const { embed, files } = moatembedTemplate({
        title: "Deposit Error",
        description: `${ARROW} You have no cash to deposit.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Calculate points earned (example: 1 point per $1,000)
    let pointsEarned = Math.floor(depositAmount / 1000);

    // Current points and cap
    const currentPoints = user.moatCastle.rewards || 0;
    const maxPoints = 5000;
    const potentialTotal = currentPoints + pointsEarned;

    // Cap logic
    if (currentPoints >= maxPoints) {
      pointsEarned = 0;
    } else if (potentialTotal > maxPoints) {
      pointsEarned = maxPoints - currentPoints;
    }

    // Apply deposit and points
    user.moatCastle.balance = (user.moatCastle.balance || 0) + depositAmount;
    user.cash = 0;
    user.moatCastle.rewards = currentPoints + pointsEarned;

    await updateUserRecord(user);

    // Embed message
    const pointsMessage =
      pointsEarned === 0
        ? `${ARROW} Cannot earn more points — already at max (5,000).`
        : `${ARROW} Points Earned: ${pointsEarned.toLocaleString()}`;

    const { embed, files } = moatembedTemplate({
      title: "Deposit Successful",
      description:
        `${ARROW} Deposited: $${depositAmount.toLocaleString()}\n` +
        `${pointsMessage}\n\n` +
        `${ARROW} New Cash Balance: $${user.cash.toLocaleString()}\n` +
        `${ARROW} Total Castle Points: ${user.moatCastle.rewards.toLocaleString()} / 5,000`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
