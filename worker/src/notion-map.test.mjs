import assert from "node:assert/strict";
import { mapPageToItem } from "./notion-map.js";

function select(name) {
  return { type: "select", select: { name } };
}

function checkbox(value) {
  return { type: "checkbox", checkbox: value };
}

function title(value) {
  return { type: "title", title: [{ plain_text: value }] };
}

function richText(value) {
  return { type: "rich_text", rich_text: [{ plain_text: value }] };
}

function url(value) {
  return { type: "url", url: value };
}

function page(properties) {
  return {
    id: "page-id",
    properties: {
      Title: title("21st.dev"),
      externalLink: url("https://21st.dev"),
      ...properties,
    },
  };
}

{
  const item = mapPageToItem(
    page({
      category: select("UI Components"),
      subcategory: select("Custom / Next.js"),
      "is-sponsored": checkbox(true),
    })
  );

  assert.equal(item.category, "UI Components");
  assert.equal(item.subcategory, "Custom / Next.js");
  assert.equal(item.pricing, "");
  assert.equal(item.isNew, false);
  assert.equal(item.isSponsored, true);
}

{
  const item = mapPageToItem(
    page({
      title: title("Agency Gallery"),
      slug: richText("agency-gallery"),
      hover_description: richText("Digital Agency Archive"),
      category: select("Inspiration"),
      subcategory: select("Web Design"),
      thumbnailUrl: url("https://cdn.example.com/thumb.png"),
      externalLink: url("https://agencygallery.com"),
      "pricing-type": select("Free"),
      "is-new": checkbox(true),
      "is-sponsored": checkbox(false),
    })
  );

  assert.equal(item.title, "Agency Gallery");
  assert.equal(item.slug, "agency-gallery");
  assert.equal(item.description, "Digital Agency Archive");
  assert.equal(item.category, "Inspiration");
  assert.equal(item.subcategory, "Web Design");
  assert.equal(item.pricing, "Free");
  assert.equal(item.isNew, true);
  assert.equal(item.isSponsored, false);
  assert.equal(item.coverImage, "https://cdn.example.com/thumb.png");
}
