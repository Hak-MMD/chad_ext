import { setupDOMEvents } from "./modules/domEvents.js";
import { setupInputListener } from "./modules/chat.js";
import { setupSendHandler } from "./modules/sendMessage.js";
import { setupSidebarToggle } from "./modules/sidebar.js";
import {
  setupCaptureButton,
  setupScreenshotListeners,
} from "./modules/screenshot.js";

setupDOMEvents();
setupInputListener();
setupSendHandler();
setupSidebarToggle();
setupCaptureButton();
setupScreenshotListeners();
