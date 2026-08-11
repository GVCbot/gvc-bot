const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankjoin")
    .setDescription("Join an existing bank.")
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const password = protect.sanitize(
      interaction.options.getString("password"),
    );

    const allUsers = interaction.client.users.cache;
    let targetBank = null;
    let ownerRecord = null;

    for (const user of allUsers.values()) {
      const rec = await getUserRecord(user.id);
      if (!rec.banks) continue;

      const found = rec.banks.find((b) => b.password === password);
      if (found) {
        targetBank = found;
        ownerRecord = rec;
        break;
      }
    }

    if (!targetBank) {
      const { embed, files } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> No bank matches that password.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    const userRecord = await getUserRecord(userId);
    if (!userRecord.banks) userRecord.banks = [];

    if (userRecord.banks.length >= 2) {
      const { embed, files } = embedTemplate({
        title: "❌ Bank Limit Reached",
        description: "> You are already in **2 banks**.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    if (targetBank.members.includes(userId)) {
      const { embed, files } = embedTemplate({
        title: "❌ Already Joined",
        description: "> You are already a member of this bank.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    targetBank.members.push(userId);
    userRecord.banks.push(targetBank);

    await updateUserRecord(ownerRecord);
    await updateUserRecord(userRecord);

    const { embed, files } = embedTemplate({
      title: "🏦 Bank Joined",
      description: `> You joined **${targetBank.type}** successfully.`,
      noLogo: true,
    });

    return interaction.reply({ embeds: [embed], files, ephemeral: true });
  },
};
