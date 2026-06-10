# Loopa Archive API (Cloudflare Worker)

Proxies Notion so the integration token **never ships in the browser extension**.

## One-time setup

### 1. Install Wrangler

```bash
cd worker
npm install
```

### 2. Local secrets

```bash
copy .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your Notion integration token and database ID.

### 3. Local dev

```bash
npm run dev
```

Extension `lib/api-config.js` should point to `http://127.0.0.1:8787` (default).

### 4. Deploy to Cloudflare

```bash
npx wrangler login
npx wrangler secret put NOTION_TOKEN
npx wrangler secret put NOTION_DATABASE_ID
```

Optional abuse protection:

```bash
npx wrangler secret put LOOPA_API_KEY
```

Then deploy:

```bash
npm run deploy
```

Copy the URL (e.g. `https://loopa-archive-api.your-name.workers.dev`) into the extension:

```bash
copy ..\lib\api-config.example.js ..\lib\api-config.js
```

Set `LOOPA_API_BASE` to your Worker URL. If you set `LOOPA_API_KEY` on the Worker, add the same value to `LOOPA_API_KEY` in `api-config.js`.

### 5. Rotate your Notion token

If the token was ever committed to git or shared in chat, create a new one at [Notion integrations](https://www.notion.so/profile/integrations) and update the Worker secret.

## Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/health` | GET | Health check |
| `/api/archive` | GET | Full archive as JSON `{ items: [...] }` |

## Optional: rate limiting

In the Cloudflare dashboard → your Worker → Settings → add rate limiting rules or use Cloudflare WAF on the route.
