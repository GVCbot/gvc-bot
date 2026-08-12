const { SlashCommandBuilder } = require("discord.js");
const protect = require("../../security/protect");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
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
      opt.setName("name").setDescription("Bank name").setRequired(true),
    )
    .addStringOption((opt) =>
      opt.setName("password").setDescription("Bank password").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userId = interaction.user.id;

    // Convert type to readable format
    const rawType = interaction.options.getString("type");
    const type =
      rawType === "foxbank"
        ? "Fox Bank"
        : rawType === "moatcastle"
          ? "Moat Castle"
          : "Unknown";

    const name = protect.sanitize(interaction.options.getString("name"));
    const password = protect.sanitize(
      interaction.options.getString("password"),
    );

    // Basic validation
    if (name.length < 2 || password.length < 2) {
      const { embed } = embedTemplate({
        title: "❌ Invalid Input",
        description:
          "> Bank name and password must be at least **2 characters** long.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Prevent weird characters
    const invalidPattern = /[^a-zA-Z0-9\s\-]/;
    if (invalidPattern.test(name)) {
      const { embed } = embedTemplate({
        title: "❌ Invalid Bank Name",
        description:
          "> Bank names may only contain letters, numbers, spaces, and hyphens.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const record = await getUserRecord(userId);
    if (!record.banks) record.banks = [];

    // Prevent too many banks
    if (record.banks.length >= 10) {
      const { embed } = embedTemplate({
        title: "❌ Bank Limit Reached",
        description: "> You cannot create more than **10 banks**.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const allRecords = await getAllUserRecords();

    // Global name check
    const globalNameTaken = allRecords.some((rec) =>
      (rec.banks || []).some(
        (b) => b.name.toLowerCase() === name.toLowerCase(),
      ),
    );

    if (globalNameTaken) {
      const { embed } = embedTemplate({
        title: "❌ Name Already Taken",
        description: `> A bank named **${name}** already exists.\n> Bank names must be unique.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Local duplicate check
    const localNameTaken = record.banks.some(
      (b) => b.name.toLowerCase() === name.toLowerCase(),
    );

    if (localNameTaken) {
      const { embed } = embedTemplate({
        title: "❌ Duplicate Name",
        description:
          "> You already own a bank with this name.\n> Choose a different name.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Cost logic: first 2 banks free, rest cost 100k
    const bankCount = record.banks.length;
    let cost = bankCount >= 2 ? 100000 : 0;

    if ((record.cash ?? 0) < cost) {
      const { embed } = embedTemplate({
        title: "❌ Insufficient Cash",
        description: `> You need **${cost.toLocaleString()} cash** to create another bank.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Generate unique bank ID
    const bankId = `bank_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 6)}`;

    const newBank = {
      id: bankId,
      type,
      name,
      password,
      owner: userId,
      members: [userId],
      balance: 0,
    };

    // Deduct cost if needed
    record.cash -= cost;
    record.banks.push(newBank);
    await updateUserRecord(record);

    const { embed } = embedTemplate({
      title: `${SUN} Bank Created ${SUN}`,
      description:
        `> ${ARROW} **Name:** ${name}\n` +
        `> ${ARROW} **Type:** ${type}\n` +
        `> ${ARROW} **Bank ID:** ${bankId}\n` +
        `> ${ARROW} **Password:** ${password}\n` +
        `> ${ARROW} **Cost:** ${cost === 0 ? "Free" : cost.toLocaleString()}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
