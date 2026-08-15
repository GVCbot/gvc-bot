const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-fixbalance")
    .setDescription(
      "Fox Bank Staff Only — Fix corrupted balances for all users.",
    ),

  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    console.log("[fox-fixbalance] Starting balance repair...");

    const allUsers = await getAllUserRecords();
    console.log(`[fox-fixbalance] Loaded ${allUsers.length} users.`);

    let fixedCount = 0;
    let scanned = 0;

    for (const user of allUsers) {
      scanned++;
      let changed = false;

      console.log(
        `[fox-fixbalance] Scanning user ${user.userId} (${scanned}/${allUsers.length})`,
      );

      // Fix cash
      if (typeof user.cash !== "number") {
        console.log(
          `[fixbalance] User ${user.userId} cash corrupted → fixing.`,
        );
        user.cash = Number(user.cash) || 0;
        changed = true;
      }

      // Fix moatBalance
      if (typeof user.moatBalance !== "number") {
        console.log(
          `[fixbalance] User ${user.userId} moatBalance corrupted → fixing.`,
        );
        user.moatBalance = Number(user.moatBalance) || 0;
        changed = true;
      }

      // Fix foxBank.balance
      if (user.foxBank) {
        if (typeof user.foxBank.balance !== "number") {
          console.log(
            `[fixbalance] User ${user.userId} foxBank.balance corrupted → fixing.`,
          );
          user.foxBank.balance = Number(user.foxBank.balance) || 0;
          changed = true;
        }
      }

      if (changed) {
        fixedCount++;
        await updateUserRecord(user);
        console.log(`[fixbalance] Updated user ${user.userId}`);
      }
    }

    console.log(
      `[fox-fixbalance] Repair complete. Users scanned: ${allUsers.length}, users fixed: ${fixedCount}.`,
    );

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Balance Repair Complete",
      description:
        `> ${ARROW} **Users scanned:** ${allUsers.length}\n` +
        `> ${ARROW} **Users fixed:** ${fixedCount}\n\n` +
        `> All corrupted balances have been repaired.\n` +
        `> Check console logs for detailed per-user repair info.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
