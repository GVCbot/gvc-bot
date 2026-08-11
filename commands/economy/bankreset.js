const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { loadEconomy, updateUserRecord } = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banksreset")
    .setDescription("HR ONLY — Wipe ALL banks from ALL users."),

  async execute(interaction) {
    // HR check
    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.reply({
        content: "❌ You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    console.log("🧹 Starting GLOBAL BANK WIPE...");

    // Load all users
    const allUsers = await loadEconomy();
    console.log(`📥 Loaded ${allUsers.length} user records.`);

    let wipedCount = 0;

    for (const user of allUsers) {
      if (user.banks && user.banks.length > 0) {
        console.log(`🗑️ Wiping banks for user ${user.userId}...`);
        user.banks = [];
        await updateUserRecord(user);
        wipedCount++;
      }
    }

    console.log(`✅ GLOBAL BANK WIPE COMPLETE — ${wipedCount} users cleaned.`);

    const { embed } = embedTemplate({
      title: `${SUN} Global Bank Reset Complete ${SUN}`,
      description:
        `> ${ARROW} All banks have been wiped from **${wipedCount} users**.\n` +
        `> ${ARROW} The entire bank system is now clean.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
