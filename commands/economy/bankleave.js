const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankleave")
    .setDescription("Leave a bank you joined.")
    .addStringOption((opt) =>
      opt
        .setName("bankid")
        .setDescription("Bank ID you want to leave")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const bankId = interaction.options.getString("bankid");
    const passwordInput = interaction.options.getString("password");
    const userId = interaction.user.id;

    const userRecord = await getUserRecord(userId);

    if (!userRecord.joinedBanks || !userRecord.joinedBanks.includes(bankId)) {
      const { embed } = embedTemplate({
        title: "❌ Not Joined",
        description: "> You are not a member of this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const ownerId = bankId.split("_")[1];
    const ownerRecord = await getUserRecord(ownerId);

    const bank = ownerRecord.banks.find((b) => b.id === bankId);
    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> This bank no longer exists.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (bank.password !== passwordInput) {
      const { embed } = embedTemplate({
        title: "❌ Invalid Password",
        description: "> The password you entered is incorrect.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Remove user from bank members
    bank.members = bank.members.filter((id) => id !== userId);
    await updateUserRecord(ownerRecord);

    // Remove bank from user's joinedBanks
    userRecord.joinedBanks = userRecord.joinedBanks.filter(
      (id) => id !== bankId,
    );
    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: "🏦 Left Bank",
      description: `> You have left **${bank.type}**.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
