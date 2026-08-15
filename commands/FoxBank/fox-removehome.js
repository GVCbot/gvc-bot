const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-removehome")
    .setDescription("Fox Bank Staff Only — Remove a home from a user.")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User to remove home from")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("area")
        .setDescription("lakeville or sixhousent")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("homeid")
        .setDescription("Home ID to remove")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Staff check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const target = interaction.options.getUser("user");
    const area = interaction.options.getString("area");
    const homeId = interaction.options.getInteger("homeid");

    const userRecord = await getUserRecord(target.id);

    if (!["lakeville", "sixhousent"].includes(area)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const homes = userRecord.homes?.[area] || [];

    if (!Array.isArray(homes)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Home Data Error",
        description: `> ${ARROW} This user’s home data is corrupted or outdated.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Find home
    const index = homes.findIndex((h) => h.homeId === homeId);

    if (index === -1) {
      const { embed, files } = foxbankembedTemplate({
        title: "Home Not Found",
        description: `> ${ARROW} This user does **not** own Home #${homeId} in **${area}**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Remove home
    const removedHome = homes[index];
    homes.splice(index, 1);

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Home Removed",
      description:
        `> ${ARROW} **Removed Home:** ${area} #${homeId}\n` +
        `> ${ARROW} **Value:** $${removedHome.price.toLocaleString()}\n` +
        `> ${ARROW} **User:** ${target.tag}\n\n` +
        `> ${ARROW} The home has been successfully removed.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
