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

async function loadAllBanks(userRecord) {
  const owned = userRecord.banks || [];
  const joinedIds = userRecord.joinedBanks || [];

  const joined = [];

  for (const bankId of joinedIds) {
    const ownerId = bankId.split("_")[1];
    const ownerRecord = await getUserRecord(ownerId);
    if (!ownerRecord.banks) continue;

    const bank = ownerRecord.banks.find((b) => b.id === bankId);
    if (bank) joined.push(bank);
  }

  return [...owned, ...joined];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("managebank")
    .setDescription("Manage your bank accounts."),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const userRecord = await getUserRecord(interaction.user.id);
    const banks = await loadAllBanks(userRecord);

    if (banks.length === 0) {
      const { embed } = embedTemplate({
        title: "🏦 No Banks",
        description: "> You are not in any banks.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    const options = banks.map((b) => ({
      label: `${b.name}`,
      description: `Balance: $${b.balance.toLocaleString()}`,
      value: b.id,
    }));

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`managebank_select_${interaction.user.id}`)
      .setPlaceholder("Select a bank to manage")
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(menu);

    const { embed } = embedTemplate({
      title: `${SUN} Manage Your Banks ${SUN}`,
      description: `> ${ARROW} Select a bank to view details.`,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
