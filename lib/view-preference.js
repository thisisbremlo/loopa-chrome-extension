import { api } from "./browser-api.js";

const VIEW_KEY = "loopaViewMode";
export const VIEW_GRID = "grid";
export const VIEW_LIST = "list";

export function getViewMode() {
  return new Promise((resolve) => {
    api.storage.local.get({ [VIEW_KEY]: VIEW_GRID }, (items) => {
      const mode = items[VIEW_KEY];
      resolve(mode === VIEW_LIST ? VIEW_LIST : VIEW_GRID);
    });
  });
}

export function setViewMode(mode) {
  return new Promise((resolve) => {
    api.storage.local.set({ [VIEW_KEY]: mode }, resolve);
  });
}
