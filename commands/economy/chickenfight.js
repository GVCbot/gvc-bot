const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const ARROW = "<:arrowright:1541479360932876398>";
const BYPASS_ROLE_ID = "1368142895181205636";
const COOLDOWN_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds

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

    // -----------------------------------------------------
    // COOLDOWN SYSTEM
    // -----------------------------------------------------
    const hasBypassRole = interaction.member?.roles?.cache?.has(BYPASS_ROLE_ID);
    const lastFight = user.lastChickenFight || 0;
    const now = Date.now();

    if (!hasBypassRole && now - lastFight < COOLDOWN_DURATION) {
      const remainingMs = COOLDOWN_DURATION - (now - lastFight);
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor(
        (remainingMs % (1000 * 60 * 60)) / (1000 * 60),
      );
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

      const timeString = `${hours}h ${minutes}m ${seconds}s`;

      const { embed, files } = embedTemplate({
        title: "🐔 Chicken Fight — Cooldown",
        description: `${ARROW} Your chicken is resting! You can fight again in **${timeString}**.`,
        color: 0xff4d4d,
      });
      return interaction.reply({ embeds: [embed], files, flags: 64 });
    }

    // -----------------------------------------------------
    // BALANCE VALIDATION
    // -----------------------------------------------------
    if (!user.cash || user.cash <= 0) {
      const { embed, files } = embedTemplate({
        title: "🐔 Chicken Fight — Broke!",
        description: `${ARROW} You don't have any cash in your wallet to place a bet!`,
        color: 0xff4d4d,
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
          description: `${ARROW} Please enter a valid positive number or write \`'all'\`.`,
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
        description: `${ARROW} You can't bet **$${betAmount.toLocaleString()}**! You only have **$${user.cash.toLocaleString()}** in cash.`,
        color: 0xff4d4d,
      });
      return interaction.reply({ embeds: [embed], files, flags: 64 });
    }

    // -----------------------------------------------------
    // FIGHT LOGIC
    // -----------------------------------------------------
    // 50/50 Win Chance
    const won = Math.random() < 0.5;

    let resultTitle = "";
    let resultDescription = "";
    let embedColor = 0x000000;

    if (won) {
      // 2x Return: Net gain equals the original bet (+300)
      const payout = betAmount * 2;
      user.cash += betAmount;

      resultTitle = "🐔 Chicken Fight — VICTORY!";
      resultDescription =
        `${ARROW} Your roost-master obliterated the opponent's chicken!\n\n` +
        `${ARROW} **Bet Placed:** $${betAmount.toLocaleString()}\n` +
        `${ARROW} **Total Returned (2x):** $${payout.toLocaleString()}\n` +
        `${ARROW} **Net Profit:** +$${betAmount.toLocaleString()}\n` +
        `${ARROW} **New Cash Balance:** $${user.cash.toLocaleString()}`;
      embedColor = 0x57f287; // Green
    } else {
      user.cash -= betAmount;

      resultTitle = "🐔 Chicken Fight — DEFEAT!";
      resultDescription =
        `${ARROW} Your chicken was turned into nuggets...\n\n` +
        `${ARROW} **Amount Lost:** -$${betAmount.toLocaleString()}\n` +
        `${ARROW} **New Cash Balance:** $${user.cash.toLocaleString()}`;
      embedColor = 0xed4245; // Red
    }

    // Update last chicken fight timestamp
    user.lastChickenFight = now;

    // Save updated record to MongoDB
    await updateUserRecord(user);

    // Build & send embed using custom template
    const { embed, files } = embedTemplate({
      title: resultTitle,
      description: resultDescription,
      color: embedColor,
    });

    return interaction.reply({ embeds: [embed], files });
  },
};
