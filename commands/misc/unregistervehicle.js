const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord, updateUserRecord } = require("../../economy/economyutils");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";
const BULLETPOINT = "<:bulletpoint:1541479624209604608>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unregistervehicle")
    .setDescription("Remove a registered vehicle from your profile.")
    .addStringOption(option =>
      option
        .setName("plate")
        .setDescription("The license plate of the vehicle to remove.")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const plate = interaction.options.getString("plate");

    // Load user record
    const user = await getUserRecord(userId);

    // Ensure vehicles array exists
    user.vehicles = user.vehicles ?? [];

    // Find vehicle by plate
    const vehicleIndex = user.vehicles.findIndex(
      v => v.plate.toLowerCase() === plate.toLowerCase()
    );

    if (vehicleIndex === -1) {
      const { embed } = embedTemplate({
        title: "❌ Vehicle Not Found",
        description: `> ${ARROW} No vehicle with plate **${plate}** is registered to your profile.`
      });

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      return interaction.editReply({ embeds: [embed] });
    }

    // Remove vehicle
    const removedVehicle = user.vehicles.splice(vehicleIndex, 1)[0];
    await updateUserRecord(user);

    // Build success embed
    const desc =
      `> ${BULLETPOINT} **Year:** ${removedVehicle.year}\n` +
      `> ${BULLETPOINT} **Make:** ${removedVehicle.make}\n` +
      `> ${BULLETPOINT} **Model:** ${removedVehicle.model}\n` +
      `> ${BULLETPOINT} **Color:** ${removedVehicle.color}\n` +
      `> ${BULLETPOINT} **Plate:** ${removedVehicle.plate}`;

    const { embed } = embedTemplate({
      title:
        `${STAR} Vehicle Unregistered ${STAR}`,
      description: desc
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  }
};
