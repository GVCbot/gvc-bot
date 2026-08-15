const { SlashCommandBuilder } = require("discord.js");
const { getUserRecord } = require("../../economy/economyutils");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-viewownedhomes")
    .setDescription("View all homes owned by a user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to check").setRequired(false),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    // Permission check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      return interaction.editReply(
        "❌ You do not have permission to use this command.",
      );
    }

    const target = interaction.options.getUser("user") || interaction.user;
    const userRecord = await getUserRecord(target.id);

    const homes = userRecord.homes || { lakeville: [], sixhousent: [] };
    const lakeville = homes.lakeville.map(
      (h) => `#${h.homeId} — $${h.price.toLocaleString()}`,
    );
    const sixhousent = homes.sixhousent.map(
      (h) => `#${h.homeId} — $${h.price.toLocaleString()}`,
    );

    const description =
      lakeville.length || sixhousent.length
        ? `> ${ARROW} **Lakeville Homes:**\n${lakeville.join("\n") || "> None"}\n\n` +
          `> ${ARROW} **Sixhousent Homes:**\n${sixhousent.join("\n") || "> None"}`
        : "> No homes owned.";

    const { embed, files } = foxbankembedTemplate({
      title: `🏠 Homes Owned — ${target.username}`,
      description,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
