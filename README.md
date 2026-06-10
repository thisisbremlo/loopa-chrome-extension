# 🔄 Loopa Extension

<div align="center">
  <p><strong>Browse your curated Notion design library directly from your browser via a gorgeous, high-performance drawer overlay.</strong></p>

  [![Chrome Web Store](https://img.shields.io/badge/Chrome%20Web%20Store-Add%20to%20Chrome-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)](https://chromewebstore.google.com/)
  [![Version](https://img.shields.io/badge/Version-1.0.0-emerald?style=for-the-badge)](#)
  [![License](https://img.shields.io/badge/License-Proprietary-darkred?style=for-the-badge)](#)
</div>

---

## 🌟 Introduction

**Loopa** is a premium companion browser extension that allows you to access and search your design bookmarks directly inside any webpage. 

Unlike traditional bookmarking tools, Loopa bridges your **Notion Database** and a **Browser Extension** via a secure **Cloudflare Worker proxy**. This ensures your private Notion workspace integration tokens are kept secure on Cloudflare's servers, allowing you to safely share the extension client with others without exposing your keys.

---

## 🔒 Security-First Architecture

Your Notion Integration Token (`secret_...` or `ntn_...`) is private and grants full access to your workspace. **It must never be exposed inside the extension client files.**

This project uses a secure proxy model:
1. **The Extension Client:** Communicates only with your Cloudflare Worker URL. It does *not* store, see, or transmit your Notion tokens.
2. **The Cloudflare Worker Proxy:** Receives requests from the extension, authorizes them, queries the Notion API, maps the response into a clean JSON array, and sends it back to the client.
3. **Secret Storage:** Tokens are stored locally in `worker/.dev.vars` (gitignored) for development, and uploaded directly as secrets on Cloudflare via `wrangler secret put` for production.

---

## 🎨 Visual Preview

Loopa features glassmorphism backdrops, responsive viewport styling, dark mode theme tokens, image loading skeletons, and interactive state transitions.

| 📱 Grid View (Cover Focus) | 📱 List View (Compact Focus) |
|:---:|:---:|
| ![Grid View](assets/grid_view.png) | ![List View](assets/list_view.png) |

---

## ⚡ Key Features

*   **🛡️ Secure Proxy Model:** Notion API credentials and Database IDs never ship in client-side extension builds.
*   **🖼️ Gorgeous Floating Drawer:** Injects a modern overlay inside a Shadow DOM context (preventing host page CSS conflicts) with a blurred glass backdrop.
*   **🔄 Persisted Layouts:** Easily toggle between a visual **Grid layout** (covers & cards) and a compact **List layout** (scanability). Layout state is persisted.
*   **🔍 Instant Search & Filter:** Filter items in real time by keywords (matches title, domain, description, subcategories, pricing) or filter by category/pricing dropdowns.
*   **🔖 Local Bookmarks:** Save specific items from the archive to a local bookmarks list with a single click.
*   **✨ Premium Micro-Interactions:** Custom SVG icons, image lazy loading with skeletons/shimmer, Google favicon integration, and fallback placeholders.
*   **📦 Cross-Browser Support:** Manifest V3 compatible, running on Google Chrome, Brave, Microsoft Edge, Opera, and Mozilla Firefox.
*   **🛠️ Build Scripts Included:** Automated PowerShell packager (`build.ps1`) to compile and zip the extension directory.

---

## 🏗️ Data Flow

```
┌─────────────────┐        ┌───────────────────────┐        ┌──────────────┐
│  Browser Tab    │        │   Cloudflare Worker   │        │  Notion API  │
│                 │  HTTP  │                       │  HTTP  │              │
│ ┌─────────────┐ │ ──────>│ ┌───────────────────┐ │ ──────>│              │
│ │  Loopa UI   │ │        │ │ `LOOPA_API_KEY`   │ │        │  (Notion     │
│ │  (Iframe)   │ │ <──────│ │ (Abuse Shield)    │ │ <──────│   Database)  │
│ └─────────────┘ │        │ └───────────────────┘ │        │              │
└─────────────────┘        └───────────────────────┘        └──────────────┘
                                       ▲
                                       │
                               ┌───────┴───────┐
                               │ NOTION_TOKEN  │
                               │ DATABASE_ID   │
                               │ (Worker Env)  │
                               └───────────────┘
```

---

## 📥 Installation & Setup

### Option 1: Quick Install (For Users)
1. Head over to the [Chrome Web Store](https://chromewebstore.google.com/) (or click the badge above).
2. Click **Add to Chrome**.
3. Click the **Extensions** (puzzle piece) icon in your toolbar, locate **Loopa**, and click the **Pin** icon.
4. Open any webpage and click the Loopa toolbar icon to open the panel!

---

### Option 2: Developer / Self-Host Setup

#### 1. Set Up Your Notion Database
1. Go to the [Notion Integrations Dashboard](https://www.notion.so/profile/integrations).
2. Create a new integration named `Loopa Extension` and copy the generated **Internal Integration Token** (`secret_...`).
3. Open your bookmarks database inside Notion, click the `•••` in the top right, go to **Connect to**, and choose your new integration.
4. Extract the **Database ID** from your Notion URL:
   ```text
   https://www.notion.so/34675f4ef864804aaebdf5ae02c24d99?v=...
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                         Database ID (32-character hex)
   ```

#### 2. Configure and Deploy the Cloudflare Worker Proxy
1. Navigate to the `worker/` directory:
   ```bash
   cd worker
   npm install
   ```
2. Set up local development variables:
   ```bash
   cp .dev.vars.example .dev.vars
   ```
   Open `.dev.vars` and insert your Notion credentials:
   ```env
   NOTION_TOKEN=secret_your_token_here
   NOTION_DATABASE_ID=34675f4ef864804aaebdf5ae02c24d99
   LOOPA_API_KEY=
   ```
3. Test locally by running:
   ```bash
   npm run dev
   ```
   Open `http://127.0.0.1:8787/health` (should return `{ "ok": true }`).
4. Log into Cloudflare and deploy the worker:
   ```bash
   npx wrangler login
   npx wrangler secret put NOTION_TOKEN
   npx wrangler secret put NOTION_DATABASE_ID
   npm run deploy
   ```
   *Copy your deployed Worker URL (e.g. `https://loopa-archive-api.yourname.workers.dev`).*

#### 3. Configure and Load the Chrome Extension
1. Go back to the extension root directory.
2. Duplicate the API config file:
   ```bash
   cp lib/api-config.example.js lib/api-config.js
   ```
3. Open `lib/api-config.js` and set your worker URL:
   ```javascript
   export const LOOPA_API_BASE = "https://loopa-archive-api.yourname.workers.dev";
   export const LOOPA_API_KEY = ""; // Optional: Matches LOOPA_API_KEY secret on worker
   ```
4. Open Google Chrome and go to `chrome://extensions/`.
5. Toggle **Developer mode** in the top right.
6. Click **Load unpacked** in the top left and select the `loopa-extension` directory.

---

## 📋 Expected Notion Schema

Your Notion database properties should map to the following schema:

| Property | Notion Type | Description | Fallbacks / Detection |
| :--- | :--- | :--- | :--- |
| **Title** | `title` | Website or tool name | `Name`, Page ID, or Domain |
| **External Link** | `url` | URL of the bookmark | `URL` |
| **Category** | `select` | Broad classification (e.g. Design, Dev) | - |
| **Subcategory** | `select` | Detailed tags | - |
| **Pricing Type** | `select` | Pricing category (e.g., Free, Freemium, Paid) | - |
| **Hover Description** | `rich_text` | Short summary | - |
| **Cover Image** | `files` | Card thumbnail | First file attachment or external link |
| **New** | `checkbox` | Highlights card with "New" badge | `Is New` |
| **Sponsored** | `checkbox` | Highlights card with "Sponsored" badge | `Is Sponsored` |

---

## 🛠️ Packaging for Production

To package the extension into a zip file for Chrome Web Store submissions, run the automated PowerShell script from the root folder:

```powershell
./build.ps1
```

The script automatically:
* Runs a scanner to block compilation if API keys or secrets are leaked.
* Filters out development files, wrangler configs, and docs.
* Outputs `loopa-extension-v1.0.0.zip` ready for upload.

---

## 📄 License

Copyright © 2026 Loopa / Benja. All rights reserved.

This repository and its contents are proprietary and confidential. Unauthorized copying, distribution, modification, or commercial use of these files is strictly prohibited.
