const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const INSURANCE_PRICES = {
  fox_basic: 600,
  fox_all: 1000,
  moat_basic: 450,
  moat_all: 1000,
};

const ITEMS = [
  {
    id: "fox_basic",
    name: "Fox Basic Insured",
    roleId: "1537049129803448391",
  },
  {
    id: "fox_all",
    name: "Fox All Insured",
    roleId: "1537048719805911060",
  },
  {
    id: "moat_basic",
    name: "Moat Castle Basic Insured",
    roleId: "1537066784279240724",
  },
  {
    id: "moat_all",
    name: "Moat Castle All Insured",
    roleId: "1537066846786949120",
  },
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("storebuy")
    .setDescription("Purchase an item from the store.")
    .addStringOption((opt) =>
      opt
        .setName("item")
        .setDescription("Select an item to purchase")
        .setRequired(true)
        .addChoices(
          { name: "Fox Basic Insured", value: "fox_basic" },
          { name: "Fox All Insured", value: "fox_all" },
          { name: "Moat Castle Basic Insured", value: "moat_basic" },
          { name: "Moat Castle All Insured", value: "moat_all" },
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const purchaseItem = interaction.options.getString("item");
    const userRecord = await getUserRecord(interaction.user.id);

    // Ensure store exists
    if (!userRecord.store) {
      userRecord.store = {
        fox_basic: { active: false, nextPayment: 0 },
        fox_all: { active: false, nextPayment: 0 },
        moat_basic: { active: false, nextPayment: 0 },
        moat_all: { active: false, nextPayment: 0 },
      };
    }

    const item = ITEMS.find((i) => i.id === purchaseItem);
    if (!item) {
      return interaction.editReply("❌ Invalid item.");
    }

    const cost = INSURANCE_PRICES[purchaseItem];

    if ((userRecord.cash ?? 0) < cost) {
      return interaction.editReply(
        `❌ You need **$${cost.toLocaleString()}** to purchase this item.`,
      );
    }

    // Deduct cost
    userRecord.cash -= cost;

    // Set next payment date (30 days)
    const nextPayment = Date.now() + 30 * 24 * 60 * 60 * 1000;

    // Activate insurance
    userRecord.store[purchaseItem] = {
      active: true,
      nextPayment,
    };

    // Add role
    await interaction.member.roles.add(item.roleId).catch(() => {});

    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: `${SUN} Purchase Successful ${SUN}`,
      description:
        `${ARROW} **Item:** ${item.name}\n` +
        `${ARROW} **Cost:** $${cost.toLocaleString()}\n` +
        `${ARROW} **Next Payment:** <t:${Math.floor(nextPayment / 1000)}:F>\n`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
