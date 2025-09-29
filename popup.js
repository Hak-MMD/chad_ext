document.addEventListener("DOMContentLoaded", () => {
  // Accordion toggle
  const settingsLink = document.getElementById("settings-link");
  const accordion = document.getElementById("settings-accordion");
  if (settingsLink && accordion) {
    settingsLink.addEventListener("click", (e) => {
      e.preventDefault();
      accordion.style.display =
        accordion.style.display === "none" ? "block" : "none";
    });
  }

  // Theme switch
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach((radio) => {
    radio.addEventListener("change", (e) => {
      if (e.target.value === "dark") {
        document.body.classList.add("theme-dark");
      } else {
        document.body.classList.remove("theme-dark");
      }
    });
  });
});

// ...existing code...

const chatContainer = document.getElementById("chat");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const imgBtn = document.getElementById("img-btn");

// Function to add a message bubble
function addMessage(text, sender = "user") {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message");
  msgDiv.classList.add(sender === "user" ? "user-message" : "bot-message");
  msgDiv.textContent = text;
  chatContainer.appendChild(msgDiv);

  // Auto-scroll to bottom
  chatContainer.scrollTop = chatContainer.scrollHeight;
}

// helper to check if there's content to send
function hasContentToSend(callback) {
  const text = messageInput.value.trim();
  if (text) return callback(true);
  // check storage for screenshot
  chrome.storage.local.get("lastScreenshot", (data) => {
    const hasShot = !!data.lastScreenshot;
    callback(hasShot);
  });
}

// Send message on button click or Enter key
sendBtn.addEventListener("click", () => {
  // prevent double sends
  if (sendBtn.disabled) return;
  hasContentToSend((canSend) => {
    if (!canSend) {
      // brief visual feedback
      sendBtn.style.opacity = 0.6;
      setTimeout(() => (sendBtn.style.opacity = 1), 300);
      return;
    }

    const text = messageInput.value.trim();

    chrome.storage.local.get("lastScreenshot", (data) => {
      let screenshot = data.lastScreenshot;

      // Strip data URL prefix if present
      if (screenshot && screenshot.startsWith("data:image")) {
        screenshot = screenshot.split(",")[1];
      }

      // Show user message(s) in chat immediately
      if (text && screenshot) {
        addMessage(text, "user");

        const imgMsg = document.createElement("div");
        imgMsg.classList.add("message", "user-message");
        const img = document.createElement("img");
        img.src = "data:image/png;base64," + screenshot;
        img.className = "chat-img";
        imgMsg.appendChild(img);
        chatContainer.appendChild(imgMsg);

        chatContainer.scrollTop = chatContainer.scrollHeight;
      } else if (text) {
        addMessage(text, "user");
      } else if (screenshot) {
        const imgMsg = document.createElement("div");
        imgMsg.classList.add("message", "user-message");
        const img = document.createElement("img");
        img.src = "data:image/png;base64," + screenshot;
        img.className = "chat-img";
        imgMsg.appendChild(img);
        chatContainer.appendChild(imgMsg);

        chatContainer.scrollTop = chatContainer.scrollHeight;
      }

      // Disable send button while pending
      sendBtn.disabled = true;
      sendBtn.style.cursor = "not-allowed";

      // Show "Processing data" message from bot
      const processingMsg = document.createElement("div");
      // processingMsg.classList.add("message", "bot-message");
      processingMsg.classList.add("gradient-text");
      processingMsg.textContent = "Processing data...";
      chatContainer.appendChild(processingMsg);
      chatContainer.scrollTop = chatContainer.scrollHeight;

      // Prepare data for POST
      const payload = {
        text: text || "",
        screenshot: screenshot || "",
      };

      // Send POST request to localhost
      fetch("https://chad-server.onrender.com/api/v1/ai/message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then(async (response) => {
          console.log("Response status:", response);
          // Handle 400 and 500 errors with custom popup
          if (!response.ok) {
            // consolwe.log("error 400");

            let errorText = "";
            if (response.status === 400) {
              // Try to parse error-message from JSON
              console.log("error 400");
              try {
                const data = await response.json();
                console.log("data error 400", data);
                errorText = data.errorMessage || "Bad request.";
              } catch {
                errorText = "An error occurred! Try again later!";
              }
              console.log("errorText", errorText);
              showErrorPopup(errorText);
              throw new Error(errorText);
            } else if (response.status === 500) {
              try {
                const data = await response.json();
                console.log("data error 500", data);
                errorText =
                  data.errorMessage || "Server overload! Try again later!";
              } catch {
                errorText = "An error occurred! Try again later!";
              }
              showErrorPopup(errorText);
              throw new Error(errorText);
            } else {
              errorText = `Error ${response.status}`;
              showErrorPopup(errorText);
              throw new Error(errorText);
            }
          }
          // Normal JSON response
          const contentType = response.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            return response.json();
          } else {
            const text = await response.text();
            throw new Error("Non-JSON response: " + text);
          }
        })
        .then((result) => {
          // Remove "Processing data" message
          if (processingMsg.parentNode) {
            processingMsg.parentNode.removeChild(processingMsg);
          }
          // Show only the reply field from server
          if (result.reply) {
            addMessage(result.reply, "bot");
          } else {
            addMessage("No reply from server.", "bot");
          }
          // re-enable send button
          sendBtn.disabled = false;
          sendBtn.style.cursor = "pointer";
        })
        .catch((error) => {
          if (processingMsg.parentNode) {
            processingMsg.parentNode.removeChild(processingMsg);
          }
          // re-enable send button on error
          sendBtn.disabled = false;
          sendBtn.style.cursor = "pointer";
        });

      // Reset input and preview after sending
      messageInput.value = "";
      chrome.storage.local.remove("lastScreenshot", () => {
        renderScreenshotPreview(null);
      });
    });
  });
});

messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    sendBtn.click();
  }
});

// ...existing code...
// Sidebar toggle
document.getElementById("menu-btn").addEventListener("click", () => {
  document.getElementById("sidebar").classList.add("open");
});
document.getElementById("close-sidebar").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("open");
  console.log(234);
});
//capture button

document.getElementById("capture-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "start_capture" }, (response) => {
    if (chrome.runtime.lastError) {
      console.error(
        "Error talking to background:",
        chrome.runtime.lastError.message
      );
      return;
    }

    if (response.success) {
      console.log("Content injected, closing popup...");
      window.close(); // close only after confirmed
    } else {
      alert("Restricted page: " + response.error);
    }
  });
});

chrome.storage.local.get("lastScreenshot", (data) => {
  if (data.lastScreenshot) {
    const previewContainer = document.getElementById("screenshot-preview");
    previewContainer.innerHTML = ""; // clear old

    const img = document.createElement("img");
    img.src = data.lastScreenshot;
    img.alt = "Screenshot preview";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "×"; // nice cross symbol
    closeBtn.onclick = () => {
      chrome.storage.local.remove("lastScreenshot", () => {
        previewContainer.style.display = "none";
        previewContainer.innerHTML = "";
      });
    };

    previewContainer.appendChild(img);
    previewContainer.appendChild(closeBtn);
    previewContainer.style.display = "block";
  }
});
function renderScreenshotPreview(dataUrl) {
  const previewContainer = document.getElementById("screenshot-preview");
  previewContainer.innerHTML = "";

  if (!dataUrl) {
    previewContainer.style.display = "none";
    return;
  }

  // wrapper to control positioning
  const wrapper = document.createElement("div");
  wrapper.className = "preview-wrapper";

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = "Screenshot preview";
  img.className = "preview-img";

  const closeBtn = document.createElement("button");
  closeBtn.textContent = "×";
  closeBtn.className = "close-btn";
  closeBtn.onclick = () => {
    chrome.storage.local.remove("lastScreenshot", () => {
      renderScreenshotPreview(null);
    });
  };

  wrapper.appendChild(closeBtn);
  wrapper.appendChild(img);
  previewContainer.appendChild(wrapper);
  previewContainer.style.display = "flex"; // flex container
}

// Listen for restricted page errors from bg.js
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "restricted_page") {
    showErrorPopup(
      "Can't capture restricted page! Try again with a different page."
    );
  }
});

// Create floating alert above input
function showErrorPopup(text) {
  console.log("showErrorPopup", text);
  const alert = document.getElementById("error-popup");
  if (alert.style.display === "block") {
    alert.style.display = "none"; // prevent duplicates
    showErrorPopup(text);
    return;
  }
  alert.textContent = text;
  alert.style.display = "block";

  setTimeout(() => {
    alert.style.display = "none";
  }, 4000);
}

// Initial load when popup opens
chrome.storage.local.get("lastScreenshot", (data) => {
  renderScreenshotPreview(data.lastScreenshot || null);
});

// Listen for updates in real time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lastScreenshot) {
    renderScreenshotPreview(changes.lastScreenshot.newValue || null);
  }
});
