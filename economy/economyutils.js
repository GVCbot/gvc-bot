const { MongoClient } = require("mongodb");
require("dotenv").config();

const uri = process.env.MONGO_URI;

const client = new MongoClient(uri, {
  ssl: true,
  tlsAllowInvalidCertificates: false,
  serverSelectionTimeoutMS: 5000,
});

const MOAT_BUSINESS_LIMIT = 6;

// ===============================
// 🔌 Database Connection
// ===============================
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

// ===============================
// 📥 Bulk / Config Loaders
// ===============================
async function loadEconomy() {
  const db = await getDB();
  console.log("📥 Loading all user records...");
  return await db.collection("users").find().toArray();
}

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

async function loadLakevillePrices() {
  const db = await getDB();
  const docs = await db.collection("foxlakevillehomeprices").find({}).toArray();

  const prices = {};
  for (const d of docs) {
    prices[d.homeId] = d.price;
  }
  return prices;
}

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

// ===============================
// 🧰 Record Normalization
// (shared by getUserRecord + getAllUserRecords, so every
//  code path sees fully migrated, consistent data)
// ===============================
function normalizeUserRecord(user) {
  // --- Basic fields ---
  user.cash = Number(user.cash) || 0;
  user.moatBalance = Number(user.moatBalance) || 0;
  if (user.userId === "MOAT_OFFICIAL_BANK") {
    user.moatCastleOfficialBank = user.moatCastleOfficialBank || {
      balance: 0,
      lastUpdated: Date.now(),
    };
  }

  // --- Fox Bank (do not auto-create) ---
  if (!user.foxBank) {
    user.foxBank = null;
  } else {
    user.foxBank.balance = Number(user.foxBank.balance) || 0;
    user.foxBank.cardStatus = user.foxBank.cardStatus || "Active";
    user.foxBank.tier = user.foxBank.tier || "Standard";
    user.foxBank.membership = user.foxBank.membership || "None";

    user.foxBank.accountId =
      user.foxBank.accountId ||
      "FB-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    user.foxBank.cardNumber =
      user.foxBank.cardNumber ||
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");

    user.foxBank.createdAt = user.foxBank.createdAt || Date.now();

    user.foxBank.cardReplacements = user.foxBank.cardReplacements || [];
    user.foxBank.lastDeposit = user.foxBank.lastDeposit || null;
    user.foxBank.lastWithdrawal = user.foxBank.lastWithdrawal || null;
  }

  // --- Moat Castle (do not auto-create) ---
  if (!user.moatCastle) {
    user.moatCastle = null;
  } else {
    user.moatCastle.balance = Number(user.moatCastle.balance) || 0;
    user.moatCastle.cardStatus = user.moatCastle.cardStatus || "Active";
    user.moatCastle.membership = user.moatCastle.membership || "Standard";

    user.moatCastle.accountId =
      user.moatCastle.accountId ||
      "MC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    user.moatCastle.cardNumber =
      user.moatCastle.cardNumber ||
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");

    user.moatCastle.createdAt = user.moatCastle.createdAt || Date.now();

    user.moatCastle.cardReplacements = user.moatCastle.cardReplacements || [];
    user.moatCastle.loans = user.moatCastle.loans || [];
    user.moatCastle.loanRequests = user.moatCastle.loanRequests || [];

    // Multi-business support
    user.moatCastle.businesses = user.moatCastle.businesses || [];
    user.moatCastle.businessRequests = user.moatCastle.businessRequests || [];

    // Migration: move old single business → new array format
    if (user.moatCastle.business && !user.moatCastle.businesses.length) {
      user.moatCastle.businesses = [user.moatCastle.business];
      user.moatCastle.business = null;
    }

    user.moatCastle.lastDeposit = user.moatCastle.lastDeposit || null;
    user.moatCastle.lastWithdrawal = user.moatCastle.lastWithdrawal || null;
    user.moatCastle.lastLoanPayment = user.moatCastle.lastLoanPayment || null;
  }

  // --- Homes (always ensure structure exists) ---
  user.homes = user.homes || { lakeville: [], sixhousent: [] };
  if (!Array.isArray(user.homes.lakeville)) user.homes.lakeville = [];
  if (!Array.isArray(user.homes.sixhousent)) user.homes.sixhousent = [];

  return user;
}

// ===============================
// 👤 User Record — Get / Create
// ===============================
async function getUserRecord(userId) {
  const db = await getDB();
  const collection = db.collection("users");

  let user = await collection.findOne({ userId });

  // Create new user record if not found
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

      foxBank: null,
      moatCastle: null,

      homes: {
        lakeville: [],
        sixhousent: [],
      },
    };

    await collection.insertOne(user);
    return user;
  }

  return normalizeUserRecord(user);
}

// ===============================
// 👤 User Record — Save
// ===============================
async function updateUserRecord(user) {
  const db = await getDB();
  const collection = db.collection("users");

  // Ensure numeric before saving
  user.cash = Number(user.cash) || 0;
  user.moatBalance = Number(user.moatBalance) || 0;

  if (user.foxBank) {
    user.foxBank.balance = Number(user.foxBank.balance) || 0;
  }

  if (user.moatCastle) {
    user.moatCastle.balance = Number(user.moatCastle.balance) || 0;
  }

  await collection.updateOne(
    { userId: user.userId },
    { $set: user },
    { upsert: true },
  );

  console.log(`💾 Updated user record for ${user.userId}`);
}

// ===============================
// 👥 User Records — Get All
// (now runs the same normalization as getUserRecord, so
//  every caller sees fully migrated data — not raw Mongo docs)
// ===============================
async function getAllUserRecords() {
  const db = await getDB();
  const users = await db.collection("users").find({}).toArray();
  return users.map(normalizeUserRecord);
}

// ===============================
// 🏢 Businesses
// ===============================
function generateBusinessId() {
  return "BIZ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateBusinessRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

async function findBusinessOwnerRecord(businessId) {
  const db = await getDB();
  const doc = await db.collection("users").findOne({
    "moatCastle.businesses.id": businessId,
  });
  return doc || null;
}

// Returns every business currently open, each tagged with its ownerId
async function getAllBusinesses() {
  const allUsers = await getAllUserRecords();
  const businesses = [];

  for (const user of allUsers) {
    if (!user.moatCastle || !user.moatCastle.businesses) continue;

    for (const biz of user.moatCastle.businesses) {
      businesses.push({
        ownerId: user.userId,
        ...biz,
      });
    }
  }

  return businesses;
}

// ===============================
// 📤 Exports
// ===============================
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
  generateBusinessId,
  generateBusinessRequestId,
  MOAT_BUSINESS_LIMIT,
  findBusinessOwnerRecord,
  getAllBusinesses,
  normalizeUserRecord,
};
