const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
  loadLakevillePrices,
  loadSixhousentPrices,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-fixhome")
    .setDescription(
      "Fox Bank Staff Only — Fix corrupted home data for all users.",
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
    const lakevillePrices = await loadLakevillePrices();
    const sixhousentPrices = await loadSixhousentPrices();

    let fixedCount = 0;

    for (const user of allUsers) {
      let changed = false;

      // Ensure homes object exists
      if (!user.homes) {
        user.homes = { lakeville: [], sixhousent: [] };
        changed = true;
      }

      // Ensure arrays exist
      if (!Array.isArray(user.homes.lakeville)) {
        user.homes.lakeville =
          user.homes.lakeville && user.homes.lakeville.homeId
            ? [user.homes.lakeville]
            : [];
        changed = true;
      }

      if (!Array.isArray(user.homes.sixhousent)) {
        user.homes.sixhousent =
          user.homes.sixhousent && user.homes.sixhousent.homeId
            ? [user.homes.sixhousent]
            : [];
        changed = true;
      }

      // Fix each home entry
      const fixArea = (areaName, priceTable) => {
        const arr = user.homes[areaName];

        for (let i = 0; i < arr.length; i++) {
          const h = arr[i];

          // Remove invalid entries
          if (!h || typeof h !== "object") {
            arr.splice(i, 1);
            i--;
            changed = true;
            continue;
          }

          // Fix missing homeId
          if (typeof h.homeId !== "number") {
            arr.splice(i, 1);
            i--;
            changed = true;
            continue;
          }

          // Fix missing price
          if (typeof h.price !== "number") {
            const correctPrice = priceTable[h.homeId];
            if (typeof correctPrice === "number") {
              h.price = correctPrice;
            } else {
              // Remove invalid home
              arr.splice(i, 1);
              i--;
            }
            changed = true;
          }
        }
      };

      fixArea("lakeville", lakevillePrices);
      fixArea("sixhousent", sixhousentPrices);

      // Ensure Fox Bank balance is numeric
      if (user.foxBank && typeof user.foxBank.balance !== "number") {
        user.foxBank.balance = Number(user.foxBank.balance) || 0;
        changed = true;
      }

      if (changed) {
        fixedCount++;
        await updateUserRecord(user);
      }
    }

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Home Data Repair Complete",
      description:
        `> ${ARROW} **Users scanned:** ${allUsers.length}\n` +
        `> ${ARROW} **Users fixed:** ${fixedCount}\n\n` +
        `> All corrupted home entries have been repaired.\n` +
        `> Homes are now fully compatible with the new unlimited-home system.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
