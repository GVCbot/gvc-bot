const words = ["apple", "chair", "light", "sound", "water", "plant"];

module.exports = (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.content.toLowerCase() === "start wordgame") {
      const target = words[Math.floor(Math.random() * words.length)];
      let attempts = 0;

      await msg.channel.send(
        "🎮 **Word Game Started!** Guess the 5‑letter word.",
      );

      const collector = msg.channel.createMessageCollector({
        filter: (m) => !m.author.bot,
        time: 60000,
      });

      collector.on("collect", (m) => {
        const guess = m.content.toLowerCase();
        if (guess.length !== 5) return;

        attempts++;

        let result = "";
        for (let i = 0; i < 5; i++) {
          if (guess[i] === target[i]) result += "🟩";
          else if (target.includes(guess[i])) result += "🟨";
          else result += "⬛";
        }

        m.reply(result);

        if (guess === target) {
          msg.channel.send(`🎉 Correct! The word was **${target}**.`);
          collector.stop();
        } else if (attempts >= 6) {
          msg.channel.send(`❌ Out of tries! The word was **${target}**.`);
          collector.stop();
        }
      });
    }
  });
};
