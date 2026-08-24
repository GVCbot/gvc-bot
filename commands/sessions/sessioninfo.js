const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

// ===============================
// 🔆 Global Constants (no repetition)
// ===============================
const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";
const STAFF_ROLE_ID = "1350897509752373341";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sessioninfo")
    .setDescription(
      "Manage session settings like AORP, Peacetime, and Drift Mode.",
    )
    .addSubcommand((sub) =>
      sub
        .setName("aorp")
        .setDescription("Announce an AORP change.")
        .addStringOption((opt) =>
          opt
            .setName("value")
            .setDescription("The new AORP value")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("peacetime")
        .setDescription("Change the Peacetime status.")
        .addStringOption((opt) =>
          opt
            .setName("status")
            .setDescription("Select the Peacetime mode")
            .setRequired(true)
            .addChoices(
              { name: "Strict", value: "strict" },
              { name: "Normal", value: "normal" },
              { name: "Off", value: "off" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("drift")
        .setDescription("Change the Drift Mode status.")
        .addStringOption((opt) =>
          opt
            .setName("status")
            .setDescription("Select the Drift Mode")
            .setRequired(true)
            .addChoices(
              { name: "Off", value: "off" },
              { name: "Corners Only", value: "corners" },
              { name: "Fully Enabled", value: "full" },
            ),
        ),
    ),

  async execute(interaction) {
    // Rate limit
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    // Staff check
    if (!interaction.member.roles.cache.has(STAFF_ROLE_ID)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const sub = interaction.options.getSubcommand();
    const host = interaction.user;

    let title = "";
    let description = "";

    // ===============================
    // AORP
    // ===============================
    if (sub === "aorp") {
      const value = interaction.options.getString("value");

      title = `${STAR} Greenville Community - *__AORP Change__* ${STAR}`;
      description = `${ARROW} AORP has been changed to **${value}** by ${host}.`;
    }

    // ===============================
    // Peacetime
    // ===============================
    if (sub === "peacetime") {
      const status = interaction.options.getString("status");

      title = `${STAR} Greenville Community - *__Peacetime Change__* ${STAR}`;

      if (status === "strict") {
        description =
          `${ARROW} **Peacetime is now Strict.**\n` +
          `${ARROW} FRP Speeds are **65mph**.\n` +
          `${ARROW} Double moderations are now enabled.\n` +
          `${ARROW} Changed by ${host}.`;
      } else if (status === "normal") {
        description =
          `${ARROW} **Peacetime is now Normal.**\n` +
          `${ARROW} FRP Speeds are **75mph**.\n` +
          `${ARROW} Changed by ${host}.`;
      } else {
        description =
          `${ARROW} **Peacetime is now Off.**\n` +
          `${ARROW} FRP Speeds are **85mph**.\n` +
          `${ARROW} You may run red lights and commit crimes.\n` +
          `${ARROW} You must still pull over for LEO and Staff.\n` +
          `${ARROW} Changed by ${host}.`;
      }
    }

    // ===============================
    // Drift Mode
    // ===============================
    if (sub === "drift") {
      const status = interaction.options.getString("status");

      title = `${STAR} Greenville Community - *__Drift Mode Change__* ${STAR}`;

      if (status === "off") {
        description =
          `${ARROW} **Drift Mode is now Off.**\n` +
          `${ARROW} Drifting is prohibited.\n` +
          `${ARROW} Maintain full vehicle control at all times.\n` +
          `${ARROW} Changed by ${host}.`;
      } else if (status === "corners") {
        description =
          `${ARROW} **Drift Mode is now Corners Only.**\n` +
          `${ARROW} Drifting is allowed **only on corners**.\n` +
          `${ARROW} Changed by ${host}.`;
      } else {
        description =
          `${ARROW} **Drift Mode is now Fully Enabled.**\n` +
          `${ARROW} Drifting is allowed anywhere.\n` +
          `${ARROW} Maintain awareness of traffic and pedestrians.\n` +
          `${ARROW} Changed by ${host}.`;
      }
    }

    const { embed } = embedTemplate({ title, description });
    await interaction.channel.send({ embeds: [embed] });

    return interaction.editReply({
      content: "Session info announcement sent successfully.",
    });
  },
};
