export const chatContainer = document.getElementById("chat");
export const messageInput = document.getElementById("message-input");
export const sendBtn = document.getElementById("send-btn");
import { formatBotMessage } from "./textParser.js";

export function addMessage(text, sender = "user") {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(
    "message",
    sender === "user" ? "user-message" : "bot-message"
  );

  if (sender === "bot") {
    text = formatBotMessage(text);
  }

  msgDiv.innerHTML = text;

  // Append message to container first
  chatContainer.appendChild(msgDiv);

  // If bot → append hr + button row
  if (sender === "bot") {
    const separator = document.createElement("hr");
    separator.classList.add("msg-separator");

    const actionRow = document.createElement("div");
    actionRow.classList.add("msg-actions");

    // Create buttons
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.classList.add("msg-btn");

    const saveBtn = document.createElement("button");
    saveBtn.textContent = "Save";
    saveBtn.classList.add("msg-btn");

    const restartBtn = document.createElement("button");
    restartBtn.textContent = "Restart";
    restartBtn.classList.add("msg-btn");

    // Button functionality:
    copyBtn.onclick = () =>
      navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ""));
    saveBtn.onclick = () => {
      const blob = new Blob([text.replace(/<[^>]*>/g, "")], {
        type: "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "message.txt";
      a.click();
      URL.revokeObjectURL(url);
    };
    restartBtn.onclick = () => location.reload();

    // Append buttons to row
    actionRow.appendChild(copyBtn);
    actionRow.appendChild(saveBtn);
    actionRow.appendChild(restartBtn);

    // Append hr + action row
    chatContainer.appendChild(separator);
    chatContainer.appendChild(actionRow);
  }

  if (sender === "user") {
    const actionRow = document.createElement("div");
    actionRow.classList.add("msg-actions-user");
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.classList.add("msg-btn-user");
    copyBtn.onclick = () =>
      navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ""));

    actionRow.appendChild(copyBtn);

    chatContainer.appendChild(actionRow);

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

export function setupInputListener() {
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendBtn.click();
  });
}
