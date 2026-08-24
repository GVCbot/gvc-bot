const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord, updateUserRecord } = require("../../economy/economyutils");

const PREMIUM_ROLE = "1445765392168517745"; // Premium vehicle slot role

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";
const BULLETPOINT = "<:bulletpoint:1541479624209604608>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("registervehicle")
    .setDescription("Register a vehicle to your profile.")
    .addIntegerOption(option =>
      option.setName("year").setDescription("Vehicle year").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("make").setDescription("Vehicle make").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("model").setDescription("Vehicle model").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("color").setDescription("Vehicle color").setRequired(true)
    )
    .addStringOption(option =>
      option.setName("plate").setDescription("License plate").setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const userId = interaction.user.id;
    const member = interaction.member;

    const year = interaction.options.getInteger("year");
    const make = interaction.options.getString("make");
    const model = interaction.options.getString("model");
    const color = interaction.options.getString("color");
    const plate = interaction.options.getString("plate");

    const user = await getUserRecord(userId);
    user.vehicles = user.vehicles ?? [];

    // VEHICLE LIMIT CHECK
    const hasPremium = member.roles.cache.has(PREMIUM_ROLE);
    const limit = hasPremium ? 15 : 10;

    if (user.vehicles.length >= limit) {
      const { embed } = embedTemplate({
        title: "🚫 Vehicle Limit Reached",
        description:
          `> ${ARROW} You can only register **${limit} vehicles**.\n` +
          (hasPremium
            ? "> ${ARROW} You already have the premium role."
            : "> ${ARROW} Unlock **15 slots** with the premium role.")
      });

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      return interaction.editReply({ embeds: [embed] });
    }

    // Duplicate plate check
    const duplicate = user.vehicles.find(
      v => v.plate.toLowerCase() === plate.toLowerCase()
    );

    if (duplicate) {
      const { embed } = embedTemplate({
        title: "❌ Duplicate Vehicle",
        description:
          `> ${ARROW} You already registered a vehicle with plate **${plate}**.`
      });

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      return interaction.editReply({ embeds: [embed] });
    }

    // Create vehicle object
    const vehicle = { year, make, model, color, plate };

    user.vehicles.push(vehicle);
    await updateUserRecord(user);

    const desc =
      `> ${BULLETPOINT} **Year:** ${year}\n` +
      `> ${BULLETPOINT} **Make:** ${make}\n` +
      `> ${BULLETPOINT} **Model:** ${model}\n` +
      `> ${BULLETPOINT} **Color:** ${color}\n` +
      `> ${BULLETPOINT} **Plate:** ${plate}`;

    const { embed } = embedTemplate({
      title:
        "${STAR} Vehicle Registered ${STAR}",
      description: desc
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  }
};
