// modlogHelpers.js

const punishmentTemplates = require("./punishmentTemplates");
const { getUserRecord, updateUserRecord } = require("../economy/economyutils");

// ===============================
// CASE ID GENERATOR
// ===============================
function generateCaseId(userRecord) {
  if (!userRecord.modlogs) userRecord.modlogs = [];

  const nextNumber = userRecord.modlogs.length + 1;
  return `MOD-${String(nextNumber).padStart(4, "0")}`;
}

// ===============================
// SUSPENSION TIMESTAMP CALCULATOR
// ===============================
function calculateSuspensionEnd(days) {
  if (!days) return null;
  return Date.now() + days * 24 * 60 * 60 * 1000;
}

// ===============================
// PERMISSION CHECKER
// ===============================
function canUsePunishmentType(member, type) {
  const template = punishmentTemplates[type];
  if (!template) return false;

  const allowedRoles = template.allowedRoles;

  return allowedRoles.some((roleId) => member.roles.cache.has(roleId));
}

// ===============================
// DM MESSAGE BUILDER
// ===============================
function buildDmMessage(type, reason, evidence, suspensionEnd) {
  const template = punishmentTemplates[type];
  if (!template) return "Unknown punishment type.";

  const lines = [...template.dm];

  // Replace @time if suspension exists
  if (suspensionEnd) {
    const unix = Math.floor(suspensionEnd / 1000);
    const formattedTime = `<t:${unix}:F>`;
    for (let i = 0; i < lines.length; i++) {
      lines[i] = lines[i].replace("@time", formattedTime);
    }
  }

  // Add reason + evidence
  lines.push("");
  lines.push(`> **Reason:** ${reason}`);
  lines.push(`> **Evidence:** ${evidence}`);

  return lines.join("\n");
}

// ===============================
// STAFF LOG MESSAGE BUILDER
// ===============================
function buildStaffLogMessage(
  type,
  reason,
  evidence,
  moderator,
  suspensionEnd,
) {
  const template = punishmentTemplates[type];

  const lines = [
    `> **Punishment:** ${template.label}`,
    `> **Moderator:** <@${moderator}>`,
    `> **Reason:** ${reason}`,
    `> **Evidence:** ${evidence}`,
  ];

  if (suspensionEnd) {
    const unix = Math.floor(suspensionEnd / 1000);
    lines.push(`> **Suspension Ends:** <t:${unix}:F>`);
  }

  return lines.join("\n");
}

// ===============================
// SAVE MODLOG ENTRY
// ===============================
async function saveModlog(
  userId,
  type,
  reason,
  evidence,
  moderator,
  suspensionEnd,
) {
  const userRecord = await getUserRecord(userId);

  if (!userRecord.modlogs) userRecord.modlogs = [];

  const caseId = generateCaseId(userRecord);

  const entry = {
    caseId,
    type,
    reason,
    evidence,
    moderator,
    timestamp: Date.now(),
    suspensionEnd: suspensionEnd || null,
  };

  userRecord.modlogs.push(entry);
  await updateUserRecord(userRecord);

  return entry;
}

// ===============================
// GET MODLOG ENTRY
// ===============================
async function getModlog(userId, caseId) {
  const userRecord = await getUserRecord(userId);
  if (!userRecord.modlogs) return null;

  return userRecord.modlogs.find((log) => log.caseId === caseId) || null;
}

// ===============================
// DELETE MODLOG ENTRY
// ===============================
async function deleteModlog(userId, caseId) {
  const userRecord = await getUserRecord(userId);
  if (!userRecord.modlogs) return false;

  const before = userRecord.modlogs.length;
  userRecord.modlogs = userRecord.modlogs.filter(
    (log) => log.caseId !== caseId,
  );

  await updateUserRecord(userRecord);

  return userRecord.modlogs.length !== before;
}

// ===============================
// EDIT MODLOG ENTRY
// ===============================
async function editModlog(userId, caseId, field, newValue) {
  const userRecord = await getUserRecord(userId);
  if (!userRecord.modlogs) return null;

  const entry = userRecord.modlogs.find((log) => log.caseId === caseId);
  if (!entry) return null;

  entry[field] = newValue;
  await updateUserRecord(userRecord);

  return entry;
}

module.exports = {
  generateCaseId,
  calculateSuspensionEnd,
  canUsePunishmentType,
  buildDmMessage,
  buildStaffLogMessage,
  saveModlog,
  getModlog,
  deleteModlog,
  editModlog,
};
