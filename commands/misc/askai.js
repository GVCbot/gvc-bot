const { SlashCommandBuilder } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const embedTemplate = require("../../utils/embedTemplate");
const protect = require("../../security/protect");
const { CohereClientV2 } = require("cohere-ai");

console.log("🔍 [askai.js] Module loading from commands/misc/askai.js");

const STAR = "<a:starspin:1541482139759935558>";
const ARROW = "<:arrowright:1541479360932876398>";

// -----------------------------------------------------
// COHERE CLIENT
// -----------------------------------------------------
let cohere = null;

if (!process.env.COHERE_API) {
  console.warn(
    "🟡 [askai.js] COHERE_API env var is missing — /askai general will not work until it's set.",
  );
} else {
  cohere = new CohereClientV2({ token: process.env.COHERE_API });
}

// -----------------------------------------------------
// LOAD SUPPORT FILES
// -----------------------------------------------------
function loadSupportData() {
  const folder = path.join(__dirname, "../../askai-data");

  if (!fs.existsSync(folder)) {
    console.warn(`🟡 [askai.js] Support data folder not found: ${folder}`);
    return "";
  }

  const files = fs.readdirSync(folder).filter((f) => f.endsWith(".txt"));

  let text = "";
  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(folder, file), "utf8");
      text += "\n" + content;
    } catch (err) {
      console.error(`🔴 [askai.js] Failed to read ${file}:`, err.message);
    }
  }
  return text;
}

// -----------------------------------------------------
// SAFETY FILTER
// -----------------------------------------------------
function isUnsafe(question) {
  const q = question.toLowerCase();

  const keywords = [
    "sex",
    "sexual",
    "nude",
    "nsfw",
    "porn",
    "explicit",
    "drug",
    "alcohol",
    "beer",
    "wine",
    "vodka",
    "whiskey",
    "vape",
    "cigarette",
    "smoke",
    "tobacco",
    "weapon",
    "gun",
    "knife",
    "bomb",
    "explosive",
    "kill",
    "hurt",
    "violence",
    "fight",
    "suicide",
    "self harm",
    "gamble",
    "casino",
    "bet",
    "extremist",
    "terror",
    "isis",
    "al qaeda",
    "kkk",
    "illegal",
    "crime",
    "steal",
    "hack",
  ];

  if (keywords.some((k) => q.includes(k))) return true;

  const unsafePatterns = [
    /how do i.*(get|buy|make|access).*(alcohol|drug|weapon)/i,
    /how to.*(vape|smoke|drink)/i,
    /how do i.*(harm|hurt|kill)/i,
    /explain.*(sexual|explicit)/i,
    /what is the best.*(gun|weapon)/i,
  ];

  return unsafePatterns.some((p) => p.test(question));
}

// -----------------------------------------------------
// SUPPORT ANSWERING (uses uploaded files only)
// -----------------------------------------------------
function generateSupportAnswer(question, data) {
  if (!data) {
    return "No server documentation is currently loaded. Please contact staff.";
  }

  const lower = question.toLowerCase();
  const lines = data.split("\n");
  const matches = lines.filter((line) => line.toLowerCase().includes(lower));

  if (matches.length === 0) {
    return "I couldn't find anything about that in the server documentation.";
  }

  return matches.slice(0, 5).join("\n");
}

// -----------------------------------------------------
// GENERAL ANSWERING (Cohere + safety)
// -----------------------------------------------------
async function generateGeneralAnswer(question) {
  if (isUnsafe(question)) {
    return (
      "I can’t answer that because it involves unsafe or age‑restricted topics. " +
      "Here’s the safe version: it's important to stay within legal and safe boundaries, " +
      "and if you're curious about something, focus on the educational or scientific side."
    );
  }

  if (!cohere) {
    return "AI general answers are currently unavailable — the API key isn't configured.";
  }

  try {
    const response = await cohere.chat({
      model: "command-a-03-2025",
      messages: [
        {
          role: "system",
          content:
            "Answer questions in a safe, teen-friendly, educational way. Keep responses concise.",
        },
        { role: "user", content: question },
      ],
    });

    const text = response.message?.content
      ?.map((block) => block.text)
      .join("")
      .trim();

    return text || "I couldn't generate a response for that.";
  } catch (err) {
    console.error("🔴 [askai.js] Cohere API error:", err.message);
    return "Something went wrong while generating a response. Please try again later.";
  }
}

// -----------------------------------------------------
// COMMAND DEFINITION
// -----------------------------------------------------
module.exports = {
  data: new SlashCommandBuilder()
    .setName("askai")
    .setDescription("AI assistant for GVC")
    .addSubcommand((sub) =>
      sub
        .setName("support")
        .setDescription("Ask AI about the Discord server")
        .addStringOption((opt) =>
          opt
            .setName("question")
            .setDescription("Your question")
            .setRequired(true),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("general")
        .setDescription("Ask AI a general question")
        .addStringOption((opt) =>
          opt
            .setName("question")
            .setDescription("Your question")
            .setRequired(true),
        ),
    ),

  async execute(interaction) {
    console.log(`🔍 [askai.js] Executed by ${interaction.user.tag}`);

    if (!protect.applyRateLimit(interaction.user.id)) {
      return interaction.reply({ content: "Slow down.", flags: 64 });
    }

    const sub = interaction.options.getSubcommand();
    const question = protect.sanitize(
      interaction.options.getString("question"),
    );

    await interaction.deferReply();

    try {
      if (sub === "support") {
        const data = loadSupportData();
        const answer = generateSupportAnswer(question, data);

        const { embed } = embedTemplate({
          title: `${STAR} AskAI Support ${STAR}`,
          description: `> ${ARROW} **Question:** ${question}\n\n> ${ARROW} **Answer:**\n${answer}`,
          noLogo: true,
        });

        return interaction.editReply({ embeds: [embed] });
      }

      if (sub === "general") {
        const answer = await generateGeneralAnswer(question);

        const { embed } = embedTemplate({
          title: `${STAR} AskAI General ${STAR}`,
          description: `> ${ARROW} **Question:** ${question}\n\n> ${ARROW} **Answer:**\n${answer}`,
          noLogo: true,
        });

        return interaction.editReply({ embeds: [embed] });
      }
    } catch (err) {
      console.error("🔴 [askai.js] Unexpected error in execute():", err);
      return interaction.editReply({
        content: "❌ Something went wrong processing your question.",
      });
    }
  },
};

console.log("🔍 [askai.js] Module loaded successfully, command name: askai");
