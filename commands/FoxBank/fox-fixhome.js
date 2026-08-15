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

    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    console.log("[fox-fixhome] Starting home data repair...");

    const allUsers = await getAllUserRecords();
    console.log(`[fox-fixhome] Loaded ${allUsers.length} users.`);

    const lakevillePrices = await loadLakevillePrices();
    const sixhousentPrices = await loadSixhousentPrices();

    let fixedCount = 0;
    let scanned = 0;

    for (const user of allUsers) {
      scanned++;
      let changed = false;

      console.log(
        `[fox-fixhome] Scanning user ${user.id || user._id} (${scanned}/${allUsers.length})`,
      );

      if (!user.homes) {
        console.log(
          `[fox-fixhome] User ${user.id} missing homes object → initializing.`,
        );
        user.homes = { lakeville: [], sixhousent: [] };
        changed = true;
      }

      if (!Array.isArray(user.homes.lakeville)) {
        console.log(
          `[fox-fixhome] User ${user.id} lakeville not array → converting.`,
        );
        user.homes.lakeville =
          user.homes.lakeville && user.homes.lakeville.homeId
            ? [user.homes.lakeville]
            : [];
        changed = true;
      }

      if (!Array.isArray(user.homes.sixhousent)) {
        console.log(
          `[fox-fixhome] User ${user.id} sixhousent not array → converting.`,
        );
        user.homes.sixhousent =
          user.homes.sixhousent && user.homes.sixhousent.homeId
            ? [user.homes.sixhousent]
            : [];
        changed = true;
      }

      const fixArea = (areaName, priceTable) => {
        const arr = user.homes[areaName];

        for (let i = 0; i < arr.length; i++) {
          const h = arr[i];

          if (!h || typeof h !== "object") {
            console.log(
              `[fox-fixhome] User ${user.id} ${areaName}[${i}] invalid → removing.`,
            );
            arr.splice(i, 1);
            i--;
            changed = true;
            continue;
          }

          if (typeof h.homeId !== "number") {
            console.log(
              `[fox-fixhome] User ${user.id} ${areaName}[${i}] missing homeId → removing.`,
            );
            arr.splice(i, 1);
            i--;
            changed = true;
            continue;
          }

          if (typeof h.price !== "number") {
            const correctPrice = priceTable[h.homeId];
            if (typeof correctPrice === "number") {
              console.log(
                `[fox-fixhome] User ${user.id} ${areaName} homeId ${h.homeId} missing price → setting to ${correctPrice}.`,
              );
              h.price = correctPrice;
            } else {
              console.log(
                `[fox-fixhome] User ${user.id} ${areaName} homeId ${h.homeId} has no valid price → removing.`,
              );
              arr.splice(i, 1);
              i--;
            }
            changed = true;
          }
        }
      };

      fixArea("lakeville", lakevillePrices);
      fixArea("sixhousent", sixhousentPrices);

      if (user.foxBank && typeof user.foxBank.balance !== "number") {
        console.log(
          `[fox-fixhome] User ${user.id} balance not numeric → fixing.`,
        );
        user.foxBank.balance = Number(user.foxBank.balance) || 0;
        changed = true;
      }

      if (changed) {
        fixedCount++;
        console.log(`[fox-fixhome] User ${user.id} updated.`);
        await updateUserRecord(user);
      }
    }

    console.log(
      `[fox-fixhome] Repair complete. Users scanned: ${allUsers.length}, users fixed: ${fixedCount}.`,
    );

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Home Data Repair Complete",
      description:
        `> ${ARROW} **Users scanned:** ${allUsers.length}\n` +
        `> ${ARROW} **Users fixed:** ${fixedCount}\n\n` +
        `> Check console logs for detailed per-user repair info.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
