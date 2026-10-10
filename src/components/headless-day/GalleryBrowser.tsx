import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchSubmissionsPage,
  fetchAllSubmissions,
  prefetchReelsSubmissions,
  type GallerySort,
} from '@/lib/headlessDayApi';
import { thumbFor } from '@/lib/siteThumb';
import { HEADLESS_DAY_ROUTES } from '@/components/headless-day/routes';
import { useVote } from '@/hooks/useVote';
import { shuffle } from '@/lib/shuffle';
import { SOLUTIONS, solutionLabel, type GallerySite, type SolutionId } from '@/lib/headlessDayData';
import {
  avatarGradient,
  hueFromSeed,
  ownerInitials,
  thumbGradient,
} from '@/lib/headlessDayVisuals';

// How many cards to load per infinite-scroll page (and in the SSR first page).
export const PAGE_SIZE = 24;

// A promo "card" slotted into the gallery grid (3rd tile) that links to the
// Reels view. Warms the Reels data on hover/focus/touch so it's ready before
// the click lands — avoiding a cold "Loading Reels…" screen.
function ReelsPromoCard() {
  const warm = () => {
    prefetchReelsSubmissions();
  };
  return (
    <li className="hcf-hday-reelscard-li">
      <a
        href={HEADLESS_DAY_ROUTES.reels}
        className="hcf-hday-reelscard"
        onMouseEnter={warm}
        onFocus={warm}
        onTouchStart={warm}
      >
        <span className="hcf-hday-reelscard-icon" aria-hidden="true">
          <svg viewBox="0 0 122.14 122.88" fill="currentColor">
            <path d="M35.14,0H87c9.65,0,18.43,3.96,24.8,10.32c6.38,6.37,10.34,15.16,10.34,24.82v52.61c0,9.64-3.96,18.42-10.32,24.79l-0.02,0.02c-6.38,6.37-15.16,10.32-24.79,10.32H35.14c-9.66,0-18.45-3.96-24.82-10.32l-0.24-0.27C3.86,105.95,0,97.27,0,87.74V35.14c0-9.67,3.95-18.45,10.32-24.82S25.47,0,35.14,0L35.14,0z M91.51,31.02l0.07,0.11h21.6c-0.87-5.68-3.58-10.78-7.48-14.69C100.9,11.64,94.28,8.66,87,8.66h-8.87L91.51,31.02L91.51,31.02z M81.52,31.13L68.07,8.66H38.57l13.61,22.47H81.52L81.52,31.13z M42.11,31.13L28.95,9.39c-4.81,1.16-9.12,3.65-12.51,7.05c-3.9,3.9-6.6,9.01-7.48,14.69H42.11L42.11,31.13z M113.48,39.79H8.66v47.96c0,7.17,2.89,13.7,7.56,18.48l0.22,0.21c4.8,4.8,11.43,7.79,18.7,7.79H87c7.28,0,13.9-2.98,18.69-7.77l0.02-0.02c4.79-4.79,7.77-11.41,7.77-18.69V39.79L113.48,39.79z M50.95,54.95l26.83,17.45c0.43,0.28,0.82,0.64,1.13,1.08c1.22,1.77,0.77,4.2-1,5.42L51.19,94.67c-0.67,0.55-1.53,0.88-2.48,0.88c-2.16,0-3.91-1.75-3.91-3.91V58.15h0.02c0-0.77,0.23-1.55,0.7-2.23C46.76,54.15,49.19,53.72,50.95,54.95L50.95,54.95L50.95,54.95z" />
          </svg>
        </span>
        <span className="hcf-hday-reelscard-title">Don&rsquo;t want to scroll?</span>
        <span className="hcf-hday-reelscard-sub">
          Flip through sites one at a time, full-screen.
        </span>
        <span className="hcf-hday-reelscard-cta">
          Try Reels
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
            <path
              d="M9 5l7 7-7 7"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </a>
    </li>
  );
}

/** The default view's first page, rendered in SSR: a random shuffle of all
 *  submissions, with thumbnails resolved. */
export interface GalleryInitial {
  sites: GallerySite[];
  total: number;
}

// The first row of cards — loaded eagerly rather than lazily.
const EAGER_CARDS = 4;

/** The gallery's interactive part: search, solution filters, sort, the infinite-
 *  scroll grid and likes. (The heading + total count live in gallery.astro.)
 *  `initial` is null when the SSR read failed; the first page then loads here. */
export function GalleryBrowser({ initial }: { initial: GalleryInitial | null }) {
  const [sites, setSites] = useState<GallerySite[]>(initial?.sites ?? []);
  // Items matching the active filter.
  const [total, setTotal] = useState<number | null>(initial?.total ?? null);
  const [loading, setLoading] = useState(initial == null); // initial / reset load
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [sort, setSort] = useState<GallerySort>('random');
  const [active, setActive] = useState<Set<SolutionId>>(new Set());
  const { likedIds, busyId, vote, isOwn } = useVote((id, likesCount) =>
    setSites((prev) => prev.map((s) => (s.id === id ? { ...s, likesCount } : s))),
  );
  const [search, setSearch] = useState(''); // raw input value
  const [debouncedSearch, setDebouncedSearch] = useState(''); // trimmed, debounced query

  // Debounce the submitter-name search so we don't re-query on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Full shuffled set for the "random" view; revealed in chunks as you scroll.
  const randomPoolRef = useRef<GallerySite[]>([]);
  // The SSR first page stands in for the default view's first load.
  const usedInitialRef = useRef(initial != null);
  // In-flight build of the random pool behind the SSR page (see ensureRandomPool).
  const poolPromiseRef = useRef<Promise<GallerySite[]> | null>(null);
  // Bumped on every sort/filter change so stale in-flight responses are ignored.
  const reqIdRef = useRef(0);
  // Synchronous guard so overlapping scroll triggers never double-fetch.
  const busyRef = useRef(false);

  const activeKey = useMemo(() => [...active].sort().join(','), [active]);
  const activeSolutions = useMemo(() => (activeKey ? activeKey.split(',') : []), [activeKey]);

  // Behind the SSR first page: fetch every submission and append the rest in a
  // fresh shuffle, keeping the cards already shown first (and their resolved
  // thumbnails). Starts on hydration so scrolling rarely waits for it.
  const ensureRandomPool = useCallback((shown: GallerySite[]) => {
    poolPromiseRef.current ??= fetchAllSubmissions().then((all) => {
      const seen = new Set(shown.map((s) => s.id));
      const rest = all.filter((s) => !seen.has(s.id));
      shuffle(rest);
      return [...shown, ...rest];
    });
    return poolPromiseRef.current;
  }, []);

  // (Re)load the first page whenever the sort or the active filter changes.
  useEffect(() => {
    if (usedInitialRef.current) {
      // First run with the SSR page: nothing to load, just warm the pool.
      usedInitialRef.current = false;
      const reqId = reqIdRef.current;
      ensureRandomPool(initial!.sites)
        .then((pool) => {
          if (reqId !== reqIdRef.current) return;
          randomPoolRef.current = pool;
          setTotal(pool.length);
        })
        .catch(() => {
          poolPromiseRef.current = null; // retried by loadMore
        });
      return;
    }
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError(false);
    randomPoolRef.current = [];
    const run = async () => {
      if (sort === 'random') {
        const all = await fetchAllSubmissions(activeSolutions, debouncedSearch);
        shuffle(all);
        if (reqId !== reqIdRef.current) return;
        randomPoolRef.current = all;
        setSites(all.slice(0, PAGE_SIZE));
        setTotal(all.length);
      } else {
        const page = await fetchSubmissionsPage({
          sort,
          solutions: activeSolutions,
          search: debouncedSearch,
          skip: 0,
          limit: PAGE_SIZE,
        });
        if (reqId !== reqIdRef.current) return;
        setSites(page.items);
        setTotal(page.total);
      }
    };
    run()
      .catch(() => {
        if (reqId === reqIdRef.current) setError(true);
      })
      .finally(() => {
        if (reqId === reqIdRef.current) setLoading(false);
      });
  }, [sort, activeSolutions, debouncedSearch]);

  const hasMore = total != null && sites.length < total;

  const loadMore = useCallback(async () => {
    if (busyRef.current || loading) return;
    busyRef.current = true;
    setLoadingMore(true);
    const reqId = reqIdRef.current;
    try {
      if (sort === 'random') {
        // Still showing the SSR page and its pool isn't built yet — wait for it.
        if (!randomPoolRef.current.length && initial) {
          const pool = await ensureRandomPool(initial.sites);
          if (reqId !== reqIdRef.current) return;
          randomPoolRef.current = pool;
        }
        const next = randomPoolRef.current.slice(0, sites.length + PAGE_SIZE);
        if (reqId === reqIdRef.current) setSites(next);
      } else {
        const page = await fetchSubmissionsPage({
          sort,
          solutions: activeSolutions,
          search: debouncedSearch,
          skip: sites.length,
          limit: PAGE_SIZE,
        });
        if (reqId === reqIdRef.current) {
          setSites((prev) => {
            const seen = new Set(prev.map((s) => s.id));
            return [...prev, ...page.items.filter((s) => !seen.has(s.id))];
          });
          setTotal(page.total);
        }
      }
    } catch {
      /* keep what we have on a failed page fetch */
    } finally {
      busyRef.current = false;
      setLoadingMore(false);
    }
  }, [sort, activeSolutions, debouncedSearch, sites.length, loading, initial, ensureRandomPool]);

  // Infinite scroll: observe a sentinel below the grid and load the next page
  // as it nears the viewport. loadMoreRef keeps the observer bound to the
  // latest closure without re-creating it on every state change.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore || loading || error) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreRef.current();
      },
      { rootMargin: '600px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, loading, error, sites.length]);

  const toggle = (id: SolutionId) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <>
      <div className="hcf-hday-search">
        <svg className="hcf-hday-search-icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
          <path d="m14 14 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className="hcf-hday-search-input"
          placeholder="Search by submitter name"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search submissions by submitter name"
        />
        {search && (
          <button
            type="button"
            className="hcf-hday-search-clear"
            onClick={() => setSearch('')}
            aria-label="Clear search"
          >
            ×
          </button>
        )}
      </div>

      <div className="hcf-hday-toolbar">
        <div className="hcf-hday-filters" role="group" aria-label="Filter by business solution">
          {SOLUTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              className="hcf-hday-filter"
              data-active={active.has(s.id)}
              aria-pressed={active.has(s.id)}
              onClick={() => toggle(s.id)}
            >
              {s.label}
            </button>
          ))}
          {active.size > 0 && (
            <button
              type="button"
              className="hcf-hday-filter-clear"
              onClick={() => setActive(new Set())}
            >
              Clear
            </button>
          )}
        </div>

        <div className="hcf-hday-sort" role="group" aria-label="Sort by">
          {(
            [
              { key: 'random', label: 'Random' },
              { key: 'newest', label: 'Newest' },
              { key: 'likes', label: 'Most Liked' },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              type="button"
              className="hcf-hday-sortlink"
              data-active={sort === s.key}
              aria-pressed={sort === s.key}
              onClick={() => setSort(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <ul className="hcf-hday-grid" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <li key={i}>
              <div className="hcf-hday-skelcard">
                <div className="hcf-hday-skelcard-top">
                  <span className="hcf-hday-skel hcf-hday-skel-avatar" />
                  <span className="hcf-hday-skel hcf-hday-skel-line" style={{ width: '45%' }} />
                </div>
                <span className="hcf-hday-skel hcf-hday-skel-thumb" />
                <div className="hcf-hday-skel-body">
                  <span className="hcf-hday-skel hcf-hday-skel-title" style={{ width: '70%' }} />
                  <span className="hcf-hday-skel hcf-hday-skel-chip" style={{ width: '45%' }} />
                </div>
                <div className="hcf-hday-skel-foot">
                  <span className="hcf-hday-skel hcf-hday-skel-pill" style={{ width: '3rem' }} />
                  <span
                    className="hcf-hday-skel hcf-hday-skel-pill"
                    style={{ width: '3.5rem' }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <p className="hcf-hday-empty">Couldn&rsquo;t load the gallery. Please try again.</p>
      ) : sites.length === 0 ? (
        <p className="hcf-hday-empty">
          {debouncedSearch
            ? `No submitters matching “${debouncedSearch}”.`
            : activeSolutions.length === 0
              ? 'No sites submitted yet — be the first!'
              : 'No sites match those filters yet.'}
        </p>
      ) : (
        <ul className="hcf-hday-grid">
          {sites.map((site, i) => {
            const hasVoted = likedIds.has(site.id);
            const own = isOwn(site);
            return (
              <Fragment key={site.id}>
                {i === 2 && <ReelsPromoCard />}
                <li>
                  <article className="hcf-hday-sitecard">
                    <div className="hcf-hday-cardtop">
                      {site.ownerImage ? (
                        <img
                          className="hcf-hday-avatar hcf-hday-avatar-img"
                          referrerPolicy="no-referrer"
                          src={site.ownerImage}
                          alt=""
                          aria-hidden="true"
                        />
                      ) : (
                        <span
                          className="hcf-hday-avatar"
                          style={{ background: avatarGradient(site.ownerName) }}
                          aria-hidden="true"
                        >
                          {ownerInitials(site.ownerName)}
                        </span>
                      )}
                      <span className="hcf-hday-cardtop-name">
                        {site.ownerName || 'Anonymous'}
                      </span>
                    </div>
                    <a
                      className="hcf-hday-sitecard-link"
                      href={site.siteUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span
                        className="hcf-hday-thumb"
                        style={{ background: thumbGradient(hueFromSeed(site.id)) }}
                        aria-hidden="true"
                      >
                        {site.headlessSiteId && (
                          <img
                            className="hcf-hday-thumb-img"
                            src={thumbFor(site)}
                            alt=""
                            loading={i < EAGER_CARDS ? 'eager' : 'lazy'}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </span>
                      <span className="hcf-hday-sitecard-body">
                        <span className="hcf-hday-sitecard-name">{site.siteName}</span>
                        <span className="hcf-hday-solutions">
                          {site.solutions.map((id) => (
                            <span key={id} className="hcf-hday-solchip">
                              {solutionLabel(id)}
                            </span>
                          ))}
                        </span>
                      </span>
                    </a>
                    <div className="hcf-hday-cardfoot">
                      <button
                        type="button"
                        className="hcf-hday-votebtn"
                        data-voted={hasVoted}
                        data-own={own}
                        disabled={busyId === site.id || own}
                        aria-pressed={hasVoted}
                        aria-label={
                          own
                            ? "You can't like your own submission"
                            : hasVoted
                              ? 'Remove your like'
                              : 'Like this site'
                        }
                        title={own ? "You can't like your own submission" : undefined}
                        onClick={() => vote(site)}
                      >
                        <span aria-hidden="true">♥</span> {site.likesCount}
                      </button>
                      <a
                        className="hcf-hday-visit"
                        href={site.siteUrl || undefined}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                    </div>
                  </article>
                </li>
              </Fragment>
            );
          })}
          {sites.length > 0 && sites.length < 3 && <ReelsPromoCard />}
        </ul>
      )}

      {/* Infinite-scroll sentinel + "loading more" hint. */}
      {!loading && !error && hasMore && (
        <div ref={sentinelRef} className="hcf-hday-sentinel" aria-hidden="true">
          {loadingMore && <span className="hcf-hday-loadingmore">Loading more…</span>}
        </div>
      )}
    </>
  );
}
