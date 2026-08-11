const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("managebank")
    .setDescription("Manage your bank accounts."),

  async execute(interaction) {
    try {
      // Correct defer
      await interaction.deferReply({ flags: 64 });

      const userRecord = await getUserRecord(interaction.user.id);
      const banks = userRecord.banks ?? [];

      if (banks.length === 0) {
        const { embed } = embedTemplate({
          title: "🏦 No Banks",
          description: "> You are not in any banks.",
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed] });
      }

      const bankOptions = banks.map((b) => ({
        label: `${b.type}`,
        description: `Balance: $${b.balance.toLocaleString()}`,
        value: b.id,
      }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`balance_bank_select_${interaction.user.id}`)
        .setPlaceholder("Select a bank to manage")
        .addOptions(bankOptions);

      const components = [new ActionRowBuilder().addComponents(menu)];

      const { embed } = embedTemplate({
        title: `${SUN} Manage Your Banks ${SUN}`,
        description: `> ${ARROW} Choose a bank to view or manage.`,
        noLogo: true,
      });

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

      return interaction.editReply({ embeds: [embed], components });
    } catch (error) {
      console.error("ManageBank error:", error);
      const { embed } = embedTemplate({
        title: "⚠️ Error ⚠️",
        description: `> ${ARROW} There was an error executing this interaction.`,
      });

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ embeds: [embed], flags: 64 });
      } else {
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
    }
  },
};
