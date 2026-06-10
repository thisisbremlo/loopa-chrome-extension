import { queryArchive } from "../lib/notion.js";
import { getSettings, isConfigured, getBookmarks, setBookmarks } from "../lib/storage.js";
import {
  getViewMode,
  setViewMode,
  VIEW_GRID,
  VIEW_LIST,
} from "../lib/view-preference.js";
import { iconifyIcon, VIEW_ICON } from "../lib/icons.js";

const isEmbed = new URLSearchParams(location.search).has("embed");

if (isEmbed) {
  document.documentElement.classList.add("embed");
  document.getElementById("close-btn")?.removeAttribute("hidden");

  const parentOrigin = (() => {
    try {
      const origin = document.referrer ? new URL(document.referrer).origin : "";
      return origin && origin !== "null" ? origin : "*";
    } catch {
      return "*";
    }
  })();

  const closeFn = () =>
    parent.postMessage({ type: "loopa-archive-close" }, parentOrigin);
  
  document.getElementById("close-btn")?.addEventListener("click", closeFn);
  
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeFn();
  });
}

const gridEl = document.getElementById("grid");
const statusEl = document.getElementById("status");
const searchEl = document.getElementById("search");
const categoryEl = document.getElementById("category-filter");
const pricingEl = document.getElementById("pricing-filter");
const refreshBtn = document.getElementById("refresh-btn");
const viewToggleBtn = document.getElementById("view-toggle");
const newFilterEl = document.getElementById("new-filter");
const bookmarksFilterEl = document.getElementById("bookmarks-filter");

document.getElementById("search-icon").innerHTML = iconifyIcon("magnifyingGlass", 16);
document.getElementById("category-chevron").innerHTML = iconifyIcon("caretDown", 14);
document.getElementById("pricing-chevron").innerHTML = iconifyIcon("caretDown", 14);
const refreshIconEl = refreshBtn.querySelector(".refresh-icon");
if (refreshIconEl) {
  refreshIconEl.innerHTML = iconifyIcon("arrowPath", 15);
}
document.getElementById("close-btn")?.insertAdjacentHTML(
  "afterbegin",
  iconifyIcon("x", 16)
);
const bookmarksFilterBtn = document.getElementById("bookmarks-filter-btn");
if (bookmarksFilterBtn) {
  bookmarksFilterBtn.innerHTML = iconifyIcon("bookmark", 16);
}
const supportIconEl = document.querySelector(".support-icon");
if (supportIconEl) {
  supportIconEl.innerHTML = iconifyIcon("heartSolid", 16);
}

let allItems = [];
let activeCategory = "All";
let activePricing = "All";
let viewMode = VIEW_GRID;
let bookmarkedIds = new Set();

function showStatus(message, type = "loading") {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
}

function hideStatus() {
  statusEl.hidden = true;
  statusEl.textContent = "";
  statusEl.className = "status";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&#60;")
    .replaceAll(">", "&#62;")
    .replaceAll('"', "&#34;");
}

function applyViewMode(mode) {
  viewMode = mode;
  gridEl.classList.remove("view-grid", "view-list");
  gridEl.classList.add(mode === VIEW_LIST ? "view-list" : "view-grid");

  const isList = mode === VIEW_LIST;
  viewToggleBtn.dataset.view = mode;
  const iconEl = viewToggleBtn.querySelector(".view-toggle-icon");
  const labelEl = viewToggleBtn.querySelector(".view-toggle-label");
  if (iconEl) iconEl.innerHTML = iconifyIcon(VIEW_ICON[mode], 15);
  if (labelEl) labelEl.textContent = isList ? "List" : "Grid";
  viewToggleBtn.classList.toggle("is-active", true);
  viewToggleBtn.title = isList ? "List view" : "Grid view";
  viewToggleBtn.setAttribute(
    "aria-label",
    isList
      ? "List view active. Click to switch to grid."
      : "Grid view active. Click to switch to list."
  );
}

async function initViewMode() {
  const saved = await getViewMode();
  applyViewMode(saved);
}

viewToggleBtn?.addEventListener("click", async () => {
  const next = viewMode === VIEW_GRID ? VIEW_LIST : VIEW_GRID;
  applyViewMode(next);
  await setViewMode(next);
});

function renderCategoryFilter(items) {
  const categories = [
    "All",
    ...[...new Set(items.map((i) => i.category).filter(Boolean))].sort(),
  ];

  const previous = activeCategory;
  categoryEl.innerHTML = categories
    .map((cat) => {
      const label = cat === "All" ? "All categories" : cat;
      return `<option value="${escapeHtml(cat)}">${escapeHtml(label)}</option>`;
    })
    .join("");

  if (categories.includes(previous)) {
    categoryEl.value = previous;
  } else {
    activeCategory = "All";
    categoryEl.value = "All";
  }
}

function renderPricingFilter(items) {
  const pricingTypes = [
    "All",
    ...[...new Set(items.map((i) => i.pricing).filter(Boolean))].sort(),
  ];

  const previous = activePricing;
  pricingEl.innerHTML = pricingTypes
    .map((p) => {
      const label = p === "All" ? "All pricing" : p;
      return `<option value="${escapeHtml(p)}">${escapeHtml(label)}</option>`;
    })
    .join("");

  if (pricingTypes.includes(previous)) {
    pricingEl.value = previous;
  } else {
    activePricing = "All";
    pricingEl.value = "All";
  }
}

function filterItems() {
  const q = searchEl.value.trim().toLowerCase();
  return allItems.filter((item) => {
    if (activeCategory !== "All" && item.category !== activeCategory) return false;
    if (activePricing !== "All" && item.pricing !== activePricing) return false;
    if (newFilterEl && newFilterEl.checked && !item.isNew) return false;
    if (bookmarksFilterEl && bookmarksFilterEl.checked && !bookmarkedIds.has(item.id)) return false;
    if (!q) return true;
    const haystack = [
      item.title,
      item.url,
      item.hostname,
      item.category,
      item.subcategory,
      item.pricing,
      item.description,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

function renderCard(item) {
  const coverBlock = item.coverImage
    ? `
        <div class="cover-skeleton" aria-hidden="true"></div>
        <img
          class="cover cover-img is-loading"
          src="${escapeHtml(item.coverImage)}"
          alt=""
          loading="lazy"
          decoding="async"
        />`
    : `<div class="cover-fallback" aria-hidden="true"></div>`;

  const flags = [
    item.isNew ? '<span class="flag flag-new">New</span>' : "",
    item.isSponsored ? '<span class="flag flag-sponsored">Sponsored</span>' : "",
  ]
    .filter(Boolean)
    .join("");

  const meta = [
    item.subcategory ? `<span class="tag">${escapeHtml(item.subcategory)}</span>` : "",
    item.pricing ? `<span class="tag">${escapeHtml(item.pricing)}</span>` : "",
  ].join("");

  return `
    <div class="card" role="listitem">
      <a class="card-link" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">
        <div class="cover-wrap">
          ${coverBlock}
          ${flags ? `<div class="card-badges">${flags}</div>` : ""}
        </div>
        <div class="card-body">
          <div class="card-title-row">
            <img class="favicon is-loading" src="${escapeHtml(item.favicon)}" alt="" width="22" height="22" loading="lazy" decoding="async" />
            <h2>${escapeHtml(item.title)}</h2>
          </div>
          ${item.description ? `<p class="description">${escapeHtml(item.description)}</p>` : ""}
          ${meta ? `<div class="meta">${meta}</div>` : ""}
        </div>
      </a>
      <button type="button" class="bookmark-btn ${bookmarkedIds.has(item.id) ? "is-active" : ""}" data-id="${escapeHtml(item.id)}" title="${bookmarkedIds.has(item.id) ? "Remove bookmark" : "Add bookmark"}" aria-label="${bookmarkedIds.has(item.id) ? "Remove bookmark" : "Add bookmark"}">
        ${iconifyIcon(bookmarkedIds.has(item.id) ? "bookmarkSolid" : "bookmark", 16)}
      </button>
    </div>
  `;
}

function bindMediaLoad(root) {
  root.querySelectorAll(".cover-img, .favicon").forEach((img) => {
    const onDone = (ok) => {
      img.classList.remove("is-loading");
      if (ok) {
        img.classList.add("is-loaded");
        const skeleton = img.closest(".cover-wrap")?.querySelector(".cover-skeleton");
        if (skeleton) skeleton.classList.add("is-hidden");
      } else {
        img.classList.add("is-error");
        const wrap = img.closest(".cover-wrap");
        if (wrap && img.classList.contains("cover-img")) {
          img.remove();
          if (!wrap.querySelector(".cover-fallback")) {
            wrap.insertAdjacentHTML(
              "afterbegin",
              '<div class="cover-fallback" aria-hidden="true"></div>'
            );
          }
          wrap.querySelector(".cover-skeleton")?.remove();
        }
      }
    };

    if (img.complete && img.naturalWidth > 0) {
      onDone(true);
    } else if (img.complete) {
      onDone(false);
    } else {
      img.addEventListener("load", () => onDone(true), { once: true });
      img.addEventListener("error", () => onDone(false), { once: true });
    }
  });
}

function renderItems(items) {
  if (!items.length) {
    gridEl.innerHTML = `<p class="empty">No finds match your search.</p>`;
    return;
  }

  gridEl.innerHTML = items.map(renderCard).join("");
  bindMediaLoad(gridEl);
}

async function loadArchive() {
  if (!isConfigured()) {
    showStatus(
      "API not configured. Set LOOPA_API_BASE in lib/api-config.js (see worker/README.md).",
      "error"
    );
    gridEl.innerHTML = "";
    return;
  }

  showStatus("Loading finds…", "loading");
  refreshBtn.disabled = true;
  refreshBtn.classList.add("is-spinning");

  try {
    const settings = await getSettings();
    const [items, bookmarks] = await Promise.all([
      queryArchive(settings),
      getBookmarks()
    ]);
    allItems = items;
    bookmarkedIds = new Set(bookmarks);
    hideStatus();
    activeCategory = "All";
    activePricing = "All";
    renderCategoryFilter(allItems);
    renderPricingFilter(allItems);
    renderItems(filterItems());
  } catch (err) {
    showStatus(err.message || "Failed to load archive.", "error");
    gridEl.innerHTML = "";
  } finally {
    refreshBtn.disabled = false;
    refreshBtn.classList.remove("is-spinning");
  }
}

searchEl.addEventListener("input", () => renderItems(filterItems()));
categoryEl.addEventListener("change", () => {
  activeCategory = categoryEl.value;
  renderItems(filterItems());
});
pricingEl.addEventListener("change", () => {
  activePricing = pricingEl.value;
  renderItems(filterItems());
});
if (newFilterEl) {
  newFilterEl.addEventListener("change", () => renderItems(filterItems()));
}
if (bookmarksFilterEl) {
  bookmarksFilterEl.addEventListener("change", () => {
    if (bookmarksFilterBtn) {
      bookmarksFilterBtn.innerHTML = iconifyIcon(
        bookmarksFilterEl.checked ? "bookmarkSolid" : "bookmark",
        16
      );
    }
    renderItems(filterItems());
  });
}
refreshBtn.addEventListener("click", loadArchive);

gridEl.addEventListener("click", async (e) => {
  const btn = e.target.closest(".bookmark-btn");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();

  const id = btn.dataset.id;
  if (!id) return;

  if (bookmarkedIds.has(id)) {
    bookmarkedIds.delete(id);
    btn.classList.remove("is-active");
    btn.innerHTML = iconifyIcon("bookmark", 16);
    btn.title = "Add bookmark";
    btn.setAttribute("aria-label", "Add bookmark");
  } else {
    bookmarkedIds.add(id);
    btn.classList.add("is-active");
    btn.innerHTML = iconifyIcon("bookmarkSolid", 16);
    btn.title = "Remove bookmark";
    btn.setAttribute("aria-label", "Remove bookmark");
  }

  await setBookmarks(Array.from(bookmarkedIds));
  
  if (bookmarksFilterEl && bookmarksFilterEl.checked) {
    renderItems(filterItems());
  }
});

(async () => {
  await initViewMode();
  await loadArchive();
})();
