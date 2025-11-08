import { messageInput } from "./chat.js";

export function hasContentToSend(callback) {
  const text = messageInput.value.trim();
  if (text) return callback(true);
  chrome.storage.local.get("lastScreenshot", (data) => {
    callback(!!data.lastScreenshot);
  });
}
