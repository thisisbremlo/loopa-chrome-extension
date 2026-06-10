# Loopa Worker Deploy Tutorial

This is a maintainer-only path for deploying the Cloudflare Worker used by the Loopa extension.

Extension users do not configure this Worker and do not access the underlying Loopa content database.

## Requirements

- Cloudflare account
- Node.js 18 or newer
- Access to Loopa's managed content database
- The Loopa database integration token and database ID

## 1. Install Dependencies

```powershell
cd C:\Users\Benja\Projects\loopa-extension\worker
npm install
```

## 2. Configure Local Secrets

```powershell
Copy-Item .dev.vars.example .dev.vars
```

Fill `.dev.vars`:

```env
NOTION_TOKEN=paste_token_here
NOTION_DATABASE_ID=paste_database_id_here
LOOPA_API_KEY=
```

`LOOPA_API_KEY` can stay empty unless API key protection is enabled for the extension.

## 3. Test Locally

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:8787/health
http://127.0.0.1:8787/api/archive
```

Expected:

- `/health` returns `{ "ok": true }`
- `/api/archive` returns JSON with an `items` array

## 4. Deploy

```powershell
npx wrangler login
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATABASE_ID
npm run deploy
```

To enable API key protection:

```powershell
npx wrangler secret put LOOPA_API_KEY
```

Copy the deployed Worker URL into `lib/api-config.js`:

```js
export const LOOPA_API_BASE = "https://loopa-archive-api.SUBDOMAIN.workers.dev";
export const LOOPA_API_KEY = "";
```

If `LOOPA_API_KEY` is configured on Cloudflare, put the same value in the extension config.

## 5. Reload the Extension

1. Open `chrome://extensions`.
2. Find Loopa.
3. Click reload.
4. Open any regular webpage and click the Loopa toolbar icon.

## Troubleshooting

| Error | Fix |
| ----- | --- |
| `Worker missing NOTION_TOKEN or NOTION_DATABASE_ID secrets.` | Check `.dev.vars` locally or Cloudflare secrets in production |
| Notion 401 | Token is wrong or expired |
| Notion 404 | Database ID is wrong or the integration is not connected |
| Extension says API is not configured | Create `lib/api-config.js` from the example |
| Extension gets 401 | Worker and extension API keys do not match |
| Extension cannot fetch local Worker | Confirm `LOOPA_API_BASE` is `http://127.0.0.1:8787` and reload the extension |

## Useful Commands

| Task | Command |
| ---- | ------- |
| Local dev | `npm run dev` |
| Deploy | `npm run deploy` |
| View logs | `npm run tail` |
| Update token | `npx wrangler secret put NOTION_TOKEN` |
