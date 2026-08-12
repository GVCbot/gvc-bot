const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankjoin")
    .setDescription("Request to join an existing bank.")
    .addStringOption((opt) =>
      opt.setName("bankid").setDescription("Bank ID").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const bankIdInput = protect.sanitize(
      interaction.options.getString("bankid"),
    );

    console.log("🔍 /bankjoin triggered by:", userId);
    console.log("🪪 Bank ID input:", bankIdInput);

    // Load all records to find the bank
    const allRecords = await getAllUserRecords();
    console.log("📂 Loaded all user records:", allRecords.length);

    let targetBank = null;
    let ownerId = null;

    for (const rec of allRecords) {
      if (!rec.banks) continue;
      const found = rec.banks.find((b) => b.id === bankIdInput);
      if (found) {
        targetBank = found;
        ownerId = rec.userId; // ✅ FIXED HERE
        break;
      }
    }

    if (!targetBank) {
      const { embed } = embedTemplate({
        title: "❌ Invalid Bank ID",
        description: "> No bank matches that ID.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    console.log("🏦 Target bank found:", targetBank.name);
    console.log("👑 Bank owner:", ownerId);

    // 🔥 RELOAD FULL OWNER RECORD (THIS FIXES EVERYTHING)
    const ownerRecord = await getUserRecord(ownerId);

    if (!ownerRecord) {
      console.error("❌ Owner record missing in database.");
      const { embed } = embedTemplate({
        title: "⚠️ Internal Error",
        description: "> Could not load the bank owner's record.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Load user record
    const userRecord = await getUserRecord(userId);
    if (!userRecord.joinedBanks) userRecord.joinedBanks = [];

    // Already a member?
    if (targetBank.members.includes(userId)) {
      const { embed } = embedTemplate({
        title: "❌ Already Joined",
        description: "> You are already a member of this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Duplicate request?
    ownerRecord.joinRequests = ownerRecord.joinRequests || [];
    if (
      ownerRecord.joinRequests.some(
        (r) => r.bankId === targetBank.id && r.userId === userId,
      )
    ) {
      const { embed } = embedTemplate({
        title: "❌ Invitation Already Sent",
        description:
          `> You already have a pending invitation for **${targetBank.name}**.\n` +
          `> Wait for the owner to accept or deny it.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Add join request safely
    const newRequest = {
      bankId: targetBank.id,
      userId: userId,
      timestamp: Date.now(),
    };

    console.log("📩 New join request created:", newRequest);

    ownerRecord.joinRequests.push(newRequest);

    // 🔥 SAFE UPDATE — DOES NOT WIPE BANKS
    await updateUserRecord(ownerRecord);

    const { embed } = embedTemplate({
      title: "📨 Invitation Added",
      description:
        `> Your invitation has been added to the bank owner's invites list.\n` +
        `> **Bank:** ${targetBank.name}\n` +
        `> **Owner:** <@${ownerId}>`,
      noLogo: true,
    });

    console.log("📨 Join request successfully saved for owner:", ownerId);

    return interaction.editReply({ embeds: [embed], flags: 64 });
  },
};
