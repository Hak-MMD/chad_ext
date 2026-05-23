export function renderUserAvatar(user) {
  const avatarEl = document.getElementById("user-avatar");

  if (!avatarEl) return;

  if (user.avatarUrl) {
    avatarEl.style.backgroundImage = `url(${user.avatarUrl})`; // working stuff
    avatarEl.style.backgroundSize = "cover";
    avatarEl.style.backgroundPosition = "center";
    avatarEl.textContent = "";
    return;
  }

  // Fallback initials
  const initials = getInitials(user.name || user.email);
  avatarEl.textContent = initials;
}

function getInitials(name) {
  const parts = name.trim().split(" ");

  if (parts.length === 1) {
    return parts[0][0].toUpperCase();
  }

  return (parts[0][0] + parts[1][0]).toUpperCase();
}
