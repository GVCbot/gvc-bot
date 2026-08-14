const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { MOATCASTLE, ARROW } = MOATEMOJIS;

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
    .setName("moat-replacecard")
    .setDescription("Replace a user's Moat Castle card (Staff Only)")
    .addUserOption((opt) =>
      opt
        .setName("user")
        .setDescription("User whose card will be replaced")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const moatStaffRole = "1537722114176581724"; // Moat Castle Staff

    // Staff-only check
    if (!interaction.member.roles.cache.has(moatStaffRole)) {
      return interaction.editReply({
        content: "❌ Only Moat Castle staff can replace cards.",
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    // No Moat Castle account
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} This user does **not** have a Moat Castle account.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const oldCard = userRecord.moatCastle.cardNumber;
    const newCard = generateCardNumber();

    // Ensure cardReplacements exists
    if (!userRecord.moatCastle.cardReplacements) {
      userRecord.moatCastle.cardReplacements = [];
    }

    // ⭐ NEW — Log card replacement
    userRecord.moatCastle.cardReplacements.push({
      oldCard,
      newCard,
      timestamp: Date.now(),
      staffId: interaction.user.id,
    });

    // Update card
    userRecord.moatCastle.cardNumber = newCard;
    userRecord.moatCastle.updatedAt = Date.now();

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "🔄 Card Replacement Successful",
      description:
        `${MOATCASTLE} **Card replaced for:** ${target}\n\n` +
        `${ARROW} **Old Card:** ${oldCard}\n` +
        `${ARROW} **New Card:** ${newCard}\n\n` +
        `${ARROW} Replacement logged in account history.`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
