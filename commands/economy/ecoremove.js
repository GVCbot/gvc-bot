const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650"; // HR Staff role

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ecoremove")
    .setDescription("HR: Remove money from a user's balance.")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to remove money from.")
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Amount of money to remove.")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // HR role check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      const { embed } = embedTemplate({
        title:
          "<a:gvcsunspin:1527220557890850846> Access Denied <a:gvcsunspin:1527220557890850846>",
        description:
          "> <:bulletpoint:1534184707900837961> Only HR staff can use this command.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const hrMember = interaction.member;
    const receiver = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title:
          "<a:gvcsunspin:1527220557890850846> Invalid Amount <a:gvcsunspin:1527220557890850846>",
        description:
          "> <:bulletpoint:1534184707900837961> Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const receiverRecord = await getUserRecord(receiver.id);

    receiverRecord.cash = receiverRecord.cash ?? 0;
    receiverRecord.banks = receiverRecord.banks ?? [];

    // Calculate total money (cash + all banks)
    const totalBankBalance = receiverRecord.banks.reduce(
      (sum, b) => sum + (b.balance ?? 0),
      0,
    );
    const totalMoney = receiverRecord.cash + totalBankBalance;

    if (totalMoney < amount) {
      const { embed } = embedTemplate({
        title:
          "<a:gvcsunspin:1527220557890850846> Insufficient Funds <a:gvcsunspin:1527220557890850846>",
        description:
          "> <:bulletpoint:1534184707900837961> That user does not have enough money.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Remove from cash first
    let remaining = amount;

    if (receiverRecord.cash >= remaining) {
      receiverRecord.cash -= remaining;
      remaining = 0;
    } else {
      remaining -= receiverRecord.cash;
      receiverRecord.cash = 0;
    }

    // Remove from banks if needed
    if (remaining > 0) {
      for (const bank of receiverRecord.banks) {
        if (bank.balance >= remaining) {
          bank.balance -= remaining;
          remaining = 0;
          break;
        } else {
          remaining -= bank.balance;
          bank.balance = 0;
        }
      }
    }

    await updateUserRecord(receiverRecord);

    const desc =
      `> <:bulletpoint:1534184707900837961> **Removed from:** <@${receiver.id}>\n` +
      `> <:bulletpoint:1534184707900837961> **Amount:** $${amount.toLocaleString()}\n` +
      `> <:bulletpoint:1534184707900837961> **New Cash:** $${receiverRecord.cash.toLocaleString()}\n` +
      `> <:bulletpoint:1534184707900837961> **Total Bank Balance:** $${receiverRecord.banks.reduce((s, b) => s + b.balance, 0).toLocaleString()}`;

    const { embed } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Money Removed <a:gvcsunspin:1527220557890850846>",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));

    await interaction.editReply({ embeds: [embed] });

    // DM the user
    try {
      const { embed: dmEmbed } = embedTemplate({
        title:
          "<a:gvcsunspin:1527220557890850846> Money Removed <a:gvcsunspin:1527220557890850846>",
        description:
          `> <:bulletpoint:1534184707900837961> **By:** ${hrMember.user.username} (HR)\n` +
          `> <:bulletpoint:1534184707900837961> **Amount Removed:** $${amount.toLocaleString()}\n` +
          `> <:bulletpoint:1534184707900837961> **New Cash:** $${receiverRecord.cash.toLocaleString()}\n` +
          `> <:bulletpoint:1534184707900837961> **Total Bank Balance:** $${receiverRecord.banks.reduce((s, b) => s + b.balance, 0).toLocaleString()}`,
        noLogo: true,
      });

      dmEmbed.setThumbnail(receiver.displayAvatarURL({ dynamic: true }));

      await receiver.send({ embeds: [dmEmbed] });
    } catch {
      // Ignore if DMs are closed
    }
  },
};
