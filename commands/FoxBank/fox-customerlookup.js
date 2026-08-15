const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { FOXICON, ARROW } = FOXEMOJIS;

const { getUserRecord } = require("../../economy/economyutils");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-customerlookup")
    .setDescription(
      "Lookup a user's full Fox Bank account information. (Fox Bank Staff Only)",
    )
    .addUserOption((opt) =>
      opt.setName("user").setDescription("User to lookup").setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const foxStaffRole = "1537894455779270717";

    if (!interaction.member.roles.cache.has(foxStaffRole)) {
      return interaction.editReply({
        content: "❌ Only Fox Bank staff can use this command.",
      });
    }

    const target = interaction.options.getUser("user");
    const userRecord = await getUserRecord(target.id);

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

    const fb = userRecord.foxBank;

    const balance = fb.balance || 0;

    const createdAt = fb.createdAt
      ? `<t:${Math.floor(fb.createdAt / 1000)}:F>`
      : "Unknown";

    const updatedAt = fb.updatedAt
      ? `<t:${Math.floor(fb.updatedAt / 1000)}:F>`
      : "Unknown";

    // ================================
    // ⭐ OWNED HOMES DISPLAY (Unlimited)
    // ================================
    let homesText = "";

    const lakevilleHomes = userRecord.homes?.lakeville || [];
    const sixhousentHomes = userRecord.homes?.sixhousent || [];

    if (lakevilleHomes.length === 0 && sixhousentHomes.length === 0) {
      homesText += `${ARROW} **Owned Homes:** None\n\n`;
    } else {
      homesText += `${ARROW} **Owned Homes:**\n`;

      for (const home of lakevilleHomes) {
        homesText +=
          `${ARROW} Lakeville Home #${home.homeId} — ` +
          `$${home.price.toLocaleString()}\n`;
      }

      for (const home of sixhousentHomes) {
        homesText +=
          `${ARROW} Sixhousent Home #${home.homeId} — ` +
          `$${home.price.toLocaleString()}\n`;
      }

      homesText += `\n`;
    }

    // ================================
    // ⭐ Recent Deposit
    // ================================
    const depositSection = fb.lastDeposit
      ? `${ARROW} **Amount:** $${fb.lastDeposit.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(
          fb.lastDeposit.timestamp / 1000,
        )}:F>\n`
      : `${ARROW} No deposits recorded.\n`;

    // ================================
    // ⭐ Recent Withdrawal
    // ================================
    const withdrawalSection = fb.lastWithdrawal
      ? `${ARROW} **Amount:** $${fb.lastWithdrawal.amount.toLocaleString()}\n` +
        `${ARROW} **Date:** <t:${Math.floor(
          fb.lastWithdrawal.timestamp / 1000,
        )}:F>\n`
      : `${ARROW} No withdrawals recorded.\n`;

    // ================================
    // ⭐ Card Replacement History
    // ================================
    const cardHistory = fb.cardReplacements || [];
    let cardSection = "";

    if (cardHistory.length === 0) {
      cardSection = `${ARROW} No card replacements recorded.\n`;
    } else {
      cardHistory.forEach((entry, i) => {
        const ts = Math.floor(entry.timestamp / 1000);
        cardSection +=
          `${ARROW} **Replacement #${i + 1}**\n` +
          `${ARROW} Old Card: ${entry.oldCard}\n` +
          `${ARROW} New Card: ${entry.newCard}\n` +
          `${ARROW} Staff: <@${entry.staffId}>\n` +
          `${ARROW} Date: <t:${ts}:F>\n\n`;
      });
    }

    // ================================
    // ⭐ FINAL EMBED
    // ================================
    const { embed, files } = foxbankembedTemplate({
      title: `Customer Lookup: ${target.username}`,
      description:
        `${FOXICON} **Account Holder:** ${target}\n\n` +
        `${ARROW} **Account Name:** ${fb.accountName}\n` +
        `${ARROW} **Account ID:** ${fb.accountId}\n` +
        `${ARROW} **Card Number:** ${fb.cardNumber}\n` +
        `${ARROW} **Card Status:** ${fb.cardStatus}\n` +
        `${ARROW} **Tier:** ${fb.tier}\n\n` +
        `${ARROW} **Balance:** $${balance.toLocaleString()}\n` +
        `${ARROW} **Created:** ${createdAt}\n` +
        `${ARROW} **Last Updated:** ${updatedAt}\n\n` +
        homesText +
        `**💳 Card Replacement History:**\n${cardSection}\n` +
        `**📘 Most Recent Deposit:**\n${depositSection}\n` +
        `**📙 Most Recent Withdrawal:**\n${withdrawalSection}\n`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
