export function setupDOMEvents() {
  document.addEventListener("DOMContentLoaded", () => {
    const settingsLink = document.getElementById("settings-link");
    const accordion = document.getElementById("settings-accordion");
    if (settingsLink && accordion) {
      settingsLink.addEventListener("click", (e) => {
        e.preventDefault();
        accordion.style.display =
          accordion.style.display === "none" ? "block" : "none";
      });
    }

    const themeRadios = document.querySelectorAll('input[name="theme"]');
    themeRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (e.target.value === "dark") {
          document.body.classList.add("theme-dark");
        } else {
          document.body.classList.remove("theme-dark");
        }
      });
    });
  });
}
