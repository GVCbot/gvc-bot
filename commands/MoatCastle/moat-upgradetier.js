const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW } = MOATEMOJIS;

// Tier cost table (unchanged)
const TIER_COSTS = {
  standard: 0,
  silver: 5000,
  gold: 10000,
  platinum: 25000,
  black: 50000,
};

// Secret Black Tier code (unchanged)
const BLACK_TIER_CODE = "moat_HAMOODx1212";

// Tier order (unchanged)
const TIER_ORDER = ["standard", "silver", "gold", "platinum", "black"];

// ⭐ NEW — Discount Tier Compatibility
const MOAT_DISCOUNT_TIERS = ["standard", "silver", "gold", "platinum", "black"];

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

    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> ${ARROW} You must create an account first.\n` +
          `> ${ARROW} Use **/moat-accountcreate**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const currentTier = userRecord.moatCastle.tier.toLowerCase();
    const chosenTier = interaction.options.getString("tier");
    const enteredCode = interaction.options
      .getString("black_tier_code")
      ?.trim();

    // ⭐ NEW — Validate tier exists in discount system
    if (!MOAT_DISCOUNT_TIERS.includes(currentTier)) {
      userRecord.moatCastle.tier = "standard"; // auto-fix old tiers
    }

    if (currentTier === "black") {
      const { embed, files } = moatembedTemplate({
        title: "Already Black Tier",
        description:
          `> ${ARROW} You already have the **Black Tier**.\n` +
          `> ${ARROW} No further upgrades available.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const currentIndex = TIER_ORDER.indexOf(currentTier);
    const chosenIndex = TIER_ORDER.indexOf(chosenTier);

    if (chosenIndex <= currentIndex) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Upgrade",
        description:
          `> ${ARROW} You cannot downgrade or re-select your current tier.\n` +
          `> ${ARROW} Your current tier: **${userRecord.moatCastle.tier}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    let finalTier = chosenTier;
    let tierCost = TIER_COSTS[chosenTier];
    let invalidCode = false;

    if (enteredCode) {
      if (enteredCode === BLACK_TIER_CODE) {
        finalTier = "black";
        tierCost = TIER_COSTS.black;
      } else {
        invalidCode = true;
      }
    }

    if (userRecord.cash < tierCost) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Upgrade Cost:** $${tierCost.toLocaleString()}\n` +
          `> ${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    userRecord.cash -= upgradeCost;

    const bankRecord = await getUserRecord("MOAT_OFFICIAL_BANK");
    bankRecord.moatCastleOfficialBank.balance += upgradeCost;
    bankRecord.moatCastleOfficialBank.lastUpdated = Date.now();
    await updateUserRecord(bankRecord);

    userRecord.moatCastle.tier =
      finalTier.charAt(0).toUpperCase() + finalTier.slice(1);

    await updateUserRecord(userRecord);

    if (invalidCode) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Code!",
        description:
          `> ${ARROW} The Black Tier code you entered is invalid.\n` +
          `> ${ARROW} You have been upgraded to **${userRecord.moatCastle.tier} Tier** instead.\n\n` +
          `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const { embed, files } = moatembedTemplate({
      title: "Tier Upgrade Successful",
      description:
        `> ${ARROW} **New Tier:** ${userRecord.moatCastle.tier}\n` +
        `> ${ARROW} **Upgrade Cost:** $${tierCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
