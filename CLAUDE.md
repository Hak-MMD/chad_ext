# my-extension — Detailed Context for Claude

Chrome Extension (Manifest V3) for ChadAI. **No build step** — plain JavaScript, vanilla DOM, no bundler, no npm. Load directly in Chrome via `chrome://extensions` → Developer Mode → Load Unpacked.

---

## File Map

```
my-extension/
├── manifest.json          # MV3 config — permissions, background, popup, icons
├── background.js          # Service worker — handles capture flow + screenshot relay
├── content.js             # Injected into web pages — screenshot overlay (Shadow DOM)
├── popup.html             # Popup UI — two screens: welcome + main chat
├── popup.css              # All popup styles
├── popup.js               # Popup entry point — imports modules, initializes UI
├── modules/
│   ├── auth.js            # checkAuthState() — reads tokens from chrome.storage.sync
│   ├── avatar.js          # renderUserAvatar() — image or initials fallback
│   ├── chat.js            # addMessage(), setupInputListener() — chat DOM logic
│   ├── domEvents.js       # Settings accordion + theme toggle (mostly dead code now)
│   ├── errorHandler.js    # showErrorPopup() — shows #error-popup for 4s
│   ├── screenshot.js      # setupCaptureButton(), setupScreenshotListeners(), renderScreenshotPreview()
│   ├── sendMessage.js     # setupSendHandler() — builds payload, calls API
│   ├── sidebar.js         # setupSidebarToggle() — open/close sidebar
│   ├── textParser.js      # formatBotMessage() — custom markdown → HTML renderer
│   └── utils/
│       └── retry.js       # handleRetry() — retry button on bot messages
└── icons/                 # UI icons: burger, burger1, close, copy, edit, icon.png,
                           # icon.ico, icon2.png, icon2.ico, photo, policy, profile,
                           # retry, send, settings, star, weblink, icon-bg, icon-tr
```

---

## Three Separate JS Contexts (Critical Chrome Extension Concept)

Chrome extensions run code in **three isolated environments** that can only communicate via message passing:

| Context | File | Has DOM? | Chrome APIs | Lifetime |
|---|---|---|---|---|
| Service Worker | `background.js` | No | Full `chrome.*` | Terminated when idle, wakes on events |
| Content Script | `content.js` | Yes (page's DOM) | Limited subset | Page lifetime |
| Popup | `popup.js` + modules | Yes (popup's own DOM) | Full `chrome.*` | While popup is open |

**Message passing is the only way these contexts share data.** DOM, variables, and functions are NOT shared across contexts.

---

## Manifest Permissions

```json
"permissions": ["storage", "activeTab", "scripting"]
```

- `storage` — read/write `chrome.storage.local` and `chrome.storage.sync`
- `activeTab` — access to the currently active tab when user clicks extension
- `scripting` — `chrome.scripting.executeScript()` to inject `content.js`
- Background is a **module** service worker (`"type": "module"`) — enables ES imports in background (not currently used)
- Popup uses `<script type="module">` — ES module imports work

---

## Two UI Screens (popup.html)

**Welcome screen** (`#welcome-screen`) — shown to unauthenticated users:
- Sign In button (`#welcome-login-btn`)
- Create Account button (`#welcome-register-btn`)
- Visit Website button (`#welcome-website-btn`)
- Remember me checkbox (`#remember-me-checkbox`)
- **All buttons currently do nothing** — not wired up yet

**Main screen** (`#main-screen`) — shown to authenticated users:
- Header: hamburger menu (`#menu-btn`), logo, user avatar (`#user-avatar`) with dropdown (`#user-dropdown`)
- Chat container (`#chat`) — messages rendered here
- Bottom bar: Capture button (`#capture-btn`), text input (`#message-input`), Send button (`#send-btn`)
- Screenshot preview area (`#screenshot-preview`) — appears above input when screenshot is pending
- Error popup (`#error-popup`) — appears above input on errors
- Sidebar (`#sidebar`) — slides in from left

---

## `popup.js` — Initialization Flow

```
DOMContentLoaded
  ↓
DEV_MODE = true → skip auth → showMainScreen()   ← CURRENT STATE
  (when false: checkAuthState() → showWelcomeScreen or showMainScreen)
  ↓
cleanup_overlay message → active tab (clears any leftover capture overlay)
  ↓
setupDOMEvents()          — settings accordion + theme (mostly dead)
setupInputListener()      — Enter key → sendBtn.click()
setupSendHandler()        — send button click handler
setupSidebarToggle()      — hamburger + close sidebar
setupCaptureButton()      — capture button → sends start_capture to background
setupScreenshotListeners() — watches storage for new screenshots, shows preview
  ↓
Read chrome.storage.sync["user"] → renderUserAvatar() if present
Wire header avatar dropdown (Profile → chad-ai website, Upgrade → /upgrade)
Wire sidebar user section (name, plan, avatar from storage)
Wire sidebar dropdown (Profile, Settings, Upgrade — all open new tabs)
```

**`DEV_MODE = true` in `popup.js:13`** — bypasses auth check completely, always shows main screen. Set to `false` before shipping.

---

## Storage Schema

```
chrome.storage.sync               — syncs across user's Chrome profiles
  accessToken: string             — JWT access token
  user: {
    id: string,
    email: string,
    name: string,
    plan: string,                 — "free" | "basic" | "pro" | "unlimited"
    role: string,
    avatarUrl: string | null,
  }
  rememberMe: boolean             — if false, checkAuthState returns false

chrome.storage.local              — local only, not synced
  lastScreenshot: string          — base64 data URL of cropped screenshot, or null
```

---

## Screenshot Capture Flow (Full)

```
1. User clicks Capture button in popup
   ↓
2. popup → background: { action: "start_capture" }
   ↓
3. background: queries active tab, pings content.js
   ├─ ping fails (not injected) → executeScript("content.js") → then send capture_overlay
   └─ ping succeeds (already there) → send capture_overlay directly
   → sendResponse({ success: true/false })
   ↓
4. popup: window.close() — popup closes so the page is visible
   ↓
5. content.js receives { action: "capture_overlay" }
   ↓
6. content.js: createOverlay() — appends #chad-screenshot-host div to page body
   - Uses Shadow DOM (attachShadow) for full CSS isolation from the page
   - Locks page scroll (overflow: hidden)
   - Cursor becomes crosshair
   ↓
7. User drags to select area → selection box drawn in shadow DOM
   ↓
8. User releases mouse → showControls() → "Search" + "Cancel" buttons appear
   - Smart positioning: tries bottom-right → above → inside selection
   - Keyboard: Enter = capture, Escape = cancel
   ↓
9a. Cancel: removeHost(), restoreScroll(), → background: { action: "reopen_popup" }
   ↓
9b. Search / Enter: captureScreenshot()
   - Sends { action: "capture_screen", x, y, width, height } to background
   - Removes host, restores scroll
   - Sends { action: "reopen_popup" } to background → popup reopens
   ↓
10. background: chrome.tabs.captureVisibleTab() → full-page screenshot PNG
    → sends { action: "got_screenshot", dataUrl, x, y, width, height } to content
    ↓
11. content.js: got_screenshot handler
    - Detects DPR: ratio of naturalWidth to window.innerWidth
    - Scales crop coordinates by DPR
    - cropImage() on Canvas using scaled coordinates
    - isBlankImage() — checks pixel variance; if all pixels same color → sends restricted_page error
    - chrome.storage.local.set({ lastScreenshot: croppedDataUrl })
    ↓
12. popup (now reopened): setupScreenshotListeners() watches storage.onChanged
    → renderScreenshotPreview(dataUrl) — shows thumbnail above input with × close button
```

**content.js double-injection guard:** `window.__CHAD_CONTENT_LOADED__` flag prevents running twice if injected multiple times. Also `window.__CHAD_SCREENSHOT_ACTIVE__` prevents creating two overlays at once.

**Restricted pages** (chrome://, extensions pages, etc.): `executeScript` fails → `sendResponse({ success: false, error })` → popup shows `alert()`. Also, `captureVisibleTab` can return blank on some pages → content detects this and sends `restricted_page` message → popup shows error popup.

---

## Message Sending Flow

In `sendMessage.js → setupSendHandler()`:

```
1. Send button clicked
   ↓
2. hasContentToSend() — true if input has text OR lastScreenshot is in storage
   ↓
3. Read chrome.storage.local["lastScreenshot"]
   ↓
4. If screenshot: display image bubble in chat (with click-to-open-tab)
   If text: addMessage(text, "user")
   ↓
5. Disable send button, show "Processing data..." gradient text
   ↓
6. Build payload:
   {
     text: messageInput.value || "",
     screenshot: base64string_without_dataurl_prefix || "",
     chatId: "696817f8c80591bdcb7196d0",  ← HARDCODED for testing
   }
   ↓
7. POST http://localhost:3001/api/v2/ai/message   ← LOCALHOST, hardcoded
   Authorization: Bearer <hardcoded_token>         ← HARDCODED token for testing
   ↓
8. On success: remove "Processing...", addMessage(result.reply, "bot")
   On error: showErrorPopup(errorText), throw
   ↓
9. Clear messageInput, clear lastScreenshot from storage, hide preview
```

**What needs to change before shipping:**
- Replace hardcoded `authToken` with `chrome.storage.sync.get("accessToken")`
- Replace hardcoded `chatId` with the user's actual chatId from storage or API
- Change URL from `localhost:3001` to production server URL

---

## Chat Message Rendering (`modules/chat.js`)

`addMessage(text, sender)` renders a message div + action buttons:

**Bot messages** (`sender === "bot"`):
- `text` goes through `formatBotMessage(text)` (markdown → HTML) before `innerHTML`
- Action row below message: Copy button (copies stripped text to clipboard), Retry button (calls `handleRetry`)
- Code blocks inside get individual Copy buttons via `.code-copy-btn` class

**User messages** (`sender === "user"`):
- `text` set directly as `innerHTML` (no markdown processing)
- Action row: Copy button, Edit button (puts text back into input field)

`showCopiedPopup(button)` — shows floating "Copied!" tooltip, fades out after 800ms.

---

## Markdown Renderer (`modules/textParser.js`)

Custom implementation — no library. `formatBotMessage(text)` processes in this order:

1. Extract code blocks `` ``` `` → placeholder tokens (`@@CODEBLOCK_N@@`)
2. Extract inline code `` ` `` → placeholder tokens (`§§INLINECODE_N§§`)
3. Escape `<` and `>` in remaining text
4. Headings `#` through `######`
5. Bold/italic (`**`, `*`, `_`)
6. Checklists (`- [x]`, `- [ ]`)
7. Unordered lists (`-`, `*`, `+`)
8. Numbered lists (`1.`)
9. Blockquotes (`>`)
10. Math: inline `\(...\)`, block `\[...\]`, `$$...$$`, inline `$...$` → `convertSimpleMath()` which converts LaTeX-style superscripts, subscripts, fractions, Greek letters, operators to HTML/unicode
11. Tables (pipe syntax)
12. Horizontal rules (`---`)
13. Line breaks (`\n\n` → `<br><br>`)
14. Links `[text](url)` and YouTube links (auto-embeds iframe)
15. Images `![alt](url)`
16. Restore code blocks as `<div class="code-block">` with language label + copy button
17. Restore inline code as `<code>`

**Old commented-out version** of the parser is still in `textParser.js` above the current one. Safe to delete.

---

## Retry (`modules/utils/retry.js`)

`handleRetry(retryButton)` walks the DOM backwards from the retry button's action row to find the previous user message, extracts plain text, re-sends to the API.

**Problem:** `retry.js` still uses the old **v1** unauthenticated URL (`chad-server.onrender.com/api/v1/ai/message`) with no auth header. Needs to be updated to v2 with auth token, same as `sendMessage.js`.

---

## Sidebar (`modules/sidebar.js`)

Simple open/close via CSS class `open` on `#sidebar`. All links open new tabs:
- Website → `https://chad-ai-nd2k.onrender.com`
- Privacy Policy → `.../policy`
- Profile → `.../profile`
- Settings → `.../settings` — **this route doesn't exist on the website**
- Upgrade → `.../upgrade` — **this route doesn't exist on the website**

User section (name, plan, avatar) populated from `chrome.storage.sync.user` in `popup.js`.

---

## Auth Module (`modules/auth.js`)

`checkAuthState()` — reads `chrome.storage.sync`: returns `true` only if both `accessToken` AND `user` are present, AND `rememberMe !== false`.

**Not connected to anything yet:**
- Welcome screen buttons don't call auth flows
- There's no login/register UI inside the extension (intended to redirect to website, but not wired)
- Token refresh on expiry not implemented — if the 15-min JWT expires, extension will get 403s with no recovery

---

## Known Issues & Things Not Done

| Issue | Location | Notes |
|---|---|---|
| `DEV_MODE = true` | `popup.js:13` | Auth bypassed — always shows main screen |
| Hardcoded auth token | `sendMessage.js:57` | Replace with `chrome.storage.sync.get("accessToken")` |
| Hardcoded chatId | `sendMessage.js:52` | Replace with user's actual chatId |
| Hardcoded localhost URL | `sendMessage.js:60` | Change to production URL before shipping |
| Welcome screen buttons unwired | `popup.html` | Sign In, Register, Visit Website do nothing |
| Retry uses old v1 API | `utils/retry.js:36` | No auth, wrong endpoint |
| `/settings` and `/upgrade` routes | `popup.js:129,134` | These pages don't exist on website |
| Token refresh not implemented | — | 15-min access token expires, extension gets 403 with no recovery |
| No chat history on open | — | Popup only shows current session messages; no load from API on startup |
| Duplicate `getInitials` function | `popup.js:138`, `avatar.js:19` | Same function defined twice |
| `domEvents.js` mostly dead | `domEvents.js` | Settings accordion + theme toggle both reference commented-out HTML elements |
| Old markdown parser | `textParser.js:1-100` | Entire old version commented out — safe to delete |

---

## Key Chrome Extension Gotchas

- **Service worker has no DOM and no persistent state.** Variables in `background.js` are reset when the worker sleeps. Use `chrome.storage` for anything that must persist.
- **Popup closes when user clicks away.** All popup state is lost. Screenshots survive via `chrome.storage.local`. Auth state survives via `chrome.storage.sync`.
- **`content.js` is NOT an ES module** — it uses an IIFE, not `import/export`. Don't add `import` statements. It's injected via `executeScript`, not listed in manifest `content_scripts`.
- **`return true` in message listeners** keeps `sendResponse` alive for async responses. Missing this causes "message port closed" errors.
- **Shadow DOM in `content.js`** fully isolates the capture overlay from the page's CSS. Any styles for the overlay must go inside the shadow stylesheet, not `popup.css`.
- **`chrome.action.openPopup()`** only works in certain contexts (user gesture, etc.) — calling it from a service worker may silently fail. This is how the popup reopens after capture.
- **DPR scaling** in `content.js` — `captureVisibleTab` returns a screenshot in device pixels, but mouse coordinates are in CSS pixels. The crop is scaled by `naturalWidth / window.innerWidth` to match.
- **Adding new permissions** requires updating `manifest.json` AND re-loading the extension in Chrome. Users with installed versions will be prompted to accept new permissions on update.
- **CORS:** The server's `allowedOrigins` in `chadai_server/server.js` includes both extension IDs (`kolefjoacfickglplddbbbahmmjlokop` and `ickgehmenchgiejcekmkhncbjcbngbdh`). If you publish a new version with a different extension ID, add it there.

---

## How to Load / Reload the Extension

1. Open Chrome → `chrome://extensions`
2. Enable Developer Mode (top right toggle)
3. Click "Load Unpacked" → select the `my-extension/` folder
4. After any JS/HTML/CSS change: click the ↺ reload button on the extension card
5. After `manifest.json` changes: reload is required AND Chrome may show a permission prompt
6. Open DevTools for the popup: right-click the extension popup → "Inspect"
7. Open DevTools for the service worker: on the extensions page, click "service worker" link under the extension
8. Open DevTools for content.js: open DevTools on the target page → Sources → Content Scripts
