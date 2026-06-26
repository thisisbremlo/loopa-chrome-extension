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

function isLoopaWebsite(url = "") {
  return url.startsWith("https://loopa.framer.website/");
}

async function sendToActiveLoopaTab(message) {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  const tab = tabs?.[0];
  if (!tab?.id || !isLoopaWebsite(tab.url)) {
    return { ok: false, reason: "No active Loopa tab" };
  }

  try {
    return await api.tabs.sendMessage(tab.id, message);
  } catch {
    await api.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["content/saved-sync.js"],
    });
    return api.tabs.sendMessage(tab.id, message);
  }
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

api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (
    message?.type !== "loopa:broadcast-saved-slugs" &&
    message?.type !== "loopa:read-saved-slugs"
  ) {
    return false;
  }

  (async () => {
    try {
      if (message.type === "loopa:read-saved-slugs") {
        sendResponse(
          await sendToActiveLoopaTab({ type: "loopa:get-saved-slugs" })
        );
        return;
      }

      const result = await sendToActiveLoopaTab({
        type: "loopa:set-saved-slugs",
        slugs: message.slugs,
      });
      sendResponse(result?.ok ? { ok: true } : result);
    } catch (err) {
      sendResponse({
        ok: false,
        reason: err?.message || "No active Loopa tab",
      });
    }
  })();

  return true;
});
