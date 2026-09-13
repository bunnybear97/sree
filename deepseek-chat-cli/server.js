#!/usr/bin/env node
import express from "express";
import open from "open";
import OpenAI from "openai";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, "config.json");

function loadConfig() {
  if (!existsSync(configPath)) return { apiKey: "", model: "deepseek-flash" };
  return JSON.parse(readFileSync(configPath, "utf-8"));
}

function saveConfig(config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2));
}

const app = express();
const PORT = 3080;

app.use(express.json());
app.use(express.static(join(__dirname, "public")));

app.get("/api/settings", (req, res) => {
  const { apiKey, model } = loadConfig();
  res.json({ hasKey: Boolean(apiKey), model });
});

app.post("/api/settings", (req, res) => {
  const { apiKey, model } = req.body;
  const current = loadConfig();
  saveConfig({
    apiKey: apiKey ?? current.apiKey,
    model: model ?? current.model ?? "deepseek-flash",
  });
  res.json({ ok: true });
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  const { apiKey, model } = loadConfig();

  if (!apiKey) {
    return res.status(400).json({ error: "No API key set. Add one in Settings." });
  }

  try {
    const client = new OpenAI({ apiKey, baseURL: "https://api.deepseek.com" });
    const response = await client.chat.completions.create({ model, messages });
    res.json({
      reply: response.choices[0].message.content,
      model: response.model,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, async () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`DeepSeek chat UI running at ${url}`);
  try {
    await open(url);
  } catch {
    console.log("Could not auto-open a browser — open the URL above manually.");
  }
});
