import { chatContainer, addMessage } from "../chat.js";
import { showErrorPopup } from "../errorHandler.js";
import { getSelectedModel } from "../modelSelector.js";

export function handleRetry(retryButton) {
  const actionsRow = retryButton.closest(".msg-actions");
  const botMessage = actionsRow.previousElementSibling;
  if (!botMessage) return;

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

  const userText = userMessage.innerText.trim();

  const processingMsg = document.createElement("div");
  processingMsg.classList.add("processing-msg");
  processingMsg.innerHTML = "<span></span><span></span><span></span>";
  chatContainer.appendChild(processingMsg);
  chatContainer.scrollTop = chatContainer.scrollHeight;

  chrome.storage.sync.get("accessToken", (data) => {
    const authToken = data.accessToken || "";

    fetch("http://localhost:3001/api/v2/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        text: userText,
        screenshot: "",
        chatId: "696817f8c80591bdcb7196d0",
        model: getSelectedModel(),
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          let errorText = "";
          try {
            const data = await response.json();
            errorText = data.errorMessage || `Error ${response.status}`;
          } catch {
            errorText = "An error occurred. Try again later.";
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
  });
}
