import { LOOPA_API_BASE, LOOPA_API_KEY } from "./api-config.js";
import { api } from "./browser-api.js";

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

function hasExtensionStorage() {
  return Boolean(api?.storage?.local);
}

function usesPromiseStorage() {
  return typeof globalThis.browser !== "undefined" && api === globalThis.browser;
}

function storageGet(keys) {
  if (!hasExtensionStorage()) return null;
  if (usesPromiseStorage()) return api.storage.local.get(keys);
  return new Promise((resolve) => api.storage.local.get(keys, resolve));
}

function storageSet(items) {
  if (!hasExtensionStorage()) return null;
  if (usesPromiseStorage()) return api.storage.local.set(items);
  return new Promise((resolve) => api.storage.local.set(items, resolve));
}

export async function getBookmarks() {
  if (hasExtensionStorage()) {
    const res = await storageGet("loopa_bookmarks");
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
  if (hasExtensionStorage()) {
    await storageSet({ loopa_bookmarks: bookmarks });
  } else {
    try {
      localStorage.setItem("loopa_bookmarks", JSON.stringify(bookmarks));
    } catch (err) {}
  }
}
