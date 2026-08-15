const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const ROLES = {
  fox_basic: "1537049129803448391",
  fox_all: "1537048719805911060",
  moat_basic: "1537066784279240724",
  moat_all: "1537066846786949120",
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cancelinsurance")
    .setDescription("Cancel your active insurance plan."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const userRecord = await getUserRecord(interaction.user.id);

    // Ensure store exists
    if (!userRecord.store) {
      userRecord.store = {
        fox_basic: { active: false, nextPayment: 0 },
        fox_all: { active: false, nextPayment: 0 },
        moat_basic: { active: false, nextPayment: 0 },
        moat_all: { active: false, nextPayment: 0 },
      };
    }

    // Find active plans
    const activePlans = Object.keys(userRecord.store).filter(
      (key) => userRecord.store[key]?.active,
    );

    if (activePlans.length === 0) {
      const { embed } = embedTemplate({
        title: "❌ No Active Insurance",
        description: "> You do not have any active insurance plans.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    let cancelledList = [];

    for (const key of activePlans) {
      const insurance = userRecord.store[key];

      insurance.active = false;
      insurance.nextPayment = 0;

      // Remove role if user has it
      const roleId = ROLES[key];
      if (roleId) {
        await interaction.member.roles.remove(roleId).catch(() => {});
      }

      cancelledList.push(key);
    }

    await updateUserRecord(userRecord);

    // Build readable list
    let desc = `${SUN} **Insurance Cancelled** ${SUN}\n\n`;

    for (const key of cancelledList) {
      const readable =
        key === "fox_basic"
          ? "Fox Basic Insured"
          : key === "fox_all"
            ? "Fox All Insured"
            : key === "moat_basic"
              ? "Moat Castle Basic Insured"
              : "Moat Castle All Insured";

      desc += `${ARROW} **${readable}** has been cancelled.\n`;
    }

    const { embed } = embedTemplate({
      title: `${SUN} Insurance Cancelled ${SUN}`,
      description: desc,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
