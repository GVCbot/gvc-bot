const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

// Temporary Express Membership codes (memory only)
const activeExpressCodes = new Map(); // userId → { code, expires }

// Membership cost table
const MEMBERSHIP_COSTS = {
  benefits: 500,
  gold: 1200,
  platinum: 2000,
  diamond: 4500,
  express: 6000, // invite-only
};

// Generate 16-digit card number
function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-account")
    .setDescription("Manage your Fox Bank account.")

    // CREATE
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Create a Fox Bank account.")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Account name").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("membership")
            .setDescription("Choose your membership")
            .addChoices(
              { name: "Benefit’s ($500/month)", value: "benefits" },
              { name: "Gold ($1,200/month)", value: "gold" },
              { name: "Platinum ($2,000/month)", value: "platinum" },
              { name: "Diamond ($4,500/month)", value: "diamond" },
            )
            .setRequired(true),
        ),
    )

    // VIEW
    .addSubcommand((sub) =>
      sub.setName("view").setDescription("View your Fox Bank account."),
    )

    // DELETE
    .addSubcommand((sub) =>
      sub.setName("delete").setDescription("Delete your Fox Bank account."),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sub = interaction.options.getSubcommand();
    const foxStaffRole = "1537894455779270717";

    // ===============================
    // 📘 VIEW ACCOUNT
    // ===============================
    if (sub === "view") {
      const userRecord = await getUserRecord(interaction.user.id);

      if (!userRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "Fox Bank Account Required",
          description:
            `${ARROW} You do not have a Fox Bank account.\n` +
            `${ARROW} Use **/fox-account create** to open one.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const acct = userRecord.foxBank;
      const createdUnix = Math.floor((acct.createdAt || Date.now()) / 1000);

      // Owned homes
      let homesText = "";
      const lakevilleHomes = userRecord.homes?.lakeville || [];
      const sixhousentHomes = userRecord.homes?.sixhousent || [];

      if (lakevilleHomes.length === 0 && sixhousentHomes.length === 0) {
        homesText += `> ${ARROW} **Owned Homes:** None\n\n`;
      } else {
        homesText += `> ${ARROW} **Owned Homes:**\n`;
        for (const home of lakevilleHomes) {
          homesText += `> ${ARROW} Lakeville Home #${home.homeId} — $${home.price.toLocaleString()}\n`;
        }
        for (const home of sixhousentHomes) {
          homesText += `> ${ARROW} Sixhousent Home #${home.homeId} — $${home.price.toLocaleString()}\n`;
        }
        homesText += `\n`;
      }

      const { embed, files } = foxbankembedTemplate({
        title: "Your Fox Bank Account",
        description:
          `> ${ARROW} **Account Name:** ${acct.accountName}\n` +
          `> ${ARROW} **Account ID:** ${acct.accountId}\n` +
          `> ${ARROW} **Card Number:** ${acct.cardNumber}\n` +
          `> ${ARROW} **Card Status:** ${acct.cardStatus}\n\n` +
          `> ${ARROW} **Balance:** $${acct.balance.toLocaleString()}\n` +
          `> ${ARROW} **Membership:** ${acct.membership}\n` +
          `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
          homesText,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🟦 CREATE ACCOUNT
    // ===============================
    if (sub === "create") {
      const userRecord = await getUserRecord(interaction.user.id);

      if (userRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "Account Already Exists",
          description:
            `${ARROW} You already have a Fox Bank account.\n` +
            `${ARROW} Use **/fox-account view** to view it.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const accountName = interaction.options.getString("name");
      const chosenMembership = interaction.options.getString("membership");

      // Express cannot be selected here
      if (chosenMembership === "express") {
        const { embed, files } = foxbankembedTemplate({
          title: "Express Membership Restricted",
          description:
            `${ARROW} Express Membership cannot be selected during account creation.\n` +
            `${ARROW} You must receive an **Express Code** from Fox Bank staff.\n` +
            `${ARROW} Use **/fox-account setmembership** or **/fox-account generatecode**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const membershipCost = MEMBERSHIP_COSTS[chosenMembership];

      if (userRecord.cash < membershipCost) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Funds",
          description:
            `${ARROW} **Membership:** ${chosenMembership.toUpperCase()}\n` +
            `${ARROW} **Cost:** $${membershipCost.toLocaleString()}\n\n` +
            `${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      // Deduct cost
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
          chosenMembership.charAt(0).toUpperCase() + chosenMembership.slice(1),
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

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Account Created",
        description:
          `> ${ARROW} **Account Name:** ${accountName}\n` +
          `> ${ARROW} **Account ID:** ${accountId}\n` +
          `> ${ARROW} **Card Number:** ${cardNumber}\n` +
          `> ${ARROW} **Membership:** ${userRecord.foxBank.membership}\n` +
          `> ${ARROW} **Cost:** $${membershipCost.toLocaleString()}\n` +
          `> ${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}\n` +
          `> ${ARROW} **Created:** <t:${createdUnix}:F>\n\n` +
          `> ${ARROW} Use **/fox-account view** to view your new account.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🟥 DELETE ACCOUNT
    // ===============================
    if (sub === "delete") {
      const userRecord = await getUserRecord(interaction.user.id);

      if (!userRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "No Fox Bank Account",
          description:
            `${ARROW} You do not have a Fox Bank account.\n` +
            `${ARROW} Use **/fox-account create** to open one.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      // Check for active homes
      const hasLakevilleHomes =
        Array.isArray(userRecord.homes?.lakeville) &&
        userRecord.homes.lakeville.length > 0;
      const hasSixhousentHomes =
        Array.isArray(userRecord.homes?.sixhousent) &&
        userRecord.homes.sixhousent.length > 0;

      if (hasLakevilleHomes || hasSixhousentHomes) {
        const { embed, files } = foxbankembedTemplate({
          title: "Active Home Detected",
          description:
            `${ARROW} You currently own a home.\n` +
            `${ARROW} You **must sell your home first** before deleting your Fox Bank account.\n\n` +
            `${ARROW} Use **/fox-homesell** to sell your home.`,
          noLogo: false,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      // Refund balance
      const refundedBalance = userRecord.foxBank.balance || 0;
      userRecord.cash += refundedBalance;

      // Membership refund (75%)
      const membership = userRecord.foxBank.membership?.toLowerCase() || "none";
      let membershipRefund = 0;

      if (membership !== "none" && MEMBERSHIP_COSTS[membership]) {
        membershipRefund = Math.floor(MEMBERSHIP_COSTS[membership] * 0.75);
        userRecord.cash += membershipRefund;
      }

      userRecord.foxBank = null;

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Account Deleted",
        description:
          `> ${ARROW} Your Fox Bank account has been permanently deleted.\n\n` +
          `> ${ARROW} **Balance Refunded:** $${refundedBalance.toLocaleString()}\n` +
          `> ${ARROW} **Membership Refund (75%):** $${membershipRefund.toLocaleString()}\n\n` +
          `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n\n` +
          `> ${ARROW} You may create a new account anytime using **/fox-account create**.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
