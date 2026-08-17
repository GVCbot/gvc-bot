const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

// ⭐ Membership Costs
const MEMBERSHIP_COSTS = {
  benefits: 500,
  gold: 1200,
  platinum: 2000,
  diamond: 4500,
  express: 6000,
};

// ⭐ Membership Order (lowest → highest)
const MEMBERSHIP_ORDER = ["benefits", "gold", "platinum", "diamond", "express"];

// ⭐ Express Invite Code
const EXPRESS_CODE = "fox_TAMALESx3434";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-upgrademembership")
    .setDescription("Upgrade your Fox Bank membership card.")
    .addStringOption((option) =>
      option
        .setName("membership")
        .setDescription("Choose a membership to upgrade to")
        .setRequired(true)
        .addChoices(
          { name: "Gold ($1,200)", value: "gold" },
          { name: "Platinum ($2,000)", value: "platinum" },
          { name: "Diamond ($4,500)", value: "diamond" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("express_code")
        .setDescription("Enter Express invite code (optional)")
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

    const currentMembership =
      userRecord.foxBank.membership?.toLowerCase() || "benefits";
    const chosenMembership = interaction.options.getString("membership");
    const enteredCode = interaction.options.getString("express_code")?.trim();

    let finalMembership = chosenMembership;
    let upgradeCost = MEMBERSHIP_COSTS[chosenMembership];
    let invalidCode = false;

    const currentIndex = MEMBERSHIP_ORDER.indexOf(currentMembership);
    const chosenIndex = MEMBERSHIP_ORDER.indexOf(chosenMembership);

    // ❌ Cannot downgrade or re-select same membership — unless Express code is valid
    if (chosenIndex <= currentIndex) {
      const enteredCode = interaction.options.getString("express_code")?.trim();
      if (enteredCode !== EXPRESS_CODE) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Upgrade",
          description:
            `> ${ARROW} You cannot downgrade or re-select your current membership.\n` +
            `> ${ARROW} Your current membership: **${userRecord.foxBank.membership}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }
    }

    // ⭐ Express Unlock Logic
    if (enteredCode) {
      if (enteredCode === EXPRESS_CODE) {
        finalMembership = "express";
        upgradeCost = MEMBERSHIP_COSTS.express;
      } else {
        invalidCode = true;
      }
    }

    // ❌ Not enough money
    if (userRecord.cash < upgradeCost) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Upgrade Cost:** $${upgradeCost.toLocaleString()}\n` +
          `> ${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct cost
    userRecord.cash -= upgradeCost;

    // Apply upgrade
    userRecord.foxBank.membership =
      finalMembership.charAt(0).toUpperCase() + finalMembership.slice(1);

    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    // Success embed
    const { embed, files } = foxbankembedTemplate({
      title: invalidCode
        ? "Invalid Express Code"
        : "Membership Upgrade Successful",
      description:
        (invalidCode
          ? `> ${ARROW} The Express code you entered is invalid.\n` +
            `> ${ARROW} You have been upgraded to **${userRecord.foxBank.membership}** instead.\n\n`
          : "") +
        `> ${ARROW} **New Membership:** ${userRecord.foxBank.membership}\n` +
        `> ${ARROW} **Upgrade Cost:** $${upgradeCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
