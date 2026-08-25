module.exports = (client) => {
  client.on("messageCreate", async (msg) => {
    if (msg.author.bot) return;

    if (
      msg.content.toLowerCase() === "coin flip" ||
      msg.content.toLowerCase() === "flip coin"
    ) {
      const result = Math.random() < 0.5 ? "🪙 **Heads!**" : "🪙 **Tails!**";
      msg.channel.send(`Flipping the coin...\n${result}`);
    }
  });
};
