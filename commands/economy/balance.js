const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your cash and manage your bank accounts."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await getUserRecord(interaction.user.id);

    const cash = user.cash ?? 0;
    const banks = user.banks ?? [];

    let desc = `${ARROW} **Cash:** $${cash.toLocaleString()}\n`;

    if (banks.length === 0) {
      desc += `${ARROW} **Banks:** None\n\n`;
    } else {
      desc += `${ARROW} **Banks:** ${banks.length} total\n`;
      for (const b of banks) {
        desc += `> • ${b.type} — $${b.balance.toLocaleString()}\n`;
      }
      desc += "\n";
    }

    const { embed } = embedTemplate({
      title: `${SUN} Your Balance ${SUN}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    // If user has banks, show select menu
    let components = [];

    if (banks.length > 0) {
      const bankOptions = banks.map((b) => ({
        label: `${b.type}`,
        description: `Balance: $${b.balance.toLocaleString()}`,
        value: b.id,
      }));

      const menu = new StringSelectMenuBuilder()
        .setCustomId(`balance_bank_select_${interaction.user.id}`)
        .setPlaceholder("Select a bank to manage")
        .addOptions(bankOptions);

      components.push(new ActionRowBuilder().addComponents(menu));
    }

    return interaction.editReply({ embeds: [embed], components });
  },
};
