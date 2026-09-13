import "dotenv/config";
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import OpenAI from "openai";

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey) {
  console.error("Missing DEEPSEEK_API_KEY. Copy .env.example to .env and add your key.");
  process.exit(1);
}

const model = process.env.DEEPSEEK_MODEL || "deepseek-chat";

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.deepseek.com",
});

const history = [
  { role: "system", content: "You are a helpful assistant." },
];

const rl = readline.createInterface({ input: stdin, output: stdout });

console.log(`DeepSeek CLI chat (model: ${model}). Type "exit" to quit.\n`);

while (true) {
  const userInput = await rl.question("You: ");
  if (userInput.trim().toLowerCase() === "exit") break;

  history.push({ role: "user", content: userInput });

  try {
    const response = await client.chat.completions.create({
      model,
      messages: history,
    });
    const reply = response.choices[0].message.content;
    history.push({ role: "assistant", content: reply });
    console.log(`\nDeepSeek: ${reply}\n`);
  } catch (err) {
    console.error("Request failed:", err.message);
  }
}

rl.close();
