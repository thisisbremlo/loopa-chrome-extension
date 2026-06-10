import { LOOPA_API_BASE, LOOPA_API_KEY } from "./api-config.js";

const PROPERTY_DEFAULTS = {
  titleProperty: "Title",
  urlProperty: "External Link",
  categoryProperty: "Category",
  descriptionProperty: "Hover Description",
  subcategoryProperty: "Subcategory",
  pricingProperty: "Pricing Type",
  coverProperty: "Cover Image",
  tagsProperty: "",
};

export function getSettings() {
  return Promise.resolve({
    apiBase: LOOPA_API_BASE.replace(/\/$/, ""),
    apiKey: LOOPA_API_KEY?.trim() ?? "",
    ...PROPERTY_DEFAULTS,
  });
}

export function isConfigured() {
  return Boolean(LOOPA_API_BASE?.trim());
}

export async function getBookmarks() {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    const res = await chrome.storage.local.get("loopa_bookmarks");
    return res.loopa_bookmarks || [];
  }
  try {
    const saved = localStorage.getItem("loopa_bookmarks");
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    return [];
  }
}

export async function setBookmarks(bookmarks) {
  if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
    await chrome.storage.local.set({ loopa_bookmarks: bookmarks });
  } else {
    try {
      localStorage.setItem("loopa_bookmarks", JSON.stringify(bookmarks));
    } catch (err) {}
  }
}
