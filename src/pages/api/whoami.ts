import type { APIRoute } from 'astro';
import { json, listVotedIds, resolveSessionMember } from '@/lib/server/submissions';

// Signed-in member for the current request: name, email, profile image, and the
// submission IDs they've liked. All null for an anonymous visitor. no-store —
// it's per-user.
export const GET: APIRoute = async () => {
  const member = await resolveSessionMember();
  // The caller's liked submissions (server truth for the filled hearts).
  // `null` signals the lookup failed so the client keeps its local hint;
  // an array (even empty) is authoritative.
  let likedSubmissionIds: string[] | null = null;
  if (member) {
    try {
      likedSubmissionIds = await listVotedIds(member.email);
    } catch {
      likedSubmissionIds = null;
    }
  }
  return json({
    userName: member?.userName ?? null,
    email: member?.email ?? null,
    image: member?.image ?? null,
    likedSubmissionIds,
  });
};
