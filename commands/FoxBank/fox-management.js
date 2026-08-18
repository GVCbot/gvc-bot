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

const FOX_STAFF = "1537894455779270717";

function generateCardNumber() {
  let num = "";
  for (let i = 0; i < 16; i++) num += Math.floor(Math.random() * 10);
  return num;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-management")
    .setDescription("Fox Bank Staff Only — Manage accounts, homes, and memberships.")
    .addSubcommand((sub) =>
      sub
        .setName("accountname")
        .setDescription("Change a user's Fox Bank account name.")
        .addStringOption((opt) =>
          opt
            .setName("accountid")
            .setDescription("The Fox Bank Account ID")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("newname")
            .setDescription("The new account name")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("membership")
        .setDescription("Manually change a user's Fox Bank membership.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User whose membership will be changed")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("membership")
            .setDescription("New membership level")
            .setRequired(true)
            .addChoices(
              { name: "Benefits", value: "benefits" },
              { name: "Gold", value: "gold" },
              { name: "Platinum", value: "platinum" },
              { name: "Diamond", value: "diamond" },
              { name: "Express", value: "express" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("removehome")
        .setDescription("Remove a home from a user.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User to remove home from")
            .setRequired(true),
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
            .setDescription("Home ID to remove")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("homegift")
        .setDescription("Gift a home to a user.")
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
          opt.setName("homeid").setDescription("Home ID").setRequired(true),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    // Staff check — shared across every subcommand
    if (!interaction.member.roles.cache.has(FOX_STAFF)) {
      const { embed, files } = foxbankembedTemplate({
        title: "Access Denied",
        description: `> ${ARROW} Only **Fox Bank Staff** may use this command.`,
      });
      return interaction.editReply({ embeds: [embed], files });
    }

    const subcommand = interaction.options.getSubcommand();

    // ===============================
    // 🏷️ Change Account Name
    // ===============================
    if (subcommand === "accountname") {
      const accountId = interaction.options.getString("accountid");
      const newName = interaction.options.getString("newname");

      const allUsers = await getAllUserRecords();
      let foundUser = null;

      for (const user of allUsers) {
        if (user.foxBank && user.foxBank.accountId === accountId) {
          foundUser = user;
          break;
        }
      }

      if (!foundUser) {
        const { embed, files } = foxbankembedTemplate({
          title: "Account Not Found",
          description:
            `> ${ARROW} No Fox Bank account exists with ID **${accountId}**.\n` +
            `> ${ARROW} Please check the ID and try again.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      foundUser.foxBank.accountName = newName;
      foundUser.foxBank.updatedAt = Date.now();
      await updateUserRecord(foundUser);

      const { embed, files } = foxbankembedTemplate({
        title: "Account Name Updated",
        description:
          `> ${ARROW} **Account ID:** ${accountId}\n` +
          `> ${ARROW} **New Name:** ${newName}\n\n` +
          `> ${ARROW} The account name has been successfully updated.`,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 💳 Change Membership
    // ===============================
    if (subcommand === "membership") {
      const targetUser = interaction.options.getUser("user");
      const newMembership = interaction.options.getString("membership");

      const targetRecord = await getUserRecord(targetUser.id);

      if (!targetRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "No Fox Bank Account",
          description: `${ARROW} That user does not have a Fox Bank account.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const oldMembership = targetRecord.foxBank.membership || "None";

      targetRecord.foxBank.membership =
        newMembership.charAt(0).toUpperCase() + newMembership.slice(1);
      targetRecord.foxBank.updatedAt = Date.now();

      await updateUserRecord(targetRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Membership Updated",
        description:
          `${ARROW} **User:** <@${targetUser.id}>\n` +
          `${ARROW} **Old Membership:** ${oldMembership}\n` +
          `${ARROW} **New Membership:** ${targetRecord.foxBank.membership}\n\n` +
          `${ARROW} Membership updated successfully by Fox Bank staff.`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🏚️ Remove Home
    // ===============================
    if (subcommand === "removehome") {
      const target = interaction.options.getUser("user");
      const area = interaction.options.getString("area");
      const homeId = interaction.options.getInteger("homeid");

      const userRecord = await getUserRecord(target.id);

      if (!["lakeville", "sixhousent"].includes(area)) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Area",
          description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const homes = userRecord.homes?.[area] || [];

      if (!Array.isArray(homes)) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Data Error",
          description: `> ${ARROW} This user's home data is corrupted or outdated.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const index = homes.findIndex((h) => h.homeId === homeId);

      if (index === -1) {
        const { embed, files } = foxbankembedTemplate({
          title: "Home Not Found",
          description: `> ${ARROW} This user does **not** own Home #${homeId} in **${area}**.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const removedHome = homes[index];
      homes.splice(index, 1);

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Home Removed",
        description:
          `> ${ARROW} **Removed Home:** ${area} #${homeId}\n` +
          `> ${ARROW} **Value:** $${removedHome.price.toLocaleString()}\n` +
          `> ${ARROW} **User:** ${target.tag}\n\n` +
          `> ${ARROW} The home has been successfully removed.`,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🎁 Gift Home
    // ===============================
    if (subcommand === "homegift") {
      const target = interaction.options.getUser("user");
      const area = interaction.options.getString("area");
      const homeId = interaction.options.getInteger("homeid");

      const userRecord = await getUserRecord(target.id);
      const allUsers = await getAllUserRecords();

      const lakeville = await loadLakevillePrices();
      const sixhousent = await loadSixhousentPrices();

      const priceTable =
        area === "lakeville"
          ? lakeville
          : area === "sixhousent"
            ? sixhousent
            : null;

      if (!priceTable) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Area",
          description: `> ${ARROW} Area must be **lakeville** or **sixhousent**.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const price = priceTable[homeId];

      if (area === "lakeville" && homeId === 1) {
        const { embed, files } = foxbankembedTemplate({
          title: "Bank Property",
          description: `> ${ARROW} Lakeville Home 1 is **BANK PROPERTY** and cannot be gifted.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      if (price === undefined) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Home ID",
          description: `> ${ARROW} Home ID ${homeId} does not exist.`,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      // Check if home is already owned
      for (const u of allUsers) {
        const homes = u.homes?.[area] || [];
        if (homes.some((h) => h.homeId === homeId)) {
          const { embed, files } = foxbankembedTemplate({
            title: "Home Already Owned",
            description: `> ${ARROW} Home ${homeId} is already owned.`,
          });
          return interaction.editReply({ embeds: [embed], files });
        }
      }

      // Auto-create Fox Bank account if missing (Membership system)
      if (!userRecord.foxBank) {
        userRecord.foxBank = {
          accountName: `Fox Account #${Math.floor(Math.random() * 1000)}`,
          membership: "Benefits",
          balance: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          cardStatus: "Active",
          accountId: `FB-${target.id}`,
          cardNumber: generateCardNumber(),
          lastDeposit: null,
          lastWithdrawal: null,
          cardReplacements: [],
        };
      }

      // Ensure homes structure exists
      if (!userRecord.homes) {
        userRecord.homes = {
          lakeville: [],
          sixhousent: [],
        };
      }

      if (!Array.isArray(userRecord.homes[area])) {
        userRecord.homes[area] = [];
      }

      userRecord.homes[area].push({ homeId, price });
      await updateUserRecord(userRecord);

      // DM the recipient
      try {
        const { embed, files } = foxbankembedTemplate({
          title: "You Received a Home!",
          description:
            `> ${ARROW} **A Fox Bank staff member has gifted you a home.**\n\n` +
            `> ${ARROW} **Home:** ${area} #${homeId}\n` +
            `> ${ARROW} **Value:** $${price.toLocaleString()}\n\n` +
            `> ${ARROW} View your home using **/fox-viewaccount**.`,
        });
        await target.send({ embeds: [embed], files });
      } catch {}

      // Staff confirmation
      const { embed, files } = foxbankembedTemplate({
        title: "Home Gifted",
        description:
          `> ${ARROW} **Home:** ${area} #${homeId}\n` +
          `> ${ARROW} **Recipient:** ${target.tag}\n` +
          `> ${ARROW} Successfully gifted.\n\n` +
          `> ${ARROW} The user has been notified via DM (if enabled).`,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};