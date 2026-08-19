const { SlashCommandBuilder } = require("discord.js");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("startup")
    .setDescription("Send the startup session embed")
    .addIntegerOption((option) =>
      option
        .setName("reactions")
        .setDescription("Number of reactions needed")
        .setRequired(true),
    ),

  async execute(interaction) {
    // Prevent logging duplication in index.js
    interaction.noLog = true;

    // Prevent duplicate execution
    if (interaction.replied || interaction.deferred) return;

    // Rate limit protection
    if (!protect.applyRateLimit(interaction.user.id)) {
      if (!interaction.deferred && !interaction.replied) {
        await interaction.reply({ content: "Slow down.", flags: 64 });
      }
      return;
    }

    // Staff-only
    const staffRoleId = "1350897509752373341";
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    const reactionsNeeded = interaction.options.getInteger("reactions");
    const host = interaction.user;

    await interaction.deferReply({ flags: 64 });

    const { embed, files } = embedTemplate({
      title:
        "<a:gvcsunspin:1527220557890850846> Greenville Community - *__Session Startup__* <a:gvcsunspin:1527220557890850846>",
      description:
        `> <:arrowright:1534182706836144158> ${host} is hosting a session.\n\n` +
        `**Startup Information**\n` +
        `> <:arrowright:1534182706836144158> If the reaction requirement is not met within 20 minutes, the session will be cancelled.\n` +
        `> <:arrowright:1534182706836144158> Required reactions: **${reactionsNeeded}**`,
      banner: path.join(__dirname, "../../graphics/gvcstartup.png"),
    });

    // Send startup embed
    const sent = await interaction.channel.send({
      content: "@everyone",
      embeds: [embed],
      files,
      allowedMentions: { parse: ["everyone"] },
    });

    // Safe reaction wrapper
    if (!sent || !sent.id) {
      console.error("⚠️ Cannot react: message not found.");
    } else {
      try {
        await sent.react("<:summeryes:1536265772379148298>");
      } catch (err) {
        console.error("⚠️ Failed to add reaction:", err.message);
      }
    }

    await interaction.editReply({
      content: "Startup embed sent successfully.",
    });
  },
};
