import type { GallerySite } from '@/lib/headlessDayData';

/** Wix's site-thumbnail service. It answers with a redirect chain (wix.com →
 *  www.wix.com → the snapshot on the wixmp CDN) that's marked no-store, so a
 *  browser pays both hops on every visit. Resolved server-side instead — see
 *  lib/server/siteThumbs.ts. */
export function siteThumbServiceUrl(siteId: string): string {
  return `https://www.wix.com/site-thumbnail/${encodeURIComponent(siteId)}?preset=site-list`;
}

/** Thumbnail URL for a Site ID when we don't have the resolved CDN URL: our own
 *  /api/site-thumb route, which redirects (cacheably) straight to the CDN. */
export function siteThumbUrl(siteId: string): string {
  if (!siteId) return '';
  return `/api/site-thumb?siteId=${encodeURIComponent(siteId)}`;
}

/** Best thumbnail URL for a submission: the CDN URL resolved in SSR when
 *  present, else the redirecting route. */
export function thumbFor(site: Pick<GallerySite, 'headlessSiteId' | 'thumbUrl'>): string {
  return site.thumbUrl || siteThumbUrl(site.headlessSiteId);
}
