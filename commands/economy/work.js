const { SlashCommandBuilder } = require("discord.js");
const {
  getUserRecord,
  updateUserRecord,
  loadWorkMessages,
} = require("../../economy/economyutils");
const embedTemplate = require("../../utils/embedTemplate");

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
    .setDescription("Work a job and earn money (6 hour cooldown)"),

  async execute(interaction) {
    const userId = interaction.user.id;
    const user = await getUserRecord(userId);

    const bypassRole = "1368142895181205636";
    const isBypass = interaction.member.roles.cache.has(bypassRole);

    const cooldown = 60 * 60 * 1000 * 6;
    const now = Date.now();

    if (!isBypass && user.lastWork && now - user.lastWork < cooldown) {
      const remaining = cooldown - (now - user.lastWork);
      const minutes = Math.ceil(remaining / 60000);

      const { embed } = embedTemplate({
        title: "⏳ Cooldown Active",
        description: `You must wait **${minutes} minutes** before working again.`,
        noLogo: true,
      });

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const workMessages = await loadWorkMessages();
    const message =
      workMessages[Math.floor(Math.random() * workMessages.length)];

    const payout = getWorkPayout();

    user.cash = (user.cash ?? 0) + payout;
    user.lastWork = now;

    await updateUserRecord(user);

    const desc =
      `> <:arrowright:1534182706836144158> ${message}\n` +
      `> <:arrowright:1534182706836144158> You earned **$${payout.toLocaleString()}**!\n\n` +
      `> <:arrowright:1534182706836144158> **New Cash Balance:** $${user.cash.toLocaleString()}`;

    const { embed } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Work Complete <a:gvcsunspin:1527220557890850846>",
      description: desc,
      noLogo: true,
    });

    embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

    return interaction.reply({ embeds: [embed] });
  },
};
