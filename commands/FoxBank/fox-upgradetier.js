const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

// ⭐ Updated Tier Costs (unchanged)
const TIER_COSTS = {
  standard: 0,
  gold: 10000,
  platinum: 25000,
  diamond: 50000,
  elite: 50000,
};

// ⭐ Updated Elite Tier Code (unchanged)
const ELITE_TIER_CODE = "fox_TAMALESx3434";

// ⭐ Updated Tier Order (unchanged)
const TIER_ORDER = ["standard", "gold", "platinum", "diamond", "elite"];

// ⭐ NEW — Discount Tier Compatibility
// This ensures the tier names match the discount system
const FOX_DISCOUNT_TIERS = ["standard", "gold", "platinum", "diamond", "elite"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-upgradetier")
    .setDescription("Upgrade your Fox Bank tier.")
    .addStringOption((option) =>
      option
        .setName("tier")
        .setDescription("Choose a tier to upgrade to")
        .setRequired(true)
        .addChoices(
          { name: "Gold ($10,000)", value: "gold" },
          { name: "Platinum ($25,000)", value: "platinum" },
          { name: "Diamond ($50,000)", value: "diamond" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("elite_tier_code")
        .setDescription("Enter Elite Tier invite code (optional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `> ${ARROW} You must create an account first.\n` +
          `> ${ARROW} Use **/fox-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const currentTier = userRecord.foxBank.tier.toLowerCase();
    const chosenTier = interaction.options.getString("tier");
    const enteredCode = interaction.options
      .getString("elite_tier_code")
      ?.trim();

    // ⭐ NEW — Validate tier exists in discount system
    if (!FOX_DISCOUNT_TIERS.includes(currentTier)) {
      userRecord.foxBank.tier = "standard"; // auto-fix old tiers
    }

    if (currentTier === "elite") {
      const { embed, files } = foxbankembedTemplate({
        title: "Already Elite Tier",
        description:
          `> ${ARROW} You already have the **Elite Tier**.\n` +
          `> ${ARROW} No further upgrades available.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const currentIndex = TIER_ORDER.indexOf(currentTier);
    const chosenIndex = TIER_ORDER.indexOf(chosenTier);

    if (chosenIndex <= currentIndex) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Upgrade",
        description:
          `> ${ARROW} You cannot downgrade or re-select your current tier.\n` +
          `> ${ARROW} Your current tier: **${userRecord.foxBank.tier}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    let finalTier = chosenTier;
    let tierCost = TIER_COSTS[chosenTier];
    let invalidCode = false;

    if (enteredCode) {
      if (enteredCode === ELITE_TIER_CODE) {
        finalTier = "elite";
        tierCost = TIER_COSTS.elite;
      } else {
        invalidCode = true;
      }
    }

    if (userRecord.cash < tierCost) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Upgrade Cost:** $${tierCost.toLocaleString()}\n` +
          `> ${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.cash -= tierCost;

    userRecord.foxBank.tier =
      finalTier.charAt(0).toUpperCase() + finalTier.slice(1);

    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    if (invalidCode) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Code!",
        description:
          `> ${ARROW} The Elite Tier code you entered is invalid.\n` +
          `> ${ARROW} You have been upgraded to **${userRecord.foxBank.tier} Tier** instead.\n\n` +
          `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const { embed, files } = foxbankembedTemplate({
      title: "Tier Upgrade Successful",
      description:
        `> ${ARROW} **New Tier:** ${userRecord.foxBank.tier}\n` +
        `> ${ARROW} **Upgrade Cost:** $${tierCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
