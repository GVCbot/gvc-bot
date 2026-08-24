const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cohost")
    .setDescription("Announce that you are adding a co-host to the session"),

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

    const host = interaction.user;

    const description = `> ${ARROW} ${host} is now co-hosting the session.`;

    const { embed } = embedTemplate({
      title:
        `${STAR} Greenville Community - *__Co-host__* ${STAR}`,
      description,
    });

    await interaction.channel.send({ embeds: [embed] });
    await interaction.editReply({
      content: "Co-host announcement sent successfully.",
    });
  },
};
