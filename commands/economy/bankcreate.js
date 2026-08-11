const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankcreate")
    .setDescription("Create a new bank account.")
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Bank type")
        .setRequired(true)
        .addChoices(
          { name: "Fox Bank", value: "foxbank" },
          { name: "Moat Castle", value: "moatcastle" },
        ),
    )
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    const userId = interaction.user.id;
    const type = interaction.options.getString("type");
    const password = protect.sanitize(
      interaction.options.getString("password"),
    );

    const record = await getUserRecord(userId);
    if (!record.banks) record.banks = [];

    if (record.banks.length >= 2) {
      const { embed, files } = embedTemplate({
        title: "❌ Bank Limit Reached",
        description: "> You already have **2 banks**.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    if ((record.cash ?? 0) < 100000) {
      const { embed, files } = embedTemplate({
        title: "❌ Insufficient Cash",
        description: "> You need **100,000 cash** to create a bank.",
        noLogo: true,
      });
      return interaction.reply({ embeds: [embed], files, ephemeral: true });
    }

    const bankId = `bank_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

    const newBank = {
      id: bankId,
      type,
      password,
      owner: userId,
      members: [userId],
      balance: 0,
    };

    record.cash -= 100000;
    record.banks.push(newBank);
    await updateUserRecord(record);

    const { embed, files } = embedTemplate({
      title: "🏦 Bank Created",
      description:
        `> **Type:** ${type}\n` +
        `> **Bank ID:** ${bankId}\n` +
        `> **Password:** ${password}\n` +
        `> **Cost:** 100,000 cash`,
      noLogo: true,
    });

    return interaction.reply({ embeds: [embed], files, ephemeral: true });
  },
};
