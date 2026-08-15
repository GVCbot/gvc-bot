const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  loadLakevillePrices,
  loadSixhousentPrices,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-availablehomes")
    .setDescription("Show all homes that are NOT owned by anyone."),

  async execute(interaction) {
    await interaction.deferReply();

    const allUsers = await getAllUserRecords();

    const lakevillePrices = await loadLakevillePrices();
    const sixhousentPrices = await loadSixhousentPrices();

    const ownedLakeville = new Set();
    const ownedSixhousent = new Set();

    for (const u of allUsers) {
      for (const h of u.homes?.lakeville || []) {
        ownedLakeville.add(h.homeId);
      }
      for (const h of u.homes?.sixhousent || []) {
        ownedSixhousent.add(h.homeId);
      }
    }

    // Build Lakeville embed
    let lakevilleText = "";
    for (const id in lakevillePrices) {
      const price = lakevillePrices[id];
      if (price !== null && !ownedLakeville.has(Number(id))) {
        lakevilleText += `${ARROW} Home #${id} — $${price.toLocaleString()}\n`;
      }
    }
    if (!lakevilleText) lakevilleText = `${ARROW} No available homes.\n`;

    const lakevilleEmbed = foxbankembedTemplate({
      title: "Available Homes — Lakeville Gardens",
      description: lakevilleText,
    });

    // Build Sixhousent embed
    let sixText = "";
    for (const id in sixhousentPrices) {
      const price = sixhousentPrices[id];
      if (price !== null && !ownedSixhousent.has(Number(id))) {
        sixText += `${ARROW} Home #${id} — $${price.toLocaleString()}\n`;
      }
    }
    if (!sixText) sixText = `${ARROW} No available homes.\n`;

    const sixEmbed = foxbankembedTemplate({
      title: "Available Homes — Sixhousent",
      description: sixText,
    });

    await interaction.editReply({
      embeds: [lakevilleEmbed.embed, sixEmbed.embed],
      files: [...lakevilleEmbed.files, ...sixEmbed.files],
    });
  },
};
