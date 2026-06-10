import { api } from "../lib/browser-api.js";

const BLOCKED_SCHEMES = [
  "chrome:",
  "chrome-extension:",
  "edge:",
  "about:",
  "moz-extension:",
  "vivaldi:",
];

function canInject(url = "") {
  if (!url) return false;
  if (BLOCKED_SCHEMES.some((scheme) => url.startsWith(scheme))) return false;
  if (url.includes("chrome.google.com/webstore")) return false;
  return url.startsWith("http://") || url.startsWith("https://") || url.startsWith("file:");
}

api.action.onClicked.addListener(async (tab) => {
  if (!tab?.id || !canInject(tab.url)) {
    return;
  }

  try {
    await api.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/overlay.js"],
    });
  } catch {
    /* tab may not allow injection (restricted pages) */
  }
});
