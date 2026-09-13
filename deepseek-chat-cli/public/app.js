const messagesEl = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const settingsBtn = document.getElementById("settingsBtn");
const settingsModal = document.getElementById("settingsModal");
const apiKeyInput = document.getElementById("apiKeyInput");
const modelInput = document.getElementById("modelInput");
const saveSettingsBtn = document.getElementById("saveSettingsBtn");
const closeSettingsBtn = document.getElementById("closeSettingsBtn");
const newChatBtn = document.getElementById("newChatBtn");
const modelNameEl = document.getElementById("modelName");

let history = [{ role: "system", content: "You are a helpful assistant." }];

function addMessage(role, text, meta) {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  if (meta) {
    const metaSpan = document.createElement("span");
    metaSpan.className = "meta";
    metaSpan.textContent = meta;
    div.appendChild(metaSpan);
  }
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

async function loadSettings() {
  const res = await fetch("/api/settings");
  const data = await res.json();
  modelNameEl.textContent = data.model;
  modelInput.value = data.model;
  if (!data.hasKey) openSettings();
}

function openSettings() {
  settingsModal.classList.remove("hidden");
}
function closeSettings() {
  settingsModal.classList.add("hidden");
}

settingsBtn.addEventListener("click", openSettings);
closeSettingsBtn.addEventListener("click", closeSettings);

saveSettingsBtn.addEventListener("click", async () => {
  const body = { model: modelInput.value.trim() || "deepseek-flash" };
  if (apiKeyInput.value.trim()) body.apiKey = apiKeyInput.value.trim();
  await fetch("/api/settings", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  apiKeyInput.value = "";
  modelNameEl.textContent = body.model;
  closeSettings();
});

newChatBtn.addEventListener("click", () => {
  history = [{ role: "system", content: "You are a helpful assistant." }];
  messagesEl.innerHTML = "";
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = "";

  addMessage("user", text);
  history.push({ role: "user", content: text });

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");

    history.push({ role: "assistant", content: data.reply });
    addMessage("assistant", data.reply, data.model);
  } catch (err) {
    addMessage("error", err.message);
  }
});

loadSettings();
