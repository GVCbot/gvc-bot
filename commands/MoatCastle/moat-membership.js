const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW } = MOATEMOJIS;

// Temporary Black Membership codes (memory only)
const activeBlackCodes = new Map(); // userId → { code, expires }

const MEMBERSHIP_COSTS = {
  standard: 0,
  silver: 250,
  gold: 500,
  platinum: 900,
  black: 0, // invite-only
};

const MEMBERSHIP_ORDER = ["standard", "silver", "gold", "platinum", "black"];

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-membership")
    .setDescription("Moat Castle membership tools.")
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription("View all Moat Castle memberships and their benefits."),
    )
    .addSubcommand((sub) =>
      sub
        .setName("upgrade")
        .setDescription("Upgrade your Moat Castle membership.")
        .addStringOption((opt) =>
          opt
            .setName("membership")
            .setDescription("Membership tier to upgrade to")
            .setRequired(true)
            .addChoices(
              { name: "Silver ($250)", value: "silver" },
              { name: "Gold ($500)", value: "gold" },
              { name: "Platinum ($900)", value: "platinum" },
              { name: "Black (Invite Only)", value: "black" },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("generatecode")
        .setDescription("[Staff] Generate a 60-second Black Membership code.")
        .addUserOption((opt) =>
          opt
            .setName("user")
            .setDescription("User to generate code for")
            .setRequired(true),
        ),
    )
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
              { name: "Standard", value: "standard" },
              { name: "Silver", value: "silver" },
              { name: "Gold", value: "gold" },
              { name: "Platinum", value: "platinum" },
              { name: "Black", value: "black" },
            ),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ flags: 64 });

    const sub = interaction.options.getSubcommand();
    const moatStaffRole = "1537722114176581724";

    // ===============================
    // 📘 VIEW MEMBERSHIPS
    // ===============================
    if (sub === "view") {
      const memberships = [
        {
          name: "Standard Membership",
          boost: "0% Business Income Boost",
          perks: [
            "Basic Moat Castle account",
            "Standard customer support",
            "Access to Moat Castle business system",
          ],
          cost: 0,
        },
        {
          name: "Silver Membership",
          boost: "+2% Business Income Boost",
          perks: [
            "Priority customer support",
            "Faster business approval times",
            "Small daily income boost",
          ],
          cost: 250,
        },
        {
          name: "Gold Membership",
          boost: "+4% Business Income Boost",
          perks: [
            "Higher priority customer support",
            "Faster business approval times",
            "Moderate daily income boost",
          ],
          cost: 500,
        },
        {
          name: "Platinum Membership",
          boost: "+6% Business Income Boost",
          perks: [
            "High priority customer support",
            "Fastest business approval times",
            "Large daily income boost",
          ],
          cost: 900,
        },
        {
          name: "Black Membership (Invite Only)",
          boost: "+10% Business Income Boost",
          perks: [
            "Highest priority customer support",
            "Instant business approval",
            "Massive daily income boost",
            "Exclusive Black Membership status",
          ],
          cost: "Invite Only",
        },
      ];

      const description = memberships
        .map(
          (m) =>
            `> ${ARROW} **${m.name}** — ${m.boost}\n` +
            m.perks.map((p) => `> ${ARROW} ${p}`).join("\n") +
            `\n> ${ARROW} **Monthly Cost:** ${
              typeof m.cost === "number"
                ? "$" + m.cost.toLocaleString()
                : m.cost
            }\n`,
        )
        .join("\n\n");

      const { embed, files } = moatembedTemplate({
        title: "Moat Castle Memberships",
        description,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🔐 GENERATE BLACK CODE (STAFF)
    // ===============================
    if (sub === "generatecode") {
      if (!interaction.member.roles.cache.has(moatStaffRole)) {
        return interaction.editReply(
          "❌ Only Moat Castle staff can generate codes.",
        );
      }

      const target = interaction.options.getUser("user");

      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expires = Date.now() + 60000; // 60 seconds

      activeBlackCodes.set(target.id, { code, expires });

      const secondsLeft = Math.floor((expires - Date.now()) / 1000);

      return interaction.editReply({
        content:
          `🔐 **Black Membership Code Generated**\n\n` +
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} **Code:** \`${code}\`\n` +
          `${ARROW} **Expires in:** ${secondsLeft} seconds\n\n` +
          `User must run: **/moat-membership upgrade membership:black**`,
        flags: 64,
      });
    }

    // ===============================
    // 🎯 SET MEMBERSHIP (STAFF)
    // ===============================
    if (sub === "set") {
      if (!interaction.member.roles.cache.has(moatStaffRole)) {
        return interaction.editReply(
          "❌ Only Moat Castle staff can set membership.",
        );
      }

      const target = interaction.options.getUser("user");
      const tier = interaction.options.getString("membership");

      const record = await getUserRecord(target.id);

      if (!record.moatCastle) {
        return interaction.editReply("❌ User has no Moat Castle account.");
      }

      const old = record.moatCastle.membership;

      record.moatCastle.membership =
        tier.charAt(0).toUpperCase() + tier.slice(1);
      record.moatCastle.updatedAt = Date.now();

      await updateUserRecord(record);

      return interaction.editReply(
        `✅ Membership updated.\n\n` +
          `${ARROW} **User:** ${target}\n` +
          `${ARROW} **Old:** ${old}\n` +
          `${ARROW} **New:** ${record.moatCastle.membership}`,
      );
    }

    // ===============================
    // ⬆️ UPGRADE MEMBERSHIP (USER)
    // ===============================
    if (sub === "upgrade") {
      const userRecord = await getUserRecord(interaction.user.id);

      if (!userRecord.moatCastle) {
        const { embed, files } = moatembedTemplate({
          title: "No Moat Castle Account",
          description: `${ARROW} You must create an account first.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const chosen = interaction.options.getString("membership");
      const current =
        userRecord.moatCastle.membership?.toLowerCase() || "standard";

      const currentIndex = MEMBERSHIP_ORDER.indexOf(current);
      const chosenIndex = MEMBERSHIP_ORDER.indexOf(chosen);

      // BLACK MEMBERSHIP
      if (chosen === "black") {
        const entry = activeBlackCodes.get(interaction.user.id);

        if (!entry || Date.now() > entry.expires) {
          const { embed, files } = moatembedTemplate({
            title: "Black Membership Requires Invite",
            description:
              `${ARROW} You must receive a **Black Membership Code** from Moat Castle staff.\n` +
              `${ARROW} Ask staff to run **/moat-membership generatecode**.`,
            noLogo: true,
          });
          return interaction.editReply({ embeds: [embed], files });
        }

        activeBlackCodes.delete(interaction.user.id);

        userRecord.moatCastle.membership = "Black";
        userRecord.moatCastle.updatedAt = Date.now();
        await updateUserRecord(userRecord);

        const { embed, files } = moatembedTemplate({
          title: "Black Membership Granted",
          description:
            `${ARROW} You have been upgraded to **Black Membership**.\n` +
            `${ARROW} Welcome to the elite tier.`,
          noLogo: false,
        });

        return interaction.editReply({ embeds: [embed], files });
      }

      // NORMAL MEMBERSHIP
      if (chosenIndex <= currentIndex) {
        const { embed, files } = moatembedTemplate({
          title: "Invalid Upgrade",
          description:
            `${ARROW} You cannot downgrade or re-select your current membership.\n` +
            `${ARROW} Current: **${current}**.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      const cost = MEMBERSHIP_COSTS[chosen];

      if (userRecord.cash < cost) {
        const { embed, files } = moatembedTemplate({
          title: "Insufficient Funds",
          description:
            `${ARROW} Upgrade Cost: $${cost}\n` +
            `${ARROW} You only have $${userRecord.cash}.`,
          noLogo: true,
        });
        return interaction.editReply({ embeds: [embed], files });
      }

      userRecord.cash -= cost;
      userRecord.moatCastle.membership =
        chosen.charAt(0).toUpperCase() + chosen.slice(1);
      userRecord.moatCastle.updatedAt = Date.now();

      await updateUserRecord(userRecord);

      const { embed, files } = moatembedTemplate({
        title: "Membership Upgrade Successful",
        description:
          `${ARROW} New Membership: **${userRecord.moatCastle.membership}**\n` +
          `${ARROW} Cost: $${cost}\n` +
          `${ARROW} Remaining Cash: $${userRecord.cash}`,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }
  },
};