// Current user's identity from the Wix session (GET /api/whoami), cached for the page
// load. Keyed on email (the unique identifier). Null when there's no session.
/** The signed-in member's display identity. Pages resolve it in SSR and pass it
 *  to the islands that need it (the submit forms). */
export interface MemberProfile {
  email: string;
  userName: string;
  image: string;
}

export interface CurrentUser extends MemberProfile {
  /** Submission IDs the user has liked (server truth), or null if the lookup
   *  failed — in which case callers should fall back to their local hint. */
  likedSubmissionIds: string[] | null;
}

let cached: CurrentUser | null | undefined;

export async function getUser(): Promise<CurrentUser | null> {
  if (cached !== undefined) return cached;
  try {
    const res = await fetch('/api/whoami');
    const { userName, email, image, likedSubmissionIds } = (await res.json()) as {
      userName?: string | null;
      email?: string | null;
      image?: string | null;
      likedSubmissionIds?: string[] | null;
    };
    cached = email
      ? {
          email,
          userName: userName ?? email,
          image: image ?? '',
          likedSubmissionIds: likedSubmissionIds ?? null,
        }
      : null;
  } catch {
    cached = null;
  }
  return cached;
}
