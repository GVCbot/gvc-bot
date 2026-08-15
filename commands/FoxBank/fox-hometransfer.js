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
    .setDescription("Transfer one of your homes to another user.")
    .addUserOption((opt) =>
      opt.setName("user").setDescription("Recipient").setRequired(true),
    )
    .addStringOption((opt) =>
      opt
        .setName("area")
        .setDescription("lakeville or sixhousent")
        .setRequired(true),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("homeid")
        .setDescription("Home ID to transfer")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const target = interaction.options.getUser("user");
    const area = interaction.options.getString("area");
    const homeId = interaction.options.getInteger("homeid");

    if (!["lakeville", "sixhousent"].includes(area)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

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

    const senderHomes = senderRecord.homes?.[area] || [];
    const index = senderHomes.findIndex((h) => h.homeId === homeId);

    if (index === -1) {
      const { embed, files } = foxbankembedTemplate({
        title: "Home Not Found",
        description: `> ${ARROW} You do not own **Home #${homeId}** in **${area}**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const home = senderHomes[index];

    // Transfer home
    senderHomes.splice(index, 1);
    receiverRecord.homes[area].push(home);

    await updateUserRecord(senderRecord);
    await updateUserRecord(receiverRecord);

    // DM the recipient
    try {
      const { embed, files } = foxbankembedTemplate({
        title: "You Received a Home!",
        description:
          `> ${ARROW} **A Fox Bank user has transferred a home to you.**\n\n` +
          `> ${ARROW} **Home:** ${area} #${home.homeId}\n` +
          `> ${ARROW} **Value:** $${home.price.toLocaleString()}\n\n` +
          `> ${ARROW} View your home using **/fox-viewaccount**.`,
      });

      await target.send({ embeds: [embed], files });
    } catch {}

    // Confirmation to sender
    const { embed, files } = foxbankembedTemplate({
      title: "Home Transferred",
      description:
        `> ${ARROW} **Home transferred to:** ${target.tag}\n` +
        `> ${ARROW} **Home:** ${area} #${home.homeId}\n` +
        `> ${ARROW} Transfer successful.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
