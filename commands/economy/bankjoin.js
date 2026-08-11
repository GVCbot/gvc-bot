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
    .setDescription("Join an existing bank.")
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const passwordInput = protect.sanitize(
      interaction.options.getString("password"),
    );

    // Load ALL user records from your database
    const allRecords = await getAllUserRecords();

    let targetBank = null;
    let ownerRecord = null;

    for (const rec of allRecords) {
      if (!rec.banks) continue;

      const found = rec.banks.find((b) => b.password === passwordInput);
      if (found) {
        targetBank = found;
        ownerRecord = rec;
        break;
      }
    }

    if (!targetBank) {
      const { embed } = embedTemplate({
        title: "❌ Invalid Password",
        description: "> No bank matches that password.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Load joining user's record
    const userRecord = await getUserRecord(userId);
    if (!userRecord.joinedBanks) userRecord.joinedBanks = [];

    // Limit: 2 banks total (owned + joined)
    const totalBanks =
      (userRecord.banks?.length || 0) + userRecord.joinedBanks.length;

    if (totalBanks >= 2) {
      const { embed } = embedTemplate({
        title: "❌ Bank Limit Reached",
        description: "> You are already in **2 banks**.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Already joined?
    if (targetBank.members.includes(userId)) {
      const { embed } = embedTemplate({
        title: "❌ Already Joined",
        description: "> You are already a member of this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Add member to owner’s bank
    targetBank.members.push(userId);
    await updateUserRecord(ownerRecord);

    // Add bank ID to member’s joinedBanks
    userRecord.joinedBanks.push(targetBank.id);
    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: "🏦 Bank Joined",
      description: `> You joined **${targetBank.type}** successfully.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
