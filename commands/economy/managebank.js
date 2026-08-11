const {
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");

const embedTemplate = require("../../utils/embedTemplate");
const { getUserRecord } = require("../../economy/economyutils");

const SUN = "<a:gvcsunspin:1527220557890850846>";
const ARROW = "<:arrowright:1534182706836144158>";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("managebank")
    .setDescription("Manage your bank accounts."),

  async execute(interaction) {
    console.log("🟢 /managebank command triggered by:", interaction.user.id);

    try {
      console.log("⏳ Deferring reply...");
      await interaction.deferReply({ flags: 64 });
      console.log("✅ Reply deferred successfully.");

      console.log("📂 Fetching user record...");
      const userRecord = await getUserRecord(interaction.user.id);
      console.log("✅ User record fetched:", userRecord);

      const banks = userRecord.banks ?? [];
      console.log("🏦 Banks found:", banks.length);

      if (banks.length === 0) {
        console.log("⚠️ No banks found for user.");
        const { embed } = embedTemplate({
          title: "🏦 No Banks",
          description: "> You are not in any banks.",
          noLogo: true,
        });
        console.log("📤 Sending 'No Banks' embed...");
        return interaction.editReply({ embeds: [embed] });
      }

      console.log("🧩 Building bank options...");
      const bankOptions = banks.map((b) => ({
        label: `${b.type}`,
        description: `Balance: $${b.balance.toLocaleString()}`,
        value: b.id,
      }));
      console.log("✅ Bank options built:", bankOptions);

      console.log("🧱 Creating select menu...");
      const menu = new StringSelectMenuBuilder()
        .setCustomId(`balance_bank_select_${interaction.user.id}`)
        .setPlaceholder("Select a bank to manage")
        .addOptions(bankOptions);

      const components = [new ActionRowBuilder().addComponents(menu)];
      console.log("✅ Components created.");

      console.log("🎨 Building embed...");
      const { embed } = embedTemplate({
        title: `${SUN} Manage Your Banks ${SUN}`,
        description: `> ${ARROW} Choose a bank to view or manage.`,
        noLogo: true,
      });

      embed.setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));
      console.log("✅ Embed built successfully.");

      console.log("📤 Sending final reply...");
      const reply = await interaction.editReply({
        embeds: [embed],
        components,
      });
      console.log("✅ Reply sent successfully:", reply);

      console.log("🎉 /managebank completed successfully.");
      return reply;
    } catch (error) {
      console.error("❌ ManageBank error caught:", error);

      const { embed } = embedTemplate({
        title: "⚠️ Error ⚠️",
        description: `> ${ARROW} There was an error executing this interaction.`,
      });

      if (interaction.replied || interaction.deferred) {
        console.log("📤 Sending follow-up error message...");
        await interaction.followUp({ embeds: [embed], flags: 64 });
      } else {
        console.log("📤 Sending initial error message...");
        await interaction.reply({ embeds: [embed], flags: 64 });
      }
    }
  },
};
