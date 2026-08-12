const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const ITEMS = [
  {
    id: "basic",
    name: "Fox Basic Insured",
    roleId: "1537049129803448391",
    cost: 600,
    description:
      "Provides basic protection benefits within the game world, including coverage for minor damage and simple repairs.",
  },
  {
    id: "all",
    name: "Fox All Insured",
    roleId: "1537048719805911060",
    cost: 1000,
    description:
      "Provides extended protection benefits within the game world, including coverage for major damage, recovery support, and additional safety features.",
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("store")
    .setDescription("View or purchase store items.")
    .addBooleanOption((opt) =>
      opt
        .setName("showitems")
        .setDescription("Show available store items")
        .setRequired(false),
    )
    .addStringOption((opt) =>
      opt
        .setName("purchaseitem")
        .setDescription("Purchase an item")
        .setRequired(false)
        .addChoices(
          { name: "Fox Basic Insured", value: "basic" },
          { name: "Fox All Insured", value: "all" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const showItems = interaction.options.getBoolean("showitems");
    const purchaseItem = interaction.options.getString("purchaseitem");

    const userRecord = await getUserRecord(interaction.user.id);

    // Ensure store object exists
    if (!userRecord.store) {
      userRecord.store = {
        basicInsured: { active: false, nextPayment: 0 },
        allInsured: { active: false, nextPayment: 0 },
      };
    }

    // Show store items
    if (showItems) {
      let desc = "";

      for (const item of ITEMS) {
        desc += `> ${ARROW} **${item.name}** — $${item.cost}/month\n`;
        desc += `> ${item.description}\n\n`;
      }

      const { embed } = embedTemplate({
        title: `${SUN} Store Items ${SUN}`,
        description: desc,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    // Purchase item
    if (purchaseItem) {
      const item = ITEMS.find((i) => i.id === purchaseItem);

      if (!item) {
        return interaction.editReply({ content: "❌ Invalid item." });
      }

      // Must have a Fox Bank
      const allBanks = await getAllUserRecords();
      const ownedBanks = userRecord.banks || [];
      const joinedBanks = userRecord.joinedBanks || [];

      let hasFoxBank = false;

      // Check owned banks
      for (const b of ownedBanks) {
        if (b.type === "Fox Bank") hasFoxBank = true;
      }

      // Check joined banks
      for (const bankId of joinedBanks) {
        for (const rec of allBanks) {
          const bank = (rec.banks || []).find((b) => b.id === bankId);
          if (bank && bank.type === "Fox Bank") hasFoxBank = true;
        }
      }

      if (!hasFoxBank) {
        return interaction.editReply({
          content:
            "❌ You must own or co‑own a **Fox Bank** to purchase this item.",
        });
      }

      // Cannot buy both
      if (purchaseItem === "basic" && userRecord.store.allInsured.active) {
        userRecord.store.allInsured.active = false;
        await interaction.member.roles
          .remove("1537048719805911060")
          .catch(() => {});
      }

      if (purchaseItem === "all" && userRecord.store.basicInsured.active) {
        userRecord.store.basicInsured.active = false;
        await interaction.member.roles
          .remove("1537049129803448391")
          .catch(() => {});
      }

      // Check cash
      if ((userRecord.cash ?? 0) < item.cost) {
        return interaction.editReply({
          content: `❌ You need **$${item.cost}** to purchase this item.`,
        });
      }

      // Deduct cost
      userRecord.cash -= item.cost;

      // Activate item
      const nextPayment = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days

      if (item.id === "basic") {
        userRecord.store.basicInsured = { active: true, nextPayment };
      } else {
        userRecord.store.allInsured = { active: true, nextPayment };
      }

      // Give role
      await interaction.member.roles.add(item.roleId).catch(() => {});

      await updateUserRecord(userRecord);

      const { embed } = embedTemplate({
        title: `${SUN} Purchase Successful ${SUN}`,
        description:
          `> ${ARROW} **Item:** ${item.name}\n` +
          `> ${ARROW} **Cost:** $${item.cost}\n` +
          `> ${ARROW} **Next Payment:** <t:${Math.floor(nextPayment / 1000)}:F>`,
        noLogo: true,
      });

      return interaction.editReply({ embeds: [embed] });
    }

    return interaction.editReply({
      content:
        "❌ Use `/store showitems:true` or `/store purchaseitem:<item>`.",
    });
  },
};
