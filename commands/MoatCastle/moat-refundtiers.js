const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const TIER_COSTS = {
  Standard: 0,
  Silver: 250,
  Gold: 500,
  Platinum: 900,
  Black: 0, // Invite-only, no refund needed
};

const STAFF_ROLE = "1537722114176581724"; // Moat staff role

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-refundtiers")
    .setDescription(
      "Refund all users who purchased old Moat Castle tiers (Staff Only)",
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
      return interaction.editReply(
        "❌ You do not have permission to use this command.",
      );
    }

    const allUsers = await getAllUserRecords();
    let refunded = 0;

    for (const user of allUsers) {
      if (!user.moatCastle) continue;

      const oldTier = user.moatCastle.tier;
      if (!oldTier) continue;

      const cost = TIER_COSTS[oldTier];
      if (cost > 0) {
        user.cash += cost;
        refunded++;
      }

      // Reset membership
      user.moatCastle.membership = "Standard";

      // Remove old tier field
      delete user.moatCastle.tier;

      await updateUserRecord(user);
    }

    return interaction.editReply(
      `✅ Refunded ${refunded} users and reset all memberships to Standard.`,
    );
  },
};
