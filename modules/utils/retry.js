import { chatContainer, addMessage } from "../chat.js";
import { showErrorPopup } from "../errorHandler.js";

export function handleRetry(retryButton) {
  // 1. Find the bot message associated with this retry button
  const actionsRow = retryButton.closest(".msg-actions");
  const botMessage = actionsRow.previousElementSibling; // .message.bot-message

  if (!botMessage) return;

  // 2. Find the previous user message
  let prevNode = botMessage.previousElementSibling;
  let userMessage = null;

  while (prevNode) {
    if (prevNode.classList.contains("user-message")) {
      userMessage = prevNode;
      break;
    }
    prevNode = prevNode.previousElementSibling;
  }

  if (!userMessage) return;

  // 3. Extract plain text from the user message
  const userText = userMessage.innerText.trim();

  // 4. Show "Regenerating..." placeholder
  const processingMsg = document.createElement("div");
  processingMsg.classList.add("gradient-text");
  processingMsg.textContent = "Regenerating...";
  chatContainer.appendChild(processingMsg);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  // 5. Send request to your API
  fetch("https://chad-server.onrender.com/api/v1/ai/message", {
    //   fetch("http://localhost:3001/api/v1/ai/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: userText, screenshot: "" }),
  })
    .then(async (response) => {
      if (!response.ok) {
        let errorText = "";
        try {
          const data = await response.json();
          errorText = data.errorMessage || `Error ${response.status}`;
        } catch {
          errorText = "An error occurred! Try again later!";
        }
        showErrorPopup(errorText);
        throw new Error(errorText);
      }
      return response.json();
    })
    .then((result) => {
      processingMsg.remove();
      addMessage(result.reply || "No reply from server.", "bot");
    })
    .catch(() => {
      processingMsg.remove();
    });
}
