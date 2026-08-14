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
  black: 50000,
};

// Secret Black Tier code
const BLACK_TIER_CODE = "moat_HAMOODx1212";

// Tier order for comparison
const TIER_ORDER = ["standard", "silver", "gold", "platinum", "black"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-upgradetier")
    .setDescription("Upgrade your Moat Castle tier.")
    .addStringOption((option) =>
      option
        .setName("tier")
        .setDescription("Choose a tier to upgrade to")
        .setRequired(true)
        .addChoices(
          { name: "Silver ($5,000)", value: "silver" },
          { name: "Gold ($10,000)", value: "gold" },
          { name: "Platinum ($25,000)", value: "platinum" },
          // ❗ Black is NOT shown here
        ),
    )
    .addStringOption((option) =>
      option
        .setName("black_tier_code")
        .setDescription("Enter Black Tier invite code (optional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    // No account
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> <:moatcastleright:1537695231409918002> You must create an account first.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const currentTier = userRecord.moatCastle.tier.toLowerCase();
    const chosenTier = interaction.options.getString("tier");
    const enteredCode = interaction.options
      .getString("black_tier_code")
      ?.trim();

    // If already Black Tier → no upgrades allowed
    if (currentTier === "black") {
      const { embed, files } = moatembedTemplate({
        title: "Already Black Tier",
        description:
          `> <:moatcastleright:1537695231409918002> You already have the **Black Tier**.\n` +
          `> <:moatcastleright:1537695231409918002> No further upgrades available.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Validate chosen tier is above current tier
    const currentIndex = TIER_ORDER.indexOf(currentTier);
    const chosenIndex = TIER_ORDER.indexOf(chosenTier);

    if (chosenIndex <= currentIndex) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Upgrade",
        description:
          `> <:moatcastleright:1537695231409918002> You cannot downgrade or re-select your current tier.\n` +
          `> <:moatcastleright:1537695231409918002> Your current tier: **${userRecord.moatCastle.tier}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

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
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Funds",
        description:
          `> <:moatcastleright:1537695231409918002> **Upgrade Cost:** $${tierCost.toLocaleString()}\n` +
          `> <:moatcastleright:1537695231409918002> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct cost
    userRecord.cash -= tierCost;

    // Apply upgrade
    userRecord.moatCastle.tier =
      finalTier.charAt(0).toUpperCase() + finalTier.slice(1);

    await updateUserRecord(userRecord);

    // Invalid code message
    if (invalidCode) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Code!",
        description:
          `> <:moatcastleright:1537695231409918002> The Black Tier code you entered is invalid.\n` +
          `> <:moatcastleright:1537695231409918002> You have been upgraded to **${userRecord.moatCastle.tier} Tier** instead.\n\n` +
          `> <:moatcastleright:1537695231409918002> **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Normal success message
    const { embed, files } = moatembedTemplate({
      title: "Tier Upgrade Successful",
      description:
        `> <:moatcastleright:1537695231409918002> **New Tier:** ${userRecord.moatCastle.tier}\n` +
        `> <:moatcastleright:1537695231409918002> **Upgrade Cost:** $${tierCost.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
