// Shared types + data mapping for the Headless Day pages: the solution
// vocabulary and mapping raw Wix CMS items to the display shape. Presentation
// helpers (gradients/initials) live in headlessDayVisuals.ts.

// CMS collection IDs (Wix Data, native collections on this site).
//  - Submissions: public read, admin-only writes (via the elevated /api/submit).
//  - Votes: admin-only; read/written only by the elevated API routes.
export const COLLECTIONS = {
  submissions: 'Submissions',
  votes: 'Votes',
} as const;

export type SolutionId =
  | 'stores'
  | 'bookings'
  | 'events'
  | 'restaurants'
  | 'blog'
  | 'members'
  | 'forms'
  | 'pricingPlans'
  | 'cms';

export const SOLUTIONS: { id: SolutionId; label: string }[] = [
  { id: 'stores', label: 'Stores' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'events', label: 'Events' },
  { id: 'restaurants', label: 'Restaurants' },
  { id: 'blog', label: 'Blog' },
  { id: 'members', label: 'Members' },
  { id: 'forms', label: 'Forms' },
  { id: 'pricingPlans', label: 'Pricing Plans' },
  { id: 'cms', label: 'CMS' },
];

const SOLUTION_LABELS: Record<SolutionId, string> = Object.fromEntries(
  SOLUTIONS.map((s) => [s.id, s.label]),
) as Record<SolutionId, string>;

const SOLUTION_IDS = new Set<string>(SOLUTIONS.map((s) => s.id));

export function solutionLabel(id: SolutionId): string {
  return SOLUTION_LABELS[id] ?? id;
}

/** Display shape used by the gallery / leaderboard / my-submission UI. */
export interface GallerySite {
  id: string;
  siteName: string;
  ownerName: string;
  ownerEmail: string;
  ownerImage: string;
  siteUrl: string;
  headlessSiteId: string;
  repoUrl: string;
  solutions: SolutionId[];
  likesCount: number;
  /** Epoch ms of submission, for the "Newest" sort (0 if unknown). */
  createdAt: number;
  /** The thumbnail's CDN URL, when resolved in SSR (lib/server/siteThumbs.ts). */
  thumbUrl?: string;
}

/** Map a raw Wix Data item from the `Submissions` collection to `GallerySite`. */
export function mapSubmission(item: Record<string, unknown>): GallerySite {
  const rawSolutions = Array.isArray(item.solutions) ? (item.solutions as unknown[]) : [];
  const created = typeof item._createdDate === 'string' ? Date.parse(item._createdDate) : NaN;
  return {
    id: String(item._id ?? ''),
    siteName: String(item.siteName ?? 'Untitled site'),
    ownerName: String(item.ownerName ?? ''),
    ownerEmail: String(item.ownerEmail ?? ''),
    ownerImage: String(item.ownerImage ?? ''),
    siteUrl: String(item.siteUrl ?? ''),
    headlessSiteId: String(item.headlessSiteId ?? ''),
    repoUrl: String(item.repoUrl ?? ''),
    solutions: rawSolutions.filter((s): s is SolutionId => SOLUTION_IDS.has(String(s))),
    likesCount: Number(item.likesCount ?? 0),
    createdAt: Number.isNaN(created) ? 0 : created,
  };
}
