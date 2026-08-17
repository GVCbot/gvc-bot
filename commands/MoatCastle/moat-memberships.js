const { SlashCommandBuilder } = require("discord.js");
const moatembedTemplate = require("../../utils/moatembedTemplate");
const { MOATEMOJIS } = moatembedTemplate;
const { ARROW, MOATCASTLE } = MOATEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("moat-memberships")
    .setDescription("View all Moat Castle memberships and their benefits."),

  async execute(interaction) {
    await interaction.deferReply();

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
            typeof m.cost === "number" ? "$" + m.cost.toLocaleString() : m.cost
          }\n`,
      )
      .join("\n\n");

    const { embed, files } = moatembedTemplate({
      title: "Moat Castle Memberships",
      description,
      noLogo: false,
    });

    return interaction.editReply({ embeds: [embed], files });
  },
};