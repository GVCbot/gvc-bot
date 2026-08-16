const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

// Membership cost table
const MEMBERSHIP_COSTS = {
  benefits: 500,
  gold: 1200,
  platinum: 2000,
  diamond: 4500,
  express: 6000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-accountdelete")
    .setDescription("Delete your Fox Bank account permanently."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `> ${ARROW} You do not have a Fox Bank account.\n` +
          `> ${ARROW} Use **/fox-accountcreate** to open one.`,
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
          `> ${ARROW} You currently own a home.\n` +
          `> ${ARROW} You **must sell your home first** before deleting your Fox Bank account.\n\n` +
          `> ${ARROW} Use **/fox-homesell** to sell your home.`,
        noLogo: false,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Refund Fox Bank balance
    const refundedBalance = userRecord.foxBank.balance || 0;
    userRecord.cash += refundedBalance;

    // Membership refund (75%)
    const membership = userRecord.foxBank.membership?.toLowerCase() || "none";
    let membershipRefund = 0;

    if (membership !== "none" && MEMBERSHIP_COSTS[membership]) {
      membershipRefund = Math.floor(MEMBERSHIP_COSTS[membership] * 0.75);
      userRecord.cash += membershipRefund;
    }

    // Delete Fox Bank account
    userRecord.foxBank = null;

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Account Deleted",
      description:
        `> ${ARROW} Your Fox Bank account has been permanently deleted.\n\n` +
        `> ${ARROW} **Balance Refunded:** $${refundedBalance.toLocaleString()}\n` +
        `> ${ARROW} **Membership Refund (75%):** $${membershipRefund.toLocaleString()}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n\n` +
        `> ${ARROW} You may create a new account anytime using **/fox-accountcreate**.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
