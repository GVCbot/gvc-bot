const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

const FOX_STAFF = "1537894455779270717";

function generateAccountId() {
  return "FB-" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) {
    num += Math.floor(Math.random() * 10);
  }
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-balanceadd")
    .setDescription(
      "Fox Bank Staff Only — Restore missing Fox Bank fields for a user.",
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to fix").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

    // If foxBank is missing, create it
    if (!userRecord.foxBank) {
      userRecord.foxBank = {
        accountName: `${target.username}'s Account`,
        accountId: generateAccountId(),
        cardNumber: generateCardNumber(),
        cardStatus: "Active",
        balance: 0,
        tier: "Standard",
        createdAt: Date.now(),
      };
    } else {
      // Fix missing fields
      userRecord.foxBank.accountName =
        userRecord.foxBank.accountName || `${target.username}'s Account`;

      userRecord.foxBank.accountId =
        userRecord.foxBank.accountId || generateAccountId();

      userRecord.foxBank.cardNumber =
        userRecord.foxBank.cardNumber || generateCardNumber();

      userRecord.foxBank.cardStatus = userRecord.foxBank.cardStatus || "Active";

      userRecord.foxBank.balance = Number(userRecord.foxBank.balance) || 0;

      userRecord.foxBank.tier = userRecord.foxBank.tier || "Standard";

      userRecord.foxBank.createdAt = userRecord.foxBank.createdAt || Date.now();
    }

    await updateUserRecord(userRecord);

    const { embed, files } = foxbankembedTemplate({
      title: "Fox Bank Fields Restored",
      description:
        `> ${ARROW} **User:** ${target.tag}\n` +
        `> ${ARROW} **Account ID:** ${userRecord.foxBank.accountId}\n` +
        `> ${ARROW} **Card Number:** ${userRecord.foxBank.cardNumber}\n` +
        `> ${ARROW} **Balance Set To:** $0\n` +
        `> ${ARROW} **Tier:** ${userRecord.foxBank.tier}\n\n` +
        `> You may now use **/fox-deposit** or a staff command to add funds.`,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
