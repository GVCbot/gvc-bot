const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const HR_ROLE_ID = "1350582607217430650";

const ROLES = {
  fox_basic: "1537049129803448391",
  fox_all: "1537048719805911060",
  moat_basic: "1537066784279240724",
  moat_all: "1537066846786949120",
};

// Updated prices
const INSURANCE_PRICES = {
  fox_basic: 800,
  fox_all: 1200,
  moat_basic: 600,
  moat_all: 1000,
};

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

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
      // Ensure store exists
      if (!userRecord.store) {
        userRecord.store = {
          fox_basic: { active: false, nextPayment: 0 },
          fox_all: { active: false, nextPayment: 0 },
          moat_basic: { active: false, nextPayment: 0 },
          moat_all: { active: false, nextPayment: 0 },
        };
      }

      const member = guild.members.cache.get(userRecord.userId);

      for (const key of Object.keys(INSURANCE_PRICES)) {
        const insurance = userRecord.store[key];
        if (!insurance?.active) continue;

        const cost = INSURANCE_PRICES[key];

        // User can pay
        if ((userRecord.cash ?? 0) >= cost) {
          userRecord.cash -= cost;
          insurance.nextPayment = now + 30 * 24 * 60 * 60 * 1000;
          charged++;
        }

        // User cannot pay → cancel insurance
        else {
          insurance.active = false;
          insurance.nextPayment = 0;
          cancelled++;

          const roleId = ROLES[key];
          if (member && roleId) {
            await member.roles.remove(roleId).catch(() => {});
          }
        }

        await updateUserRecord(userRecord);
      }
    }

    const { embed } = embedTemplate({
      title: `${SUN} Insurance Billing Complete ${SUN}`,
      description:
        `${ARROW} **Charged:** ${charged} users\n` +
        `${ARROW} **Cancelled:** ${cancelled} users\n\n` +
        `Monthly insurance fees have been processed.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
