const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
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

    const allRecords = await getAllUserRecords();

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
      const { embed } = embedTemplate({
        title: "❌ Invalid Bank ID",
        description: "> No bank matches that ID.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const userRecord = await getUserRecord(userId);
    if (!userRecord.joinedBanks) userRecord.joinedBanks = [];

    if (targetBank.members.includes(userId)) {
      const { embed } = embedTemplate({
        title: "❌ Already Joined",
        description: "> You are already a member of this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const ownerUser = await interaction.client.users.fetch(targetBank.owner);

    return interaction.editReply({
      content: "📨 Your join request has been sent to the bank owner.",
      flags: 64,
    });
  },
};
