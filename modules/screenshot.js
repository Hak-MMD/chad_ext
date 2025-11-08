import { showErrorPopup } from "./errorHandler.js";

export function setupCaptureButton() {
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
        window.close();
      } else {
        alert("Restricted page: " + response.error);
      }
    });
  });
}

export function renderScreenshotPreview(dataUrl) {
  const previewContainer = document.getElementById("screenshot-preview");
  previewContainer.innerHTML = "";

  if (!dataUrl) {
    previewContainer.style.display = "none";
    return;
  }

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
  previewContainer.style.display = "flex";
}

export function setupScreenshotListeners() {
  chrome.storage.local.get("lastScreenshot", (data) => {
    renderScreenshotPreview(data.lastScreenshot || null);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.lastScreenshot) {
      renderScreenshotPreview(changes.lastScreenshot.newValue || null);
    }
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "restricted_page") {
      showErrorPopup(
        "Can't capture restricted page! Try again with a different page."
      );
    }
  });
}
