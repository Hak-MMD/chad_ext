import { setupDOMEvents } from "./modules/domEvents.js";
import { setupInputListener } from "./modules/chat.js";
import { setupSendHandler } from "./modules/sendMessage.js";
import { setupSidebarToggle } from "./modules/sidebar.js";
import {
  setupCaptureButton,
  setupScreenshotListeners,
} from "./modules/screenshot.js";

import { checkAuthState } from "./modules/auth.js";
import { renderUserAvatar } from "./modules/avatar.js";

const DEV_MODE = true;
// const DEV_MODE = false;

document.addEventListener("DOMContentLoaded", async () => {
  // -------------------------
  // AUTH / SCREEN TOGGLE
  // -------------------------
  if (DEV_MODE) {
    showMainScreen();
  } else {
    const isLoggedIn = await checkAuthState();
    if (!isLoggedIn) {
      showWelcomeScreen();
      return;
    }
    showMainScreen();
  }

  // -------------------------
  // CLEANUP OVERLAY
  // -------------------------
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "cleanup_overlay" }, () => {
      void chrome.runtime.lastError;
    });
  });

  // -------------------------
  // INITIALIZE MAIN UI
  // -------------------------
  setupDOMEvents();
  setupInputListener();
  setupSendHandler();
  setupSidebarToggle();
  setupCaptureButton();
  setupScreenshotListeners();

  // -------------------------
  // AVATAR LOGIC
  // -------------------------
  chrome.storage.sync.get(["user"], (data) => {
    if (data.user) {
      renderUserAvatar(data.user);
    }
  });

  const avatar = document.getElementById("user-avatar");
  const dropdown = document.getElementById("user-dropdown");

  avatar.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.style.display =
      dropdown.style.display === "block" ? "none" : "block";
  });

  document.addEventListener("click", (e) => {
    if (!avatar.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.style.display = "none";
    }
  });

  document.getElementById("profile-link").onclick = () => {
    chrome.tabs.create({ url: "https://chad-ai-nd2k.onrender.com/profile" });
  };

  document.getElementById("upgrade-link").onclick = () => {
    chrome.tabs.create({ url: "https://chad-ai-nd2k.onrender.com/upgrade" });
  };

  // -------------------------
  // SIDEBAR USER SECTION
  // -------------------------
  chrome.storage.sync.get(["user"], (data) => {
    const user = data.user;
    if (!user) return;

    const avatarEl = document.getElementById("sidebar-user-avatar");
    const nameEl = document.getElementById("sidebar-user-name");
    const planEl = document.getElementById("sidebar-user-plan");

    nameEl.textContent = user.name || user.email;
    planEl.textContent = user.plan ? `${user.plan} plan` : "Free plan";

    // Avatar logic
    if (user.avatarUrl) {
      avatarEl.style.backgroundImage = `url(${user.avatarUrl})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
    } else {
      avatarEl.textContent = getInitials(user.name || user.email);
    }
  });

  // Dropdown toggle
  const sidebarUserSection = document.getElementById("sidebar-user-section");
  const sidebarDropdown = document.getElementById("sidebar-user-dropdown");

  sidebarUserSection.addEventListener("click", (e) => {
    if (e.target.id === "sidebar-upgrade-btn") return; // skip upgrade button
    sidebarDropdown.style.display =
      sidebarDropdown.style.display === "block" ? "none" : "block";
  });

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (!sidebarUserSection.contains(e.target)) {
      sidebarDropdown.style.display = "none";
    }
  });

  // Redirects
  document.getElementById("sidebar-profile-link").onclick = () => {
    chrome.tabs.create({ url: "https://chad-ai-nd2k.onrender.com/profile" });
  };

  document.getElementById("sidebar-settings-link").onclick = () => {
    chrome.tabs.create({ url: "https://chad-ai-nd2k.onrender.com/settings" });
  };

  document.getElementById("sidebar-upgrade-link").onclick =
    document.getElementById("sidebar-upgrade-btn").onclick = () => {
      chrome.tabs.create({ url: "https://chad-ai-nd2k.onrender.com/upgrade" });
    };

  // Helper
  function getInitials(name) {
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
});

// -------------------------
// SCREEN SWITCHERS
// -------------------------
function showWelcomeScreen() {
  document.getElementById("welcome-screen").style.display = "flex";
  document.getElementById("main-screen").style.display = "none";
}

function showMainScreen() {
  document.getElementById("welcome-screen").style.display = "none";
  document.getElementById("main-screen").style.display = "block";
}
