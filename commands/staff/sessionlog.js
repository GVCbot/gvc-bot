const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

function calculateDuration(start, finish) {
  const startDate = new Date(`1970-01-01 ${start}`);
  const endDate = new Date(`1970-01-01 ${finish}`);

  // If either time is invalid, return fallback
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return "Not Valid Time";
  }

  const diffMs = endDate - startDate;

  // Negative duration also counts as invalid
  if (diffMs <= 0) {
    return "Not Valid Time";
  }

  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const minutes = diffMin % 60;

  return `${hours}h ${minutes}m`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("sessionlog")
    .setDescription("Log a completed session.")
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Session type")
        .setRequired(true)
        .addChoices(
          { name: "Hosted", value: "Hosted" },
          { name: "Cancelled", value: "Cancelled" },
          { name: "Trained", value: "Trained" },
          { name: "Supervised", value: "Supervised" },
          { name: "Cohosted", value: "Cohosted" },
        ),
    )
    .addStringOption((option) =>
      option
        .setName("startingtime")
        .setDescription("Starting timestamp (e.g., 10:30 AM)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("finishingtime")
        .setDescription("Finishing timestamp (e.g., 11:45 AM)")
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName("timezone")
        .setDescription("Timezone (e.g., GST, EST, PST)")
        .setRequired(true),
    )
    .addAttachmentOption((option) =>
      option
        .setName("screenshot")
        .setDescription("Upload a screenshot")
        .setRequired(true),
    ),

  async execute(interaction) {
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    const staffRoleId = "1350897509752373341";
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const type = interaction.options.getString("type");
    const start = interaction.options.getString("startingtime");
    const finish = interaction.options.getString("finishingtime");
    const timezone = interaction.options.getString("timezone");
    const screenshot = interaction.options.getAttachment("screenshot");
    const host = interaction.user;

    const totalTime = calculateDuration(start, finish);

    const description =
      `**Session Log**\n\n` +
      `- **Username:** ${host}\n` +
      `- **Hosted/Co-Hosted:** ${type}\n` +
      `- **Starting Time:** ${start}\n` +
      `- **Ending Time:** ${finish}\n` +
      `- **Total Amount of time on-duty:** ${totalTime}\n` +
      `- **Timezone:** ${timezone}\n` +
      `- **Screenshot:** Attached below`;

    const { embed } = embedTemplate({
      title: `${STAR} Greenville Community - *__Session Log__* ${STAR}`,
      description,
    });

    embed.setImage(screenshot.url);

    const logChannel = interaction.guild.channels.cache.get(
      "1350585791021187263",
    );

    await logChannel.send({
      embeds: [embed],
    });

    await interaction.editReply({
      content: "Session log submitted successfully.",
    });
  },
};
