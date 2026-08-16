const { SlashCommandBuilder } = require("discord.js");
const foxbankembedTemplate = require("../../utils/foxbankembedTemplate");
const { FOXEMOJIS } = require("../../utils/foxbankembedTemplate");
const { ARROW } = FOXEMOJIS;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox-memberships")
    .setDescription("View all Fox Bank membership cards and their benefits."),

  async execute(interaction) {
    await interaction.deferReply();

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
  },
};
