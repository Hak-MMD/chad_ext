const MODELS = [
  { id: "gpt-4o", name: "GPT-4o" },
  { id: "gpt-4o-mini", name: "GPT-4o mini" },
  { id: "gpt-3.5-turbo", name: "GPT-3.5" },
];

let currentModel = MODELS[0].id;

export function getSelectedModel() {
  return currentModel;
}

export function setupModelSelector() {
  const btn = document.getElementById("model-btn");
  const dropdown = document.getElementById("model-dropdown");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("open");
    btn.classList.toggle("active", isOpen);
  });

  document.addEventListener("click", () => {
    dropdown.classList.remove("open");
    btn.classList.remove("active");
  });

  dropdown.addEventListener("click", (e) => e.stopPropagation());

  dropdown.querySelectorAll(".model-option").forEach((option) => {
    option.addEventListener("click", () => {
      currentModel = option.dataset.model;
      btn.querySelector(".model-name").textContent = option.textContent;
      dropdown.classList.remove("open");
      btn.classList.remove("active");

      dropdown.querySelectorAll(".model-option").forEach((o) => o.classList.remove("active"));
      option.classList.add("active");

      chrome.storage.sync.set({ selectedModel: currentModel });
    });
  });

  chrome.storage.sync.get("selectedModel", (data) => {
    if (!data.selectedModel) {
      dropdown.querySelector(`[data-model="${MODELS[0].id}"]`).classList.add("active");
      return;
    }
    const model = MODELS.find((m) => m.id === data.selectedModel);
    if (!model) return;
    currentModel = model.id;
    btn.querySelector(".model-name").textContent = model.name;
    dropdown.querySelectorAll(".model-option").forEach((o) => {
      o.classList.toggle("active", o.dataset.model === model.id);
    });
  });
}
