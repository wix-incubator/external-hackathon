// Presentation-only helpers for the Headless Day pages: deterministic gradients
// and initials for site thumbnails and owner avatars. Kept separate from the
// data types/mapping in headlessDayData.ts.

/** Stable hue (0–359) hashed from a seed string (e.g. the item id). */
export function hueFromSeed(seed: string): number {
  let hue = 0;
  for (let i = 0; i < seed.length; i++) hue = (hue * 31 + seed.charCodeAt(i)) % 360;
  return hue;
}

/** CSS gradient for a site's placeholder thumbnail, derived from a hue. */
export function thumbGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue}, 85%, 72%), hsl(${(hue + 45) % 360}, 80%, 55%))`;
}

/** Owner initials (up to 2) for the avatar placeholder. */
export function ownerInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join('') || '?'
  );
}

/** Stable per-person gradient for the owner avatar, hashed from the name. */
export function avatarGradient(name: string): string {
  const hue = hueFromSeed(name || 'anon');
  return `linear-gradient(135deg, hsl(${hue}, 68%, 62%), hsl(${(hue + 40) % 360}, 68%, 48%))`;
}
