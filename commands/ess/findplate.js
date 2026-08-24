const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const { loadEconomy } = require("../../economy/economyutils");

// LEO roles allowed to use this command
const LEO_ROLES = [
  "1352019732055851048",
  "1058635044308123719",
  "1058635001329107005",
];

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("findplate")
    .setDescription("LEO: Search for a registered vehicle by license plate.")
    .addStringOption((option) =>
      option
        .setName("plate")
        .setDescription("License plate to search for")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // LEO role check
    const member = interaction.member;
    const isLEO = LEO_ROLES.some((role) => member.roles.cache.has(role));

    if (!isLEO) {
      const { embed } = embedTemplate({
        title: `${STAR} Access Denied ${STAR}`,
        description: `> ${ARROW} You are not authorized to use LEO commands.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const plateQuery = interaction.options.getString("plate").toLowerCase();
    const allUsers = await loadEconomy();

    let foundVehicle = null;
    let ownerId = null;

    for (const user of allUsers) {
      if (!user.vehicles) continue;

      const match = user.vehicles.find(
        (v) => v.plate.toLowerCase() === plateQuery,
      );

      if (match) {
        foundVehicle = match;
        ownerId = user.userId;
        break;
      }
    }

    if (!foundVehicle) {
      const { embed } = embedTemplate({
        title: "🚫 Vehicle Not Found",
        description: `> ${ARROW} No registered vehicle found with plate **${plateQuery.toUpperCase()}**.`,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const owner = await interaction.client.users.fetch(ownerId);

    const desc =
      `> ${ARROW} **Owner:** ${owner.tag} (${owner.id})\n` +
      `> ${ARROW} **Year:** ${foundVehicle.year}\n` +
      `> ${ARROW} **Make:** ${foundVehicle.make}\n` +
      `> ${ARROW} **Model:** ${foundVehicle.model}\n` +
      `> ${ARROW} **Color:** ${foundVehicle.color}\n` +
      `> ${ARROW} **Plate:** ${foundVehicle.plate}`;

    const { embed } = embedTemplate({
      title: `${STAR} Vehicle Lookup Result ${STAR}`,
      description: desc,
    });

    embed.setThumbnail(owner.displayAvatarURL({ dynamic: true }));

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`viewVehicles_${interaction.user.id}_${owner.id}`)
        .setLabel("View Owner's Vehicles")
        .setStyle(ButtonStyle.Primary),

      new ButtonBuilder()
        .setCustomId(`viewRecords_${interaction.user.id}_${owner.id}`)
        .setLabel("View Owner's Records")
        .setStyle(ButtonStyle.Secondary),
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
