const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chickenfight")
    .setDescription("Bet your cash on a high-stakes chicken fight!")
    .addStringOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount to bet (number or 'all')")
        .setRequired(true),
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const rawInput = interaction.options
      .getString("amount")
      .trim()
      .toLowerCase();

    // Fetch user economy record
    const user = await getUserRecord(userId);

    // Validate cash balance
    if (!user.cash || user.cash <= 0) {
      const { embed, files } = embedTemplate({
        title: "🐔 Chicken Fight — Broke!",
        description: "You don't have any cash in your wallet to place a bet!",
        color: 0xff4d4d, // Red for error
      });
      return interaction.reply({ embeds: [embed], files, flags: 64 });
    }

    let betAmount = 0;

    // Handle "all" or specific numerical bet
    if (rawInput === "all") {
      betAmount = user.cash;
    } else {
      const parsed = parseInt(rawInput, 10);
      if (isNaN(parsed) || parsed <= 0) {
        const { embed, files } = embedTemplate({
          title: "🐔 Chicken Fight — Invalid Bet",
          description: "Please enter a valid positive number or write `'all'`.",
          color: 0xff4d4d,
        });
        return interaction.reply({ embeds: [embed], files, flags: 64 });
      }
      betAmount = parsed;
    }

    // Check if user has enough cash
    if (betAmount > user.cash) {
      const { embed, files } = embedTemplate({
        title: "🐔 Chicken Fight — Insufficient Funds",
        description: `You can't bet **$${betAmount.toLocaleString()}**! You only have **$${user.cash.toLocaleString()}** in cash.`,
        color: 0xff4d4d,
      });
      return interaction.reply({ embeds: [embed], files, flags: 64 });
    }

    // 50/50 Win Chance
    const won = Math.random() < 0.5;

    let resultTitle = "";
    let resultDescription = "";
    let embedColor = 0x000000;

    if (won) {
      // 2x Return: Net gain equals the original bet (+300)
      const payout = betAmount * 2;
      user.cash += betAmount; // Adding +betAmount achieves the net 2x payout (Balance - Bet + Payout)

      resultTitle = "🐔 Chicken Fight — VICTORY!";
      resultDescription =
        `Your roost-master obliterated the opponent's chicken!\n\n` +
        `**Bet Placed:** $${betAmount.toLocaleString()}\n` +
        `**Total Returned (2x):** $${payout.toLocaleString()}\n` +
        `**Net Profit:** +$${betAmount.toLocaleString()}\n` +
        `**New Cash Balance:** $${user.cash.toLocaleString()}`;
      embedColor = 0x57f287; // Green
    } else {
      user.cash -= betAmount;

      resultTitle = "🐔 Chicken Fight — DEFEAT!";
      resultDescription =
        `Your chicken was turned into nuggets...\n\n` +
        `**Amount Lost:** -$${betAmount.toLocaleString()}\n` +
        `**New Cash Balance:** $${user.cash.toLocaleString()}`;
      embedColor = 0xed4245; // Red
    }

    // Save updated balance to MongoDB
    await updateUserRecord(user);

    // Build & send embed using your custom template
    const { embed, files } = embedTemplate({
      title: resultTitle,
      description: resultDescription,
      color: embedColor,
    });

    return interaction.reply({ embeds: [embed], files });
  },
};
