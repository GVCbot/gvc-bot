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
  black: 0, // Invite-only, no cost but requires code
};

// Secret Black Membership code
const BLACK_CODE = "moat_HAMOODx1212";

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
        .setName("membership")
        .setDescription("Choose your starting membership")
        .addChoices(
          { name: "Standard (Free)", value: "standard" },
          { name: "Silver ($250)", value: "silver" },
          { name: "Gold ($500)", value: "gold" },
          { name: "Platinum ($900)", value: "platinum" },
        )
        .setRequired(false),
    )
    .addStringOption((option) =>
      option
        .setName("black_code")
        .setDescription("Enter your Black Membership invite code (optional)")
        .setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // Prevent duplicate accounts
    if (userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "Account Already Exists",
        description:
          `> ${ARROW} You already have a Moat Castle account.\n` +
          `> ${ARROW} Use **/moat-viewaccount** to view it.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const accountName = interaction.options.getString("name");
    const chosenMembership =
      interaction.options.getString("membership") || "standard";
    const enteredCode = interaction.options.getString("black_code")?.trim();

    let finalMembership = chosenMembership;
    let membershipCost = MEMBERSHIP_COSTS[chosenMembership];
    let invalidCode = false;

    // Handle Black Membership code
    if (enteredCode) {
      if (enteredCode === BLACK_CODE) {
        finalMembership = "black";
        membershipCost = MEMBERSHIP_COSTS.black;
      } else {
        invalidCode = true;
      }
    }

    // Check funds (skip if Black Membership)
    if (finalMembership !== "black" && userRecord.cash < membershipCost) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Funds",
        description:
          `> ${ARROW} **Membership:** ${finalMembership.toUpperCase()}\n` +
          `> ${ARROW} **Cost:** $${membershipCost.toLocaleString()}\n\n` +
          `> You only have **$${userRecord.cash.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Deduct cost (skip if Black Membership)
    if (finalMembership !== "black") {
      userRecord.cash -= membershipCost;

      // Deposit membership cost into official bank
      const bankRecord = await getUserRecord("MOAT_OFFICIAL_BANK");
      bankRecord.moatCastleOfficialBank.balance += membershipCost;
      bankRecord.moatCastleOfficialBank.lastUpdated = Date.now();
      await updateUserRecord(bankRecord);
    }

    // Generate account ID + card number
    const accountId = `MC-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const cardNumber = generateCardNumber();

    userRecord.moatCastle = {
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
      lastLoanPayment: null,
      cardReplacements: [],
      loans: [],
      loanRequests: [],
    };

    await updateUserRecord(userRecord);

    const createdUnix = Math.floor(Date.now() / 1000);

    // Invalid code message
    if (invalidCode) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Code!",
        description:
          `> ${ARROW} The code you entered is invalid.\n` +
          `> ${ARROW} You have been assigned the **${userRecord.moatCastle.membership} Membership** instead.\n\n` +
          `> ${ARROW} **Account Name:** ${accountName}\n` +
          `> ${ARROW} **Account ID:** ${accountId}\n` +
          `> ${ARROW} **Card Number:** ${cardNumber}\n` +
          `> ${ARROW} **Membership Cost:** $${membershipCost.toLocaleString()}\n` +
          `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> ${ARROW} **Created:** <t:${createdUnix}:F>`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Normal success message
    const { embed, files } = moatembedTemplate({
      title: "Moat Castle Account Created",
      description:
        `> ${ARROW} **Account Name:** ${accountName}\n` +
        `> ${ARROW} **Account ID:** ${accountId}\n` +
        `> ${ARROW} **Card Number:** ${cardNumber}\n` +
        `> ${ARROW} **Membership:** ${userRecord.moatCastle.membership}\n` +
        `> ${ARROW} **Membership Cost:** $${membershipCost.toLocaleString()}\n` +
        `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
        `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
        `> ${ARROW} Use **/moat-viewaccount** to view your new account.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
