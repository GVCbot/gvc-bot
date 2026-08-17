const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { MOATCASTLE, ARROW } = MOATEMOJIS;

// Membership cost table
const MEMBERSHIP_COSTS = {
  standard: 0,
  silver: 250,
  gold: 500,
  platinum: 900,
  black: 0, // Invite-only, requires code
};

// Membership order (lowest → highest)
const MEMBERSHIP_ORDER = ["standard", "silver", "gold", "platinum", "black"];

// Secret Black Membership code
const BLACK_CODE = "moat_HAMOODx1212";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-upgrademembership")
    .setDescription("Upgrade your Moat Castle membership.")
    .addStringOption((option) =>
      option
        .setName("membership")
        .setDescription("Choose a membership to upgrade to")
        .setRequired(true)
        .addChoices(
          { name: "Silver ($250)", value: "silver" },
          { name: "Gold ($500)", value: "gold" },
          { name: "Platinum ($900)", value: "platinum" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("black_code")
        .setDescription("Enter Black Membership invite code (optional)")
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

    const currentMembership =
      userRecord.moatCastle.membership?.toLowerCase() || "standard";
    const chosenMembership = interaction.options.getString("membership");
    const enteredCode = interaction.options.getString("black_code")?.trim();

    let finalMembership = chosenMembership;
    let upgradeCost = MEMBERSHIP_COSTS[chosenMembership];
    let invalidCode = false;

    const currentIndex = MEMBERSHIP_ORDER.indexOf(currentMembership);
    const chosenIndex = MEMBERSHIP_ORDER.indexOf(chosenMembership);

    // ⭐ Black Membership override
    if (enteredCode && enteredCode === BLACK_CODE) {
      finalMembership = "black";
      upgradeCost = MEMBERSHIP_COSTS.black; // Always 0
    } else if (enteredCode) {
      invalidCode = true;
    }

    // ❌ Cannot downgrade or re-select same membership (unless Black code used)
    if (finalMembership !== "black" && chosenIndex <= currentIndex) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Upgrade",
        description:
          `> ${ARROW} You cannot downgrade or re-select your current membership.\n` +
          `> ${ARROW} Your current membership: **${userRecord.moatCastle.membership}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ❌ Not enough money (skip if Black Membership)
    if (finalMembership !== "black" && userRecord.cash < upgradeCost) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Upgrade Cost:** $${upgradeCost.toLocaleString()}\n` +
          `> ${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct cost (skip for Black Membership)
    if (finalMembership !== "black") {
      userRecord.cash -= upgradeCost;

      const bankRecord = await getUserRecord("MOAT_OFFICIAL_BANK");
      bankRecord.moatCastleOfficialBank.balance += upgradeCost;
      bankRecord.moatCastleOfficialBank.lastUpdated = Date.now();
      await updateUserRecord(bankRecord);
    }

    // Apply upgrade
    userRecord.moatCastle.membership =
      finalMembership.charAt(0).toUpperCase() + finalMembership.slice(1);
    userRecord.moatCastle.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: invalidCode ? "Invalid Code!" : "Membership Upgrade Successful",
      description:
        (invalidCode
          ? `> ${ARROW} The Black Membership code you entered is invalid.\n` +
            `> ${ARROW} You have been upgraded to **${userRecord.moatCastle.membership}** instead.\n\n`
          : "") +
        `> ${ARROW} **New Membership:** ${userRecord.moatCastle.membership}\n` +
        `> ${ARROW} **Upgrade Cost:** $${upgradeCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
