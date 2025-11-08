import { chatContainer, messageInput, sendBtn, addMessage } from "./chat.js";
import { hasContentToSend } from "./utils.js";
import { showErrorPopup } from "./errorHandler.js";
import { renderScreenshotPreview } from "./screenshot.js";

export function setupSendHandler() {
  console.log("Setting up send handler...");
  sendBtn.addEventListener("click", () => {
    if (sendBtn.disabled) return;

    hasContentToSend((canSend) => {
      if (!canSend) {
        sendBtn.style.opacity = 0.6;
        setTimeout(() => (sendBtn.style.opacity = 1), 300);
        return;
      }

      const text = messageInput.value.trim();
      chrome.storage.local.get("lastScreenshot", (data) => {
        let screenshot = data.lastScreenshot;
        if (screenshot?.startsWith("data:image")) {
          screenshot = screenshot.split(",")[1];
        }

        if (text) addMessage(text, "user");
        if (screenshot) {
          const imgMsg = document.createElement("div");
          imgMsg.classList.add("message", "user-message");
          const img = document.createElement("img");
          img.src = "data:image/png;base64," + screenshot;
          img.className = "chat-img";
          imgMsg.appendChild(img);
          chatContainer.appendChild(imgMsg);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        sendBtn.disabled = true;
        sendBtn.style.cursor = "not-allowed";

        const processingMsg = document.createElement("div");
        processingMsg.classList.add("gradient-text");
        processingMsg.textContent = "Processing data...";
        chatContainer.appendChild(processingMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const payload = { text: text || "", screenshot: screenshot || "" };

        fetch("https://chad-server.onrender.com/api/v1/ai/message", {
          // fetch("http://localhost:3001/api/v1/ai/message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
            const contentType = response.headers.get("content-type");
            return contentType.includes("application/json")
              ? response.json()
              : Promise.reject("Non-JSON response");
          })
          .then((result) => {
            processingMsg.remove();
            addMessage(result.reply || "No reply from server.", "bot");
            sendBtn.disabled = false;
            sendBtn.style.cursor = "pointer";
          })
          .catch(() => {
            processingMsg.remove();
            sendBtn.disabled = false;
            sendBtn.style.cursor = "pointer";
          });

        messageInput.value = "";
        chrome.storage.local.remove("lastScreenshot", () => {
          renderScreenshotPreview(null);
        });
      });
    });
  });
}
