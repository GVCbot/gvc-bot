const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("View your cash and bank accounts."),

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
        desc += `> • ${b.name} — $${b.balance.toLocaleString()}\n`;
      }
      desc += "\n";
    }

    const { embed } = embedTemplate({
      title: `${SUN} Your Balance ${SUN}`,
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
