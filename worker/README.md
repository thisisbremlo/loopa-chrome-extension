# Loopa Archive API

Maintainer-only Cloudflare Worker used by the Loopa extension. It returns Loopa archive data as JSON for the extension.

This is project infrastructure for Loopa. Extension users do not configure or access the underlying content database.

## Setup

```powershell
npm install
Copy-Item .dev.vars.example .dev.vars
```

Fill `.dev.vars`:

```env
NOTION_TOKEN=secret_or_ntn_value
NOTION_DATABASE_ID=loopa_database_id
LOOPA_API_KEY=
```

`LOOPA_API_KEY` is optional. If set, the extension must send the same value in `lib/api-config.js`.

## Local Development

```powershell
npm run dev
```

Use these URLs for quick checks:

```text
http://127.0.0.1:8787/health
http://127.0.0.1:8787/api/archive
```

For local extension testing, set:

```js
export const LOOPA_API_BASE = "http://127.0.0.1:8787";
export const LOOPA_API_KEY = "";
```

## Deploy

```powershell
npx wrangler login
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATABASE_ID
npm run deploy
```

Optional API key:

```powershell
npx wrangler secret put LOOPA_API_KEY
```

After deploy, copy the Worker URL into `lib/api-config.js`.

## Endpoints

| Path | Method | Description |
| ---- | ------ | ----------- |
| `/health` | GET | Health check |
| `/api/archive` | GET | Archive JSON: `{ "items": [...] }` |

## Troubleshooting

| Problem | Check |
| ------- | ----- |
| `Worker missing NOTION_TOKEN or NOTION_DATABASE_ID secrets.` | `.dev.vars` or Cloudflare secrets are missing |
| Notion 401 | Token is wrong or expired |
| Notion 404 | Database ID is wrong or the integration is not connected |
| Extension 401 | `LOOPA_API_KEY` differs between Worker and extension |
| Extension fetch/CORS error | `LOOPA_API_BASE` does not match the local or deployed Worker URL |
