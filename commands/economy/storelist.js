const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { getUserRecord } = require("../../economy/economyutils");
const path = require("node:path");

const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW: FOXARROW } = FOXEMOJIS;

const { MOATEMOJIS } = require("../../utils/moatembedTemplate");
const { MOATCASTLE, ARROW: MOATARROW } = MOATEMOJIS;

// FOX DISCOUNTS
const FOX_DISCOUNTS = {
  standard: 0,
  gold: 0.05,
  platinum: 0.1,
  diamond: 0.15,
  elite: 0.2,
};

// MOAT DISCOUNTS
const MOAT_DISCOUNTS = {
  standard: 0,
  silver: 0.05,
  gold: 0.1,
  platinum: 0.15,
  black: 0.2,
};

// FOX ROLE IDs
const FOX_ROLES = {
  home_basic: "1537049129803448391",
  home_all: "1537048719805911060",
  life: "1538200236269240400",
  car_basic: "1538199302453858314",
  car_all: "1538199121788145744",
};

// FOX PRICES
const FOX_PRICES = {
  home_basic: 3400,
  home_all: 5500,
  life: 30000,
  car_basic: 600,
  car_all: 1000,
};

// MOAT ROLE IDs
const MOAT_ROLES = {
  vehicle_basic: "1537066784279240724",
  vehicle_all: "1537066846786949120",
  health: "1538201686869287002",
  home_basic: "1538201826799788123",
  home_all: "1538201914569789550",
};

// MOAT PRICES
const MOAT_PRICES = {
  vehicle_basic: 500,
  vehicle_all: 850,
  health: 25000,
  home_basic: 3000,
  home_all: 4800,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("storelist")
    .setDescription("View all Fox Mountain & Moat Castle insurance plans."),

  async execute(interaction) {
    await interaction.deferReply();

    const userRecord = await getUserRecord(interaction.user.id);

    const foxTier = userRecord.foxBank?.tier?.toLowerCase() || "standard";
    const moatTier = userRecord.moatCastle?.tier?.toLowerCase() || "standard";

    const foxDiscount = FOX_DISCOUNTS[foxTier];
    const moatDiscount = MOAT_DISCOUNTS[moatTier];

    // ============================
    // 🦊 FOX SECTION
    // ============================
    let foxDesc = "";

    foxDesc += `### 🏠 **Fox Mountain Home Insurance**\n\n`;
    foxDesc +=
      `**Basic House Coverage** — $${Math.floor(FOX_PRICES.home_basic * (1 - foxDiscount))} every 30 days\n` +
      `> ${FOXARROW} Covers **interior & exterior house damage**\n` +
      `> ${FOXARROW} Includes **fire coverage**\n` +
      `> ${FOXARROW} Role: <@&${FOX_ROLES.home_basic}>\n\n`;

    foxDesc +=
      `**Full House Coverage** — $${Math.floor(FOX_PRICES.home_all * (1 - foxDiscount))} every 30 days\n` +
      `> ${FOXARROW} Covers **interior & exterior house damage**\n` +
      `> ${FOXARROW} Includes **fire, robbery, and damage coverage**\n` +
      `> ${FOXARROW} Role: <@&${FOX_ROLES.home_all}>\n\n`;

    foxDesc += `### 🚗 **Fox Mountain Vehicle Insurance**\n\n`;
    foxDesc +=
      `**Basic Car Insurance** — $${Math.floor(FOX_PRICES.car_basic * (1 - foxDiscount))} every 30 days\n` +
      `> ${FOXARROW} Covers **physical damage & accidents**\n` +
      `> ${FOXARROW} Includes **windows & light body repairs**\n` +
      `> ${FOXARROW} Role: <@&${FOX_ROLES.car_basic}>\n\n`;

    foxDesc +=
      `**All Car Insurance** — $${Math.floor(FOX_PRICES.car_all * (1 - foxDiscount))} every 30 days\n` +
      `> ${FOXARROW} Covers **physical damage & accidents**\n` +
      `> ${FOXARROW} Includes **windows, body repairs, stolen vehicle & fire protection**\n` +
      `> ${FOXARROW} Role: <@&${FOX_ROLES.car_all}>\n\n`;

    foxDesc += `### ❤️ **Fox Mountain Life Insurance**\n\n`;
    foxDesc +=
      `**Fox Life Insurance** — $${Math.floor(FOX_PRICES.life * (1 - foxDiscount))} every 60 days\n` +
      `> ${FOXARROW} Covers **any user physical damage**\n` +
      `> ${FOXARROW} Includes **cost-free & priority lawyer assistance**\n` +
      `> ${FOXARROW} Role: <@&${FOX_ROLES.life}>\n\n`;

    foxDesc += `*(Your Fox Tier Discount: **${foxDiscount * 100}%**) *\n\n`;

    const { embed: foxEmbed, files: foxFiles } = foxbankembedTemplate({
      title: `${FOXICON} Fox Mountain Insurance Store ${FOXICON}`,
      description: foxDesc,
      noLogo: false,
    });

    // ============================
    // 🏰 MOAT SECTION
    // ============================
    let moatDesc = "";

    moatDesc += `### 🏠 **Moat Castle Home Insurance**\n\n`;
    moatDesc +=
      `**Basic Home Insurance** — $${Math.floor(MOAT_PRICES.home_basic * (1 - moatDiscount))} every 30 days\n` +
      `> ${MOATARROW} Covers **interior & exterior home damage**\n` +
      `> ${MOATARROW} Includes **fire coverage**\n` +
      `> ${MOATARROW} Role: <@&${MOAT_ROLES.home_basic}>\n\n`;

    moatDesc +=
      `**All Home Insurance** — $${Math.floor(MOAT_PRICES.home_all * (1 - moatDiscount))} every 30 days\n` +
      `> ${MOATARROW} Covers **interior & exterior home damage**\n` +
      `> ${MOATARROW} Includes **fire, robbery, and damage coverage**\n` +
      `> ${MOATARROW} Role: <@&${MOAT_ROLES.home_all}>\n\n`;

    moatDesc += `### 🚚 **Moat Castle Vehicle Insurance**\n\n`;
    moatDesc +=
      `**Basic Vehicle Insurance** — $${Math.floor(MOAT_PRICES.vehicle_basic * (1 - moatDiscount))} every 30 days\n` +
      `> ${MOATARROW} Covers **cars & trucks**\n` +
      `> ${MOATARROW} Covers **accidents & physical damage**\n` +
      `> ${MOATARROW} Role: <@&${MOAT_ROLES.vehicle_basic}>\n\n`;

    moatDesc +=
      `**All Vehicle Insurance** — $${Math.floor(MOAT_PRICES.vehicle_all * (1 - moatDiscount))} every 30 days\n` +
      `> ${MOATARROW} Covers **cars & trucks**\n` +
      `> ${MOATARROW} Includes **fire, theft, full body repairs**\n` +
      `> ${MOATARROW} Role: <@&${MOAT_ROLES.vehicle_all}>\n\n`;

    moatDesc += `### 🏥 **Moat Castle Health Insurance**\n\n`;
    moatDesc +=
      `**Health Insurance** — $${Math.floor(MOAT_PRICES.health * (1 - moatDiscount))} every 60 days\n` +
      `> ${MOATARROW} Covers **medical emergencies & injuries**\n` +
      `> ${MOATARROW} Includes **priority medical support**\n` +
      `> ${MOATARROW} Role: <@&${MOAT_ROLES.health}>\n\n`;

    moatDesc += `*(Your Moat Tier Discount: **${moatDiscount * 100}%**) *\n\n`;

    const { embed: moatEmbed, files: moatFiles } = moatembedTemplate({
      title: `${MOATCASTLE} Moat Castle Insurance Store ${MOATCASTLE}`,
      description: moatDesc,
      noLogo: false,
    });

    return interaction.editReply({
      embeds: [foxEmbed, moatEmbed],
      files: [...foxFiles, ...moatFiles],
    });
  },
};