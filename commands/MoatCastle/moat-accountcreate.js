const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

// Tier cost table
const TIER_COSTS = {
  standard: 0,
  silver: 5000,
  gold: 10000,
  platinum: 25000,
  black: 50000, // still defined for internal use
};

// Secret Black Tier code
const BLACK_TIER_CODE = "moat_HAMOODx1212";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-accountcreate")
    .setDescription("Create a Moat Castle account")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Your Moat Castle account name")
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
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // Prevent duplicate accounts
    if (userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Account Already Exists",
        description:
          `> <:moatcastleright:1537695231409918002> You already have a Moat Castle account.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-viewaccount** to view it.`,
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

    // Handle Black Tier code logic
    if (enteredCode) {
      if (enteredCode === BLACK_TIER_CODE) {
        finalTier = "black";
        tierCost = TIER_COSTS.black;
      } else {
        invalidCode = true;
      }
    }

    // Check if user can afford the tier
    if (userRecord.cash < tierCost) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Funds",
        description:
          `> <:moatcastleright:1537695231409918002> **Tier:** ${finalTier.toUpperCase()}\n` +
          `> <:moatcastleright:1537695231409918002> **Cost:** $${tierCost.toLocaleString()}\n\n` +
          `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct tier cost
    userRecord.cash -= tierCost;

    // Generate unique Moat Castle account ID
    const accountId = `MC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create the account
    userRecord.moatCastle = {
      accountName,
      accountId,
      balance: 0,
      tier: finalTier.charAt(0).toUpperCase() + finalTier.slice(1),
      rewards: 0,
      createdAt: Date.now(),
    };

    await updateUserRecord(userRecord);

    const createdUnix = Math.floor(Date.now() / 1000);

    // Handle invalid code message
    if (invalidCode) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Code!",
        description:
          `> <:moatcastleright:1537695231409918002> The code you entered is invalid.\n` +
          `> <:moatcastleright:1537695231409918002> You have been assigned the **${userRecord.moatCastle.tier} Tier** instead.\n\n` +
          `> <:moatcastleright:1537695231409918002> **Account Name:** ${accountName}\n` +
          `> <:moatcastleright:1537695231409918002> **Account ID:** ${accountId}\n` +
          `> <:moatcastleright:1537695231409918002> **Tier Cost:** $${tierCost.toLocaleString()}\n` +
          `> <:moatcastleright:1537695231409918002> **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> <:moatcastleright:1537695231409918002> **Created:** <t:${createdUnix}:F>`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Normal success message
    const { embed, files } = moatembedTemplate({
      title: "Moat Castle Account Created",
      description:
        `> <:moatcastleright:1537695231409918002> **Account Name:** ${accountName}\n` +
        `> <:moatcastleright:1537695231409918002> **Account ID:** ${accountId}\n` +
        `> <:moatcastleright:1537695231409918002> **Tier:** ${userRecord.moatCastle.tier}\n` +
        `> <:moatcastleright:1537695231409918002> **Tier Cost:** $${tierCost.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Created:** <t:${createdUnix}:F>\n\n` +
        `> <:moatcastleright:1537695231409918002> Use **/moat-viewaccount** to view your new account.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
