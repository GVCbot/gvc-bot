const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";
const HR_ROLE_ID = "1350582607217430650";

// Helper: find the true owner of a bank
async function findBankOwnerRecord(bankId) {
  const allRecords = await getAllUserRecords();
  return allRecords.find((rec) =>
    (rec.banks || []).some((b) => b.id === bankId),
  );
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrwithdraw")
    .setDescription("HR ONLY — Move a user's bank balance into their cash.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose bank you want to withdraw from")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("bankid")
        .setDescription("Bank ID to withdraw from")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    // HR check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      const { embed } = embedTemplate({
        title: "❌ Access Denied",
        description: "> Only **HR** can use this command.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const targetUser = interaction.options.getUser("user");
    const bankId = interaction.options.getString("bankid");

    // Load target user record (co-owner or owner)
    const targetRecord = await getUserRecord(targetUser.id);

    // Find the TRUE owner of the bank
    const ownerRecord = await findBankOwnerRecord(bankId);

    if (!ownerRecord) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> No bank with that ID exists in the system.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Load the bank from the owner's record
    const bank = ownerRecord.banks.find((b) => b.id === bankId);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> Bank exists but could not be loaded.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Check balance
    const amount = Number(bank.balance) || 0;

    if (amount <= 0) {
      const { embed } = embedTemplate({
        title: "❌ No Balance",
        description: "> This bank has **0** balance.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Move money into owner's cash
    ownerRecord.cash = (Number(ownerRecord.cash) || 0) + amount;
    bank.balance = 0;

    // Save owner record
    await updateUserRecord(ownerRecord);

    const { embed } = embedTemplate({
      title: `${SUN} HR Withdrawal Complete ${SUN}`,
      description:
        `> ${ARROW} **Bank Owner:** <@${ownerRecord.userId}>\n` +
        `> ${ARROW} **Bank:** ${bank.name} (${bank.id})\n` +
        `> ${ARROW} **Amount Moved:** $${amount.toLocaleString()}\n\n` +
        `> ${ARROW} **New Cash Balance:** $${ownerRecord.cash.toLocaleString()}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
