const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getAllUserRecords } = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const FOX_AUDIT_ROLE = "1537063265518223470";
const MOAT_AUDIT_ROLE = "1537063320631377940";

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

// ⭐ Added discount tables (informational only)
const FOX_DISCOUNTS = {
  standard: 0,
  gold: 0.05,
  platinum: 0.1,
  diamond: 0.15,
  elite: 0.2,
};

const MOAT_DISCOUNTS = {
  standard: 0,
  silver: 0.05,
  gold: 0.1,
  platinum: 0.15,
  black: 0.2,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("insurancelogs")
    .setDescription("View active insurance logs by bank type.")
    .addStringOption((opt) =>
      opt
        .setName("type")
        .setDescription("Select bank type")
        .setRequired(true)
        .addChoices(
          { name: "Fox Bank", value: "fox" },
          { name: "Moat Castle", value: "moat" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString("type");

    const memberRoles = interaction.member.roles.cache;

    const isHR = memberRoles.has(HR_ROLE_ID);
    const isFoxAudit = memberRoles.has(FOX_AUDIT_ROLE);
    const isMoatAudit = memberRoles.has(MOAT_AUDIT_ROLE);

    // Permission check (unchanged)
    if (!isHR) {
      if (type === "fox" && !isFoxAudit) {
        return interaction.editReply(
          "❌ You do not have permission to view Fox Bank logs.",
        );
      }
      if (type === "moat" && !isMoatAudit) {
        return interaction.editReply(
          "❌ You do not have permission to view Moat Castle logs.",
        );
      }
    }

    const allRecords = await getAllUserRecords();
    const guild = interaction.guild;

    let logs = [];

    for (const userRecord of allRecords) {
      if (!userRecord.store) continue;

      const member = guild.members.cache.get(userRecord.userId);
      const username = member
        ? member.user.username
        : `Unknown (${userRecord.userId})`;

      const store = userRecord.store;

      // ⭐ Added discount tier detection
      const foxTier = userRecord.foxBank?.tier?.toLowerCase() || "standard";
      const moatTier = userRecord.moatCastle?.tier?.toLowerCase() || "standard";

      const foxDiscount = FOX_DISCOUNTS[foxTier] * 100;
      const moatDiscount = MOAT_DISCOUNTS[moatTier] * 100;

      // -----------------------------
      // FOX INSURANCE LOGS (unchanged + improved)
      // -----------------------------
      if (type === "fox") {
        if (store.home_basic?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Fox Basic Home Insurance",
            nextPayment: store.home_basic.nextPayment,
            discount: foxDiscount,
          });
        }
        if (store.home_all?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Fox All Home Insurance",
            nextPayment: store.home_all.nextPayment,
            discount: foxDiscount,
          });
        }
        if (store.car_basic?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Fox Basic Car Insurance",
            nextPayment: store.car_basic.nextPayment,
            discount: foxDiscount,
          });
        }
        if (store.car_all?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Fox All Car Insurance",
            nextPayment: store.car_all.nextPayment,
            discount: foxDiscount,
          });
        }
        if (store.life?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Fox Life Insurance",
            nextPayment: store.life.nextPayment,
            discount: foxDiscount,
          });
        }
      }

      // -----------------------------
      // MOAT INSURANCE LOGS (unchanged + improved)
      // -----------------------------
      if (type === "moat") {
        if (store.vehicle_basic?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Moat Basic Vehicle Insurance",
            nextPayment: store.vehicle_basic.nextPayment,
            discount: moatDiscount,
          });
        }
        if (store.vehicle_all?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Moat All Vehicle Insurance",
            nextPayment: store.vehicle_all.nextPayment,
            discount: moatDiscount,
          });
        }
        if (store.health?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Moat Health Insurance",
            nextPayment: store.health.nextPayment,
            discount: moatDiscount,
          });
        }
        if (store.home_basic?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Moat Basic Home Insurance",
            nextPayment: store.home_basic.nextPayment,
            discount: moatDiscount,
          });
        }
        if (store.home_all?.active) {
          logs.push({
            username,
            userId: userRecord.userId,
            plan: "Moat All Home Insurance",
            nextPayment: store.home_all.nextPayment,
            discount: moatDiscount,
          });
        }
      }
    }

    // -----------------------------
    // BUILD OUTPUT (unchanged + improved)
    // -----------------------------
    let desc = "";

    if (logs.length === 0) {
      desc = "> No active insurances found for this bank type.";
    } else {
      for (const l of logs) {
        const nextUnix = Math.floor(l.nextPayment / 1000);

        desc +=
          `> ${ARROW} **${l.username}** (<@${l.userId}>)\n` +
          `> • Plan: ${l.plan}\n` +
          `> • Next Payment: <t:${nextUnix}:F>\n` +
          `> • Tier Discount: ${l.discount}%\n\n`;
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} Insurance Logs — ${type === "fox" ? "Fox Bank" : "Moat Castle"} ${SUN}`,
      description: desc,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
