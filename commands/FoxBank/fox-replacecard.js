const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { FOXICON, ARROW } = FOXEMOJIS;

// Generate 16-digit card number
function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-replacecard")
    .setDescription("Replace a user's Fox Bank card (Staff Only)")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose Fox Bank card will be replaced")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const foxStaffRole = "1537894455779270717"; // Fox Bank Staff

    // Staff-only check
    if (!interaction.member.roles.cache.has(foxStaffRole)) {
      return interaction.editReply({
        content: "❌ Only Fox Bank staff can replace cards.",
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    // No Fox Bank account
    if (!userRecord.foxBank) {
      const { embed, files } = foxbankembedTemplate({
        title: "No Fox Bank Account",
        description:
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} This user does **not** have a Fox Bank account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const oldCard = userRecord.foxBank.cardNumber;
    const newCard = generateCardNumber();

    // Ensure cardReplacements exists
    if (!userRecord.foxBank.cardReplacements) {
      userRecord.foxBank.cardReplacements = [];
    }

    // Log card replacement
    userRecord.foxBank.cardReplacements.push({
      oldCard,
      newCard,
      timestamp: Date.now(),
      staffId: interaction.user.id,
    });

    // Update card
    userRecord.foxBank.cardNumber = newCard;
    userRecord.foxBank.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "🔄 Card Replacement Successful",
      description:
        `${FOXICON} **Card replaced for:** ${target}\n\n` +
        `${ARROW} **Old Card:** ${oldCard}\n` +
        `${ARROW} **New Card:** ${newCard}\n\n` +
        `${ARROW} Replacement logged in account history.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
