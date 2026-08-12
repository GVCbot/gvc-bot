const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const path = require("node:path");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const STORE_BANNER = path.join(
  __dirname,
  "..",
  "..",
  "graphics",
  "gvcstore.png",
);

const INSURANCE_PRICES = {
  fox_basic: 600,
  fox_all: 1000,
  moat_basic: 600,
  moat_all: 1000,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("storelist")
    .setDescription("View all store items."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let desc = "";

    desc +=
      `**Fox Basic Insured** — $${INSURANCE_PRICES.fox_basic}/month\n` +
      `> ${ARROW} Coverage for your **Fox Banks**.\n\n`;

    desc +=
      `**Fox All Insured** — $${INSURANCE_PRICES.fox_all}/month\n` +
      `> ${ARROW} Full coverage for your **Fox Banks**.\n\n`;

    desc +=
      `**Moat Castle Basic Insured** — $${INSURANCE_PRICES.moat_basic}/month\n` +
      `> ${ARROW} Coverage for your **Moat Castle Banks**.\n\n`;

    desc +=
      `**Moat Castle All Insured** — $${INSURANCE_PRICES.moat_all}/month\n` +
      `> ${ARROW} Full coverage for your **Moat Castle Banks**.\n\n`;

    const { embed, files } = embedTemplate({
      title: `${SUN} Store Items ${SUN}`,
      description: desc,
      banner: STORE_BANNER,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
