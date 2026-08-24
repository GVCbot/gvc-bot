const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("payfine")
    .setDescription("Pay one of your outstanding citations."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const userId = interaction.user.id;
    const userRecord = await getUserRecord(userId);

    // Ensure records exist
    if (!userRecord.records || !userRecord.records.citations) {
      const { embed } = embedTemplate({
        title:
          "${STAR} No Citations ${STAR}",
        description:
          "> ${ARROW} You have no outstanding citations.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const citations = userRecord.records.citations;

    if (citations.length === 0) {
      const { embed } = embedTemplate({
        title:
          "${STAR} No Citations ${STAR}",
        description:
          "> ${ARROW} You have no outstanding citations.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Build select menu options
    const options = citations.map((c) => ({
      label: `${c.case} — $${c.price}`,
      description: `${c.violation} | ${c.offense}`,
      value: c.case,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId("payfine_select")
      .setPlaceholder("Select a citation to pay")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const { embed } = embedTemplate({
      title:
        "${STAR} Pay a Citation ${STAR}",
      description:
        "> ${ARROW} Select a citation from the menu below.",
      noLogo: true,
    });

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
