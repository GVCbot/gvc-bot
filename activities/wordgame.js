const words = ["apple", "chair", "light", "sound", "water", "plant"];

module.exports = (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.content.toLowerCase() === "start wordgame") {
      const target = words[Math.floor(Math.random() * words.length)];
      let attempts = 0;

      await msg.channel.send(
        "🎮 **Word Game Started!**\nGuess the 5‑letter word.\nYou have **6 attempts**.",
      );

      const collector = msg.channel.createMessageCollector({
        filter: (m) => !m.author.bot && m.author.id === msg.author.id,
        time: 60000,
      });

      collector.on("collect", (m) => {
        const guess = m.content.toLowerCase();

        if (guess.length !== 5) {
          return m.reply("❗ Your guess must be **exactly 5 letters**.");
        }

        attempts++;

        let result = "";
        for (let i = 0; i < 5; i++) {
          if (guess[i] === target[i]) result += "🟩";
          else if (target.includes(guess[i])) result += "🟨";
          else result += "⬛";
        }

        m.reply(`Attempt ${attempts}/6:\n${result}`);

        if (guess === target) {
          msg.channel.send(
            `🎉 **Correct!** The word was **${target}**.\nYou solved it in **${attempts} attempts**!`,
          );
          collector.stop("won");
        } else if (attempts >= 6) {
          msg.channel.send(
            `❌ **Out of tries!**\nThe word was **${target}**.\nBetter luck next time!`,
          );
          collector.stop("lost");
        }
      });

      collector.on("end", (_, reason) => {
        if (reason === "time") {
          msg.channel.send(
            `⏱️ **Time's up!** You had 60 seconds.\nThe word was **${target}**.`,
          );
        }
      });
    }
  });
};
