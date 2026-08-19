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
  black: 0, // Invite-only
};

// Membership income boost table
const MEMBERSHIP_BOOSTS = {
  standard: 0,
  silver: 0.02,
  gold: 0.04,
  platinum: 0.06,
  black: 0.1,
};

// Secret Black Membership code
const BLACK_CODE = "moat_HAMOODx1212";

// Generate 16-digit card number
function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-account")
    .setDescription("Manage your Moat Castle account")

    // CREATE
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a Moat Castle account")
        .addStringOption((opt) =>
          opt
            .setName("name")
            .setDescription("Your Moat Castle account name")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("membership")
            .setDescription("Choose your starting membership")
            .addChoices(
              { name: "Standard (Free)", value: "standard" },
              { name: "Silver ($250)", value: "silver" },
              { name: "Gold ($500)", value: "gold" },
              { name: "Platinum ($900)", value: "platinum" },
            ),
        )
        .addStringOption((opt) =>
          opt
            .setName("black_code")
            .setDescription("Black Membership invite code (optional)"),
        ),
    )

    // VIEW
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View your Moat Castle account"),
    )

    // DELETE
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete your Moat Castle account permanently"),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // ===============================
    // 🟩 VIEW ACCOUNT
    // ===============================
    if (sub === "view") {
      if (!userRecord.moatCastle) {
        const { embed, files } = moatembedTemplate({
          title: "Moat Castle Account Required",
          description:
            `> ${ARROW} You do not have a Moat Castle account.\n` +
            `> ${ARROW} Use **/moat-account create** to open one.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const acct = userRecord.moatCastle;
      const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);
      const membership = acct.membership?.toLowerCase() || "standard";
      const boostPercent = MEMBERSHIP_BOOSTS[membership] * 100;

      const { embed, files } = moatembedTemplate({
        title: "Your Moat Castle Account",
        description:
          `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
          `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
          `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
          `> ${ARROW} **Card Status:** ${acct.cardStatus}\n\n` +
          `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
          `> ${ARROW} **Membership:** ${acct.membership}\n` +
          `> ${ARROW} **Income Boost:** ${boostPercent}%\n` +
          `> ${ARROW} **Created:** <t:${createdUnix}:F>\n`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🟦 CREATE ACCOUNT
    // ===============================
    if (sub === "create") {
      if (userRecord.moatCastle) {
        const { embed, files } = moatembedTemplate({
          title: "Account Already Exists",
          description:
            `> ${ARROW} You already have a Moat Castle account.\n` +
            `> ${ARROW} Use **/moat-account view** to view it.`,
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

      if (enteredCode) {
        if (enteredCode === BLACK_CODE) {
          finalMembership = "black";
          membershipCost = MEMBERSHIP_COSTS.black;
        } else invalidCode = true;
      }

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

      if (finalMembership !== "black") {
        userRecord.cash -= membershipCost;

        const bankRecord = await getUserRecord("MOAT_OFFICIAL_BANK");
        bankRecord.moatCastleOfficialBank.balance += membershipCost;
        bankRecord.moatCastleOfficialBank.lastUpdated = Date.now();
        await updateUserRecord(bankRecord);
      }

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

      const { embed, files } = moatembedTemplate({
        title: invalidCode ? "Invalid Code!" : "Moat Castle Account Created",
        description:
          (invalidCode
            ? `> ${ARROW} The code you entered is invalid.\n` +
              `> ${ARROW} You have been assigned the **${userRecord.moatCastle.membership} Membership** instead.\n\n`
            : "") +
          `> ${ARROW} **Account Name:** ${accountName}\n` +
          `> ${ARROW} **Account ID:** ${accountId}\n` +
          `> ${ARROW} **Card Number:** ${cardNumber}\n` +
          `> ${ARROW} **Membership:** ${userRecord.moatCastle.membership}\n` +
          `> ${ARROW} **Membership Cost:** $${membershipCost.toLocaleString()}\n` +
          `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
          `> ${ARROW} Use **/moat-account view** to view your new account.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🟥 DELETE ACCOUNT
    // ===============================
    if (sub === "delete") {
      if (!userRecord.moatCastle) {
        const { embed, files } = moatembedTemplate({
          title: "No Moat Castle Account",
          description:
            `> ${ARROW} You do not have a Moat Castle account.\n` +
            `> ${ARROW} Use **/moat-account create** to open one.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (userRecord.moatCastle.businesses?.length > 0) {
        const { embed, files } = moatembedTemplate({
          title: "Business Still Open",
          description:
            `> ${ARROW} You still own **${userRecord.moatCastle.businesses.length} business(es)**.\n` +
            `> ${ARROW} Delete them first using **/moat-business delete**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const refundedCash = userRecord.moatCastle.balance || 0;
      userRecord.cash += refundedCash;

      userRecord.moatCastle = null;

      await updateUserRecord(userRecord);

      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Account Deleted",
        description:
          `> ${ARROW} Your Moat Castle account has been permanently deleted.\n` +
          `> ${ARROW} **Refunded:** $${refundedCash.toLocaleString()}\n` +
          `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n\n` +
          `> ${ARROW} You may create a new account anytime using **/moat-account create**.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
