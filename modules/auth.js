export async function checkAuthState() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(["accessToken", "user", "rememberMe"], (data) => {
      if (!data.accessToken || !data.user) {
        resolve(false);
        return;
      }

      if (data.rememberMe === false) {
        resolve(false);
        return;
      }

      resolve(true);
    });
  });
}
