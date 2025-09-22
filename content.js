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
    overlay.id = "chad-screenshot-overlay";
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
    selectionBox.id = "chad-selection-box";
    selectionBox.style.position = "absolute";
    selectionBox.style.border = "2px dashed white";
    selectionBox.style.background = "rgba(255, 255, 255, 0.2)";
    overlay.appendChild(selectionBox);
  }

  // ---- 5. Remove old elements (for reset) ----
  function removeOldElements() {
    let oldSelectionBox = document.getElementById("chad-selection-box");
    let oldControls = document.getElementById("chad-selection-controls");
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
    controls.id = "chad-selection-controls";
    Object.assign(controls.style, {
      position: "absolute",
      bottom: "20px",
      right: "20px",
      background: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      display: "flex",
      gap: "10px",
      zIndex: "10000",
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
    });

    // Prevent clicks inside controls from bubbling up
    controls.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });
    // Unique inline style for buttons
    const btnStyle = {
      background: "#fff",
      border: "1px solid #ccc",
      padding: "6px 18px",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: "bold",
      color: "#222",
      transition: "background 0.2s, color 0.2s",
      outline: "none",
      boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
    };
    // Search button
    let searchBtn = document.createElement("button");
    searchBtn.innerText = "Search";
    Object.assign(searchBtn.style, btnStyle);
    searchBtn.id = "chad-ext-btn-search";
    searchBtn.onmouseenter = () => (searchBtn.style.background = "#f3f3f3");
    searchBtn.onmouseleave = () => (searchBtn.style.background = "#fff");
    searchBtn.onclick = () => captureScreenshot();
    searchBtn.addEventListener("mousedown", (e) => e.stopPropagation());

    // Cancel button
    let cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    Object.assign(cancelBtn.style, btnStyle);
    cancelBtn.id = "chad-ext-btn-cancel";
    cancelBtn.onmouseenter = () => (cancelBtn.style.background = "#f3f3f3");
    cancelBtn.onmouseleave = () => (cancelBtn.style.background = "#fff");
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
            // Detect blank/gray image (all pixels same color or very low variance)
            isBlankImage(croppedDataUrl).then((isBlank) => {
              if (isBlank) {
                // Send error to popup
                chrome.runtime.sendMessage({
                  action: "restricted_page",
                  error: "Blank or restricted capture. Try a different page.",
                });
                return;
              }
              chrome.storage.local.set(
                { lastScreenshot: croppedDataUrl },
                () => {
                  console.log("Cropped screenshot saved!");
                }
              );
            });
          }
        );
        // Utility: Detect blank/gray image (returns Promise<boolean>)
        function isBlankImage(dataUrl) {
          return new Promise((resolve) => {
            const img = new Image();
            img.onload = function () {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              const data = ctx.getImageData(0, 0, img.width, img.height).data;
              let r = data[0],
                g = data[1],
                b = data[2];
              let same = true;
              for (let i = 0; i < data.length; i += 4) {
                if (
                  Math.abs(data[i] - r) > 5 ||
                  Math.abs(data[i + 1] - g) > 5 ||
                  Math.abs(data[i + 2] - b) > 5
                ) {
                  same = false;
                  break;
                }
              }
              resolve(same);
            };
            img.onerror = function () {
              resolve(false);
            };
            img.src = dataUrl;
          });
        }
      };
      img.src = dataUrl;
    }
  });
}
