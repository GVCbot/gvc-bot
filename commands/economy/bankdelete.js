const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankdelete")
    .setDescription("Delete one of your banks.")
    .addStringOption((opt) =>
      opt.setName("bankid").setDescription("Bank ID").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const bankIdInput = protect.sanitize(
      interaction.options.getString("bankid"),
    );
    const passwordInput = protect.sanitize(
      interaction.options.getString("password"),
    );

    const ownerRecord = await getUserRecord(userId);
    if (!ownerRecord.banks) ownerRecord.banks = [];

    const bank = ownerRecord.banks.find((b) => b.id === bankIdInput);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> No bank matches that ID.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (bank.password !== passwordInput) {
      const { embed } = embedTemplate({
        title: "❌ Incorrect Password",
        description: "> The password does not match this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    if (bank.owner !== userId) {
      const { embed } = embedTemplate({
        title: "❌ Permission Denied",
        description: "> Only the bank owner can delete this bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    ownerRecord.cash = (ownerRecord.cash ?? 0) + bank.balance;
    bank.balance = 0;

    for (const memberId of bank.members) {
      const memberRecord = await getUserRecord(memberId);
      if (memberRecord.joinedBanks) {
        memberRecord.joinedBanks = memberRecord.joinedBanks.filter(
          (id) => id !== bank.id,
        );
        await updateUserRecord(memberRecord);
      }
    }

    ownerRecord.banks = ownerRecord.banks.filter((b) => b.id !== bank.id);
    await updateUserRecord(ownerRecord);

    const { embed } = embedTemplate({
      title: "🗑️ Bank Deleted",
      description: "> Your bank has been deleted successfully.",
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
