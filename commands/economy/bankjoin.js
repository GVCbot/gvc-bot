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

    const allRecords = await getAllUserRecords();
    console.log("📂 Loaded all user records:", allRecords.length);

    let targetBank = null;
    let ownerRecord = null;

    for (const rec of allRecords) {
      if (!rec.banks) continue;
      const found = rec.banks.find((b) => b.id === bankIdInput);
      if (found) {
        targetBank = found;
        ownerRecord = rec;
        break;
      }
    }

    if (!targetBank) {
      console.warn("❌ Invalid bank ID:", bankIdInput);
      const { embed } = embedTemplate({
        title: "❌ Invalid Bank ID",
        description: "> No bank matches that ID.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    console.log("🏦 Target bank found:", targetBank.name);
    console.log("👑 Bank owner:", targetBank.owner);

    const userRecord = await getUserRecord(userId);
    if (!userRecord.joinedBanks) userRecord.joinedBanks = [];

    if (targetBank.members.includes(userId)) {
      console.warn("⚠️ User already a member:", userId);
      const { embed } = embedTemplate({
        title: "❌ Already Joined",
        description: "> You are already a member of this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // 🚫 Prevent duplicate invitations
    if (
      ownerRecord.joinRequests &&
      ownerRecord.joinRequests.some(
        (r) => r.bankId === targetBank.id && r.userId === userId,
      )
    ) {
      console.warn("⚠️ Duplicate invitation attempt:", userId);
      const { embed } = embedTemplate({
        title: "❌ Invitation Already Sent",
        description:
          `> You already have a pending invitation for **${targetBank.name}**.\n` +
          `> Wait for the owner to accept or deny it.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], flags: 64 });
    }

    // 📩 Store join request in owner's record
    if (!ownerRecord.joinRequests) ownerRecord.joinRequests = [];

    const newRequest = {
      bankId: targetBank.id,
      userId: userId,
      timestamp: Date.now(),
    };

    console.log("📩 New join request created:", newRequest);
    console.log("📂 Owner record before update:", ownerRecord.joinRequests);

    ownerRecord.joinRequests.push(newRequest);
    await updateUserRecord(ownerRecord);

    console.log("💾 Updated owner record for:", targetBank.owner);
    console.log("✅ Owner record after update:", ownerRecord.joinRequests);

    const { embed } = embedTemplate({
      title: "📨 Invitation Added",
      description:
        `> Your invitation has been added to the bank owner's invites list.\n` +
        `> **Bank:** ${targetBank.name}\n` +
        `> **Owner:** <@${targetBank.owner}>`,
      noLogo: true,
    });

    console.log(
      "📨 Join request successfully saved for owner:",
      targetBank.owner,
    );

    return interaction.editReply({ embeds: [embed], flags: 64 });
  },
};
