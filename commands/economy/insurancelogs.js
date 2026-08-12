const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getAllUserRecords } = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const FOX_AUDIT_ROLE = "1537063265518223470";
const MOAT_AUDIT_ROLE = "1537063320631377940";

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

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
    // ⭐ Make logs hidden
    await interaction.deferReply({ ephemeral: true });

    const type = interaction.options.getString("type");

    const memberRoles = interaction.member.roles.cache;

    const isHR = memberRoles.has(HR_ROLE_ID);
    const isFoxAudit = memberRoles.has(FOX_AUDIT_ROLE);
    const isMoatAudit = memberRoles.has(MOAT_AUDIT_ROLE);

    // Permission check
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

      // Determine bank type
      let bankType = null;

      const ownedBanks = userRecord.banks || [];
      const joinedBanks = userRecord.joinedBanks || [];

      for (const b of ownedBanks) {
        if (b.type === "Fox Bank") bankType = "fox";
        if (b.type === "Moat Castle") bankType = "moat";
      }

      // If no owned bank, check joined banks
      if (!bankType && joinedBanks.length > 0) {
        for (const rec of allRecords) {
          for (const b of rec.banks || []) {
            if (joinedBanks.includes(b.id)) {
              if (b.type === "Fox Bank") bankType = "fox";
              if (b.type === "Moat Castle") bankType = "moat";
            }
          }
        }
      }

      if (bankType !== type) continue;

      if (userRecord.store.basicInsured?.active) {
        logs.push({
          username,
          userId: userRecord.userId,
          plan: "Fox Basic Insured",
          nextPayment: userRecord.store.basicInsured.nextPayment,
        });
      }

      if (userRecord.store.allInsured?.active) {
        logs.push({
          username,
          userId: userRecord.userId,
          plan: "Fox All Insured",
          nextPayment: userRecord.store.allInsured.nextPayment,
        });
      }
    }

    let desc = "";

    if (logs.length === 0) {
      desc = "> No active insurances found for this bank type.";
    } else {
      for (const l of logs) {
        desc +=
          `> ${ARROW} **${l.username}** (<@${l.userId}>)\n` +
          `> • Plan: ${l.plan}\n` +
          `> • Next Payment: <t:${Math.floor(l.nextPayment / 1000)}:F>\n\n`;
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
