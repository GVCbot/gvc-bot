const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const path = require("node:path");
const {
  getUserRecord,
  updateUserRecord,
  getAllUserRecords,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const STORE_BANNER = path.join(
  __dirname,
  "..",
  "..",
  "graphics",
  "gvcstore.png",
);

const ITEMS = [
  {
    id: "basic",
    name: "Fox Basic Insured",
    roleId: "1537049129803448391",
    cost: 600,
    insuredType: "basic",
  },
  {
    id: "all",
    name: "Fox All Insured",
    roleId: "1537048719805911060",
    cost: 1000,
    insuredType: "all",
  },
];

// Normalize bank types
function normalizeType(type) {
  if (!type) return type;
  const t = type.toLowerCase();
  if (t.includes("fox")) return "Fox Bank";
  if (t.includes("moat")) return "Moat Castle";
  return type;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("store")
    .setDescription("View store items and optionally purchase one.")
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

    const purchaseItem = interaction.options.getString("purchaseitem");
    const userRecord = await getUserRecord(interaction.user.id);

    // Ensure store object exists
    if (!userRecord.store) {
      userRecord.store = {
        basicInsured: { active: false, nextPayment: 0 },
        allInsured: { active: false, nextPayment: 0 },
      };
    }

    // ⭐ SLEEK STORE LIST
    let desc = `${SUN} **GVC Store** ${SUN}\n\n`;

    for (const item of ITEMS) {
      desc +=
        `${ARROW} **${item.name}** — $${item.cost}/month\n` +
        `> Insurance coverage for your **Fox Banks**.\n\n`;
    }

    const { embed: listEmbed, files: listFiles } = embedTemplate({
      title: `${SUN} Store Items ${SUN}`,
      description: desc,
      banner: STORE_BANNER,
      noLogo: false,
    });

    // If no purchase requested → show store list only
    if (!purchaseItem) {
      return interaction.editReply({ embeds: [listEmbed], files: listFiles });
    }

    // ⭐ PURCHASE LOGIC
    const item = ITEMS.find((i) => i.id === purchaseItem);
    if (!item) return interaction.editReply("❌ Invalid item.");

    const allRecords = await getAllUserRecords();
    const ownedBanks = userRecord.banks || [];
    const joinedBanks = userRecord.joinedBanks || [];

    let hasFoxBank = false;

    // Check owned banks
    for (const b of ownedBanks) {
      if (normalizeType(b.type) === "Fox Bank") hasFoxBank = true;
    }

    // Check joined banks
    for (const bankId of joinedBanks) {
      for (const rec of allRecords) {
        const bank = (rec.banks || []).find((b) => b.id === bankId);
        if (bank && normalizeType(bank.type) === "Fox Bank") {
          hasFoxBank = true;
        }
      }
    }

    if (!hasFoxBank) {
      return interaction.editReply(
        "❌ You must own or co‑own a **Fox Bank** to purchase this item.",
      );
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
      return interaction.editReply(
        `❌ You need **$${item.cost}** to purchase this item.`,
      );
    }

    // Deduct cost
    userRecord.cash -= item.cost;

    // Activate insurance
    const nextPayment = Date.now() + 30 * 24 * 60 * 60 * 1000;

    if (item.id === "basic") {
      userRecord.store.basicInsured = { active: true, nextPayment };
    } else {
      userRecord.store.allInsured = { active: true, nextPayment };
    }

    // ⭐ INSURANCE TAGGING — ONLY FOR BANKS YOU OWN
    for (const bank of ownedBanks) {
      if (normalizeType(bank.type) === "Fox Bank") {
        bank.insured = true;
        bank.insuredType = item.insuredType;
      }
    }

    // Give role
    await interaction.member.roles.add(item.roleId).catch(() => {});

    await updateUserRecord(userRecord);

    // ⭐ SUCCESS EMBED
    const { embed: successEmbed, files: successFiles } = embedTemplate({
      title: `${SUN} Purchase Successful ${SUN}`,
      description:
        `${ARROW} **Item:** ${item.name}\n` +
        `${ARROW} **Cost:** $${item.cost}\n` +
        `${ARROW} **Next Payment:** <t:${Math.floor(nextPayment / 1000)}:F>\n` +
        `${ARROW} Your **Fox Banks** are now **INSURED**.`,
      banner: STORE_BANNER,
      noLogo: false,
    });

    return interaction.editReply({
      embeds: [listEmbed, successEmbed],
      files: [...listFiles, ...successFiles],
    });
  },
};
