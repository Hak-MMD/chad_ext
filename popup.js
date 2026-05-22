import { setupDOMEvents } from "./modules/domEvents.js";
import { setupInputListener } from "./modules/chat.js";
import { setupSendHandler } from "./modules/sendMessage.js";
import { setupSidebarToggle } from "./modules/sidebar.js";
import {
  setupCaptureButton,
  setupScreenshotListeners,
} from "./modules/screenshot.js";

import { checkAuthState } from "./modules/auth.js";
document.addEventListener("DOMContentLoaded", async () => {
  const isLoggedIn = await checkAuthState();

  if (!isLoggedIn) {
    showWelcomeScreen();
    return;
  }

  showMainScreen();

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "cleanup_overlay" }, () => {
      // Ignore errors — content script may not exist yet
      void chrome.runtime.lastError;
    });
  });

  setupDOMEvents();
  setupInputListener();
  setupSendHandler();
  setupSidebarToggle();
  setupCaptureButton();
  setupScreenshotListeners();
});

function showWelcomeScreen() {
  document.getElementById("welcome-screen").style.display = "flex";
  document.getElementById("main-screen").style.display = "none";
}

function showMainScreen() {
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("main-screen").style.display = "block";
}
