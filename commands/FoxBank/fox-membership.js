const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = foxbankembedTemplate;
const { ARROW } = FOXEMOJIS;

// Temporary Express Membership codes (memory only)
const activeExpressCodes = new Map(); // userId → { code, expires }

// Membership cost table
const MEMBERSHIP_COSTS = {
  benefits: 500,
  gold: 1200,
  platinum: 2000,
  diamond: 4500,
  express: 6000, // invite-only
};

// Membership order (lowest → highest)
const MEMBERSHIP_ORDER = ["benefits", "gold", "platinum", "diamond", "express"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-membership")
    .setDescription("Fox Bank membership tools.")

    // VIEW MEMBERSHIPS
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription(
          "View all Fox Bank membership cards and their benefits.",
        ),
    )

    // UPGRADE MEMBERSHIP
    .addSubcommand((sub) =>
      sub
        .setName("upgrade")
        .setDescription("Upgrade your Fox Bank membership card.")
        .addStringOption((opt) =>
          opt
            .setName("membership")
            .setDescription("Choose a membership to upgrade to")
            .setRequired(true)
            .addChoices(
              { name: "Gold ($1,200)", value: "gold" },
              { name: "Platinum ($2,000)", value: "platinum" },
              { name: "Diamond ($4,500)", value: "diamond" },
              { name: "Express (Invite Only)", value: "express" },
            ),
        ),
    )

    // GENERATE EXPRESS CODE (STAFF)
    .addSubcommand((sub) =>
      sub
        .setName("generatecode")
        .setDescription("[Staff] Generate a 60-second Express Membership code.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User to generate code for")
            .setRequired(true),
        ),
    )

    // SET MEMBERSHIP (STAFF)
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("[Staff] Manually set a user's membership.")
        .addUserOption((opt) =>
          opt.setName("user").setDescription("User").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("membership")
            .setDescription("Membership tier")
            .setRequired(true)
            .addChoices(
              { name: "Benefits", value: "benefits" },
              { name: "Gold", value: "gold" },
              { name: "Platinum", value: "platinum" },
              { name: "Diamond", value: "diamond" },
              { name: "Express (Invite Only)", value: "express" },
            ),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sub = interaction.options.getSubcommand();
    const foxStaffRole = "1537894455779270717";

    // ===============================
    // 📘 VIEW MEMBERSHIPS
    // ===============================
    if (sub === "view") {
      const memberships = [
        {
          name: "Fox Benefit’s Card",
          discount: "3% OFF purchases & home buying",
          perks: [
            "Card discounts on partnered services",
            "Free Fox Bank public lawyer service",
            "Exclusive offers and discounts",
          ],
          cost: 500,
        },
        {
          name: "Fox Gold Card",
          discount: "6% OFF purchases & home buying",
          perks: [
            "Higher priority in services & loans",
            "Card discounts on partnered services",
            "Free weekly gardening services",
            "Free Fox Bank public lawyer service",
          ],
          cost: 1200,
        },
        {
          name: "Fox Platinum Card",
          discount: "10% OFF purchases & home buying",
          perks: [
            "Higher priority in services & loans",
            "Card discounts on partnered services",
            "Free weekly gardening services",
            "Free Fox Bank public lawyer service",
          ],
          cost: 2000,
        },
        {
          name: "Fox Diamond Card",
          discount: "15% OFF purchases & home buying",
          perks: [
            "Higher priority in services & loans",
            "Card discounts on partnered services",
            "Free weekly gardening services",
            "Free Fox Bank private lawyer service",
            "Exclusive access to a private lounge",
          ],
          cost: 4500,
        },
        {
          name: "Fox Express Card (Invite Only)",
          discount: "20% OFF purchases & home buying",
          perks: [
            "Highest priority in services & loans",
            "Card discounts on partnered services",
            "Free weekly gardening services",
            "Free Fox Bank private lawyer service",
            "Exclusive access to a private lounge",
          ],
          cost: 6000,
        },
      ];

      const description = memberships
        .map(
          (m) =>
            `> ${ARROW} **${m.name}** — ${m.discount}\n` +
            m.perks.map((p) => `> ${ARROW} ${p}`).join("\n") +
            `\n> ${ARROW} **Monthly Cost:** $${m.cost.toLocaleString()}\n`,
        )
        .join("\n\n");

      const { embed, files } = foxbankembedTemplate({
        title: "Fox Bank Membership Cards",
        description,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // ⬆️ UPGRADE MEMBERSHIP
    // ===============================
    if (sub === "upgrade") {
      const userRecord = await getUserRecord(interaction.user.id);

      if (!userRecord.foxBank) {
        const { embed, files } = foxbankembedTemplate({
          title: "No Fox Bank Account",
          description:
            `${ARROW} You must create an account first.\n` +
            `${ARROW} Use **/fox-account create**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const currentMembership =
        userRecord.foxBank.membership?.toLowerCase() || "benefits";
      const chosenMembership = interaction.options.getString("membership");

      const currentIndex = MEMBERSHIP_ORDER.indexOf(currentMembership);
      const chosenIndex = MEMBERSHIP_ORDER.indexOf(chosenMembership);

      // EXPRESS MEMBERSHIP CHECK
      if (chosenMembership === "express") {
        const entry = activeExpressCodes.get(interaction.user.id);

        if (!entry || Date.now() > entry.expires) {
          const { embed, files } = foxbankembedTemplate({
            title: "Express Membership Requires Invite",
            description:
              `${ARROW} You must receive an **Express Membership Code** from Fox Bank staff.\n` +
              `${ARROW} Ask staff to run **/fox-membership generatecode**.`,
            noLogo: true,
          });
          return interaction.editReply({ embeds: [embed], files });
        }

        activeExpressCodes.delete(interaction.user.id);

        userRecord.foxBank.membership = "Express";
        userRecord.foxBank.updatedAt = Date.now();
        await updateUserRecord(userRecord);

        const { embed, files } = foxbankembedTemplate({
          title: "Express Membership Granted",
          description:
            `${ARROW} You have been upgraded to **Express Membership**.\n` +
            `${ARROW} Welcome to the elite tier.`,
          noLogo: false,
        });

        return interaction.editReply({ embeds: [embed], files });
      }

      // NORMAL MEMBERSHIP UPGRADE
      if (chosenIndex <= currentIndex) {
        const { embed, files } = foxbankembedTemplate({
          title: "Invalid Upgrade",
          description:
            `${ARROW} You cannot downgrade or re-select your current membership.\n` +
            `${ARROW} Current: **${userRecord.foxBank.membership}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const upgradeCost = MEMBERSHIP_COSTS[chosenMembership];

      if (userRecord.cash < upgradeCost) {
        const { embed, files } = foxbankembedTemplate({
          title: "Insufficient Funds",
          description:
            `${ARROW} **Upgrade Cost:** $${upgradeCost.toLocaleString()}\n` +
            `${ARROW} You only have **$${userRecord.cash.toLocaleString()}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      userRecord.cash -= upgradeCost;

      userRecord.foxBank.membership =
        chosenMembership.charAt(0).toUpperCase() + chosenMembership.slice(1);

      userRecord.foxBank.updatedAt = Date.now();

      await updateUserRecord(userRecord);

      const { embed, files } = foxbankembedTemplate({
        title: "Membership Upgrade Successful",
        description:
          `${ARROW} **New Membership:** ${userRecord.foxBank.membership}\n` +
          `${ARROW} **Upgrade Cost:** $${upgradeCost.toLocaleString()}\n` +
          `${ARROW} **Remaining Cash:** $${userRecord.cash.toLocaleString()}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🔐 GENERATE EXPRESS CODE (STAFF)
    // ===============================
    if (sub === "generatecode") {
      if (!interaction.member.roles.cache.has(foxStaffRole)) {
        return interaction.editReply(
          "❌ Only Fox Bank staff can generate codes.",
        );
      }

      const target = interaction.options.getUser("user");

      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expires = Date.now() + 60000; // 60 seconds

      activeExpressCodes.set(target.id, { code, expires });

      const secondsLeft = Math.floor((expires - Date.now()) / 1000);

      return interaction.editReply({
        content:
          `🔐 **Express Membership Code Generated**\n\n` +
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} **Code:** \`${code}\`\n` +
          `${ARROW} **Expires in:** ${secondsLeft} seconds\n\n` +
          `User must run: **/fox-membership upgrade membership:express**`,
        flags: 64,
      });
    }

    // ===============================
    // 🎯 SET MEMBERSHIP (STAFF)
    // ===============================
    if (sub === "set") {
      if (!interaction.member.roles.cache.has(foxStaffRole)) {
        return interaction.editReply(
          "❌ Only Fox Bank staff can set membership.",
        );
      }

      const target = interaction.options.getUser("user");
      const tier = interaction.options.getString("membership");

      const record = await getUserRecord(target.id);

      if (!record.foxBank) {
        return interaction.editReply("❌ User has no Fox Bank account.");
      }

      // Express membership requires a valid code
      if (tier === "express") {
        const entry = activeExpressCodes.get(target.id);

        if (!entry || Date.now() > entry.expires) {
          return interaction.editReply(
            "❌ Express Membership requires a valid, active Express Code.",
          );
        }

        activeExpressCodes.delete(target.id);
      }

      const old = record.foxBank.membership;

      record.foxBank.membership = tier.charAt(0).toUpperCase() + tier.slice(1);
      record.foxBank.updatedAt = Date.now();

      await updateUserRecord(record);

      return interaction.editReply(
        `✅ Membership updated.\n\n` +
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} **Old:** ${old}\n` +
          `${ARROW} **New:** ${record.foxBank.membership}`,
      );
    }
  },
};
