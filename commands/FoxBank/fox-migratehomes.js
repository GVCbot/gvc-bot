const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-migratehomes")
    .setDescription(
      "Fox Bank Staff Only — One-time migration to unlimited homes.",
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Staff check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const allUsers = await getAllUserRecords();

    let migratedLakeville = 0;
    let migratedSixhousent = 0;

    for (const user of allUsers) {
      if (!user.homes) continue;

      let changed = false;

      // ⭐ Migrate Lakeville
      if (user.homes.lakeville && !Array.isArray(user.homes.lakeville)) {
        const oldHome = user.homes.lakeville;
        if (oldHome && oldHome.homeId !== undefined) {
          user.homes.lakeville = [oldHome];
          migratedLakeville++;
          changed = true;
        } else {
          user.homes.lakeville = [];
        }
      }

      // ⭐ Migrate Sixhousent
      if (user.homes.sixhousent && !Array.isArray(user.homes.sixhousent)) {
        const oldHome = user.homes.sixhousent;
        if (oldHome && oldHome.homeId !== undefined) {
          user.homes.sixhousent = [oldHome];
          migratedSixhousent++;
          changed = true;
        } else {
          user.homes.sixhousent = [];
        }
      }

      if (changed) {
        await updateUserRecord(user);
      }
    }

    const { embed, files } = foxbankembedTemplate({
      title: "Home Migration Complete",
      description:
        `> ${ARROW} Migration finished successfully.\n\n` +
        `> ${ARROW} **Lakeville homes migrated:** ${migratedLakeville}\n` +
        `> ${ARROW} **Sixhousent homes migrated:** ${migratedSixhousent}\n\n` +
        `> ${ARROW} All users now support **unlimited homes**.\n` +
        `> ${ARROW} You may now safely delete this command.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
