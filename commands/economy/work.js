const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
  loadWorkMessages,
} = require("../../economy/economyutils");
const embedTemplate = require("../../utils/embedTemplate");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

// Weighted random payout function
function getWorkPayout() {
  const roll = Math.random();

  if (roll > 0.995) return 5000; // 0.5% chance
  if (roll > 0.97) return 2500; // 3% chance
  if (roll > 0.9) return 1500; // 10% chance
  if (roll > 0.7) return 800; // 20% chance

  return Math.floor(Math.random() * 400) + 100; // Common payout
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("work")
    .setDescription("Work a job and earn money (6‑hour cooldown)"),

  async execute(interaction) {
    try {
      // Immediately acknowledge to avoid timeout
      await interaction.deferReply({ flags: 64 });

      const userId = interaction.user.id;
      const user = await getUserRecord(userId);

      const bypassRole = "1368142895181205636";
      const isBypass = interaction.member.roles.cache.has(bypassRole);

      const cooldown = 6 * 60 * 60 * 1000; // 6 hours
      const now = Date.now();

      // Cooldown check
      if (!isBypass && user.lastWork && now - user.lastWork < cooldown) {
        const remaining = cooldown - (now - user.lastWork);
        const minutes = Math.ceil(remaining / 60000);

        const { embed } = embedTemplate({
          title: "⏳ Cooldown Active",
          description: `You must wait **${minutes} minutes** before working again.`,
          noLogo: true,
        });

        return interaction.editReply({ embeds: [embed] });
      }

      // Load random work message
      const workMessages = await loadWorkMessages();
      const message =
        workMessages[Math.floor(Math.random() * workMessages.length)];

      // Calculate payout
      const payout = getWorkPayout();

      user.cash = (user.cash ?? 0) + payout;
      user.lastWork = now;

      await updateUserRecord(user);

      const desc =
        `> ${ARROW} ${message}\n` +
        `> ${ARROW} You earned **$${payout.toLocaleString()}**!\n\n` +
        `> ${ARROW} **New Cash Balance:** $${user.cash.toLocaleString()}`;

      const { embed } = embedTemplate({
        title:
          "${STAR} Work Complete ${STAR}",
        description: desc,
        noLogo: true,
      });

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error("Work command error:", err);
      return interaction.editReply({
        content: "❌ Something went wrong while processing your work command.",
      });
    }
  },
};
