const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reinvitesover")
    .setDescription("End the reinvites phase and announce completion"),

  async execute(interaction) {
    // Anti-spam
    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    // Staff-only
    const staffRoleId = "1350897509752373341";
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({
        content: "You do not have permission to use this command.",
        flags: 64,
      });
    }

    await interaction.deferReply({ flags: 64 });

    const messages = await interaction.channel.messages.fetch({ limit: 50 });

    const reinvitesMessage = messages.find((m) =>
      m.embeds[0]?.title?.includes("Reinvites"),
    );

    if (reinvitesMessage) {
      await reinvitesMessage.delete().catch(() => {});
    }

    const description = `> ${ARROW} Reinvites are now over. Please wait patiently for the next round.`;

    const { embed } = embedTemplate({
      title:
        `${STAR} Greenville Community - *__Reinvites Over__* ${STAR}`,
      description,
    });

    await interaction.channel.send({ embeds: [embed] });

    await interaction.editReply({
      content: "Reinvites over announcement sent successfully.",
    });
  },
};
