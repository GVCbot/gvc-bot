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

  // -----------------------------------------------------
  // CREATE NEW USER RECORD IF NOT FOUND
  // -----------------------------------------------------
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

  // -----------------------------------------------------
  // NORMALIZE BASIC FIELDS
  // -----------------------------------------------------
  user.cash = Number(user.cash) || 0;
  user.moatBalance = Number(user.moatBalance) || 0;

  // -----------------------------------------------------
  // FOX BANK — DO NOT AUTO-CREATE
  // -----------------------------------------------------
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

    // Optional fields
    user.foxBank.cardReplacements = user.foxBank.cardReplacements || [];
    user.foxBank.lastDeposit = user.foxBank.lastDeposit || null;
    user.foxBank.lastWithdrawal = user.foxBank.lastWithdrawal || null;
  }

  // -----------------------------------------------------
  // MOAT CASTLE — DO NOT AUTO-CREATE
  // -----------------------------------------------------
  if (!user.moatCastle) {
    user.moatCastle = null;
  } else {
    user.moatCastle.balance = Number(user.moatCastle.balance) || 0;
    user.moatCastle.cardStatus = user.moatCastle.cardStatus || "Active";
    user.moatCastle.tier = user.moatCastle.tier || "Standard";

    user.moatCastle.accountId =
      user.moatCastle.accountId ||
      "MC-" + Math.random().toString(36).substring(2, 8).toUpperCase();

    user.moatCastle.cardNumber =
      user.moatCastle.cardNumber ||
      Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join("");

    user.moatCastle.createdAt = user.moatCastle.createdAt || Date.now();
    user.moatCastle.rewards = Number(user.moatCastle.rewards) || 0;

    // Arrays
    user.moatCastle.cardReplacements = user.moatCastle.cardReplacements || [];
    user.moatCastle.loans = user.moatCastle.loans || [];
    user.moatCastle.loanRequests = user.moatCastle.loanRequests || [];

    // NEW — business fields (moved here so we never touch
    // user.moatCastle.business before confirming moatCastle exists)
    user.moatCastle.business = user.moatCastle.business || null;
    user.moatCastle.businessRequests = user.moatCastle.businessRequests || [];

    user.moatCastle.lastDeposit = user.moatCastle.lastDeposit || null;
    user.moatCastle.lastWithdrawal = user.moatCastle.lastWithdrawal || null;
    user.moatCastle.lastLoanPayment = user.moatCastle.lastLoanPayment || null;
  }

  // -----------------------------------------------------
  // HOMES — ALWAYS ENSURE STRUCTURE EXISTS
  // -----------------------------------------------------
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

// -----------------------------------------------------
// GET ALL USERS
// -----------------------------------------------------
async function getAllUserRecords() {
  const db = await getDB();
  return await db.collection("users").find({}).toArray();
}

// -----------------------------------------------------
// BUSINESSES
// -----------------------------------------------------

// Generates a short unique-ish business id, e.g. "BIZ-4F9K2A"
function generateBusinessId() {
  return "BIZ-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Generates a short unique-ish request id for business creation requests
function generateBusinessRequestId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// Finds the raw user document that owns a given business id.
// Returns the raw Mongo document (NOT run through getUserRecord's
// normalization) — callers that plan to updateUserRecord() it should
// be fine since updateUserRecord() only touches a few numeric fields.
async function findBusinessOwnerRecord(businessId) {
  const db = await getDB();
  const doc = await db
    .collection("users")
    .findOne({ "moatCastle.business.id": businessId });
  return doc || null;
}

// Returns every business currently open, each tagged with its ownerId
async function getAllBusinesses() {
  const allUsers = await getAllUserRecords();
  return allUsers
    .filter((u) => u.moatCastle && u.moatCastle.business)
    .map((u) => ({ ownerId: u.userId, ...u.moatCastle.business }));
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
  generateBusinessId,
  generateBusinessRequestId,
  findBusinessOwnerRecord,
  getAllBusinesses,
};
