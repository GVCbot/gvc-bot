module.exports = (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (msg.content.toLowerCase() === "reaction test") {
      const waitTime = Math.floor(Math.random() * 5000) + 2000; // 2–7 seconds

      await msg.channel.send("⚡ Get ready...");

      setTimeout(async () => {
        const start = Date.now();
        const prompt = await msg.channel.send("NOW!");

        const collector = msg.channel.createMessageCollector({
          filter: (m) => !m.author.bot && m.author.id === msg.author.id,
          time: 10000,
        });

        collector.on("collect", (m) => {
          const reactionTime = Date.now() - start;
          m.reply(`⚡ **Your reaction time:** ${reactionTime}ms`);
          collector.stop("done");
        });

        collector.on("end", (_, reason) => {
          if (reason !== "done") {
            msg.channel.send(
              "🐌 **Too slow!** You didn’t react within 10 seconds.",
            );
          }
        });
      }, waitTime);
    }
  });
};
