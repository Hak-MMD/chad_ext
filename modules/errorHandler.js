export function showErrorPopup(text) {
  console.log("showErrorPopup", text);
  const alert = document.getElementById("error-popup");
  if (alert.style.display === "block") {
    alert.style.display = "none";
    showErrorPopup(text);
    return;
  }
  alert.textContent = text;
  alert.style.display = "block";
  setTimeout(() => {
    alert.style.display = "none";
  }, 4000);
}
