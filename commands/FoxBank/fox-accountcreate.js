const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

// Tier cost table
const TIER_COSTS = {
  standard: 0,
  silver: 5000,
  gold: 10000,
  platinum: 25000,
  black: 50000,
};

// Secret Black Tier code
const BLACK_TIER_CODE = "fox_TAMALESx3434";

// Generate 16-digit card number
function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-accountcreate")
    .setDescription("Create a Fox Bank account")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Your Fox Bank account name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("tier")
        .setDescription("Choose your starting tier")
        .addChoices(
          { name: "Standard (Free)", value: "standard" },
          { name: "Silver ($5,000)", value: "silver" },
          { name: "Gold ($10,000)", value: "gold" },
          { name: "Platinum ($25,000)", value: "platinum" },
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("black_tier_code")
        .setDescription("Enter your Black Tier invite code (optional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // Prevent duplicate accounts
    if (userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Account Already Exists",
        description:
          `> ${ARROW} You already have a Fox Bank account.\n` +
          `> ${ARROW} Use **/fox-viewaccount** to view it.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const accountName = interaction.options.getString("name");
    const chosenTier = interaction.options.getString("tier") || "standard";
    const enteredCode = interaction.options
      .getString("black_tier_code")
      ?.trim();

    let finalTier = chosenTier;
    let tierCost = TIER_COSTS[chosenTier];
    let invalidCode = false;

    // Handle Black Tier code
    if (enteredCode) {
      if (enteredCode === BLACK_TIER_CODE) {
        finalTier = "black";
        tierCost = TIER_COSTS.black;
      } else {
        invalidCode = true;
      }
    }

    // Check funds
    if (userRecord.cash < tierCost) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Tier:** ${finalTier.toUpperCase()}\n` +
          `> ${ARROW} **Cost:** $${tierCost.toLocaleString()}\n\n` +
          `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct tier cost
    userRecord.cash -= tierCost;

    // Generate account ID + card number
    const accountId = `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const cardNumber = generateCardNumber();

    userRecord.foxBank = {
      accountName,
      accountId,
      cardNumber,
      cardStatus: "Active",
      balance: 0,
      tier: finalTier.charAt(0).toUpperCase() + finalTier.slice(1),
      rewards: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),

      lastDeposit: null,
      lastWithdrawal: null,

      cardReplacements: [],
    };

    await updateUserRecord(userRecord);

    const createdUnix = Math.floor(Date.now() / 1000);

    // Invalid code message
    if (invalidCode) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Code!",
        description:
          `> ${ARROW} The code you entered is invalid.\n` +
          `> ${ARROW} You have been assigned the **${userRecord.foxBank.tier} Tier** instead.\n\n` +
          `> ${ARROW} **Account Name:** ${accountName}\n` +
          `> ${ARROW} **Account ID:** ${accountId}\n` +
          `> ${ARROW} **Card Number:** ${cardNumber}\n` +
          `> ${ARROW} **Tier Cost:** $${tierCost.toLocaleString()}\n` +
          `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> ${ARROW} **Created:** <t:${createdUnix}:F>`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Normal success message
    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Account Created",
      description:
        `> ${ARROW} **Account Name:** ${accountName}\n` +
        `> ${ARROW} **Account ID:** ${accountId}\n` +
        `> ${ARROW} **Card Number:** ${cardNumber}\n` +
        `> ${ARROW} **Tier:** ${userRecord.foxBank.tier}\n` +
        `> ${ARROW} **Tier Cost:** $${tierCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        `> ${ARROW} Use **/fox-viewaccount** to view your new account.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
