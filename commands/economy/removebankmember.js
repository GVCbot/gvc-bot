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

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("removebankmember")
    .setDescription("Remove a co-owner from one of your banks.")
    .addStringOption((opt) =>
      opt.setName("bankname").setDescription("Bank name").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const bankNameInput = interaction.options
      .getString("bankname")
      .toLowerCase();
    const ownerId = interaction.user.id;

    const ownerRecord = await getUserRecord(ownerId);
    const ownedBanks = ownerRecord.banks || [];

    // Find bank by name
    const bank = ownedBanks.find((b) => b.name.toLowerCase() === bankNameInput);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> You do not own a bank with that name.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Filter out the owner from the list
    const coowners = bank.members.filter((id) => id !== ownerId);

    if (coowners.length === 0) {
      const { embed } = embedTemplate({
        title: "❌ No Co-Owners",
        description: "> This bank has no co-owners to remove.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Build select menu
    const options = coowners.map((id) => ({
      label: `User: ${id}`,
      value: id,
    }));

    const row = new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`removebankmember_select_${bank.id}`)
        .setPlaceholder("Choose a member to remove")
        .addOptions(options),
    );

    const { embed } = embedTemplate({
      title: `${SUN} Remove Bank Member ${SUN}`,
      description:
        `> ${ARROW} **Bank:** ${bank.name}\n` +
        `> ${ARROW} Select a co-owner to remove.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed], components: [row] });
  },
};
