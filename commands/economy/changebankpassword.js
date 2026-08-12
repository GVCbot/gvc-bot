const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

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
    const ownedBanks = userRecord.banks || [];

    // ⭐ Show ONLY owned banks — not co-owned
    const choices = ownedBanks.map((b) => ({
      name: `${b.name} — ${b.type} (${b.id})`,
      value: b.id,
    }));

    // ⭐ Discord allows max 25 autocomplete choices
    await interaction.respond(choices.slice(0, 25));
  },

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const bankId = interaction.options.getString("bank");
    const newPassword = interaction.options.getString("newpassword").trim();
    const userRecord = await getUserRecord(interaction.user.id);

    // ⭐ Only owned banks
    const bank = (userRecord.banks || []).find((b) => b.id === bankId);

    if (!bank) {
      const { embed } = embedTemplate({
        title: "❌ Access Denied",
        description:
          "> You can only change passwords for banks you **own**.\n" +
          "> Co‑owners cannot modify bank settings.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // ⭐ Update password
    bank.password = newPassword;
    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: `${SUN} Password Updated ${SUN}`,
      description:
        `> ${ARROW} **Bank:** ${bank.name}\n` +
        `> ${ARROW} **Bank ID:** ${bank.id}\n` +
        `> ${ARROW} **New Password:** ${newPassword}`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
