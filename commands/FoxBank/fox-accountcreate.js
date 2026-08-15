const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

// ⭐ Updated Tier Costs
const TIER_COSTS = {
  standard: 0,
  gold: 10000,
  platinum: 25000,
  diamond: 50000,
  elite: 50000, // formerly "black"
};

// ⭐ Updated Elite Tier Code
const ELITE_TIER_CODE = "fox_TAMALESx3434";

// ⭐ Card Number Generator
function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
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
          { name: "Gold ($10,000)", value: "gold" },
          { name: "Platinum ($25,000)", value: "platinum" },
          { name: "Diamond ($50,000)", value: "diamond" },
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("elite_tier_code")
        .setDescription("Enter your Elite Tier invite code (optional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // Already has account
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
      .getString("elite_tier_code")
      ?.trim();

    let finalTier = chosenTier;
    let tierCost = TIER_COSTS[chosenTier];
    let invalidCode = false;

    // ⭐ Elite Tier Code Check
    if (enteredCode) {
      if (enteredCode === ELITE_TIER_CODE) {
        finalTier = "elite";
        tierCost = TIER_COSTS.elite;
      } else {
        invalidCode = true;
      }
    }

    // Not enough money
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

    const accountId = `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const cardNumber = generateCardNumber();

    userRecord.foxBank = {
      accountName,
      accountId,
      cardNumber,
      cardStatus: "Active",
      balance: 0,
      tier: finalTier.charAt(0).toUpperCase() + finalTier.slice(1),
      createdAt: Date.now(),
      updatedAt: Date.now(),

      lastDeposit: null,
      lastWithdrawal: null,
      cardReplacements: [],
    };

    await updateUserRecord(userRecord);

    const createdUnix = Math.floor(Date.now() / 1000);

    // Invalid elite code
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

    // Success embed
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
