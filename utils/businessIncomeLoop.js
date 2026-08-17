const {
  getAllUserRecords,
  updateUserRecord,
} = require("../economy/economyutils");
const moatembedTemplate = require("./moatembedTemplate");

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

// ⭐ NEW — Membership income boosts
const MEMBERSHIP_INCOME_BOOST = {
  standard: 0,
  silver: 0.02,
  gold: 0.04,
  platinum: 0.06,
  black: 0.1,
};

async function runBusinessIncomeCollection(client) {
  console.log("🏢 Running scheduled business income collection...");

  const allUsers = await getAllUserRecords();
  let collectedCount = 0;

  for (const user of allUsers) {
    if (!user.moatCastle || !user.moatCastle.business) continue;

    const baseIncome = Number(user.moatCastle.business.income) || 0;
    if (baseIncome <= 0) continue;

    const membership = user.moatCastle.membership?.toLowerCase() || "standard";
    const boostPercent = MEMBERSHIP_INCOME_BOOST[membership] || 0;

    // ⭐ Apply membership boost
    const bonusIncome = Math.floor(baseIncome * boostPercent);
    const totalIncome = baseIncome + bonusIncome;

    user.moatCastle.balance =
      (Number(user.moatCastle.balance) || 0) + totalIncome;

    user.moatCastle.business.lastIncomeCollected = Date.now();

    await updateUserRecord(user);
    collectedCount++;

    try {
      const owner = await client.users.fetch(user.userId);
      const { embed } = moatembedTemplate({
        title: "🏢 Daily Business Income",
        description:
          `> Your business **${user.moatCastle.business.name}** earned:\n\n` +
          `> **Base Income:** $${baseIncome.toLocaleString()}\n` +
          `> **Membership Bonus:** $${bonusIncome.toLocaleString()}\n` +
          `> **Total:** $${totalIncome.toLocaleString()}`,
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
  setInterval(() => runBusinessIncomeCollection(client), TWENTY_FOUR_HOURS);
}

module.exports = { startBusinessIncomeLoop, runBusinessIncomeCollection };
