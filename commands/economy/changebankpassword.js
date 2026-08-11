const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

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
    .setName("changebankpassword")
    .setDescription("Change the password of one of your banks.")
    .addStringOption((opt) =>
      opt
        .setName("bank")
        .setDescription("Select which bank to update")
        .setRequired(true)
        .setAutocomplete(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("newpassword")
        .setDescription("The new password for your bank")
        .setRequired(true),
    ),

  async autocomplete(interaction) {
    const userRecord = await getUserRecord(interaction.user.id);
    const banks = await loadAllBanks(userRecord);

    const ownedBanks = banks.filter((b) => b.owner === interaction.user.id);

    const choices = ownedBanks.map((b) => ({
      name: `${b.type} (${b.id})`,
      value: b.id,
    }));

    await interaction.respond(choices);
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const bankId = interaction.options.getString("bank");
    const newPassword = interaction.options.getString("newpassword").trim();

    const userRecord = await getUserRecord(interaction.user.id);

    // Find bank in user's owned banks
    const bank = userRecord.banks.find((b) => b.id === bankId);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Bank Not Found",
        description: "> You can only change passwords for banks you **own**.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Update password
    bank.password = newPassword;
    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: `${SUN} Password Updated ${SUN}`,
      description:
        `> ${ARROW} **Bank:** ${bank.type}\n` +
        `> ${ARROW} **Bank ID:** ${bank.id}\n` +
        `> ${ARROW} **New Password:** ${newPassword}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
