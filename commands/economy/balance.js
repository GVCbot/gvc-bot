const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Check your current cash and bank balances."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const user = await getUserRecord(interaction.user.id);

    const cash = user.cash ?? 0;
    const banks = user.banks ?? [];

    let desc = `> <:arrowright:1534182706836144158> **Cash:** $${cash.toLocaleString()}\n`;

    if (banks.length === 0) {
      desc += `> <:arrowright:1534182706836144158> **Banks:** None\n`;
    } else {
      desc += `> <:arrowright:1534182706836144158> **Banks:**\n`;
      for (const b of banks) {
        desc += `> • ${b.type} — $${b.balance.toLocaleString()}\n`;
      }
    }

    const { embed } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Your Balance <a:gvcsunspin:1527220557890850846>",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed] });
  },
};
