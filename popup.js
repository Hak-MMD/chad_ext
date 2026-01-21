import { setupDOMEvents } from "./modules/domEvents.js";
import { setupInputListener } from "./modules/chat.js";
import { setupSendHandler } from "./modules/sendMessage.js";
import { setupSidebarToggle } from "./modules/sidebar.js";
import {
  setupCaptureButton,
  setupScreenshotListeners,
} from "./modules/screenshot.js";

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "cleanup_overlay" });
});

setupDOMEvents();
setupInputListener();
setupSendHandler();
setupSidebarToggle();
setupCaptureButton();
setupScreenshotListeners();
