const NOTION_VERSION = "2022-06-28";

const SETTINGS = {
  titleProperty: "Title",
  urlProperty: "External Link",
  categoryProperty: "Category",
  descriptionProperty: "Hover Description",
  subcategoryProperty: "Subcategory",
  pricingProperty: "Pricing Type",
  coverProperty: "thumbnailUrl",
};

function extractPlainText(richText = []) {
  return richText.map((t) => t.plain_text).join("").trim();
}

function pickProperty(properties, preferredNames, typeFilter) {
  const entries = Object.entries(properties ?? {});
  for (const name of preferredNames) {
    const key = entries.find(([k]) => k.toLowerCase() === name.toLowerCase());
    if (key && (!typeFilter || key[1].type === typeFilter)) return key;
  }
  if (typeFilter) {
    return entries.find(([, prop]) => prop.type === typeFilter) ?? null;
  }
  return null;
}

function getProp(properties, settingKey, fallbackNames, typeFilter) {
  const custom = SETTINGS[settingKey];
  if (custom && properties[custom]) return [custom, properties[custom]];
  return pickProperty(properties, fallbackNames, typeFilter);
}

function readTitle(prop) {
  if (!prop) return "";
  if (prop.type === "title") return extractPlainText(prop.title);
  return "";
}

function readUrl(prop) {
  if (!prop) return "";
  if (prop.type === "url") return prop.url ?? "";
  return "";
}

function readSelect(prop) {
  if (!prop) return "";
  if (prop.type === "select") return prop.select?.name ?? "";
  return "";
}

function readCheckbox(prop) {
  if (!prop || prop.type !== "checkbox") return false;
  return Boolean(prop.checkbox);
}

function readDescription(prop) {
  if (!prop) return "";
  if (prop.type === "rich_text") return extractPlainText(prop.rich_text);
  return "";
}

function normalizeImageUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? url : "";
  } catch {
    return "";
  }
}

function readImageUrl(prop) {
  if (!prop) return "";
  if (prop.type === "url") return normalizeImageUrl(prop.url);
  if (prop.type === "rich_text") return normalizeImageUrl(extractPlainText(prop.rich_text));
  if (prop.type === "formula" && prop.formula?.type === "string") {
    return normalizeImageUrl(prop.formula.string);
  }
  if (prop.type !== "files") return "";

  const file = prop.files?.[0];
  if (!file) return "";
  if (file.type === "file") return normalizeImageUrl(file.file?.url);
  if (file.type === "external") return normalizeImageUrl(file.external?.url);
  return "";
}

export function mapPageToItem(page) {
  const { properties } = page;

  const title = readTitle(
    getProp(properties, "titleProperty", ["Title", "Name"], "title")?.[1]
  );
  const url = readUrl(
    getProp(properties, "urlProperty", ["External Link", "URL"], "url")?.[1]
  );
  const category = readSelect(
    getProp(properties, "categoryProperty", ["Category"], "select")?.[1]
  );
  const subcategory = readSelect(
    getProp(properties, "subcategoryProperty", ["Subcategory"], "select")?.[1]
  );
  const pricing = readSelect(
    getProp(properties, "pricingProperty", ["Pricing Type"], "select")?.[1]
  );
  const description = readDescription(
    getProp(properties, "descriptionProperty", ["Hover Description"], "rich_text")?.[1]
  );
  const coverImage = readImageUrl(
    getProp(
      properties,
      "coverProperty",
      ["thumbnailUrl", "Thumbnail URL", "Thumbnail", "Cover Image"]
    )?.[1]
  );
  const isNew = readCheckbox(
    pickProperty(properties, ["New", "Is New"], "checkbox")?.[1]
  );
  const isSponsored = readCheckbox(
    pickProperty(properties, ["Sponsored", "Is Sponsored"], "checkbox")?.[1]
  );

  let hostname = "";
  try {
    if (url) hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* ignore */
  }

  return {
    id: page.id,
    title: title || hostname || "Untitled",
    url,
    category,
    subcategory,
    pricing,
    description,
    coverImage,
    isNew,
    isSponsored,
    tags: subcategory ? [subcategory] : [],
    hostname,
    favicon: url
      ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`
      : "",
  };
}

export async function fetchArchiveItems(env) {
  const token = env.NOTION_TOKEN?.trim();
  const databaseId = env.NOTION_DATABASE_ID?.replace(/-/g, "").trim();

  if (!token || !databaseId) {
    throw new Error("Worker missing NOTION_TOKEN or NOTION_DATABASE_ID secrets.");
  }

  const items = [];
  let cursor;

  do {
    const body = cursor ? { start_cursor: cursor } : {};
    const response = await fetch(
      `https://api.notion.com/v1/databases/${databaseId}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Notion API error (${response.status})`);
    }

    const data = await response.json();
    for (const page of data.results ?? []) {
      if (page.object !== "page") continue;
      const item = mapPageToItem(page);
      if (item.url) items.push(item);
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  items.sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  );
  return items;
}
