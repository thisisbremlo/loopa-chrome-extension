# Loopa — Cloudflare Worker setup (step by step)

This hides your Notion token on Cloudflare. The browser extension only talks to your Worker URL.

**Time:** ~15 minutes  
**You need:** Cloudflare account, Node.js on your PC, your Notion integration token

---

## Part 1 — Notion (2 min)

1. Open [notion.so/profile/integrations](https://www.notion.so/profile/integrations).
2. Open your **Loopa** integration (or create one: **New integration** → name it `Loopa Extension`).
3. Copy the **Internal Integration Secret** (`secret_…` or `ntn_…`). Keep this tab open.
4. Open your **Loopa** database in Notion.
5. Click **•••** (top right) → **Connect to** → select that integration.
6. Copy the **database ID** from the browser URL:
   ```
   https://www.notion.so/34675f4ef864804aaebdf5ae02c24d99?v=...
                              ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                              this part (32 characters)
   ```

---

## Part 2 — Cloudflare dashboard (3 min)

1. You are on [dash.cloudflare.com](https://dash.cloudflare.com).
2. In the left sidebar, click **Workers & Pages** (or **Compute** → **Workers**).
3. You do **not** need to click “Create” in the UI yet — we deploy from your computer with Wrangler (Cloudflare’s CLI). The Worker will appear here after deploy.
4. Optional: note your **Account ID** (right sidebar on Workers overview, or **Workers & Pages** → scroll down). Wrangler usually detects it automatically.

---

## Part 3 — Install tools on your PC (5 min)

Open **PowerShell** or **Terminal**:

```powershell
cd C:\Users\Benja\Projects\loopa-extension\worker
```

Check Node.js:

```powershell
node -v
```

You need v18 or newer. If missing, install from [nodejs.org](https://nodejs.org).

Install dependencies:

```powershell
npm install
```

Install Wrangler globally (optional but easier):

```powershell
npm install -g wrangler
```

Log in to Cloudflare (browser window opens):

```powershell
npx wrangler login
```

- Approve access in the browser.
- Return to the terminal when it says you are logged in.

---

## Part 4 — Local secrets file (2 min)

Still in the `worker` folder:

```powershell
copy .dev.vars.example .dev.vars
```

Open `.dev.vars` in Cursor/Notepad and set:

```env
NOTION_TOKEN=paste_your_notion_secret_here
NOTION_DATABASE_ID=34675f4ef864804aaebdf5ae02c24d99
LOOPA_API_KEY=
```

- No quotes around values.
- `LOOPA_API_KEY` can stay empty for now.

Save the file. **Never commit `.dev.vars` to GitHub** (it is already gitignored).

---

## Part 5 — Test locally (3 min)

Start the Worker on your machine:

```powershell
npm run dev
```

You should see something like:

```
Ready on http://127.0.0.1:8787
```

**Test in browser:** open a new tab and visit:

```
http://127.0.0.1:8787/health
```

You should see: `{"ok":true}`

Then visit:

```
http://127.0.0.1:8787/api/archive
```

You should see JSON with an `"items"` array (may take a few seconds).

If you get an error:

| Error | Fix |
|-------|-----|
| `Worker missing NOTION_TOKEN` | Check `.dev.vars` spelling and restart `npm run dev` |
| Notion 401 / unauthorized | Wrong token, or integration not connected to database |
| Notion 404 | Wrong `NOTION_DATABASE_ID` |

Leave `npm run dev` running for the next step, or stop it with `Ctrl+C` after tests pass.

---

## Part 6 — Deploy to Cloudflare (3 min)

Open a **new** terminal (or stop dev with `Ctrl+C`), same folder:

```powershell
cd C:\Users\Benja\Projects\loopa-extension\worker
```

Upload secrets to Cloudflare (paste when prompted — input is hidden):

```powershell
npx wrangler secret put NOTION_TOKEN
```

```powershell
npx wrangler secret put NOTION_DATABASE_ID
```

Paste the database ID when asked (e.g. `34675f4ef864804aaebdf5ae02c24d99`).

Deploy:

```powershell
npm run deploy
```

At the end you will see a URL like:

```
https://loopa-archive-api.YOUR-NAME.workers.dev
```

**Copy that URL** — you need it for the extension.

**Verify in Cloudflare:**

1. Dashboard → **Workers & Pages**
2. You should see **loopa-archive-api**
3. Click it → **Settings** → **Variables and Secrets** should list `NOTION_TOKEN` and `NOTION_DATABASE_ID` (values hidden)

Test production in browser:

```
https://loopa-archive-api.YOUR-NAME.workers.dev/health
https://loopa-archive-api.YOUR-NAME.workers.dev/api/archive
```

---

## Part 7 — Connect the extension (2 min)

1. Open `C:\Users\Benja\Projects\loopa-extension\lib\api-config.js`  
   (if missing: `copy lib\api-config.example.js lib\api-config.js`)

2. Set:

```js
export const LOOPA_API_BASE = "https://loopa-archive-api.YOUR-NAME.workers.dev";
export const LOOPA_API_KEY = "";
```

Use **your** Worker URL from Part 6. No trailing slash.

3. Open Chrome → `chrome://extensions`
4. Find **Loopa Archive** → click **Reload**
5. On any website, click the Loopa extension icon

The archive should load. The Notion token is **not** in the extension anymore.

---

## Part 8 — Optional: API key (abuse protection)

If you publish the extension or share the Worker URL, add a simple key:

**On Cloudflare:**

```powershell
npx wrangler secret put LOOPA_API_KEY
```

Enter a long random string (e.g. generate with a password manager).

**In extension** `lib/api-config.js`:

```js
export const LOOPA_API_KEY = "same-random-string";
```

Redeploy is **not** needed after changing only `LOOPA_API_KEY` secret — it applies immediately.

---

## Part 9 — Rotate your old token (recommended)

If the Notion token was ever in the extension files or chat:

1. Notion → Integrations → your integration → **Refresh** / new secret
2. Update Cloudflare:
   ```powershell
   npx wrangler secret put NOTION_TOKEN
   ```
3. Update `.dev.vars` locally if you still use `npm run dev`

---

## Quick reference

| Task | Command |
|------|---------|
| Local dev | `npm run dev` |
| Deploy | `npm run deploy` |
| View live logs | `npm run tail` |
| Update secret | `npx wrangler secret put NOTION_TOKEN` |

| File | Purpose |
|------|---------|
| `worker/.dev.vars` | Local secrets (your PC only) |
| Cloudflare secrets | Production secrets |
| `lib/api-config.js` | Worker URL for extension |

---

## Troubleshooting

**Extension: “API not configured”**  
→ Create/fix `lib/api-config.js` with `LOOPA_API_BASE`.

**Extension: “Failed to fetch” / CORS**  
→ Check `LOOPA_API_BASE` matches deploy URL exactly. Reload extension.

**Extension: 401 Unauthorized**  
→ `LOOPA_API_KEY` mismatch between Worker and `api-config.js`.

**Worker 500 on `/api/archive`**  
→ Run `npm run tail`, reload extension, read error in terminal.

**“npm / wrangler not found”**  
→ Install Node.js, run `npm install` inside `worker` folder first.

---

When Part 6 and Part 7 work, you are done. The Notion key lives only on Cloudflare.
