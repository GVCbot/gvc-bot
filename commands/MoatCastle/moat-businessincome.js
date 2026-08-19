const { SlashCommandBuilder } = require("discord.js");
const {
  getAllUserRecords,
  updateUserRecord,
  findBusinessOwnerRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const MOAT_STAFF_ROLE = "1537722114176581724";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-businessincome")
    .setDescription("[Staff] Manage Moat Castle business income")

    // SET BUSINESS INCOME
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("[Staff] Set a business's daily income")
        .addStringOption((opt) =>
          opt
            .setName("business_id")
            .setDescription("Business ID")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("income")
            .setDescription("Daily income amount")
            .setRequired(true)
            .setMinValue(0),
        ),
    )

    // COLLECT ALL BUSINESS INCOME
    .addSubcommand((sub) =>
      sub
        .setName("collect")
        .setDescription("[Staff] Collect daily income for ALL businesses"),
    ),

  async execute(interaction) {
    if (!interaction.member.roles.cache.has(MOAT_STAFF_ROLE)) {
      return interaction.reply({
        content: "❌ Only Moat Castle staff can use this command.",
        ephemeral: true,
      });
    }

    const sub = interaction.options.getSubcommand();
    await interaction.deferReply({ ephemeral: true });

    // ===============================
    // 🟩 SET BUSINESS INCOME
    // ===============================
    if (sub === "set") {
      const businessId = interaction.options.getString("business_id");
      const income = interaction.options.getInteger("income");

      const ownerDoc = await findBusinessOwnerRecord(businessId);
      if (!ownerDoc) {
        return interaction.editReply({
          content: "❌ No business found with that ID.",
        });
      }

      const business = ownerDoc.moatCastle.businesses.find(
        (b) => b.id === businessId,
      );

      if (!business) {
        return interaction.editReply({
          content:
            "❌ Business exists but could not be located in owner's record.",
        });
      }

      business.income = income;
      business.lastIncomeCollected = Date.now();
      await updateUserRecord(ownerDoc);

      // DM owner
      try {
        const ownerUser = await interaction.client.users.fetch(ownerDoc.userId);
        const { embed } = moatembedTemplate({
          title: "🏢 Business Income Updated",
          description: `> Your business **${business.name}** now earns **$${income.toLocaleString()}** every 24 hours.`,
          noLogo: false,
        });
        await ownerUser.send({ embeds: [embed] });
      } catch {}

      return interaction.editReply({
        content: `✅ Set daily income for **${business.name}** (${businessId}) to $${income.toLocaleString()}.`,
      });
    }

    // ===============================
    // 🟦 COLLECT ALL BUSINESS INCOME
    // ===============================
    if (sub === "collect") {
      const MEMBERSHIP_BOOSTS = {
        standard: 0,
        silver: 0.02,
        gold: 0.04,
        platinum: 0.06,
        black: 0.1,
      };

      const allUsers = await getAllUserRecords();
      let collectedBusinesses = 0;
      let totalPaid = 0;

      for (const user of allUsers) {
        if (!user.moatCastle || !user.moatCastle.businesses) continue;

        const membership =
          user.moatCastle.membership?.toLowerCase() || "standard";
        const boost = MEMBERSHIP_BOOSTS[membership] || 0;

        for (const business of user.moatCastle.businesses) {
          const baseIncome = Number(business.income) || 0;
          if (baseIncome <= 0) continue;

          // Apply membership boost
          const finalIncome = Math.floor(baseIncome * (1 + boost));

          // ⭐ Manual collection should NOT reset the 24-hour timer
          // DO NOT modify business.lastIncomeCollected here

          user.moatCastle.balance =
            (Number(user.moatCastle.balance) || 0) + finalIncome;

          await updateUserRecord(user);

          collectedBusinesses++;
          totalPaid += finalIncome;

          // DM owner
          try {
            const owner = await interaction.client.users.fetch(user.userId);
            const { embed } = moatembedTemplate({
              title: "🏢 Business Income Collected",
              description:
                `> Your business **${business.name}** earned **$${finalIncome.toLocaleString()}** ` +
                `(including ${boost * 100}% membership boost).`,
              noLogo: false,
            });
            await owner.send({ embeds: [embed] });
          } catch {}
        }
      }

      return interaction.editReply({
        content: `✅ Collected income for **${collectedBusinesses}** business(es). Total paid: $${totalPaid.toLocaleString()}.`,
      });
    }
  },
};
