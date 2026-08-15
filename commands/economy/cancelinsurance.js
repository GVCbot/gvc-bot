const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const embedTemplate = require("../../utils/embedTemplate");

const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const LOG_CHANNEL = "1538196137528401991";

// FOX ROLES
const FOX_ROLES = {
  home_basic: "1537049129803448391",
  home_all: "1537048719805911060",
  life: "1538200236269240400",
  car_basic: "1538199302453858314",
  car_all: "1538199121788145744",
};

// MOAT ROLES
const MOAT_ROLES = {
  vehicle_basic: "1537066784279240724",
  vehicle_all: "1537066846786949120",
  health: "1538201686869287002",
  home_basic: "1538201826799788123",
  home_all: "1538201914569789550",
};

// CATEGORY MAP (unchanged)
const CATEGORY_MAP = {
  home_basic: "home",
  home_all: "home",
  car_basic: "vehicle",
  car_all: "vehicle",
  life: "life",
  vehicle_basic: "vehicle",
  vehicle_all: "vehicle",
  health: "health",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cancelinsurance")
    .setDescription("Cancel one of your insurance plans.")
    .addStringOption((opt) =>
      opt
        .setName("plan")
        .setDescription("Select which insurance to cancel")
        .setRequired(true)
        .addChoices(
          // FOX
          { name: "Fox Basic Home Insurance", value: "home_basic" },
          { name: "Fox All Home Insurance", value: "home_all" },
          { name: "Fox Basic Car Insurance", value: "car_basic" },
          { name: "Fox All Car Insurance", value: "car_all" },
          { name: "Fox Life Insurance", value: "life" },

          // MOAT
          { name: "Moat Basic Vehicle Insurance", value: "vehicle_basic" },
          { name: "Moat All Vehicle Insurance", value: "vehicle_all" },
          { name: "Moat Basic Home Insurance", value: "home_basic_moat" },
          { name: "Moat All Home Insurance", value: "home_all_moat" },
          { name: "Moat Health Insurance", value: "health" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let plan = interaction.options.getString("plan");

    // ⭐ Normalize Moat home plans
    // home_basic_moat → home_basic
    // home_all_moat → home_all
    const normalizedPlan = plan.replace("_moat", "");

    const userRecord = await getUserRecord(interaction.user.id);

    userRecord.store = userRecord.store || {};

    const insurance = userRecord.store[normalizedPlan];

    if (!insurance?.active) {
      const { embed } = embedTemplate({
        title: "❌ Not Active",
        description: "> You do not have this insurance active.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // ⭐ Cancel insurance
    insurance.active = false;
    insurance.nextPayment = 0;

    // ⭐ Determine bank type (fixed)
    const FOX_PLANS = [
      "home_basic",
      "home_all",
      "car_basic",
      "car_all",
      "life",
    ];
    const MOAT_PLANS = [
      "vehicle_basic",
      "vehicle_all",
      "health",
      "home_basic",
      "home_all",
    ];

    const isFox = FOX_PLANS.includes(normalizedPlan);
    const isMoat = MOAT_PLANS.includes(normalizedPlan);

    // ⭐ Remove correct role
    const roleId = isFox
      ? FOX_ROLES[normalizedPlan]
      : MOAT_ROLES[normalizedPlan];

    if (roleId) {
      await interaction.member.roles.remove(roleId).catch(() => {});
    }

    await updateUserRecord(userRecord);

    // ⭐ Build readable name (cleaned)
    const readableName = (() => {
      switch (plan) {
        case "home_basic":
          return "Fox Basic Home Insurance";
        case "home_all":
          return "Fox All Home Insurance";
        case "car_basic":
          return "Fox Basic Car Insurance";
        case "car_all":
          return "Fox All Car Insurance";
        case "life":
          return "Fox Life Insurance";

        case "vehicle_basic":
          return "Moat Basic Vehicle Insurance";
        case "vehicle_all":
          return "Moat All Vehicle Insurance";
        case "home_basic_moat":
          return "Moat Basic Home Insurance";
        case "home_all_moat":
          return "Moat All Home Insurance";
        case "health":
          return "Moat Health Insurance";

        default:
          return plan.replace("_", " ");
      }
    })();

    const template = isFox ? foxbankembedTemplate : moatembedTemplate;

    // ⭐ DM user
    const { embed, files } = template({
      title: "Insurance Cancelled",
      description:
        `> Your **${readableName}** plan has been cancelled.\n` +
        `> You may re‑purchase it at any time.`,
      noLogo: false,
    });

    interaction.user.send({ embeds: [embed], files }).catch(() => {});

    // ⭐ Log cancellation
    const logChannel = interaction.guild.channels.cache.get(LOG_CHANNEL);

    if (logChannel) {
      const { embed: logEmbed, files: logFiles } = template({
        title: "Insurance Cancellation Log",
        description:
          `> **User:** <@${interaction.user.id}>\n` +
          `> **Plan:** ${readableName}\n` +
          `> **Status:** Cancelled`,
        noLogo: false,
      });

      logChannel.send({ embeds: [logEmbed], files: logFiles }).catch(() => {});
    }

    // ⭐ Reply to user
    return interaction.editReply({
      embeds: [embed],
      files,
    });
  },
};
