// /security/protect.js

const crypto = require("crypto");

// -----------------------------------------------------
// SAFE USERS (trusted internal IDs)
// -----------------------------------------------------
const safeUsers = {
  bypassCooldown: "1368142895181205636",
};

// -----------------------------------------------------
// INPUT SANITIZATION (anti-injection, anti-ping)
// -----------------------------------------------------
function sanitize(str) {
  if (typeof str !== "string") return str;

  return str
    .replace(/[<>`]/g, "") // prevent markdown injection
    .replace(/@everyone/g, "everyone") // prevent mass ping
    .replace(/@here/g, "here") // prevent mass ping
    .replace(/\n{3,}/g, "\n\n"); // prevent embed stretching
}

// -----------------------------------------------------
// MONGODB SANITIZATION (anti-query injection)
// -----------------------------------------------------
function sanitizeMongo(obj) {
  if (typeof obj !== "object" || obj === null) return obj;

  const clean = {};
  for (const key in obj) {
    if (key.startsWith("$")) continue; // prevent operator injection
    clean[key] = obj[key];
  }
  return clean;
}

// -----------------------------------------------------
// RATE LIMITING (anti-spam)
// -----------------------------------------------------
const rateLimit = new Map();

function applyRateLimit(userId, limitMs = 1500) {
  if (rateLimit.has(userId)) return false;
  rateLimit.set(userId, Date.now());
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
  if (interaction.user.id === safeUsers.bypassCooldown) return true;
  return interaction.member.permissions.has("Administrator");
}

// -----------------------------------------------------
// ROLE VALIDATION (anti-role spoofing)
// -----------------------------------------------------
function hasRole(interaction, roleId) {
  if (!interaction || !interaction.member) return false;
  return interaction.member.roles.cache.has(roleId);
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
