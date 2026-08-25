module.exports = (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.content.toLowerCase() === "guess number") {
      const target = Math.floor(Math.random() * 100000) + 1;
      let attempts = 0;

      await msg.channel.send(
        "🔢 **Guess the Number!**\nI'm thinking of a number between **1 and 100000**.\nYou have **15 attempts**.",
      );

      const collector = msg.channel.createMessageCollector({
        filter: (m) => !m.author.bot && m.author.id === msg.author.id,
        time: 60000,
      });

      collector.on("collect", (m) => {
        const guess = parseInt(m.content);
        if (isNaN(guess)) return m.reply("❗ Please enter a valid number.");

        attempts++;

        if (guess === target) {
          m.reply(
            `🎉 Correct! The number was **${target}**.\nAttempts: ${attempts}`,
          );
          collector.stop("won");
        } else if (guess < target) {
          m.reply("📉 Higher!");
        } else {
          m.reply("📈 Lower!");
        }

        if (attempts >= 15) {
          msg.channel.send(
            `❌ **Out of attempts!** The number was **${target}**.`,
          );
          collector.stop("lost");
        }
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
          msg.channel.send(`⏱️ **Time's up!** The number was **${target}**.`);
        }
      });
    }
  });
};
