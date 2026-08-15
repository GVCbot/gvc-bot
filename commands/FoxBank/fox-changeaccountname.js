const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-changeaccountname")
    .setDescription(
      "Fox Bank Staff Only — Change a user's Fox Bank account name.",
    )
    .addStringOption((opt) =>
      opt
        .setName("accountid")
        .setDescription("The Fox Bank Account ID")
        .setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("newname")
        .setDescription("The new account name")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Staff check
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const accountId = interaction.options.getString("accountid");
    const newName = interaction.options.getString("newname");

    const allUsers = await getAllUserRecords();

    let foundUser = null;

    // Search for matching account ID
    for (const user of allUsers) {
      if (user.foxBank && user.foxBank.accountId === accountId) {
        foundUser = user;
        break;
      }
    }

    // No account found
    if (!foundUser) {
      const { embed, files } = foxbankembedTemplate({
        title: "Account Not Found",
        description:
          `> ${ARROW} No Fox Bank account exists with ID **${accountId}**.\n` +
          `> ${ARROW} Please check the ID and try again.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Update account name
    foundUser.foxBank.accountName = newName;
    foundUser.foxBank.updatedAt = Date.now();

    await updateUserRecord(foundUser);

    const { embed, files } = foxbankembedTemplate({
      title: "Account Name Updated",
      description:
        `> ${ARROW} **Account ID:** ${accountId}\n` +
        `> ${ARROW} **New Name:** ${newName}\n\n` +
        `> ${ARROW} The account name has been successfully updated.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
