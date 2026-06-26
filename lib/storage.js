import { LOOPA_API_BASE, LOOPA_API_KEY } from "./api-config.js";
import {
  getExtensionSavedSlugs,
  setExtensionSavedSlugs,
} from "./saved-storage.js";

const PROPERTY_DEFAULTS = {
  titleProperty: "Title",
  urlProperty: "externalLink",
  categoryProperty: "Category",
  descriptionProperty: "Hover Description",
  subcategoryProperty: "Subcategory",
  pricingProperty: "Pricing Type",
  coverProperty: "thumbnailUrl",
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
  return getExtensionSavedSlugs();
}

export async function setBookmarks(bookmarks) {
  return setExtensionSavedSlugs(bookmarks);
}
