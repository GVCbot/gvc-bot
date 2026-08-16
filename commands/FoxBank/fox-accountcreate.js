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
  express: 6000, // invite-only
};

// ⭐ Express Invite Code
const EXPRESS_CODE = "fox_TAMALESx3434";

// ⭐ Card Number Generator
function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-accountcreate")
    .setDescription("Create a Fox Bank account with a membership card.")
    .addStringOption((option) =>
      option
        .setName("name")
        .setDescription("Your Fox Bank account name")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("membership")
        .setDescription("Choose your Fox Bank membership card")
        .addChoices(
          { name: "Benefit’s ($500/month)", value: "benefits" },
          { name: "Gold ($1,200/month)", value: "gold" },
          { name: "Platinum ($2,000/month)", value: "platinum" },
          { name: "Diamond ($4,500/month)", value: "diamond" },
        )
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("express_code")
        .setDescription("Enter Express invite code (optional)")
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
    const chosenMembership = interaction.options.getString("membership");
    const enteredCode = interaction.options.getString("express_code")?.trim();

    let finalMembership = chosenMembership;
    let membershipCost = MEMBERSHIP_COSTS[chosenMembership];
    let invalidCode = false;

    // ⭐ Express Unlock Logic
    if (enteredCode) {
      if (enteredCode === EXPRESS_CODE) {
        finalMembership = "express";
        membershipCost = MEMBERSHIP_COSTS.express;
      } else {
        invalidCode = true;
      }
    }

    // Not enough money
    if (userRecord.cash < membershipCost) {
      const { embed, files } = foxbankembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Membership:** ${finalMembership.toUpperCase()}\n` +
          `> ${ARROW} **Cost:** $${membershipCost.toLocaleString()}\n\n` +
          `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct membership cost
    userRecord.cash -= membershipCost;

    const accountId = `FB-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const cardNumber = generateCardNumber();

    userRecord.foxBank = {
      accountName,
      accountId,
      cardNumber,
      cardStatus: "Active",
      balance: 0,
      membership:
        finalMembership.charAt(0).toUpperCase() + finalMembership.slice(1),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      lastDeposit: null,
      lastWithdrawal: null,
      cardReplacements: [],
    };

    await updateUserRecord(userRecord);

    const createdUnix = Math.floor(Date.now() / 1000);

    const { embed, files } = foxbankembedTemplate({
      title: invalidCode ? "Invalid Express Code" : "Fox Bank Account Created",
      description:
        (invalidCode
          ? `> ${ARROW} The Express code you entered is invalid.\n` +
            `> ${ARROW} You have been assigned **${userRecord.foxBank.membership}** instead.\n\n`
          : "") +
        `> ${ARROW} **Account Name:** ${accountName}\n` +
        `> ${ARROW} **Account ID:** ${accountId}\n` +
        `> ${ARROW} **Card Number:** ${cardNumber}\n` +
        `> ${ARROW} **Membership:** ${userRecord.foxBank.membership}\n` +
        `> ${ARROW} **Cost:** $${membershipCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        `> ${ARROW} Use **/fox-viewaccount** to view your new account.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
