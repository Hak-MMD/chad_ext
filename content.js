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

  function createOverlay() {
    // Create host
    const host = document.createElement("div");
    host.id = "chad-screenshot-host";
    host.style.position = "fixed";
    host.style.top = "0";
    host.style.left = "0";
    host.style.width = "100vw";
    host.style.height = "100vh";
    host.style.zIndex = "999999";
    host.style.pointerEvents = "none"; // allow overlay to control events
    document.body.appendChild(host);

    // Shadow root
    const shadow = host.attachShadow({ mode: "open" });

    // Shadow stylesheet (FULL isolation)
    const style = document.createElement("style");
    style.textContent = `
    * {
      box-sizing: border-box;
      font-family: Arial, sans-serif;
    }

    #overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0,0,0,0.05);
      cursor: crosshair;
      pointer-events: auto;
    }

    #selection-box {
      position: absolute;
      border: 2px dashed white;
      background: rgba(255,255,255,0.15);
      backdrop-filter: blur(1px);
      pointer-events: none;
    }

    #controls {
      position: absolute;
      background: #fff;
      padding: 8px 12px;
      border-radius: 8px;
      display: flex;
      gap: 10px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.15);
      pointer-events: auto;
    }

    button {
      all: unset;
      padding: 6px 18px;
      border-radius: 6px;
      border: 1px solid #ccc;
      background: #fff;
      font-size: 15px;
      font-weight: bold;
      color: #222;
      cursor: pointer;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }

    button:hover {
      background: #f3f3f3;
    }
  `;
    shadow.appendChild(style);

    // Overlay
    overlay = document.createElement("div");
    overlay.id = "overlay";
    shadow.appendChild(overlay);

    // Selection box
    selectionBox = document.createElement("div");
    selectionBox.id = "selection-box";
    shadow.appendChild(selectionBox);

    // Mouse events
    overlay.addEventListener("mousedown", startSelection);
    overlay.addEventListener("mousemove", updateSelection);
    overlay.addEventListener("mouseup", endSelection);

    // Save shadow root for later use
    window.__CHAD_SHADOW_ROOT__ = shadow;
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
    const controls = document.createElement("div");
    controls.id = "chad-selection-controls";

    Object.assign(controls.style, {
      position: "absolute",
      background: "#fff",
      padding: "8px 12px",
      borderRadius: "8px",
      display: "flex",
      gap: "10px",
      zIndex: "10000",
      boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
      transition: "opacity 0.15s ease",
      opacity: "0",
    });

    // Prevent clicks inside controls from bubbling up
    controls.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      e.preventDefault();
    });

    // Button style
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
    const searchBtn = document.createElement("button");
    searchBtn.innerText = "Search";
    Object.assign(searchBtn.style, btnStyle);
    searchBtn.onmouseenter = () => (searchBtn.style.background = "#f3f3f3");
    searchBtn.onmouseleave = () => (searchBtn.style.background = "#fff");
    searchBtn.onclick = () => captureScreenshot();
    searchBtn.addEventListener("mousedown", (e) => e.stopPropagation());

    // Cancel button
    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    Object.assign(cancelBtn.style, btnStyle);
    cancelBtn.onmouseenter = () => (cancelBtn.style.background = "#f3f3f3");
    cancelBtn.onmouseleave = () => (cancelBtn.style.background = "#fff");
    cancelBtn.onclick = () => cancelSelection();
    cancelBtn.addEventListener("mousedown", (e) => e.stopPropagation());

    controls.appendChild(searchBtn);
    controls.appendChild(cancelBtn);
    overlay.appendChild(controls);

    // --- SMART POSITIONING LOGIC ---
    const rect = selectionBox.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const controlsWidth = 200; // approx width of the buttons container
    const controlsHeight = 50; // approx height

    const margin = 12;

    let posX, posY;

    // 1. Default: bottom-right OUTSIDE selection
    posX = rect.right + margin;
    posY = rect.bottom + margin;

    // If outside-right is off-screen → try above-right
    if (posX + controlsWidth > viewportW) {
      posX = rect.right - controlsWidth;
    }

    // If below is off-screen → move above
    if (posY + controlsHeight > viewportH) {
      posY = rect.top - controlsHeight - margin;
    }

    // If above is also off-screen → place INSIDE bottom-right
    if (posY < 0) {
      posY = rect.bottom - controlsHeight - margin;
    }

    // If inside-bottom-right still off-screen → inside-top-right
    if (posY < 0) {
      posY = rect.top + margin;
    }

    // Final clamp to viewport
    posX = Math.max(8, Math.min(posX, viewportW - controlsWidth - 8));
    posY = Math.max(8, Math.min(posY, viewportH - controlsHeight - 8));

    controls.style.left = `${posX}px`;
    controls.style.top = `${posY}px`;

    // Fade in
    requestAnimationFrame(() => {
      controls.style.opacity = "1";
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", handleKeyControls);
  }

  function handleKeyControls(e) {
    if (e.key === "Escape") {
      cancelSelection();
    } else if (e.key === "Enter") {
      captureScreenshot();
      document.removeEventListener("keydown", handleKeyControls);
    }
  }
  function restoreScroll() {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }

  function cancelSelection() {
    console.log("Capture cancelled");
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    restoreScroll();
    window.__SCREENSHOT_OVERLAY_ACTIVE__ = false;
    document.removeEventListener("keydown", handleKeyControls);
    chrome.runtime.sendMessage({ action: "reopen_popup" });
  }

  function captureScreenshot() {
    let rect = selectionBox.getBoundingClientRect();

    if (rect.width < 5 || rect.height < 5) {
      console.log("Selection too small — ignoring capture.");
      return;
    }

    chrome.runtime.sendMessage({
      action: "capture_screen",
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    });

    console.log("Capture initiated with CSS coords:", rect);

    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
    restoreScroll();
    window.__SCREENSHOT_OVERLAY_ACTIVE__ = false;
    document.removeEventListener("keydown", handleKeyControls);

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
  // ---- 9. Cleanup overlay on request ----
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "cleanup_overlay") {
      const oldOverlay = document.getElementById("chad-screenshot-overlay");
      const oldControls = document.getElementById("chad-selection-controls");
      const oldBox = document.getElementById("chad-selection-box");

      if (oldOverlay) oldOverlay.remove();
      if (oldControls) oldControls.remove();
      if (oldBox) oldBox.remove();

      window.__SCREENSHOT_OVERLAY_ACTIVE__ = false;
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
  });
}
