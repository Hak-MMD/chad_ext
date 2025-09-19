if (!window.__SCREENSHOT_OVERLAY_ACTIVE__) {
  window.__SCREENSHOT_OVERLAY_ACTIVE__ = true;
  // ---- 1. Listen for messages from background.js ----
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "capture_overlay") {
      createOverlay();
      chrome.runtime.sendMessage({ action: "content_ready" });
    }
  });

  // ---- 2. Variables ----
  let overlay, selectionBox;
  let startX, startY, endX, endY;
  let selecting = false;

  // ---- 3. Overlay creation ----
  function createOverlay() {
    // Main overlay covering the page
    overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.background = "rgba(0, 0, 0, 0.3)";
    overlay.style.cursor = "crosshair";
    overlay.style.zIndex = "9999";
    document.body.appendChild(overlay);

    // Initial empty selection box
    selectionBox = document.createElement("div");
    selectionBox.id = "selection-box";
    selectionBox.style.position = "absolute";
    selectionBox.style.border = "2px dashed white";
    selectionBox.style.background = "rgba(255, 255, 255, 0.2)";
    overlay.appendChild(selectionBox);

    // Mouse event listeners
    overlay.addEventListener("mousedown", startSelection);
    overlay.addEventListener("mousemove", updateSelection);
    overlay.addEventListener("mouseup", endSelection);
  }

  // ---- 4. Start drawing selection ----
  function startSelection(event) {
    startX = event.clientX;
    startY = event.clientY;
    selecting = true;
    console.log("Selection started at:", startX, startY);

    // Remove old elements before starting a new selection
    removeOldElements();

    // New selection box
    selectionBox = document.createElement("div");
    selectionBox.id = "selection-box";
    selectionBox.style.position = "absolute";
    selectionBox.style.border = "2px dashed white";
    selectionBox.style.background = "rgba(255, 255, 255, 0.2)";
    overlay.appendChild(selectionBox);
  }

  // ---- 5. Remove old elements (for reset) ----
  function removeOldElements() {
    let oldSelectionBox = document.getElementById("selection-box");
    let oldControls = document.getElementById("selection-controls");
    if (oldSelectionBox) oldSelectionBox.remove();
    if (oldControls) oldControls.remove();
  }

  // ---- 6. Update selection box size ----
  function updateSelection(event) {
    if (!selecting) return;

    endX = event.clientX;
    endY = event.clientY;

    let left = Math.min(startX, endX);
    let top = Math.min(startY, endY);
    let width = Math.abs(endX - startX);
    let height = Math.abs(endY - startY);

    selectionBox.style.left = `${left}px`;
    selectionBox.style.top = `${top}px`;
    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
  }

  // ---- 7. End selection, show controls ----
  function endSelection() {
    selecting = false;
    showControls();
  }

  // ---- 8. Show Search + Cancel buttons ----
  function showControls() {
    let controls = document.createElement("div");
    controls.id = "selection-controls";
    controls.style.position = "absolute"; // keep in viewport
    controls.style.bottom = "20px";
    controls.style.right = "20px";
    controls.style.background = "white";
    controls.style.padding = "8px 12px";
    controls.style.borderRadius = "8px";
    controls.style.display = "flex";
    controls.style.gap = "10px";
    controls.style.zIndex = "10000";
    controls.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";

    // Prevent clicks inside controls from bubbling up
    controls.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    const btnStyle = `
    background: #ffffff;
    border: 1px solid #ccc;
    padding: 6px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
  `;
    // Search button
    let searchBtn = document.createElement("button");
    searchBtn.innerText = "Search";
    searchBtn.style.cssText = btnStyle;
    searchBtn.className = "chrome-ext-btn"; // match popup style (popup.css must define .chrome-ext-btn)
    searchBtn.onclick = () => captureScreenshot();
    searchBtn.addEventListener("mousedown", (e) => e.stopPropagation());

    // Cancel button
    let cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    cancelBtn.style.cssText = btnStyle;
    cancelBtn.className = "chrome-ext-btn";
    cancelBtn.onclick = () => cancelSelection();
    cancelBtn.addEventListener("mousedown", (e) => e.stopPropagation());

    controls.appendChild(searchBtn);
    controls.appendChild(cancelBtn);
    overlay.appendChild(controls);

    // Add keyboard shortcuts
    document.addEventListener("keydown", handleKeyControls);
  }

  function cancelSelection() {
    console.log("Capture cancelled");
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    document.removeEventListener("keydown", handleKeyControls);
    chrome.runtime.sendMessage({ action: "open_popup_window" });
  }

  function handleKeyControls(e) {
    if (e.key === "Escape") {
      cancelSelection();
    } else if (e.key === "Enter") {
      captureScreenshot();
      document.removeEventListener("keydown", handleKeyControls);
    }
  }

  function captureScreenshot() {
    let rect = selectionBox.getBoundingClientRect();

    chrome.runtime.sendMessage({
      action: "capture_screen",
      x: rect.left + window.scrollX,
      y: rect.top + window.scrollY,
      width: rect.width,
      height: rect.height,
    });

    console.log("Capture initiated with CSS coords:", rect);

    // Remove overlay
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    document.removeEventListener("keydown", handleKeyControls);

    // Tell background to reopen popup in same window
    chrome.runtime.sendMessage({ action: "reopen_popup" });
  }

  function cropImage(dataUrl, x, y, width, height) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        console.log(
          "Screenshot natural size:",
          img.naturalWidth,
          img.naturalHeight
        );
        console.log("Crop request:", { x, y, width, height });

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        ctx.drawImage(
          img,
          x,
          y,
          width,
          height, // source rect
          0,
          0,
          width,
          height // destination rect
        );

        resolve(canvas.toDataURL("image/png"));
      };
      img.src = dataUrl;
    });
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "got_screenshot") {
      const { dataUrl, x, y, width, height } = msg;

      // Screenshot is in device pixels → scale crop coordinates
      const img = new Image();
      img.onload = () => {
        const dpr = img.naturalWidth / window.innerWidth;
        // fallback to window.devicePixelRatio if needed
        const scale =
          isFinite(dpr) && dpr > 0 ? dpr : window.devicePixelRatio || 1;

        const scaledX = x * scale;
        const scaledY = y * scale;
        const scaledWidth = width * scale;
        const scaledHeight = height * scale;

        cropImage(dataUrl, scaledX, scaledY, scaledWidth, scaledHeight).then(
          (croppedDataUrl) => {
            chrome.storage.local.set({ lastScreenshot: croppedDataUrl }, () => {
              console.log("Cropped screenshot saved!");
            });
          }
        );
      };
      img.src = dataUrl;
    }
  });
}
