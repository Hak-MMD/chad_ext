export function setupSidebarToggle() {
  document.getElementById("menu-btn").addEventListener("click", () => {
    document.getElementById("sidebar").classList.add("open");
  });

  document.getElementById("close-sidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.remove("open");
  });
}
