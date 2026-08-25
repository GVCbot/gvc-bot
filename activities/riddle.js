const riddles = [
  {
    q: "I speak without a mouth and hear without ears. What am I?",
    a: "echo",
  },
  {
    q: "What has to be broken before you can use it?",
    a: "egg",
  },
  {
    q: "What goes up but never comes down?",
    a: "age",
  },
  {
    q: "I’m tall when I’m young, and I’m short when I’m old. What am I?",
    a: "candle",
  },
];

module.exports = (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.content.toLowerCase() === "start riddle") {
      const riddle = riddles[Math.floor(Math.random() * riddles.length)];

      await msg.channel.send(
        `🧠 **Riddle Time!**\n${riddle.q}\nYou have **20 seconds** to answer.`,
      );

      const collector = msg.channel.createMessageCollector({
        filter: (m) => !m.author.bot && m.author.id === msg.author.id,
        time: 20000,
      });

      collector.on("collect", (m) => {
        if (m.content.toLowerCase() === riddle.a) {
          m.reply("🎉 Correct!");
          collector.stop("correct");
        } else {
          m.reply("❌ Incorrect, try again!");
        }
      });

      collector.on("end", (_, reason) => {
        if (reason !== "correct") {
          msg.channel.send(`⏱️ **Time's up!** The answer was **${riddle.a}**.`);
        }
      });
    }
  });
};
