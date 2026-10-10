import { items } from '@wix/data';
import { COLLECTIONS, mapSubmission, type GallerySite } from '@/lib/headlessDayData';

// Reads run in the browser on the visitor session that @wix/astro sets up
// (Submissions is public-read); writes go through the elevated API routes
// /api/submit and /api/vote (src/pages/api/*).

export type GallerySort = 'newest' | 'likes' | 'random';

const submissionsQuery = () => items.query(COLLECTIONS.submissions);

export interface SubmissionsPage {
  items: GallerySite[];
  /** Total items matching the query (across all pages), from returnTotalCount. */
  total: number;
}

/** Total number of submissions (unfiltered) — powers the gallery title counter. */
export async function countSubmissions(): Promise<number> {
  return submissionsQuery().count();
}

/**
 * One page of submissions, sorted + filtered server-side (offset paging).
 * `skip` = how many already loaded for this same sort/filter. Used by the
 * gallery's infinite scroll for the "newest" and "likes" sorts.
 */
export async function fetchSubmissionsPage(opts: {
  sort: 'newest' | 'likes';
  solutions?: string[];
  /** Case-insensitive substring match on the submitter's name. */
  search?: string;
  skip?: number;
  limit?: number;
}): Promise<SubmissionsPage> {
  const { sort, solutions = [], search = '', skip = 0, limit = 24 } = opts;
  let q = submissionsQuery();
  if (solutions.length) q = q.hasSome('solutions', solutions);
  if (search.trim()) q = q.contains('ownerName', search.trim());
  // Secondary _createdDate keeps the order stable across pages when likes tie.
  q = sort === 'likes' ? q.descending('likesCount', '_createdDate') : q.descending('_createdDate');
  const res = await q.skip(skip).limit(limit).find({ returnTotalCount: true });
  return { items: res.items.map(mapSubmission), total: res.totalCount ?? res.items.length };
}

/**
 * Every submission matching the filter (fetched in pages of 1000 via the query
 * cursor). Wix Data has no random sort, so the "random" view shuffles this set
 * client-side; the gallery then reveals it in chunks as you scroll.
 */
export async function fetchAllSubmissions(
  solutions: string[] = [],
  search = '',
): Promise<GallerySite[]> {
  let q = submissionsQuery().descending('_createdDate');
  if (solutions.length) q = q.hasSome('solutions', solutions);
  if (search.trim()) q = q.contains('ownerName', search.trim());
  let res = await q.limit(1000).find();
  const all = res.items.map(mapSubmission);
  while (res.hasNext()) {
    res = await res.next();
    all.push(...res.items.map(mapSubmission));
  }
  return all;
}

// Shared "Reels" prefetch. The Reels view and the gallery's promo card both call
// this; the card warms it on hover/touch so the data is ready by the time the
// user lands on the Reels page — avoiding a cold "Loading Reels…" screen.
// Cached briefly so a hover-then-click reuses one request without
// pinning stale data for the whole session; a failed request is not cached.
let reelsCache: { at: number; promise: Promise<GallerySite[]> } | null = null;
const REELS_CACHE_TTL_MS = 60_000;

export function prefetchReelsSubmissions(): Promise<GallerySite[]> {
  const now = Date.now();
  if (reelsCache && now - reelsCache.at <= REELS_CACHE_TTL_MS) return reelsCache.promise;
  const promise = fetchAllSubmissions([]);
  reelsCache = { at: now, promise };
  promise.catch(() => {
    if (reelsCache?.promise === promise) reelsCache = null;
  });
  return promise;
}

export interface SubmitInput {
  id?: string;
  userName: string;
  image?: string;
  siteName: string;
  siteUrl: string;
  headlessSiteId: string;
  repoUrl?: string;
  solutions?: string[];
}

/** Create/update the caller's submission via the `/api/submit` GET route
 *  (server-side elevated write). The owner email comes from the server-side
 *  member session, not from here. */
export async function submitSite(input: SubmitInput): Promise<{ id: string; updated: boolean }> {
  const params = new URLSearchParams({
    userName: input.userName,
    image: input.image ?? '',
    siteName: input.siteName,
    siteUrl: input.siteUrl,
    headlessSiteId: input.headlessSiteId,
    repoUrl: input.repoUrl ?? '',
    solutions: (input.solutions ?? []).join(','),
  });
  if (input.id) params.set('id', input.id);
  const res = await fetch(`/api/submit?${params.toString()}`);
  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    updated?: boolean;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? `Submit failed (HTTP ${res.status})`);
  return { id: body.id ?? '', updated: Boolean(body.updated) };
}

/** The current user's submissions (keyed on their email), newest first. */
export async function fetchMySubmissions(email: string): Promise<GallerySite[]> {
  if (!email) return [];
  const res = await items
    .query(COLLECTIONS.submissions)
    .eq('ownerEmail', email)
    .descending('_createdDate')
    .limit(100)
    .find();
  return res.items.map(mapSubmission);
}

/**
 * Toggle the caller's like on a single submission via the `/api/vote` GET route.
 * Likes are independent per site — a user can like as many submissions as they
 * want. Returns whether the caller now likes this submission and its updated
 * likesCount.
 */
export async function voteForSite(
  submissionId: string,
): Promise<{ liked: boolean; likesCount: number }> {
  const params = new URLSearchParams({ submissionId });
  const res = await fetch(`/api/vote?${params.toString()}`);
  const body = (await res.json().catch(() => ({}))) as {
    liked?: boolean;
    likesCount?: number;
    error?: string;
  };
  if (!res.ok) throw new Error(body.error ?? `Vote failed (HTTP ${res.status})`);
  return { liked: Boolean(body.liked), likesCount: Number(body.likesCount ?? 0) };
}
