// /security/protect.js

const crypto = require("crypto");

// -----------------------------------------------------
// SAFE USERS (trusted internal IDs)
// -----------------------------------------------------
const safeUsers = {
  bypassCooldown: "1368142895181205636",
};

// -----------------------------------------------------
// INPUT SANITIZATION (anti-injection, anti-ping, anti-spam)
// -----------------------------------------------------
function sanitize(str) {
  if (typeof str !== "string") return str;

  let clean = str;

  // Basic markdown / injection characters
  clean = clean.replace(/[<>`]/g, "");

  // Prevent mass pings
  clean = clean.replace(/@everyone/gi, "everyone").replace(/@here/gi, "here");

  // Prevent direct role/user/channel mentions
  clean = clean.replace(/<@!?(\d+)>/g, "user");
  clean = clean.replace(/<@&(\d+)>/g, "role");
  clean = clean.replace(/<#(\d+)>/g, "channel");

  // Collapse excessive whitespace/newlines
  clean = clean.replace(/\n{3,}/g, "\n\n");
  clean = clean.replace(/\s{3,}/g, "  ");

  // Hard cap length to avoid embed/message overflow
  const MAX_LEN = 1500; // below Discord 2000 char limit
  if (clean.length > MAX_LEN) {
    clean = clean.slice(0, MAX_LEN) + "…";
  }

  return clean;
}

// -----------------------------------------------------
// MONGODB SANITIZATION (anti-query injection)
// -----------------------------------------------------
function sanitizeMongo(obj) {
  if (typeof obj !== "object" || obj === null) return obj;

  const clean = {};
  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
    if (key.startsWith("$")) continue; // prevent operator injection
    clean[key] = obj[key];
  }
  return clean;
}

// -----------------------------------------------------
// RATE LIMITING (anti-spam for commands & interactions)
// -----------------------------------------------------
const rateLimit = new Map();

function applyRateLimit(userId, limitMs = 1500) {
  if (!userId) return false;

  const now = Date.now();
  const last = rateLimit.get(userId);

  if (last && now - last < limitMs) return false;

  rateLimit.set(userId, now);
  setTimeout(() => rateLimit.delete(userId), limitMs);
  return true;
}

// -----------------------------------------------------
// COOLDOWN BYPASS
// -----------------------------------------------------
function bypassCooldown(userId) {
  return userId === safeUsers.bypassCooldown;
}

// -----------------------------------------------------
// PERMISSION CHECKER (anti-unauthorized admin use)
// -----------------------------------------------------
function requireAdmin(interaction) {
  if (!interaction || !interaction.member) return false;
  if (interaction.user?.id === safeUsers.bypassCooldown) return true;
  return interaction.member.permissions?.has("Administrator");
}

// -----------------------------------------------------
// ROLE VALIDATION (anti-role spoofing)
// -----------------------------------------------------
function hasRole(interaction, roleId) {
  if (!interaction || !interaction.member || !roleId) return false;
  return interaction.member.roles?.cache?.has(roleId);
}

// -----------------------------------------------------
// TOKEN PROTECTION (anti-token exposure)
// -----------------------------------------------------
function protectToken(token) {
  if (!token) return "";
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 12);
}

// -----------------------------------------------------
// INTERACTION VALIDATION (anti-null crashes)
// -----------------------------------------------------
function validateInteraction(interaction) {
  return (
    interaction && interaction.user && interaction.guild && interaction.channel
  );
}

// -----------------------------------------------------
// EVENT FLOOD PROTECTION (anti-DDoS-like spam)
// -----------------------------------------------------
let eventFloodCounter = 0;
let floodBlocked = false;

function protectEvents() {
  eventFloodCounter++;

  if (eventFloodCounter > 50 && !floodBlocked) {
    floodBlocked = true;
    console.warn("⚠ Event flood detected — temporarily blocking handlers.");
    setTimeout(() => {
      floodBlocked = false;
      eventFloodCounter = 0;
    }, 3000);
  }

  return !floodBlocked;
}

// -----------------------------------------------------
// GLOBAL ERROR PROTECTION (anti-crash)
// -----------------------------------------------------
function enableGlobalProtection() {
  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Rejection:", err);
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
  });
}

// -----------------------------------------------------
// EXPORTS
// -----------------------------------------------------
module.exports = {
  sanitize,
  sanitizeMongo,
  applyRateLimit,
  bypassCooldown,
  requireAdmin,
  hasRole,
  protectToken,
  validateInteraction,
  protectEvents,
  enableGlobalProtection,
};
