import { siteThumbServiceUrl } from '@/lib/siteThumb';
import type { GallerySite } from '@/lib/headlessDayData';

// Resolves a site's thumbnail to its final CDN URL (the Location of the
// site-thumbnail service's redirect), so pages can render it directly instead
// of making each browser walk the uncacheable redirect chain. SERVER ONLY.
//
// Cached per site ID in memory. Entries expire because a site's snapshot can
// be regenerated (a new CDN URL); failures are cached briefly so a broken
// service isn't hit on every render.

const SITE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const THUMB_TTL_S = 600;
const MISS_TTL_MS = 60_000;
const RESOLVE_TIMEOUT_MS = 2000;

const cache = new Map<string, { url: string | null; expires: number }>();

export const isSiteId = (id: string) => SITE_ID.test(id);

/** The CDN URL of a site's thumbnail, or null if it can't be resolved. */
export async function resolveSiteThumb(siteId: string): Promise<string | null> {
  if (!isSiteId(siteId)) return null;
  const hit = cache.get(siteId);
  if (hit && hit.expires > Date.now()) return hit.url;

  let url: string | null = null;
  try {
    const res = await fetch(siteThumbServiceUrl(siteId), {
      redirect: 'manual',
      signal: AbortSignal.timeout(RESOLVE_TIMEOUT_MS),
    });
    const location = res.headers.get('location');
    if (res.status >= 300 && res.status < 400 && location?.startsWith('https://')) url = location;
  } catch {
    url = null;
  }
  cache.set(siteId, { url, expires: Date.now() + (url ? THUMB_TTL_S * 1000 : MISS_TTL_MS) });
  return url;
}

/** The submissions with `thumbUrl` resolved (in parallel); unresolved ones keep
 *  none and fall back to /api/site-thumb in the browser. */
export async function withThumbs(sites: GallerySite[]): Promise<GallerySite[]> {
  return Promise.all(
    sites.map(async (s) => {
      const thumbUrl = s.headlessSiteId ? await resolveSiteThumb(s.headlessSiteId) : null;
      return thumbUrl ? { ...s, thumbUrl } : s;
    }),
  );
}
