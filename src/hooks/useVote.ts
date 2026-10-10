import { useCallback, useEffect, useRef, useState } from 'react';
import { voteForSite } from '@/lib/headlessDayApi';
import { getUser } from '@/lib/currentUser';
import { loadLiked, saveLiked } from '@/lib/likedSites';
import type { GallerySite } from '@/lib/headlessDayData';

/**
 * Liking behavior shared by the Gallery and Reels views: the persisted liked-set,
 * the signed-in email (to disable liking your own site), a per-site busy flag,
 * and the toggle itself. The only per-view difference — how the local site list's
 * likesCount is updated — is delegated to `onVoted(siteId, likesCount)`.
 */
export function useVote(onVoted: (siteId: string, likesCount: number) => void): {
  likedIds: Set<string>;
  busyId: string | null;
  vote: (site: GallerySite) => void;
  isOwn: (site: GallerySite) => boolean;
} {
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [myEmail, setMyEmail] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Keep `vote` stable across renders while always calling the latest callback.
  const onVotedRef = useRef(onVoted);
  onVotedRef.current = onVoted;

  // One-time: paint instantly from the local hint, then reconcile with the
  // server's liked-set (the source of truth) so already-liked sites show red
  // even when localStorage is empty/stale (different browser, cleared storage).
  useEffect(() => {
    let cancelled = false;
    setLikedIds(loadLiked());
    getUser().then((u) => {
      if (cancelled) return;
      setMyEmail(u?.email ?? null);
      // An array (even empty) is authoritative; null means the lookup failed —
      // keep the local hint in that case.
      if (u?.likedSubmissionIds) {
        const server = new Set(u.likedSubmissionIds);
        setLikedIds(server);
        saveLiked(server);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const vote = useCallback(async (site: GallerySite) => {
    const user = await getUser();
    if (!user) return; // not signed in — nothing to attribute the like to
    if (site.ownerEmail && site.ownerEmail.toLowerCase() === user.email.toLowerCase()) return;
    setBusyId(site.id);
    try {
      const res = await voteForSite(site.id);
      // Independent per-site toggle: only this submission's count changes.
      onVotedRef.current(site.id, res.likesCount);
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (res.liked) next.add(site.id);
        else next.delete(site.id);
        saveLiked(next);
        return next;
      });
    } catch {
      /* leave state unchanged on failure */
    } finally {
      setBusyId(null);
    }
  }, []);

  const isOwn = useCallback(
    (site: GallerySite) =>
      Boolean(
        myEmail && site.ownerEmail && site.ownerEmail.toLowerCase() === myEmail.toLowerCase(),
      ),
    [myEmail],
  );

  return { likedIds, busyId, vote, isOwn };
}
