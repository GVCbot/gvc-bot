const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-withdraw")
    .setDescription("Withdraw money from your Moat Castle account.")
    .addIntegerOption((opt) =>
      opt
        .setName("amount")
        .setDescription("Amount of cash to withdraw")
        .setRequired(true),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const amount = interaction.options.getInteger("amount");
    const userRecord = await getUserRecord(interaction.user.id);

    // No account exists
    if (!userRecord.moatCastle) {
      const { embed, files } = moatembedTemplate({
        title: "No Moat Castle Account",
        description:
          `> <:moatcastleright:1537695231409918002> You do not have a Moat Castle account.\n` +
          `> <:moatcastleright:1537695231409918002> Use **/moat-accountcreate** to open one.`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // Invalid amount
    if (amount <= 0) {
      const { embed, files } = moatembedTemplate({
        title: "Invalid Amount",
        description: "> Amount must be greater than 0.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Check Moat Castle balance
    const acct = userRecord.moatCastle;

    if (acct.balance < amount) {
      const { embed, files } = moatembedTemplate({
        title: "Insufficient Account Balance",
        description: `> <:moatcastleright:1537695231409918002> Your Moat Castle account only has **$${acct.balance.toLocaleString()}**.`,
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // Withdraw: move money from Moat Castle → cash
    acct.balance -= amount;
    userRecord.cash += amount;

    await updateUserRecord(userRecord);

    const { embed, files } = moatembedTemplate({
      title: "Withdrawal Successful",
      description:
        `> <:moatcastleright:1537695231409918002> **Cash Withdrawn:** $${amount.toLocaleString()}\n\n` +
        `> <:moatcastleright:1537695231409918002> **New Cash Balance:** $${userRecord.cash.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Moat Castle Account Balance:** $${acct.balance.toLocaleString()}\n` +
        `> <:moatcastleright:1537695231409918002> **Castle Points:** ${acct.rewards.toLocaleString()}`,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};
