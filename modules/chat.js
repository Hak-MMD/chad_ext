export const chatContainer = document.getElementById("chat");
export const messageInput = document.getElementById("message-input");
export const sendBtn = document.getElementById("send-btn");
import { formatBotMessage } from "./textParser.js";
import { handleRetry } from "./utils/retry.js";

export function addMessage(text, sender = "user") {
  const msgDiv = document.createElement("div");
  msgDiv.classList.add(
    "message",
    sender === "user" ? "user-message" : "bot-message"
  );

  if (sender === "bot") {
    text = formatBotMessage(text);
  }

  msgDiv.innerHTML = text;

  // Append message to container first
  chatContainer.appendChild(msgDiv);

  // If bot → append hr + button row
  if (sender === "bot") {
    // const separator = document.createElement("hr");
    // separator.classList.add("msg-separator");

    const codeButtons = msgDiv.querySelectorAll(".code-copy-btn");

    codeButtons.forEach((btn) => {
      btn.onclick = () => {
        const codeElement = btn
          .closest(".code-block")
          .querySelector("pre code");
        const code = codeElement.innerText; // preserves formatting
        navigator.clipboard.writeText(code);
        showCopiedPopup(btn);
      };
    });

    const actionRow = document.createElement("div");
    actionRow.classList.add("msg-actions");

    // Create buttons
    // BOT ACTION BUTTONS
    const copyBtn = document.createElement("button");
    copyBtn.classList.add("msg-icon-btn");
    copyBtn.setAttribute("data-tooltip", "Copy");
    copyBtn.innerHTML = `<img src="icons/copy.png" alt="Copy" />`;

    const restartBtn = document.createElement("button");
    restartBtn.classList.add("msg-icon-btn");
    restartBtn.setAttribute("data-tooltip", "Retry");
    restartBtn.innerHTML = `<img src="icons/retry.png" alt="Retry" />`;

    // const saveBtn = document.createElement("button");
    // saveBtn.classList.add("msg-icon-btn");
    // saveBtn.innerHTML = `<img src="icons/save.png" alt="Save" />`;

    // Button functionality:
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ""));
      showCopiedPopup(copyBtn);
    };

    // saveBtn.onclick = () => {
    //   const blob = new Blob([text.replace(/<[^>]*>/g, "")], {
    //     type: "text/plain",
    //   });
    //   const url = URL.createObjectURL(blob);
    //   const a = document.createElement("a");
    //   a.href = url;
    //   a.download = "message.txt";
    //   a.click();
    //   URL.revokeObjectURL(url);
    // };
    restartBtn.onclick = () => {
      handleRetry(restartBtn);
    };

    // Append buttons to row
    actionRow.appendChild(copyBtn);
    // actionRow.appendChild(saveBtn);
    actionRow.appendChild(restartBtn);

    // Append hr + action row
    chatContainer.appendChild(actionRow);
  }

  if (sender === "user") {
    const actionRow = document.createElement("div");
    actionRow.classList.add("msg-actions-user");

    const copyBtn = document.createElement("button");
    copyBtn.classList.add("msg-icon-btn");
    copyBtn.setAttribute("data-tooltip", "Copy");
    copyBtn.innerHTML = `<img src="icons/copy.png" alt="Copy" />`;

    const editBtn = document.createElement("button");
    editBtn.classList.add("msg-icon-btn");
    editBtn.setAttribute("data-tooltip", "Edit");
    editBtn.innerHTML = `<img src="icons/edit.png" alt="Edit" />`;

    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text.replace(/<[^>]*>/g, ""));
      showCopiedPopup(copyBtn);
    };

    editBtn.onclick = () => {
      const plainText = text.replace(/<[^>]*>/g, "");
      const input = document.getElementById("message-input");
      input.value = plainText;
      input.style.height = "auto";
      input.style.height = input.scrollHeight + "px";
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    };

    actionRow.appendChild(copyBtn);
    actionRow.appendChild(editBtn);

    chatContainer.appendChild(actionRow);

    chatContainer.scrollTop = chatContainer.scrollHeight;
  }
}

export function setupInputListener() {
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendBtn.click();
    }
  });

  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";
    chrome.storage.local.set({ draftText: messageInput.value });
  });
}

function showCopiedPopup(button) {
  const popup = document.createElement("div");
  popup.className = "copied-popup";
  popup.textContent = "Copied!";

  // Position relative to the button
  const rect = button.getBoundingClientRect();
  popup.style.top = rect.top - 28 + "px";
  popup.style.left = rect.left + rect.width / 2 + "px";

  document.body.appendChild(popup);

  // Animate + remove
  setTimeout(() => {
    popup.classList.add("fade-out");
  }, 800);

  setTimeout(() => {
    popup.remove();
  }, 1100);
}
