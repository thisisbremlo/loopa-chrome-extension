/**
 * Copy to `api-config.js` after deploying the Cloudflare Worker.
 * Loopa database credentials live only on Cloudflare, not in the extension.
 */
export const LOOPA_API_BASE = "https://loopa-archive-api.SUBDOMAIN.workers.dev";
/** Optional. Set the same value as LOOPA_API_KEY worker secret, or leave empty. */
export const LOOPA_API_KEY = "";
