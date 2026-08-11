const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

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
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;
    const type = interaction.options.getString("type");
    const password = protect.sanitize(
      interaction.options.getString("password"),
    );

    const record = await getUserRecord(userId);
    if (!record.banks) record.banks = [];

    // Limit: 2 banks per user
    if (record.banks.length >= 2) {
      const { embed } = embedTemplate({
        title: "❌ Bank Limit Reached",
        description: "> You already have **2 banks**.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Require 100k cash
    if ((record.cash ?? 0) < 100000) {
      const { embed } = embedTemplate({
        title: "❌ Insufficient Cash",
        description: "> You need **100,000 cash** to create a bank.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Generate unique bank ID
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

    const { embed } = embedTemplate({
      title: `${SUN} Bank Created ${SUN}`,
      description:
        `> ${ARROW} **Type:** ${type}\n` +
        `> ${ARROW} **Bank ID:** ${bankId}\n` +
        `> ${ARROW} **Password:** ${password}\n` +
        `> ${ARROW} **Cost:** 100,000 cash`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
