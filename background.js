// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start_capture") {
    console.log("Starting capture from bg.js");

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0].id;

      // Step 1 — ping the tab to see if content.js is already injected
      chrome.tabs.sendMessage(tabId, { action: "ping" }, () => {
        if (chrome.runtime.lastError) {
          // ❌ No content script → inject it
          console.log("content.js not loaded, injecting...");

          chrome.scripting.executeScript(
            {
              target: { tabId },
              files: ["content.js"],
            },
            () => {
              if (chrome.runtime.lastError) {
                console.warn(
                  "Restricted page:",
                  chrome.runtime.lastError.message
                );

                sendResponse({
                  success: false,
                  error: chrome.runtime.lastError.message,
                });
                return;
              }

              // After injection → start overlay
              chrome.tabs.sendMessage(tabId, { action: "capture_overlay" });
              sendResponse({ success: true });
            }
          );
        } else {
          // ✅ content.js already injected → just start overlay
          console.log("content.js already loaded, sending capture_overlay");
          chrome.tabs.sendMessage(tabId, { action: "capture_overlay" });
          sendResponse({ success: true });
        }
      });
    });

    return true; // keep sendResponse alive
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === "content_ready") {
    console.log("Content sent:", msg.data);
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  console.log("capture screen bg0");
  if (msg.action === "capture_screen") {
    console.log("capture screen bg1");
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      if (chrome.runtime.lastError || !dataUrl) {
        console.warn("Capture failed:", chrome.runtime.lastError?.message);

        chrome.runtime.sendMessage({
          action: "restricted_page",
          error: chrome.runtime.lastError?.message || "Capture failed",
        });
        return;
      }

      chrome.tabs.sendMessage(sender.tab.id, {
        action: "got_screenshot",
        dataUrl: dataUrl,
        x: msg.x,
        y: msg.y,
        width: msg.width,
        height: msg.height,
      });
    });
  }
});
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "save_screenshot") {
    chrome.storage.local.set({ lastScreenshot: msg.screenshot }, () => {
      console.log("Screenshot saved in storage!");
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "reopen_popup") {
    // Reopen extension popup (works in Manifest V3 only)
    if (chrome.action.openPopup) {
      chrome.action.openPopup().catch((err) => {
        console.error("Failed to open popup:", err);
      });
    } else {
      console.warn("chrome.action.openPopup() not supported in this context.");
    }
  }
});
