const {
  getAllUserRecords,
  updateUserRecord,
} = require("../economy/economyutils");
const moatembedTemplate = require("./moatembedTemplate");

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

async function runBusinessIncomeCollection(client) {
  console.log("🏢 Running scheduled business income collection...");

  const allUsers = await getAllUserRecords();
  let collectedCount = 0;

  for (const user of allUsers) {
    if (!user.moatCastle || !user.moatCastle.business) continue;

    const income = Number(user.moatCastle.business.income) || 0;
    if (income <= 0) continue;

    user.moatCastle.balance = (Number(user.moatCastle.balance) || 0) + income;
    user.moatCastle.business.lastIncomeCollected = Date.now();

    await updateUserRecord(user);
    collectedCount++;

    try {
      const owner = await client.users.fetch(user.userId);
      const { embed } = moatembedTemplate({
        title: "🏢 Daily Business Income",
        description: `> Your business **${user.moatCastle.business.name}** earned **$${income.toLocaleString()}** today.`,
        noLogo: false,
      });
      await owner.send({ embeds: [embed] });
    } catch {}
  }

  console.log(
    `✅ Business income collection complete. Paid ${collectedCount} business(es).`,
  );
}

function startBusinessIncomeLoop(client) {
  // Run once on startup, then every 24 hours.

  setInterval(() => runBusinessIncomeCollection(client), TWENTY_FOUR_HOURS);
}

module.exports = { startBusinessIncomeLoop, runBusinessIncomeCollection };
