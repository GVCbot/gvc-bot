// utils/expressCodes.js

const activeExpressCodes = new Map(); // userId → { code, expires }

// Remove expired codes
function cleanExpiredCodes() {
  const now = Date.now();
  for (const [userId, entry] of activeExpressCodes.entries()) {
    if (entry.expires < now) activeExpressCodes.delete(userId);
  }
}

// Validate and consume a code (one‑time use)
function useExpressCode(userId, code) {
  cleanExpiredCodes();

  const entry = activeExpressCodes.get(userId);
  if (!entry) return false; // no code
  if (entry.code !== code) return false; // wrong code
  if (entry.expires < Date.now()) {
    activeExpressCodes.delete(userId);
    return false; // expired
  }

  // Valid → consume it
  activeExpressCodes.delete(userId);
  return true;
}

module.exports = {
  activeExpressCodes,
  cleanExpiredCodes,
  useExpressCode,
};
