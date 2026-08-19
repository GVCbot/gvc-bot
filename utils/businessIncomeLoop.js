const {
  getAllUserRecords,
  updateUserRecord,
} = require("../economy/economyutils");
const moatembedTemplate = require("./moatembedTemplate");

const MEMBERSHIP_INCOME_BOOST = {
  standard: 0,
  silver: 0.02,
  gold: 0.04,
  platinum: 0.06,
  black: 0.1,
};

// Convert GMT+4 10:00 AM to UTC time (6:00 AM UTC)
function getNextRunTime() {
  const now = new Date();
  const next = new Date();

  next.setUTCHours(6, 0, 0, 0); // 10 AM GMT+4 = 6 AM UTC

  // If today's 10 AM GMT+4 already passed, schedule tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  return next.getTime();
}

async function runBusinessIncomeCollection(client) {
  console.log("🏢 Running scheduled business income collection...");

  const allUsers = await getAllUserRecords();
  const now = Date.now();
  let collectedCount = 0;

  for (const user of allUsers) {
    if (!user.moatCastle || !user.moatCastle.businesses) continue;

    const membership = user.moatCastle.membership?.toLowerCase() || "standard";
    const boostPercent = MEMBERSHIP_INCOME_BOOST[membership] || 0;

    for (const business of user.moatCastle.businesses) {
      const baseIncome = Number(business.income) || 0;
      if (baseIncome <= 0) continue;

      const last = business.lastIncomeCollected || 0;

      // Only pay if 24 hours passed
      if (now - last >= 86400000) {
        const bonusIncome = Math.floor(baseIncome * boostPercent);
        const totalIncome = baseIncome + bonusIncome;

        user.moatCastle.balance =
          (Number(user.moatCastle.balance) || 0) + totalIncome;

        business.lastIncomeCollected = now;
        await updateUserRecord(user);

        collectedCount++;

        try {
          const owner = await client.users.fetch(user.userId);
          const { embed } = moatembedTemplate({
            title: "🏢 Daily Business Income",
            description:
              `> Your business **${business.name}** earned:\n\n` +
              `> **Base Income:** $${baseIncome.toLocaleString()}\n` +
              `> **Membership Bonus:** $${bonusIncome.toLocaleString()}\n` +
              `> **Total:** $${totalIncome.toLocaleString()}`,
            noLogo: false,
          });
          await owner.send({ embeds: [embed] });
        } catch {}
      }
    }
  }

  console.log(
    `✅ Business income collection complete. Paid ${collectedCount} business(es).`,
  );

  // Schedule next run
  const nextRun = getNextRunTime();
  const delay = nextRun - Date.now();
  setTimeout(() => runBusinessIncomeCollection(client), delay);
}

function startBusinessIncomeLoop(client) {
  const firstRunDelay = getNextRunTime() - Date.now();
  setTimeout(() => runBusinessIncomeCollection(client), firstRunDelay);
}

module.exports = { startBusinessIncomeLoop };
