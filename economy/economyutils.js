const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  ssl: true,
  tlsAllowInvalidCertificates: false,
  serverSelectionTimeoutMS: 5000,
});

async function getDB() {
  try {
    if (!client.topology || !client.topology.isConnected()) {
      console.log("🔌 Connecting to MongoDB...");
      await client.connect();
      console.log("✅ MongoDB connected");
    }

    const db = client.db("economy");
    console.log("📂 Using database: economy");
    return db;
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
    throw err;
  }
}

// -----------------------------------------------------
// LOAD ALL USERS
// -----------------------------------------------------
async function loadEconomy() {
  const db = await getDB();
  console.log("📥 Loading all user records...");
  return await db.collection("users").find().toArray();
}

// -----------------------------------------------------
// LOAD ROLE INCOME
// -----------------------------------------------------
async function loadRoleIncome() {
  try {
    const db = await getDB();
    const collection = db.collection("roleIncome");

    console.log("📥 Fetching roleIncome document...");
    const doc = await collection.findOne({});
    if (!doc) {
      console.log("⚠️ roleIncome document not found!");
      return {};
    }

    console.log("📄 roleIncome loaded:", doc.data);
    return doc.data || {};
  } catch (err) {
    console.error("❌ Error loading roleIncome:", err);
    return {};
  }
}

// -----------------------------------------------------
// LOAD WORK MESSAGES
// -----------------------------------------------------
async function loadWorkMessages() {
  try {
    const db = await getDB();
    const collection = db.collection("workMessages");

    console.log("📥 Fetching workMessages document...");
    const doc = await collection.findOne({});
    if (!doc || !doc.data) {
      console.log("⚠️ No workMessages found in DB!");
      return [];
    }

    console.log(`📄 Loaded ${doc.data.length} workMessages`);
    return doc.data;
  } catch (err) {
    console.error("❌ Error loading workMessages:", err);
    return [];
  }
}

// -----------------------------------------------------
// LOAD HOME PRICES — LAKEVILLE
// -----------------------------------------------------
async function loadLakevillePrices() {
  const db = await getDB();
  const docs = await db.collection("foxlakevillehomeprices").find({}).toArray();

  const prices = {};
  for (const d of docs) {
    prices[d.homeId] = d.price;
  }
  return prices;
}

// -----------------------------------------------------
// LOAD HOME PRICES — SIXHOUSENT
// -----------------------------------------------------
async function loadSixhousentPrices() {
  const db = await getDB();
  const docs = await db
    .collection("foxsixhousenthomeprices")
    .find({})
    .toArray();

  const prices = {};
  for (const d of docs) {
    prices[d.homeId] = d.price;
  }
  return prices;
}

// -----------------------------------------------------
// GET OR CREATE USER RECORD
// -----------------------------------------------------
async function getUserRecord(userId) {
  const db = await getDB();
  const collection = db.collection("users");

  let user = await collection.findOne({ userId });

  if (!user) {
    console.log(`🆕 Creating new user record for ${userId}`);
    user = {
      userId,
      cash: 0,
      moatBalance: 0,
      lastCollect: 0,
      lastWork: 0,

      records: { citations: [], warrants: [], blackpoints: 0 },
      vehicles: [],
      moatCastle: null,

      foxBank: null,

      homes: {
        lakeville: [],
        sixhousent: [],
      },
    };

    await collection.insertOne(user);
    return user;
  }

  // ⭐ Ensure balances are numeric
  user.cash = Number(user.cash) || 0;
  user.moatBalance = Number(user.moatBalance) || 0;

  // ⭐ Ensure foxBank exists
  if (!user.foxBank) {
    user.foxBank = {
      accountName: `${userId}'s Account`,
      accountId:
        "FB-" + Math.random().toString(36).substring(2, 8).toUpperCase(),
      cardNumber: Array.from({ length: 16 }, () =>
        Math.floor(Math.random() * 10),
      ).join(""),
      cardStatus: "Active",
      balance: 0,
      tier: "Standard",
      createdAt: Date.now(),
    };
  } else {
    // ⭐ Ensure foxBank fields exist
    user.foxBank.balance = Number(user.foxBank.balance) || 0;
    user.foxBank.cardStatus = user.foxBank.cardStatus || "Active";
    user.foxBank.tier = user.foxBank.tier || "Standard";
    user.foxBank.accountId =
      user.foxBank.accountId ||
      "FB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    user.foxBank.cardNumber =
      user.foxBank.cardNumber ||
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");
    user.foxBank.createdAt = user.foxBank.createdAt || Date.now();
  }

  // ⭐ Ensure homes exist
  user.homes = user.homes || { lakeville: [], sixhousent: [] };
  if (!Array.isArray(user.homes.lakeville)) user.homes.lakeville = [];
  if (!Array.isArray(user.homes.sixhousent)) user.homes.sixhousent = [];

  return user;
}

// -----------------------------------------------------
// SAFE UPDATE USER RECORD
// -----------------------------------------------------
async function updateUserRecord(user) {
  const db = await getDB();
  const collection = db.collection("users");

  // ⭐ Ensure numeric before saving
  user.cash = Number(user.cash) || 0;
  user.moatBalance = Number(user.moatBalance) || 0;

  if (user.foxBank) {
    user.foxBank.balance = Number(user.foxBank.balance) || 0;
  }

  await collection.updateOne(
    { userId: user.userId },
    { $set: user },
    { upsert: true },
  );

  console.log(`💾 Updated user record for ${user.userId}`);
}

// -----------------------------------------------------
// GET ALL USERS
// -----------------------------------------------------
async function getAllUserRecords() {
  const db = await getDB();
  return await db.collection("users").find({}).toArray();
}

module.exports = {
  loadEconomy,
  loadRoleIncome,
  loadWorkMessages,
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
  getDB,
  loadLakevillePrices,
  loadSixhousentPrices,
};
