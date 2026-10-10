import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { prefetchReelsSubmissions } from '@/lib/headlessDayApi';
import { thumbFor } from '@/lib/siteThumb';
import { useVote } from '@/hooks/useVote';
import { shuffle } from '@/lib/shuffle';
import { HEADLESS_DAY_ROUTES } from '@/components/headless-day/routes';
import { solutionLabel, type GallerySite } from '@/lib/headlessDayData';
import {
  avatarGradient,
  hueFromSeed,
  ownerInitials,
  thumbGradient,
} from '@/lib/headlessDayVisuals';

function ChevronLeft() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M15 5 8 12l7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// If a site hasn't fired onload within this window we assume it's blocking the
// frame (X-Frame-Options / CSP) and fall back to its screenshot.
const LOAD_TIMEOUT_MS = 8000;

/**
 * One full-bleed site view. A thumbnail "poster" fills the stage immediately
 * (blurred, behind a glossy sheen, with a "Loading <name>…" pill) while the live
 * <iframe> loads behind it; on `onLoad` the poster fades out to reveal the site.
 * On load failure (timeout or error) the poster stays as the fallback surface
 * with an "Open site" prompt. The parent keys this on site.id and wraps it in
 * <AnimatePresence> so navigation crossfades between sites.
 */
function SiteStage({ site, reduce }: { site: GallerySite; reduce: boolean | null }) {
  const [status, setStatus] = useState<'loading' | 'live' | 'fallback'>('loading');
  const [thumbFailed, setThumbFailed] = useState(false);

  useEffect(() => {
    setStatus('loading');
    setThumbFailed(false);
    if (!site.siteUrl) {
      setStatus('fallback');
      return;
    }
    const timer = setTimeout(() => {
      // onload never came — treat as blocked. A genuinely slow load that arrives
      // later still flips back to 'live' via the iframe's onLoad handler.
      setStatus((s) => (s === 'loading' ? 'fallback' : s));
    }, LOAD_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [site.id, site.siteUrl]);

  const thumb = thumbFor(site) || null;
  const fade = reduce ? { duration: 0 } : { duration: 0.28, ease: 'easeOut' as const };

  return (
    <motion.div
      className="hcf-reels-stage"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
    >
      {site.siteUrl && status !== 'fallback' && (
        <iframe
          key={site.id}
          className="hcf-reels-frame"
          src={site.siteUrl}
          title={site.siteName}
          loading="eager"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox allow-modals"
          onLoad={() => setStatus('live')}
          onError={() => setStatus('fallback')}
        />
      )}

      {/* Poster: shown until the iframe is live, then fades out to reveal it. */}
      <AnimatePresence>
        {status !== 'live' && (
          <motion.div
            className="hcf-reels-poster"
            data-mode={status}
            style={{ background: thumbGradient(hueFromSeed(site.id)) }}
            initial={false}
            exit={{ opacity: 0 }}
            transition={fade}
          >
            {thumb && !thumbFailed && (
              <img
                className="hcf-reels-poster-img"
                src={thumb}
                alt=""
                aria-hidden="true"
                onError={() => setThumbFailed(true)}
              />
            )}
            <div className="hcf-reels-poster-glass" aria-hidden="true" />

            {status === 'loading' && (
              <div className="hcf-reels-loader" aria-live="polite">
                <span className="hcf-reels-loader-ring" aria-hidden="true" />
                <span className="hcf-reels-loader-label">Loading {site.siteName}…</span>
              </div>
            )}

            {status === 'fallback' && (
              <div className="hcf-reels-fallback-note">
                <p>This site can’t be previewed inline.</p>
                {site.siteUrl && (
                  <a
                    className="hcf-reels-fallback-open"
                    href={site.siteUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open site ↗
                  </a>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function Reels() {
  const [pool, setPool] = useState<GallerySite[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const reduce = useReducedMotion();
  const { likedIds, busyId, vote, isOwn } = useVote((id, likesCount) =>
    setPool((prev) => prev.map((s) => (s.id === id ? { ...s, likesCount } : s))),
  );

  // One-time: load the shuffled pool. Liked-set + current user are owned by useVote.
  useEffect(() => {
    let cancelled = false;
    prefetchReelsSubmissions()
      .then((all) => {
        if (cancelled) return;
        const shuffled = [...all];
        shuffle(shuffled);
        setPool(shuffled);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const total = pool.length;
  const current = total ? pool[index % total] : null;

  const go = useCallback(
    (dir: 1 | -1) => {
      setIndex((i) => {
        if (!total) return 0;
        return (i + dir + total) % total;
      });
    },
    [total],
  );

  // Preload both neighbours' thumbnails so the poster is instant in either
  // direction (the poster shows immediately while the live iframe loads behind).
  useEffect(() => {
    if (total < 2) return;
    const neighbours = [pool[(index + 1) % total], pool[(index - 1 + total) % total]];
    for (const n of neighbours) {
      const url = n && thumbFor(n);
      if (url) {
        const img = new Image();
        img.src = url;
      }
    }
  }, [index, total, pool]);

  // Warm the connection (DNS/TCP/TLS) to the next site's origin so its live
  // iframe becomes interactive sooner — shrinking the poster→live gap.
  useEffect(() => {
    if (total < 2) return;
    const next = pool[(index + 1) % total];
    let origin = '';
    try {
      if (next?.siteUrl) origin = new URL(next.siteUrl).origin;
    } catch {
      origin = '';
    }
    if (!origin) return;
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = origin;
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, [index, total, pool]);

  // Keyboard navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  if (loading) {
    return (
      <div className="hcf-reels hcf-reels-centered">
        <span className="hcf-reels-spinner" aria-hidden="true" />
        <p className="hcf-reels-msg">Loading Reels…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="hcf-reels hcf-reels-centered">
        <p className="hcf-reels-msg">Couldn’t load Reels. Please try again.</p>
        <a href={HEADLESS_DAY_ROUTES.gallery} className="hcf-reels-exit-link">
          ← Back to Gallery
        </a>
      </div>
    );
  }
  if (!current) {
    return (
      <div className="hcf-reels hcf-reels-centered">
        <p className="hcf-reels-msg">No sites submitted yet — be the first!</p>
        <a href={HEADLESS_DAY_ROUTES.gallery} className="hcf-reels-exit-link">
          ← Back to Gallery
        </a>
      </div>
    );
  }

  const hasVoted = likedIds.has(current.id);
  const own = isOwn(current);

  return (
    <div className="hcf-reels">
      <AnimatePresence initial={false}>
        <SiteStage key={current.id} site={current} reduce={reduce} />
      </AnimatePresence>

      <div className="hcf-reels-chrome">
        <div className="hcf-reels-scrim hcf-reels-scrim-bottom" aria-hidden="true" />

        <div className="hcf-reels-bar">
          <div className="hcf-reels-left">
            <a href={HEADLESS_DAY_ROUTES.gallery} className="hcf-reels-exit" title="Back to Gallery">
              <span aria-hidden="true">←</span> Gallery
            </a>

            <div className="hcf-reels-meta">
              <div className="hcf-reels-owner">
                {current.ownerImage ? (
                  <img
                    className="hcf-reels-avatar hcf-reels-avatar-img"
                    referrerPolicy="no-referrer"
                    src={current.ownerImage}
                    alt=""
                    aria-hidden="true"
                  />
                ) : (
                  <span
                    className="hcf-reels-avatar"
                    style={{ background: avatarGradient(current.ownerName) }}
                    aria-hidden="true"
                  >
                    {ownerInitials(current.ownerName)}
                  </span>
                )}
                <span className="hcf-reels-ownername">{current.ownerName || 'Anonymous'}</span>
              </div>
              <h1 className="hcf-reels-title">{current.siteName}</h1>
              {current.solutions.length > 0 && (
                <div className="hcf-reels-solutions">
                  {current.solutions.map((id) => (
                    <span key={id} className="hcf-reels-solchip">
                      {solutionLabel(id)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="hcf-reels-actions">
            <button
              type="button"
              className="hcf-reels-like"
              data-voted={hasVoted}
              data-own={own}
              disabled={busyId === current.id || own}
              aria-pressed={hasVoted}
              aria-label={
                own
                  ? "You can't like your own submission"
                  : hasVoted
                    ? 'Remove your like'
                    : 'Like this site'
              }
              title={own ? "You can't like your own submission" : undefined}
              onClick={() => vote(current)}
            >
              <span className="hcf-reels-heart" aria-hidden="true">
                ♥
              </span>
              <span className="hcf-reels-likecount">{current.likesCount}</span>
            </button>
            <a
              className="hcf-reels-open"
              href={current.siteUrl || undefined}
              target="_blank"
              rel="noreferrer"
              aria-label="Open site in a new tab"
              title="Open in new tab"
            >
              <span aria-hidden="true">↗</span>
              <span className="hcf-reels-open-label">Open</span>
            </a>
            <div className="hcf-reels-nav" role="group" aria-label="Navigate sites">
              <button
                type="button"
                className="hcf-reels-arrow"
                onClick={() => go(-1)}
                aria-label="Previous site"
              >
                <ChevronLeft />
              </button>
              <button
                type="button"
                className="hcf-reels-arrow"
                onClick={() => go(1)}
                aria-label="Next site"
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
