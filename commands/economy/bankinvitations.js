const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
  getUserRecord: getRecord,
} = require("../../economy/economyutils");
const embedTemplate = require("../../utils/embedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bankinvitations")
    .setDescription("View and manage pending bank join requests."),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const ownerId = interaction.user.id;
    const ownerRecord = await getUserRecord(ownerId);

    if (!ownerRecord.joinRequests || ownerRecord.joinRequests.length === 0) {
      return interaction.editReply({
        content: "📭 You have no pending bank join requests.",
        flags: 64,
      });
    }

    // Show each request separately
    for (const req of ownerRecord.joinRequests) {
      const requester = await interaction.client.users.fetch(req.userId);
      const bank = ownerRecord.banks.find((b) => b.id === req.bankId);

      if (!bank) continue;

      const { embed } = embedTemplate({
        title: "🏦 Bank Join Request",
        description:
          `> ${requester} wants to join your bank **${bank.name}**.\n` +
          `> Bank ID: ${bank.id}\n` +
          `> Requested: <t:${Math.floor(req.timestamp / 1000)}:R>`,
        noLogo: true,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`inv_accept_${bank.id}_${req.userId}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`inv_deny_${bank.id}_${req.userId}`)
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger),
      );

      await interaction.followUp({
        embeds: [embed],
        components: [row],
        flags: 64,
      });
    }
  },
};
