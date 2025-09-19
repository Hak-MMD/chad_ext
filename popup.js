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

// Send message on button click or Enter key
sendBtn.addEventListener("click", () => {
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
    fetch("http://localhost:3001/api/v1/ai/message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
      .then(async (response) => {
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
      })
      .catch((error) => {
        if (processingMsg.parentNode) {
          processingMsg.parentNode.removeChild(processingMsg);
        }
        addMessage("Failed to send: " + error, "bot");
      });

    // Reset input and preview after sending
    messageInput.value = "";
    chrome.storage.local.remove("lastScreenshot", () => {
      renderScreenshotPreview(null);
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
  const oldAlert = document.getElementById("error-popup");
  if (oldAlert) oldAlert.remove(); // prevent duplicates

  const alert = document.createElement("div");
  alert.id = "error-popup";
  alert.textContent = text;

  document.querySelector(".popup-bottom").prepend(alert);

  // Auto-remove after 4s
  setTimeout(() => {
    alert.remove();
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
