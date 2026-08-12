const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";
const BASIC_ROLE = "1537049129803448391";
const ALL_ROLE = "1537048719805911060";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("chargeinsurance")
    .setDescription("HR ONLY — Charge all users their monthly insurance fees."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    if (!interaction.member.roles.cache.has(HR_ROLE_ID)) {
      return interaction.editReply("❌ Only HR can use this command.");
    }

    const allRecords = await getAllUserRecords();
    const guild = interaction.guild;

    let charged = 0;
    let cancelled = 0;

    const now = Date.now();

    for (const userRecord of allRecords) {
      if (!userRecord.store) continue;

      const member = guild.members.cache.get(userRecord.userId);

      // BASIC INSURANCE
      if (userRecord.store.basicInsured?.active) {
        const cost = 600;

        if ((userRecord.cash ?? 0) >= cost) {
          userRecord.cash -= cost;
          userRecord.store.basicInsured.nextPayment =
            now + 30 * 24 * 60 * 60 * 1000;
          charged++;
        } else {
          userRecord.store.basicInsured.active = false;
          userRecord.store.basicInsured.nextPayment = 0;
          cancelled++;

          if (member) {
            await member.roles.remove(BASIC_ROLE).catch(() => {});
          }
        }

        await updateUserRecord(userRecord);
      }

      // ALL INSURANCE
      if (userRecord.store.allInsured?.active) {
        const cost = 1000;

        if ((userRecord.cash ?? 0) >= cost) {
          userRecord.cash -= cost;
          userRecord.store.allInsured.nextPayment =
            now + 30 * 24 * 60 * 60 * 1000;
          charged++;
        } else {
          userRecord.store.allInsured.active = false;
          userRecord.store.allInsured.nextPayment = 0;
          cancelled++;

          if (member) {
            await member.roles.remove(ALL_ROLE).catch(() => {});
          }
        }

        await updateUserRecord(userRecord);
      }
    }

    const { embed } = embedTemplate({
      title: "📅 Insurance Billing Complete",
      description:
        `> **Charged:** ${charged} users\n` +
        `> **Cancelled:** ${cancelled} users\n\n` +
        `Monthly insurance fees have been processed.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
