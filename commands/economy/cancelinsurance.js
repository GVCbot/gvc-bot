const { SlashCommandBuilder } = require("discord.js");
const embedTemplate = require("../../utils/embedTemplate");
const {
  getUserRecord,
  updateUserRecord,
} = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

const BASIC_ROLE = "1537049129803448391";
const ALL_ROLE = "1537048719805911060";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cancelinsurance")
    .setDescription("Cancel your active insurance plan."),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    const userRecord = await getUserRecord(interaction.user.id);

    // Ensure store object exists
    if (!userRecord.store) {
      userRecord.store = {
        basicInsured: { active: false, nextPayment: 0 },
        allInsured: { active: false, nextPayment: 0 },
      };
    }

    const hasBasic = userRecord.store.basicInsured.active;
    const hasAll = userRecord.store.allInsured.active;

    if (!hasBasic && !hasAll) {
      const { embed } = embedTemplate({
        title: "❌ No Active Insurance",
        description: "> You do not have any active insurance plans.",
        noLogo: true,
      });
      return interaction.editReply({ embeds: [embed] });
    }

    // Cancel Basic
    if (hasBasic) {
      userRecord.store.basicInsured.active = false;
      userRecord.store.basicInsured.nextPayment = 0;
      await interaction.member.roles.remove(BASIC_ROLE).catch(() => {});
    }

    // Cancel All
    if (hasAll) {
      userRecord.store.allInsured.active = false;
      userRecord.store.allInsured.nextPayment = 0;
      await interaction.member.roles.remove(ALL_ROLE).catch(() => {});
    }

    await updateUserRecord(userRecord);

    const { embed } = embedTemplate({
      title: `${SUN} Insurance Cancelled ${SUN}`,
      description:
        hasBasic && hasAll
          ? `> ${ARROW} Both **Fox Basic Insured** and **Fox All Insured** have been cancelled.`
          : hasBasic
            ? `> ${ARROW} **Fox Basic Insured** has been cancelled.`
            : `> ${ARROW} **Fox All Insured** has been cancelled.`,
      noLogo: true,
    });

    return interaction.editReply({ embeds: [embed] });
  },
};
