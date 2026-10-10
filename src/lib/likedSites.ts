// The set of submissions the current user has liked, cached in localStorage so
// the filled-heart state is instant on load and shared across the Gallery and
// Showcase views (both read/write this one key). The /api/vote route remains the
// source of truth; this is only a UI hint. Stored as a JSON array of ids.
const LIKED_KEY = 'hday-liked';

export function loadLiked(): Set<string> {
  if (typeof localStorage === 'undefined') return new Set();
  const raw = localStorage.getItem(LIKED_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.map(String));
  } catch {
    // Legacy value was a single id string (the old one-like model).
    return new Set([raw]);
  }
  return new Set();
}

export function saveLiked(ids: Set<string>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LIKED_KEY, JSON.stringify([...ids]));
}
