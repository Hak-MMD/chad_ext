const TYPE_CONFIG = {
  error:   { icon: "✕", color: "#ef4444" },
  success: { icon: "✓", color: "#22c55e" },
  info:    { icon: "i", color: "#3b82f6" },
  warning: { icon: "!", color: "#f59e0b" },
};

export function showToast(message, type = "error", duration = 4500) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const cfg = TYPE_CONFIG[type] || TYPE_CONFIG.error;

  const toast = document.createElement("div");
  toast.className = `toast-item toast-${type}`;

  const icon = document.createElement("span");
  icon.className = "toast-item-icon";
  icon.textContent = cfg.icon;

  const msg = document.createElement("span");
  msg.className = "toast-item-msg";
  msg.textContent = message;

  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-item-close";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", () => _dismiss(toast));

  toast.appendChild(icon);
  toast.appendChild(msg);
  toast.appendChild(closeBtn);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => _dismiss(toast), duration);
  }
}

function _dismiss(toast) {
  if (!toast.isConnected) return;
  toast.classList.add("toast-exit");
  setTimeout(() => toast.remove(), 300);
}

// backward-compatible alias — existing callers (sendMessage.js, retry.js) don't need to change
export function showErrorPopup(message) {
  showToast(message, "error");
}
