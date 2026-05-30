import { chatContainer, messageInput, sendBtn, addMessage } from "./chat.js";
import { hasContentToSend } from "./utils.js";
import { showErrorPopup } from "./errorHandler.js";
import { renderScreenshotPreview } from "./screenshot.js";
import { getSelectedModel } from "./modelSelector.js";

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

        if (screenshot) {
          const imgMsg = document.createElement("div");
          imgMsg.classList.add("message", "user-message", "chat-img");
          const img = document.createElement("img");
          img.src = "data:image/png;base64," + screenshot;
          img.className = "chat-img";
          img.onclick = () => {
            chrome.tabs.create({ url: img.src });
          };
          imgMsg.appendChild(img);
          chatContainer.appendChild(imgMsg);
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        if (text) addMessage(text, "user");

        sendBtn.disabled = true;
        sendBtn.style.cursor = "not-allowed";

        const processingMsg = document.createElement("div");
        processingMsg.classList.add("processing-msg");
        processingMsg.innerHTML = "<span></span><span></span><span></span>";
        chatContainer.appendChild(processingMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const payload = {
          text: text || "",
          screenshot: screenshot || "",
          chatId: "696817f8c80591bdcb7196d0", // for testing purposes
          model: getSelectedModel(),
        };

        // for testing purposes
        let authToken =
          "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5NjgxN2Y3YzgwNTkxYmRjYjcxOTZjZSIsImVtYWlsIjoiMW0xMDBtMjAwbUBnbWFpbC5jb20iLCJwbGFuIjoiZnJlZSIsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzc5NDc0MDkwLCJleHAiOjE3Nzk0NzQ5OTB9.nIcJmGij7EbEoYJSpS894dejCk8lyB0fwVeWBtG_LqE";

        fetch("https://chad-server.onrender.com/api/v1/ai/message", {
          // fetch("http://localhost:3001/api/v2/ai/message", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`, // for testing purposes
          },
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
        messageInput.style.height = "auto";
        chrome.storage.local.remove(["lastScreenshot", "draftText"], () => {
          renderScreenshotPreview(null);
        });
      });
    });
  });
}
