const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

// Old tier cost table (for refunds)
const OLD_TIER_COSTS = {
  standard: 0,
  gold: 10000,
  platinum: 25000,
  diamond: 50000,
  elite: 50000,
};

// Staff role
const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("refundtier")
    .setDescription(
      "Fox Staff Only — Refund all users who had a tier before memberships.",
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Staff check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `${ARROW} Only **Fox Bank Staff** may use this command.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const allUsers = await getAllUserRecords();
    let refundedUsers = 0;
    let totalRefundAmount = 0;

    for (const user of allUsers) {
      if (!user.foxBank) continue;

      const tier = user.foxBank.tier?.toLowerCase();
      if (!tier) continue;

      // Only refund users who had a tier (not memberships)
      if (!OLD_TIER_COSTS.hasOwnProperty(tier)) continue;

      const tierRefund = OLD_TIER_COSTS[tier];
      const balanceRefund = user.foxBank.balance || 0;

      const totalRefund = tierRefund + balanceRefund;

      user.cash += totalRefund;

      // Convert account to membership system
      user.foxBank.membership = "Benefits";
      user.foxBank.balance = 0;
      user.foxBank.tier = null; // remove tier
      user.foxBank.updatedAt = Date.now();

      await updateUserRecord(user);

      refundedUsers++;
      totalRefundAmount += totalRefund;
    }

    const { embed, files } = foxbankembedTemplate({
      title: "Tier Refund Complete",
      description:
        `> ${ARROW} **Refunded Users:** ${refundedUsers}\n` +
        `> ${ARROW} **Total Refunded:** $${totalRefundAmount.toLocaleString()}\n\n` +
        `> ${ARROW} All tier accounts have been converted to **Benefits Membership**.\n` +
        `> ${ARROW} All Fox Bank balances were refunded.\n` +
        `> ${ARROW} All tiers have been removed.\n\n` +
        `> ${ARROW} The Fox Bank system is now fully migrated to **Memberships**.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
