const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankleave")
    .setDescription("Leave a bank you co-own.")
    .addStringOption((opt) =>
      opt
        .setName("bankname")
        .setDescription("Bank name you want to leave")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const bankNameInput = interaction.options
      .getString("bankname")
      .toLowerCase();
    const userId = interaction.user.id;

    let userRecord = await getUserRecord(userId);

    if (!userRecord) {
      const { embed } = embedTemplate({
        title: "❌ No Profile Found",
        description: "> You do not have an economy profile yet.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const ownedBanks = userRecord.banks || [];
    const joinedBanks = userRecord.joinedBanks || [];

    const ownedMatch = ownedBanks.find(
      (b) => b.name.toLowerCase() === bankNameInput,
    );

    if (ownedMatch) {
      const { embed } = embedTemplate({
        title: "❌ Cannot Leave Your Own Bank",
        description:
          "> You are the **owner** of this bank.\n> Use `/bankdelete` instead.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    let targetBank = null;
    let ownerRecord = null;

    if (joinedBanks.length > 0) {
      const allRecords = await getAllUserRecords();

      for (const bankId of joinedBanks) {
        for (const rec of allRecords) {
          const bank = (rec.banks || []).find((b) => b.id === bankId);
          if (bank && bank.name.toLowerCase() === bankNameInput) {
            targetBank = bank;
            ownerRecord = rec;
            break;
          }
        }
        if (targetBank) break;
      }
    }

    if (!targetBank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> You are not a co-owner of any bank with that name.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    targetBank.members = targetBank.members.filter((id) => id !== userId);
    await updateUserRecord(ownerRecord);

    userRecord.joinedBanks = userRecord.joinedBanks.filter(
      (id) => id !== targetBank.id,
    );
    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: "🏦 Left Bank",
      description: `> You are no longer a co-owner of **${targetBank.name}**.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
