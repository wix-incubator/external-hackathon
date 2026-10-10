import type { APIRoute } from 'astro';
import { siteThumbServiceUrl } from '@/lib/siteThumb';
import { THUMB_TTL_S, isSiteId, resolveSiteThumb } from '@/lib/server/siteThumbs';

// A site's thumbnail, for images the browser renders without an SSR-resolved
// URL (infinite scroll, filters, Reels, edited Site IDs):
//   /api/site-thumb?siteId=<uuid>
// One redirect straight to the CDN snapshot, cacheable for THUMB_TTL_S —
// instead of the thumbnail service's two uncacheable hops. Only Site-ID-shaped
// values are accepted, and the target is always Wix's own service response.
export const GET: APIRoute = async ({ url }) => {
  const siteId = (url.searchParams.get('siteId') ?? '').trim();
  if (!isSiteId(siteId)) return new Response('Invalid siteId', { status: 400 });

  const resolved = await resolveSiteThumb(siteId);
  return new Response(null, {
    status: 302,
    headers: resolved
      ? { Location: resolved, 'Cache-Control': `public, max-age=${THUMB_TTL_S}` }
      : { Location: siteThumbServiceUrl(siteId), 'Cache-Control': 'no-store' },
  });
};
