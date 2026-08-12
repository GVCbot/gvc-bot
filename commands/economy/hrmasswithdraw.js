const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";
const HR_ROLE_ID = "1350582607217430650";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hrmasswithdraw")
    .setDescription(
      "HR ONLY — Withdraw ALL bank balances from EVERY user into their cash.",
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

    const allRecords = await getAllUserRecords();

    let totalBanksProcessed = 0;
    let totalMoneyMoved = 0;

    for (const record of allRecords) {
      if (!record.banks || record.banks.length === 0) continue;

      let userMoved = 0;

      for (const bank of record.banks) {
        if (bank.balance > 0) {
          userMoved += bank.balance;
          totalMoneyMoved += bank.balance;
          bank.balance = 0;
          totalBanksProcessed++;
        }
      }

      if (userMoved > 0) {
        record.cash = (record.cash ?? 0) + userMoved;
        await updateUserRecord(record);
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} HR Mass Withdrawal Complete ${SUN}`,
      description:
        `> ${ARROW} **Total Banks Processed:** ${totalBanksProcessed}\n` +
        `> ${ARROW} **Total Money Moved:** $${totalMoneyMoved.toLocaleString()}\n\n` +
        `> ${ARROW} All bank balances have been moved into user cash balances.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
