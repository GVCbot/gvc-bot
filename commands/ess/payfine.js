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
          "<a:gvcsunspin:1527220557890850846> No Citations <a:gvcsunspin:1527220557890850846>",
        description:
          "> <:arrowright:1534182706836144158> You have no outstanding citations.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const citations = userRecord.records.citations;

    if (citations.length === 0) {
      const { embed } = embedTemplate({
        title:
          "<a:gvcsunspin:1527220557890850846> No Citations <a:gvcsunspin:1527220557890850846>",
        description:
          "> <:arrowright:1534182706836144158> You have no outstanding citations.",
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
        "<a:gvcsunspin:1527220557890850846> Pay a Citation <a:gvcsunspin:1527220557890850846>",
      description:
        "> <:arrowright:1534182706836144158> Select a citation from the menu below.",
      noLogo: true,
    });

    await interaction.editReply({ embeds: [embed], components: [row] });
  },
};
