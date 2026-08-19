const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  getAllUserRecords,
  updateUserRecord,
  loadLakevillePrices,
  loadSixhousentPrices,
} = require("../../economy/economyutils");

const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

// Membership-based home discount system (buy only)
function getHomeDiscountPercent(membership) {
  switch ((membership || "").toLowerCase()) {
    case "benefits":
      return 0.03;
    case "gold":
      return 0.06;
    case "platinum":
      return 0.1;
    case "diamond":
      return 0.15;
    case "express":
      return 0.2;
    default:
      return 0.0;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-home")
    .setDescription("Buy, sell, or transfer a Fox Bank home.")
    .addSubcommand((sub) =>
      sub
        .setName("buy")
        .setDescription("Buy a home from any Fox Bank area.")
        .addStringOption((opt) =>
          opt
            .setName("area")
            .setDescription("lakeville or sixhousent")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt.setName("homeid").setDescription("Home ID").setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("sell")
        .setDescription("Sell one of your homes for a 75% refund.")
        .addStringOption((opt) =>
          opt
            .setName("area")
            .setDescription("lakeville or sixhousent")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("homeid")
            .setDescription("Home ID to sell")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("transfer")
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
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const area = interaction.options.getString("area");
    const homeId = interaction.options.getInteger("homeid");

    // Area validation — shared across all three subcommands
    if (!["lakeville", "sixhousent"].includes(area)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Invalid Area",
        description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🏠 Buy Home
    // ===============================
    if (subcommand === "buy") {
      const prices =
        area === "lakeville"
          ? await loadLakevillePrices()
          : await loadSixhousentPrices();

      const price = prices[homeId];

      if (price === undefined) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Home ID",
          description: `> ${ARROW} Home ID **${homeId}** does not exist.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (price === null) {
        const { embed, files } = foxbankembedTemplate({
          title: "Bank Property",
          description: `> ${ARROW} Home **${homeId}** is **BANK PROPERTY** and cannot be purchased.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const userRecord = await getUserRecord(interaction.user.id);

      if (!userRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "Fox Bank Required",
          description:
            `> ${ARROW} You must have a **Fox Bank account** to buy a home.\n` +
            `> ${ARROW} Use **/fox-accountcreate** to open one.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (typeof userRecord.foxBank.balance !== "number") {
        userRecord.foxBank.balance = 0;
      }

      if (!userRecord.homes) {
        userRecord.homes = { lakeville: [], sixhousent: [] };
      }
      if (!Array.isArray(userRecord.homes[area])) {
        userRecord.homes[area] = [];
      }

      // Check if home is already owned by ANY user
      const allUsers = await getAllUserRecords();
      for (const u of allUsers) {
        const homes = u.homes?.[area] || [];
        if (homes.some((h) => h.homeId === homeId)) {
          const { embed, files } = foxbankembedTemplate({
            title: "Home Already Owned",
            description: `> ${ARROW} Home **${homeId}** is already owned.`,
          });
          return interaction.editReply({ embeds: [embed], files });
        }
      }

      // Apply membership discount
      const membership =
        userRecord.foxBank.membership?.toLowerCase() || "benefits";
      const discountPercent = getHomeDiscountPercent(membership);
      const discountAmount = Math.floor(price * discountPercent);
      const finalPrice = price - discountAmount;

      if (userRecord.foxBank.balance < finalPrice) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Funds",
          description:
            `> ${ARROW} You need **$${finalPrice.toLocaleString()}** to buy this home.\n` +
            `> ${ARROW} Your Fox Bank balance: **$${userRecord.foxBank.balance.toLocaleString()}**`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      userRecord.foxBank.balance -= finalPrice;
      userRecord.homes[area].push({ homeId, price });

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Home Purchased",
        description:
          `> ${ARROW} **Home:** ${area} #${homeId}\n` +
          `> ${ARROW} **Original Price:** $${price.toLocaleString()}\n` +
          `> ${ARROW} **Discount:** $${discountAmount.toLocaleString()}\n` +
          `> ${ARROW} **Final Price Paid:** $${finalPrice.toLocaleString()}\n\n` +
          `> ${ARROW} **New Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 💰 Sell Home
    // ===============================
    if (subcommand === "sell") {
      const userRecord = await getUserRecord(interaction.user.id);

      if (!userRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "Fox Bank Required",
          description: `> ${ARROW} You must have a **Fox Bank account** to sell your home.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (!userRecord.homes) {
        userRecord.homes = { lakeville: [], sixhousent: [] };
      }
      if (!Array.isArray(userRecord.homes[area])) {
        userRecord.homes[area] = [];
      }

      const homes = userRecord.homes[area];
      const index = homes.findIndex((h) => h.homeId === homeId);

      if (index === -1) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Not Found",
          description: `> ${ARROW} You do not own **Home #${homeId}** in **${area}**.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const home = homes[index];

      const price = typeof home.price === "number" ? home.price : 0;
      const refund = Math.floor(price * 0.75);

      if (typeof userRecord.foxBank.balance !== "number") {
        userRecord.foxBank.balance = 0;
      }

      userRecord.foxBank.balance += refund;
      homes.splice(index, 1);

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Home Sold",
        description:
          `> ${ARROW} **Area:** ${area}\n` +
          `> ${ARROW} **Home ID:** ${homeId}\n` +
          `> ${ARROW} **Refund:** $${refund.toLocaleString()}\n` +
          `> ${ARROW} **New Balance:** $${userRecord.foxBank.balance.toLocaleString()}`,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🔁 Transfer Home
    // ===============================
    if (subcommand === "transfer") {
      const target = interaction.options.getUser("user");

      const senderRecord = await getUserRecord(interaction.user.id);
      const receiverRecord = await getUserRecord(target.id);

      if (!senderRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "Fox Bank Required",
          description: `> ${ARROW} You must have a Fox Bank account to transfer a home.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (!receiverRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "Recipient Lacks Fox Bank",
          description: `> ${ARROW} The recipient must have a Fox Bank account.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (!senderRecord.homes) {
        senderRecord.homes = { lakeville: [], sixhousent: [] };
      }
      if (!receiverRecord.homes) {
        receiverRecord.homes = { lakeville: [], sixhousent: [] };
      }

      if (!Array.isArray(senderRecord.homes[area])) {
        senderRecord.homes[area] = [];
      }
      if (!Array.isArray(receiverRecord.homes[area])) {
        receiverRecord.homes[area] = [];
      }

      const senderHomes = senderRecord.homes[area];
      const index = senderHomes.findIndex((h) => h.homeId === homeId);

      if (index === -1) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Not Found",
          description: `> ${ARROW} You do not own **Home #${homeId}** in **${area}**.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const home = senderHomes[index];

      senderHomes.splice(index, 1);
      receiverRecord.homes[area].push(home);

      await updateUserRecord(senderRecord);
      await updateUserRecord(receiverRecord);

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

      const { embed, files } = foxbankembedTemplate({
        title: "Home Transferred",
        description:
          `> ${ARROW} **Home transferred to:** ${target.tag}\n` +
          `> ${ARROW} **Home:** ${area} #${home.homeId}\n` +
          `> ${ARROW} Transfer successful.`,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};
