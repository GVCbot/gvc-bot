const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-hometransfer")
    .setDescription("Transfer your home to another user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Recipient").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user");
    const senderRecord = await getUserRecord(interaction.user.id);
    const receiverRecord = await getUserRecord(target.id);

    // Sender must have Fox Bank
    if (!senderRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Required",
        description: `> ${ARROW} You must have a Fox Bank account to transfer a home.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Receiver must have Fox Bank
    if (!receiverRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "Recipient Lacks Fox Bank",
        description: `> ${ARROW} The recipient must have a Fox Bank account.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const home = senderRecord.homes.lakeville || senderRecord.homes.sixhousnet;

    if (!home) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Home Owned",
        description: `> ${ARROW} You do not own a home.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    if (receiverRecord.homes.lakeville || receiverRecord.homes.sixhousnet) {
      const { embed, files } = foxbankembedTemplate({
        title: "Recipient Already Owns Home",
        description: `> ${ARROW} The recipient already owns a home.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Transfer home
    let transferredArea = null;

    if (senderRecord.homes.lakeville) {
      receiverRecord.homes.lakeville = senderRecord.homes.lakeville;
      senderRecord.homes.lakeville = null;
      transferredArea = "Lakeville";
    }

    if (senderRecord.homes.sixhousnet) {
      receiverRecord.homes.sixhousnet = senderRecord.homes.sixhousnet;
      senderRecord.homes.sixhousnet = null;
      transferredArea = "Sixhousnet";
    }

    await updateUserRecord(senderRecord);
    await updateUserRecord(receiverRecord);

    // DM the recipient
    try {
      const { embed, files } = foxbankembedTemplate({
        title: "You Received a Home!",
        description:
          `> ${ARROW} **A Fox Bank user has transferred a home to you.**\n\n` +
          `> ${ARROW} **Home:** ${transferredArea} #${home.homeId}\n` +
          `> ${ARROW} **Value:** $${home.price.toLocaleString()}\n\n` +
          `> ${ARROW} You can view your home using **/fox-viewaccount**.`,
      });

      await target.send({ embeds: [embed], files });
    } catch (err) {
      // User has DMs closed — ignore silently
    }

    // Confirmation to sender
    const { embed, files } = foxbankembedTemplate({
      title: "Home Transferred",
      description:
        `> ${ARROW} **Home transferred to:** ${target.tag}\n` +
        `> ${ARROW} **Home:** ${transferredArea} #${home.homeId}\n` +
        `> ${ARROW} Transfer successful.\n\n` +
        `> ${ARROW} The recipient has been notified via DM (if enabled).`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
