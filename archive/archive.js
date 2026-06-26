import { queryArchive } from "../lib/notion.js";
import { getSettings, isConfigured } from "../lib/storage.js";
import {
  getExtensionSavedSlugs,
  normalizeSlug,
  setExtensionSavedSlugs,
} from "../lib/saved-storage.js";
import { api } from "../lib/browser-api.js";
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
let savedSlugs = new Set();

const PRICING_LABELS = new Set([
  "free",
  "paid",
  "freemium",
  "free trial",
  "trial",
  "open source",
]);

function normalizeComparableLabel(value) {
  return String(value ?? "").trim().toLowerCase();
}

function normalizeFlag(value) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value !== "string") return false;

  const normalized = value.trim().toLowerCase();
  return ["1", "true", "yes", "new", "sponsored"].includes(normalized);
}

function normalizePricing(item) {
  const pricing = String(item?.pricing ?? "").trim();
  if (!pricing) return "";

  const normalizedPricing = normalizeComparableLabel(pricing);
  if (!PRICING_LABELS.has(normalizedPricing)) {
    return "";
  }

  const category = normalizeComparableLabel(item?.category);
  const subcategory = normalizeComparableLabel(item?.subcategory);
  if (normalizedPricing === category || normalizedPricing === subcategory) {
    return "";
  }

  return pricing;
}

function normalizeArchiveItem(item) {
  return {
    ...item,
    pricing: normalizePricing(item),
    isNew: normalizeFlag(item?.isNew),
    isSponsored: normalizeFlag(item?.isSponsored),
  };
}

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

function slugify(value) {
  return normalizeSlug(value)
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getHostnameSlug(item) {
  const hostname = normalizeSlug(item?.hostname);
  const source = hostname || (() => {
    try {
      return item?.url ? new URL(item.url).hostname : "";
    } catch {
      return "";
    }
  })();

  return slugify(source.replace(/^www\./, "").split(".")[0]);
}

function getItemSlugCandidates(item) {
  const candidates = [
    item?.slug,
    item?.cmsSlug,
    item?.framerCMSSlug,
    slugify(item?.title),
    getHostnameSlug(item),
    item?.id,
  ];
  const seen = new Set();
  return candidates
    .map(normalizeSlug)
    .filter((slug) => {
      if (!slug || seen.has(slug)) return false;
      seen.add(slug);
      return true;
    });
}

function getItemSavedSlug(item) {
  const candidates = getItemSlugCandidates(item);
  return candidates.find((slug) => savedSlugs.has(slug)) ?? candidates[0] ?? "";
}

function getItemLegacyId(item) {
  return normalizeSlug(item?.notionId ?? item?.id);
}

function isItemSaved(item) {
  const legacyId = getItemLegacyId(item);
  return Boolean(
    getItemSlugCandidates(item).some((slug) => savedSlugs.has(slug)) ||
      (legacyId && savedSlugs.has(legacyId))
  );
}

async function syncSavedSlugsToActiveLoopaTab(slugs) {
  try {
    await api.runtime.sendMessage({
      type: "loopa:broadcast-saved-slugs",
      slugs,
    });
  } catch {
    /* the active tab may not be a Loopa page */
  }
}

async function getActiveLoopaSavedSlugs() {
  try {
    const response = await api.runtime.sendMessage({
      type: "loopa:read-saved-slugs",
    });
    return response?.ok && Array.isArray(response.slugs)
      ? response.slugs
      : null;
  } catch {
    return null;
  }
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
    if (bookmarksFilterEl && bookmarksFilterEl.checked && !isItemSaved(item)) return false;
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
  const saved = isItemSaved(item);
  const savedSlug = getItemSavedSlug(item);
  const legacyId = getItemLegacyId(item);
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
      <button type="button" class="bookmark-btn ${saved ? "is-active" : ""}" data-slug="${escapeHtml(savedSlug)}" data-legacy-id="${escapeHtml(legacyId)}" title="${saved ? "Remove bookmark" : "Add bookmark"}" aria-label="${saved ? "Remove bookmark" : "Add bookmark"}">
        ${iconifyIcon(saved ? "bookmarkSolid" : "bookmark", 16)}
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

  showStatus("Loading finds...", "loading");
  refreshBtn.disabled = true;
  refreshBtn.classList.add("is-spinning");

  try {
    const settings = await getSettings();
    const [items, extensionSlugs, activeTabSlugs] = await Promise.all([
      queryArchive(settings),
      getExtensionSavedSlugs(),
      getActiveLoopaSavedSlugs()
    ]);
    const bookmarks = activeTabSlugs
      ? await setExtensionSavedSlugs(activeTabSlugs)
      : extensionSlugs;
    allItems = items.map(normalizeArchiveItem);
    savedSlugs = new Set(bookmarks);
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

  const slug = normalizeSlug(btn.dataset.slug);
  const legacyId = normalizeSlug(btn.dataset.legacyId);
  if (!slug) return;

  if (savedSlugs.has(slug) || (legacyId && savedSlugs.has(legacyId))) {
    savedSlugs.delete(slug);
    if (legacyId) savedSlugs.delete(legacyId);
    btn.classList.remove("is-active");
    btn.innerHTML = iconifyIcon("bookmark", 16);
    btn.title = "Add bookmark";
    btn.setAttribute("aria-label", "Add bookmark");
  } else {
    savedSlugs.add(slug);
    btn.classList.add("is-active");
    btn.innerHTML = iconifyIcon("bookmarkSolid", 16);
    btn.title = "Remove bookmark";
    btn.setAttribute("aria-label", "Remove bookmark");
  }

  const nextSlugs = await setExtensionSavedSlugs(Array.from(savedSlugs));
  savedSlugs = new Set(nextSlugs);
  await syncSavedSlugsToActiveLoopaTab(nextSlugs);
  
  if (bookmarksFilterEl && bookmarksFilterEl.checked) {
    renderItems(filterItems());
  }
});

(async () => {
  await initViewMode();
  await loadArchive();
})();
