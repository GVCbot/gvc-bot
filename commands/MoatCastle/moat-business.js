const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
  findBusinessOwnerRecord,
  generateBusinessRequestId,
} = require("../../economy/economyutils");
const moatembedTemplate = require("../../utils/moatembedTemplate");

const MOAT_STAFF_ROLE = "1537722114176581724";
const BUSINESS_OWNER_ROLE = "1470101925662953704";
const BUSINESS_REQUEST_CHANNEL = "1538507930502963251";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-business")
    .setDescription("Manage your Moat Castle businesses.")

    // CREATE
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Request to open a new Moat Castle business.")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Business name").setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("description")
            .setDescription("Business description")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("type")
            .setDescription("Business type")
            .setRequired(true)
            .addChoices(
              { name: "Custom", value: "custom" },
              { name: "Auctioned", value: "auctioned" },
            ),
        ),
    )

    // VIEW
    .addSubcommand((sub) =>
      sub
        .setName("view")
        .setDescription(
          "View your Moat Castle businesses or look one up by ID.",
        )
        .addStringOption((opt) =>
          opt
            .setName("business_id")
            .setDescription("Business ID")
            .setRequired(false),
        ),
    )

    // DELETE
    .addSubcommand((sub) =>
      sub
        .setName("delete")
        .setDescription("Delete one of your Moat Castle businesses.")
        .addStringOption((opt) =>
          opt
            .setName("business_id")
            .setDescription("Business ID")
            .setRequired(true),
        ),
    )

    // PAY BUSINESS
    .addSubcommand((sub) =>
      sub
        .setName("pay")
        .setDescription("Pay a Moat Castle business from your balance.")
        .addStringOption((opt) =>
          opt
            .setName("business_id")
            .setDescription("Business ID")
            .setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("amount")
            .setDescription("Amount to pay")
            .setRequired(true)
            .setMinValue(1),
        ),
    )

    // RENAME BUSINESS
    .addSubcommand((sub) =>
      sub
        .setName("rename")
        .setDescription("Rename one of your Moat Castle businesses.")
        .addStringOption((opt) =>
          opt
            .setName("business_id")
            .setDescription("Business ID")
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("new_name")
            .setDescription("New business name")
            .setRequired(true)
            .setMaxLength(50),
        ),
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;
    const record = await getUserRecord(userId);

    if (!record.moatCastle) {
      return interaction.editReply({
        content: "❌ You need a Moat Castle account first.",
      });
    }

    record.moatCastle.businesses = record.moatCastle.businesses || [];
    record.moatCastle.businessRequests =
      record.moatCastle.businessRequests || [];

    // ===============================
    // 🏢 CREATE BUSINESS
    // ===============================
    if (sub === "create") {
      const name = interaction.options.getString("name");
      const description = interaction.options.getString("description");
      const type = interaction.options.getString("type");

      if (
        record.moatCastle.businesses.some(
          (b) => b.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        return interaction.editReply({
          content: "❌ You already own a business with that name.",
        });
      }

      // ⭐ Improved limit message
      if (record.moatCastle.businesses.length >= 3) {
        return interaction.editReply({
          content:
            "❌ You cannot create another business — you already own the maximum of **3 businesses**.",
        });
      }

      if (record.moatCastle.businessRequests.length > 0) {
        return interaction.editReply({
          content: "❌ You already have a pending business request.",
        });
      }

      const requestId = generateBusinessRequestId();
      const request = {
        id: requestId,
        name,
        description,
        type,
        requestedAt: Date.now(),
      };

      record.moatCastle.businessRequests.push(request);
      await updateUserRecord(record);

      const { embed, files } = moatembedTemplate({
        title: "🏢 New Business Request",
        description:
          `> Requester: <@${userId}>\n` +
          `> Business Name: **${name}**\n` +
          `> Type: **${type}**\n` +
          `> Description: ${description}\n\n` +
          `> Moat staff, please accept or deny this request below.`,
        noLogo: false,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`moat_business_accept_${userId}_${requestId}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`moat_business_deny_${userId}_${requestId}`)
          .setLabel("Deny")
          .setStyle(ButtonStyle.Danger),
      );

      const channel = await interaction.client.channels.fetch(
        BUSINESS_REQUEST_CHANNEL,
      );
      await channel.send({
        content: `<@&${MOAT_STAFF_ROLE}>`,
        embeds: [embed],
        components: [row],
        files,
      });

      return interaction.editReply({
        content: "✅ Business request submitted.",
      });
    }

    // ===============================
    // 🔍 VIEW BUSINESS
    // ===============================
    if (sub === "view") {
      const businessId = interaction.options.getString("business_id");

      if (businessId) {
        const ownerDoc = await findBusinessOwnerRecord(businessId);
        if (!ownerDoc)
          return interaction.editReply({
            content: "❌ No business found with that ID.",
          });

        const business = ownerDoc.moatCastle.businesses.find(
          (b) => b.id === businessId,
        );

        const { embed, files } = moatembedTemplate({
          title: "🏢 Business Overview",
          description:
            `> Owner: <@${ownerDoc.userId}>\n` +
            `> Name: **${business.name}**\n` +
            `> Description: ${business.description}\n` +
            `> ID: **${business.id}**\n` +
            `> Balance: $${ownerDoc.moatCastle.balance.toLocaleString()}\n` +
            `> Daily Income: $${(business.income || 0).toLocaleString()}\n` +
            `> Created: <t:${Math.floor(business.createdAt / 1000)}:D>`,
          noLogo: false,
        });

        return interaction.editReply({ embeds: [embed], files });
      }

      if (record.moatCastle.businesses.length === 0) {
        return interaction.editReply({
          content: "❌ You don't own any businesses.",
        });
      }

      let desc = record.moatCastle.businesses
        .map(
          (b) =>
            `> • **${b.name}** (${b.type}) — ID: ${b.id}\n` +
            `> ${b.description}\n` +
            `> Daily Income: $${(b.income || 0).toLocaleString()}\n` +
            `> Created: <t:${Math.floor(b.createdAt / 1000)}:D>\n`,
        )
        .join("\n");

      const { embed, files } = moatembedTemplate({
        title: "🏢 Your Businesses",
        description: desc,
        noLogo: false,
      });

      return interaction.editReply({ embeds: [embed], files });
    }

    // ===============================
    // 🗑️ DELETE BUSINESS
    // ===============================
    if (sub === "delete") {
      const businessId = interaction.options.getString("business_id");

      const business = record.moatCastle.businesses.find(
        (b) => b.id === businessId,
      );
      if (!business)
        return interaction.editReply({
          content: "❌ You do not own a business with that ID.",
        });

      record.moatCastle.businesses = record.moatCastle.businesses.filter(
        (b) => b.id !== businessId,
      );
      record.moatCastle.businessRequests =
        record.moatCastle.businessRequests.filter((r) => r.id !== businessId);

      await updateUserRecord(record);

      if (record.moatCastle.businesses.length === 0) {
        try {
          const member = await interaction.guild.members.fetch(userId);
          await member.roles.remove(BUSINESS_OWNER_ROLE);
        } catch {}
      }

      return interaction.editReply({
        content: `✅ Deleted business **${business.name}**.`,
      });
    }

    // ===============================
    // 💸 PAY BUSINESS
    // ===============================
    if (sub === "pay") {
      const businessId = interaction.options.getString("business_id");
      const amount = interaction.options.getInteger("amount");

      const payerRecord = record;

      if (payerRecord.moatCastle.balance < amount) {
        return interaction.editReply({
          content: "❌ Insufficient Moat Castle balance.",
        });
      }

      const ownerDoc = await findBusinessOwnerRecord(businessId);
      if (!ownerDoc)
        return interaction.editReply({
          content: "❌ No business found with that ID.",
        });

      if (ownerDoc.userId === userId) {
        return interaction.editReply({
          content: "❌ You cannot pay your own business.",
        });
      }

      const business = ownerDoc.moatCastle.businesses.find(
        (b) => b.id === businessId,
      );

      payerRecord.moatCastle.balance -= amount;
      ownerDoc.moatCastle.balance += amount;

      await updateUserRecord(payerRecord);
      await updateUserRecord(ownerDoc);

      try {
        const ownerUser = await interaction.client.users.fetch(ownerDoc.userId);
        const { embed } = moatembedTemplate({
          title: "🏢 Business Payment Received",
          description: `> ${interaction.user} paid your business **${business.name}** $${amount.toLocaleString()}.`,
          noLogo: false,
        });
        await ownerUser.send({ embeds: [embed] });
      } catch {}

      return interaction.editReply({
        content: `✅ Paid $${amount.toLocaleString()} to **${business.name}**.`,
      });
    }

    // ===============================
    // ✏️ RENAME BUSINESS
    // ===============================
    if (sub === "rename") {
      const businessId = interaction.options.getString("business_id");
      const newName = interaction.options.getString("new_name");

      const business = record.moatCastle.businesses.find(
        (b) => b.id === businessId,
      );
      if (!business)
        return interaction.editReply({
          content: "❌ You do not own a business with that ID.",
        });

      if (
        record.moatCastle.businesses.some(
          (b) => b.name.toLowerCase() === newName.toLowerCase(),
        )
      ) {
        return interaction.editReply({
          content: "❌ You already have a business with that name.",
        });
      }

      const oldName = business.name;
      business.name = newName;

      await updateUserRecord(record);

      return interaction.editReply({
        content: `✅ Renamed **${oldName}** to **${newName}**.`,
      });
    }
  },
};
